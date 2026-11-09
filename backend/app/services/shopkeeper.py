import asyncio
import logging
import os
import secrets
import tempfile
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from geoalchemy2.elements import WKTElement
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import auth, models, schemas
from ..database import SessionLocal
from . import fcm_service, karma_engine, insee, student_portal

log = logging.getLogger("vif.shopkeeper")


def _validate_owner_shopkeeper(user: models.User) -> None:
    if user.role != models.UserRole.SHOPKEEPER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Shopkeeper access required")
    if not user.siret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shopkeeper SIRET is missing")
    if not insee.validate_siret_format(user.siret):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid SIRET format")


def get_or_create_shop(db: Session, user: models.User) -> models.Shop:
    _validate_owner_shopkeeper(user)

    shop = db.query(models.Shop).filter(models.Shop.owner_user_id == user.id).first()
    if shop:
        return shop

    shop = models.Shop(
        owner_user_id=user.id,
        name=user.shop_name or "Unnamed Shop",
        siret=user.siret,
        address=user.shop_address,
        inventory_costs={},
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


def _encode_inventory_costs(inventory_costs: Dict[str, schemas.InventoryCostItem]) -> Dict[str, dict]:
    encoded = {}
    for item_name, payload in inventory_costs.items():
        encoded[item_name] = {
            "cost_price": float(payload.cost_price),
            "unit": payload.unit,
            "currency": payload.currency,
        }
    return encoded


def _decode_inventory_costs(inventory_costs: Optional[dict]) -> Dict[str, schemas.InventoryCostItem]:
    decoded: Dict[str, schemas.InventoryCostItem] = {}
    for item_name, payload in (inventory_costs or {}).items():
        if isinstance(payload, dict):
            decoded[item_name] = schemas.InventoryCostItem(
                cost_price=Decimal(str(payload.get("cost_price", 0))),
                unit=payload.get("unit"),
                currency=payload.get("currency", "EUR"),
            )
        elif isinstance(payload, (int, float, Decimal, str)):
            try:
                decoded[item_name] = schemas.InventoryCostItem(
                    cost_price=Decimal(str(payload)),
                    unit="piece",
                    currency="EUR",
                )
            except Exception:
                pass
    return decoded


def _set_shop_location(shop: models.Shop, latitude: Optional[float], longitude: Optional[float]) -> None:
    if latitude is None or longitude is None:
        return
    shop.location = WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def _ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _generate_unique_qr_token(db: Session, length: int = 6) -> str:
    while True:
        token = f"{secrets.randbelow(10 ** length):0{length}d}"
        exists = db.query(models.Claim.id).filter(models.Claim.qr_token == token).first()
        if not exists:
            return token


def _extract_coordinates(point_value) -> Tuple[Optional[float], Optional[float]]:
    return student_portal._extract_point_coordinates(point_value)


def upsert_inventory_costs(
    db: Session,
    current_user: models.User,
    payload: schemas.InventoryCostsUpsert,
) -> models.Shop:
    shop = get_or_create_shop(db, current_user)
    if payload.inventory_costs:
        shop.inventory_costs = _encode_inventory_costs(payload.inventory_costs)
    if payload.address:
        shop.address = payload.address
        current_user.shop_address = payload.address
        db.add(current_user)
    _set_shop_location(shop, payload.latitude, payload.longitude)
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


async def search_verified_students_near_shop(db: Session, shop: models.Shop, radius_meters: int = 1000) -> List[models.StudentLocation]:
    if not shop.location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shop location is missing. Store latitude/longitude before sending pulses.",
        )

    return (
        db.query(models.StudentLocation)
        .join(models.User, models.User.id == models.StudentLocation.student_user_id)
        .filter(models.User.is_verified.is_(True))
        .filter(models.User.role == models.UserRole.STUDENT.value)
        .filter(func.ST_DWithin(models.StudentLocation.location, shop.location, radius_meters))
        .all()
    )


