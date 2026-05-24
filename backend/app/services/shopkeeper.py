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

from .. import models, schemas
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
        decoded[item_name] = schemas.InventoryCostItem(
            cost_price=Decimal(str(payload.get("cost_price", 0))),
            unit=payload.get("unit"),
            currency=payload.get("currency", "EUR"),
        )
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
    if not point_value:
        return None, None
    try:
        text_value = getattr(point_value, "desc", None) or getattr(point_value, "data", None) or str(point_value)
        if text_value.startswith("010100"):
            return None, None
    except Exception:
        return None, None
    return None, None


def upsert_inventory_costs(
    db: Session,
    current_user: models.User,
    payload: schemas.InventoryCostsUpsert,
) -> models.Shop:
    shop = get_or_create_shop(db, current_user)
    shop.inventory_costs = _encode_inventory_costs(payload.inventory_costs)
    if payload.address:
        shop.address = payload.address
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
        return Decimal("0.00")
    return Decimal(str(payload.get("cost_price", 0)))


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