async def create_pulse(
    db: Session,
    current_user: models.User,
    payload: schemas.PulseCreate,
) -> Tuple[models.Pulse, int]:
    shop = get_or_create_shop(db, current_user)

    if payload.cost_price is not None:
        costs = dict(shop.inventory_costs or {})
        costs[payload.item_name] = {
            "cost_price": float(payload.cost_price),
            "unit": "unit",
            "currency": "EUR",
        }
        shop.inventory_costs = costs
        db.add(shop)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=60)

    pulse = models.Pulse(
        shop_id=shop.id,
        type=models.PulseType.DONATION if payload.is_donation else models.PulseType.WHOLESALE,
        item_name=payload.item_name,
        description=payload.description,
        is_donation=payload.is_donation,
        quantity=payload.quantity,
        quantity_remaining=payload.quantity,
        expires_at=expires_at,
    )
    db.add(pulse)
    db.commit()
    db.refresh(pulse)

    nearby_students = await search_verified_students_near_shop(db, shop)
    push_tokens = [student.push_token for student in nearby_students if student.push_token]
    await fcm_service.send_push_notifications(
        push_tokens,
        title=f"New surplus available: {payload.item_name}",
        body=f"{payload.quantity} item(s) available at {shop.name}",
        data={
            "pulse_id": str(pulse.id),
            "shop_id": str(shop.id),
            "is_donation": str(payload.is_donation).lower(),
        },
    )

    return pulse, len(push_tokens)


async def create_student_claim(
    db: Session,
    current_user: models.User,
    pulse_id: UUID,
    quantity: int,
) -> models.Claim:
    claim = await student_portal.create_claim(db, current_user, pulse_id, SessionLocal)
    return claim


async def validate_claim(
    db: Session,
    current_user: models.User,
    qr_token: str,
) -> models.Claim:
    shop = get_or_create_shop(db, current_user)
    claim = (
        db.query(models.Claim)
        .filter((models.Claim.qr_token == qr_token) | (models.Claim.qr_code_token == qr_token))
        .filter(models.Claim.shop_id == shop.id)
        .first()
    )
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending claim not found for this shop")

    now = datetime.now(timezone.utc)
    if claim.expires_at and _ensure_aware_utc(claim.expires_at) <= now:
        claim.status = models.ClaimStatus.GHOSTED.value
        claim.ghosted_at = now
        db.add(claim)
        db.commit()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Claim token has expired")

    if claim.status != models.ClaimStatus.PENDING.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Claim has already been processed")

    claim.status = models.ClaimStatus.COLLECTED.value
    claim.collected_at = now
    db.add(claim)
    db.commit()
    db.refresh(claim)

    await karma_engine.cancel_claim_tasks(claim.id)
    return claim


def _get_inventory_cost(shop: models.Shop, item_name: str) -> Decimal:
    inventory_costs = shop.inventory_costs or {}
    payload = inventory_costs.get(item_name)
    if not payload:
        # Try case-insensitive or substring match against known keys
        item_lower = (item_name or "").lower()
        for k, v in inventory_costs.items():
            if k.lower() in item_lower or item_lower in k.lower():
                payload = v
                break
    if not payload:
        return Decimal("0.85")
    if isinstance(payload, dict):
        return Decimal(str(payload.get("cost_price", 0.85)))
    return Decimal(str(payload))


def get_bakery_history(db: Session, current_user: models.User) -> schemas.BakeryHistoryResponse:
    """Return complete bakery dashboard history: pulses, student claims, KPIs, and shop profile."""
    shop = get_or_create_shop(db, current_user)
    now = datetime.now(timezone.utc)
    lat, lng = _extract_coordinates(shop.location)

    pulses_rows = (
        db.query(models.Pulse)
        .filter(models.Pulse.shop_id == shop.id)
        .order_by(models.Pulse.created_at.desc())
        .all()
    )

    pulses_list: List[schemas.BakeryPulseHistoryItem] = []
    active_pulses_count = 0
    total_posted_tax_credit = 0.0
    for p in pulses_rows:
        exp = _ensure_aware_utc(p.expires_at)
        is_active = exp > now and (p.quantity_remaining or 0) > 0
        if is_active:
            active_pulses_count += 1
        unit_cost = float(_get_inventory_cost(shop, p.item_name))
        tax_deduction_val = round((p.quantity or 0) * unit_cost * 0.60, 2)
        total_posted_tax_credit += tax_deduction_val
        pulses_list.append(
            schemas.BakeryPulseHistoryItem(
                pulse_id=p.id,
                item_name=p.item_name,
                description=p.description,
                quantity=p.quantity,
                quantity_remaining=p.quantity_remaining or 0,
                cost_price=unit_cost,
                tax_deduction_value=tax_deduction_val,
                is_donation=bool(p.is_donation),
                created_at=_ensure_aware_utc(p.created_at),
                expires_at=exp,
                is_active=is_active,
            )
        )

    claim_rows = (
        db.query(models.Claim, models.Pulse, models.User)
        .outerjoin(models.Pulse, models.Pulse.id == models.Claim.pulse_id)
        .outerjoin(models.User, models.User.id == models.Claim.student_user_id)
        .filter(models.Claim.shop_id == shop.id)
        .order_by(models.Claim.claimed_at.desc())
        .all()
    )

    claims_list: List[schemas.BakeryClaimHistoryItem] = []
    collected_count = 0
    pending_count = 0
    ghosted_count = 0
    total_baskets_donated = 0

    for claim, pulse, student in claim_rows:
        status_str = student_portal._normalize_claim_status(claim.status)
        if status_str == models.ClaimStatus.COLLECTED.value:
            collected_count += 1
            total_baskets_donated += claim.quantity or 1
        elif status_str == models.ClaimStatus.GHOSTED.value:
            ghosted_count += 1
        else:
            pending_count += 1

        claims_list.append(
            schemas.BakeryClaimHistoryItem(
                claim_id=claim.id,
                pulse_id=claim.pulse_id,
                item_name=pulse.item_name if pulse else "Surplus Basket",
                student_email=student.email if student else "student@univ-paris.fr",
                student_name=getattr(student, "full_name", None) if student else None,
                student_university=getattr(student, "university", None) if student else None,
                quantity=claim.quantity or 1,
                status=status_str,
                qr_code_token=claim.qr_code_token or claim.qr_token,
                claimed_at=_ensure_aware_utc(claim.claimed_at),
                claim_deadline=_ensure_aware_utc(claim.claim_deadline),
                collected_at=_ensure_aware_utc(claim.collected_at) if claim.collected_at else None,
                ghosted_at=_ensure_aware_utc(claim.ghosted_at) if claim.ghosted_at else None,
            )
        )

    # Estimate 60% CGI Art. 238 bis tax credit across the bakery's items
    estimated_tax_credit = round(total_posted_tax_credit, 2)

    return schemas.BakeryHistoryResponse(
        shop_id=shop.id,
        shop_name=shop.name,
        shop_address=shop.address,
        siret=shop.siret,
        email=current_user.email,
        phone=getattr(current_user, "phone", None),
        bio=getattr(current_user, "bio", None),
        latitude=lat,
        longitude=lng,
        total_pulses=len(pulses_list),
        active_pulses_count=active_pulses_count,
        total_claims=len(claims_list),
        collected_claims_count=collected_count,
        pending_claims_count=pending_count,
        ghosted_claims_count=ghosted_count,
        total_baskets_donated=total_baskets_donated,
        estimated_tax_credit_eur=estimated_tax_credit,
        pulses=pulses_list,
        claims=claims_list,
    )


def update_pulse(
    db: Session,
    current_user: models.User,
    pulse_id: UUID,
    payload: schemas.PulseUpdate,
) -> schemas.BakeryPulseHistoryItem:
    """Update a bakery surplus pulse/item and its internal Cerfa tax unit cost price."""
    shop = get_or_create_shop(db, current_user)
    pulse = (
        db.query(models.Pulse)
        .filter(models.Pulse.id == pulse_id, models.Pulse.shop_id == shop.id)
        .first()
    )
    if not pulse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surplus item/pulse not found for your bakery",
        )

    old_name = pulse.item_name
    if payload.item_name is not None and payload.item_name.strip():
        pulse.item_name = payload.item_name.strip()

    if payload.description is not None:
        pulse.description = payload.description.strip()

    if payload.quantity is not None:
        pulse.quantity = payload.quantity

    if payload.quantity_remaining is not None:
        pulse.quantity_remaining = payload.quantity_remaining

    now = datetime.now(timezone.utc)
    if payload.extend_minutes is not None and payload.extend_minutes > 0:
        base_time = max(now, _ensure_aware_utc(pulse.expires_at))
        pulse.expires_at = base_time + timedelta(minutes=payload.extend_minutes)
    elif (pulse.quantity_remaining or 0) > 0 and _ensure_aware_utc(pulse.expires_at) <= now:
        # Automatically reactivate for 60 minutes if quantity_remaining is set > 0 on an expired item
        pulse.expires_at = now + timedelta(minutes=60)

    if payload.cost_price is not None:
        costs = dict(shop.inventory_costs or {})
        if old_name != pulse.item_name and old_name in costs:
            costs.pop(old_name, None)
        costs[pulse.item_name] = {
            "cost_price": float(payload.cost_price),
            "unit": "unit",
            "currency": "EUR",
        }
        shop.inventory_costs = costs
        db.add(shop)
    elif old_name != pulse.item_name:
        costs = dict(shop.inventory_costs or {})
        if old_name in costs:
            costs[pulse.item_name] = costs.pop(old_name)
            shop.inventory_costs = costs
            db.add(shop)

    db.add(pulse)
    db.commit()
    db.refresh(pulse)
    db.refresh(shop)

    exp = _ensure_aware_utc(pulse.expires_at)
    is_active = exp > now and (pulse.quantity_remaining or 0) > 0
    unit_cost = float(_get_inventory_cost(shop, pulse.item_name))
    tax_deduction_val = round((pulse.quantity or 0) * unit_cost * 0.60, 2)

    return schemas.BakeryPulseHistoryItem(
        pulse_id=pulse.id,
        item_name=pulse.item_name,
        description=pulse.description,
        quantity=pulse.quantity,
        quantity_remaining=pulse.quantity_remaining or 0,
        cost_price=unit_cost,
        tax_deduction_value=tax_deduction_val,
        is_donation=bool(pulse.is_donation),
        created_at=_ensure_aware_utc(pulse.created_at),
        expires_at=exp,
        is_active=is_active,
    )


def delete_pulse(
    db: Session,
    current_user: models.User,
    pulse_id: UUID,
) -> dict:
    """Delete a bakery surplus item/pulse and any dependent claims."""
    shop = get_or_create_shop(db, current_user)
    pulse = (
        db.query(models.Pulse)
        .filter(models.Pulse.id == pulse_id, models.Pulse.shop_id == shop.id)
        .first()
    )
    if not pulse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surplus item/pulse not found for your bakery",
        )

    item_name = pulse.item_name
    db.query(models.Claim).filter(models.Claim.pulse_id == pulse.id).delete()
    db.delete(pulse)
    db.commit()
    return {"deleted": True, "pulse_id": str(pulse_id), "item_name": item_name}


def update_bakery_profile(
    db: Session,
    current_user: models.User,
    payload: schemas.BakeryProfileUpdate,
) -> models.User:
    """Update bakery shopkeeper profile and shop details in PostgreSQL."""
    shop = get_or_create_shop(db, current_user)

    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    if payload.email is not None and payload.email.strip():
        new_email = payload.email.strip().lower()
        if new_email != current_user.email:
            existing = (
                db.query(models.User)
                .filter(models.User.email == new_email, models.User.id != current_user.id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already in use by another account",
                )
            current_user.email = new_email

    if payload.shop_name is not None and payload.shop_name.strip():
        shop.name = payload.shop_name.strip()
        current_user.shop_name = payload.shop_name.strip()

    if payload.shop_address is not None and payload.shop_address.strip():
        shop.address = payload.shop_address.strip()
        current_user.shop_address = payload.shop_address.strip()

    if payload.phone is not None:
        current_user.phone = payload.phone.strip()

    if payload.bio is not None:
        current_user.bio = payload.bio.strip()

    if payload.latitude is not None and payload.longitude is not None:
        _set_shop_location(shop, payload.latitude, payload.longitude)

    if payload.new_password and payload.new_password.strip():
        if len(payload.new_password.strip()) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long",
            )
        current_user.hashed_password = auth.get_password_hash(payload.new_password.strip())

    db.add(shop)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


def generate_cerfa_report(
    db: Session,
    shop_id: UUID,
    year: int,
    month: int,
) -> Tuple[models.TaxReport, str]:
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    if not insee.validate_siret_format(shop.siret):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid shop SIRET")

    collected_claims = (
        db.query(models.Claim, models.Pulse)
        .join(models.Pulse, models.Pulse.id == models.Claim.pulse_id)
        .filter(models.Claim.shop_id == shop_id)
        .filter(models.Claim.status == models.ClaimStatus.COLLECTED.value)
        .filter(func.extract("year", models.Claim.collected_at) == year)
        .filter(func.extract("month", models.Claim.collected_at) == month)
        .all()
    )

    line_items = []
    total_value = Decimal("0.00")
    total_items = 0
    for claim, pulse in collected_claims:
        unit_cost = _get_inventory_cost(shop, pulse.item_name)
        line_value = unit_cost * Decimal(str(claim.quantity))
        total_value += line_value
        total_items += claim.quantity
        line_items.append(
            {
                "item_name": pulse.item_name,
                "quantity": claim.quantity,
                "unit_cost": float(unit_cost),
                "line_value": float(line_value),
            }
        )

    cerfa_payload = {
        "cerfa": "11580*05",
        "legal_mention": "Article 238 bis du CGI",
        "shop": {
            "siret": shop.siret,
            "name": shop.name,
            "address": shop.address,
        },
        "period": {"year": year, "month": month},
        "totals": {
            "items_count": total_items,
            "total_donated_value": float(total_value),
        },
        "line_items": line_items,
    }

    existing_report = (
        db.query(models.TaxReport)
        .filter(models.TaxReport.shop_id == shop_id)
        .filter(models.TaxReport.year == year)
        .filter(models.TaxReport.month == month)
        .first()
    )
    if existing_report:
        existing_report.total_donated_value = float(total_value)
        existing_report.items_count = total_items
        existing_report.cerfa_payload = cerfa_payload
        report = existing_report
    else:
        report = models.TaxReport(
            shop_id=shop_id,
            year=year,
            month=month,
            total_donated_value=float(total_value),
            items_count=total_items,
            cerfa_payload=cerfa_payload,
        )
        db.add(report)
    db.commit()
    db.refresh(report)

    temp_dir = tempfile.gettempdir()
    pdf_filename = f"cerfa_{shop.siret}_{year}_{month:02d}.pdf"
    pdf_path = os.path.join(temp_dir, pdf_filename)
    _build_cerfa_pdf(pdf_path, cerfa_payload)
    return report, pdf_path


def _build_cerfa_pdf(pdf_path: str, cerfa_payload: Dict) -> None:
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    story = []

    story.append(Paragraph("CERFA 11580*05 - Donation Certificate", styles["Title"]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Legal mention: Article 238 bis du CGI", styles["Normal"]))
    story.append(Spacer(1, 4 * mm))
    shop = cerfa_payload["shop"]
    story.append(Paragraph(f"Shop SIRET: {shop['siret']}", styles["Normal"]))
    story.append(Paragraph(f"Shop name: {shop['name']}", styles["Normal"]))
    story.append(Paragraph(f"Shop address: {shop['address'] or 'N/A'}", styles["Normal"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(f"Period: {cerfa_payload['period']['month']:02d}/{cerfa_payload['period']['year']}", styles["Normal"]))
    story.append(Paragraph(f"Total monthly donation value: €{cerfa_payload['totals']['total_donated_value']:.2f}", styles["Normal"]))
    story.append(Spacer(1, 8 * mm))

    table_data = [["Item", "Qty", "Unit Cost (€)", "Line Value (€)"]]
    for line in cerfa_payload["line_items"]:
        table_data.append([
            line["item_name"],
            str(line["quantity"]),
            f"{line['unit_cost']:.2f}",
            f"{line['line_value']:.2f}",
        ])

    if len(table_data) == 1:
        table_data.append(["No collected claims found", "0", "0.00", "0.00"])

    table = Table(table_data, colWidths=[70 * mm, 20 * mm, 35 * mm, 35 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("This certificate follows the donation recognition logic required for French tax reporting.", styles["Italic"]))
    doc.build(story)
