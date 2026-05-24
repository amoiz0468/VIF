import logging
import re
from io import BytesIO
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func
from sqlalchemy.orm import Session, sessionmaker

from .. import models, schemas
from . import karma_engine

log = logging.getLogger("vif.student_portal")
PRIORITY_WINDOW_MINUTES = 10
CLAIM_WINDOW_MINUTES = 20
FEED_RADIUS_METERS = 1000

KEYWORD_PATTERNS = (
    "ETUDIANT",
    "STUDENT",
    "IZLY",
    "PASS CULTURE",
)


def _ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _student_point(latitude: float, longitude: float) -> WKTElement:
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def _academic_year_tokens(now: Optional[datetime] = None) -> Tuple[str, str, str]:
    current = now or datetime.now(timezone.utc)
    if current.month >= 9:
        start_year = current.year
    else:
        start_year = current.year - 1
    end_year = start_year + 1
    return (
        str(start_year),
        f"{start_year}-{end_year}",
        f"{start_year}/{end_year}",
    )


async def _extract_ocr_text(upload: UploadFile) -> str:
    file_bytes = await upload.read()
    if not file_bytes:
        return ""

    try:
        from PIL import Image  # type: ignore
        import pytesseract  # type: ignore
    except Exception:
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    try:
        image = Image.open(BytesIO(file_bytes))
    except Exception:
        return ""

    try:
        return pytesseract.image_to_string(image)
    except Exception:
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""


def _find_verification_keywords(extracted_text: str) -> List[str]:
    normalized_text = extracted_text.upper()
    matches: List[str] = []

    for keyword in KEYWORD_PATTERNS:
        if keyword in normalized_text:
            matches.append(keyword)

    for year_token in _academic_year_tokens():
        if year_token.upper() in normalized_text:
            matches.append(year_token)

    return matches


async def get_nearby_pulses(db: Session, current_user: models.User, latitude: float, longitude: float) -> List[schemas.NearbyPulseResponse]:
    current_time = datetime.now(timezone.utc)
    priority_cutoff = current_time - timedelta(minutes=PRIORITY_WINDOW_MINUTES)
    student_point = _student_point(latitude, longitude)

    rows = (
        db.query(
            models.Pulse,
            models.Shop,
            func.ST_Distance(models.Shop.location, student_point).label("distance_meters"),
        )
        .join(models.Shop, models.Shop.id == models.Pulse.shop_id)
        .filter(models.Pulse.quantity_remaining > 0)
        .filter(models.Pulse.expires_at > current_time)
        .filter(models.Shop.location.isnot(None))
        .filter(func.ST_DWithin(models.Shop.location, student_point, FEED_RADIUS_METERS))
        .order_by(func.ST_Distance(models.Shop.location, student_point).asc())
        .all()
    )

    results: List[schemas.NearbyPulseResponse] = []
    for pulse, shop, distance_meters in rows:
        created_at = _ensure_aware_utc(pulse.created_at)
        priority_window_active = created_at >= priority_cutoff
        if priority_window_active and not current_user.is_verified:
            continue

        results.append(
            schemas.NearbyPulseResponse(
                pulse_id=pulse.id,
                shop_id=shop.id,
                shop_name=shop.name,
                shop_address=shop.address,
                item_name=pulse.item_name,
                description=pulse.description,
                quantity_remaining=pulse.quantity_remaining,
                created_at=created_at,
                expires_at=_ensure_aware_utc(pulse.expires_at),
                distance_meters=float(distance_meters or 0.0),
                priority_window_active=priority_window_active,
            )
        )

    return results


async def create_claim(db: Session, current_user: models.User, pulse_id: UUID, session_factory: sessionmaker) -> models.Claim:
    if current_user.role != models.UserRole.STUDENT.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")

    if (current_user.karma_score or 0) < 30:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account locked due to ghosting")

    now = datetime.now(timezone.utc)
    claim_deadline = now + timedelta(minutes=CLAIM_WINDOW_MINUTES)
    try:
        db.query(models.User).filter(models.User.id == current_user.id).with_for_update().one_or_none()
        pulse = (
            db.query(models.Pulse)
            .filter(models.Pulse.id == pulse_id)
            .with_for_update()
            .one_or_none()
        )
        if not pulse:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pulse not found")

        if _ensure_aware_utc(pulse.expires_at) <= now:
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="This pulse has expired")

        if (pulse.quantity_remaining or 0) <= 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No quantity remaining for this pulse")

        active_claim = (
            db.query(models.Claim)
            .filter(models.Claim.student_user_id == current_user.id)
            .filter(models.Claim.status == models.ClaimStatus.PENDING.value)
            .with_for_update()
            .first()
        )
        if active_claim:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only one active reservation allowed at a time")

        # Prevent re-claiming the same pulse if already collected
        already_collected = (
            db.query(models.Claim)
            .filter(models.Claim.student_user_id == current_user.id)
            .filter(models.Claim.pulse_id == pulse_id)
            .filter(models.Claim.status == models.ClaimStatus.COLLECTED.value)
            .with_for_update()
            .first()
        )
        if already_collected:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already collected from this pulse")

        pulse.quantity_remaining = (pulse.quantity_remaining or 0) - 1
        qr_code_token = str(uuid4())
        claim = models.Claim(
            shop_id=pulse.shop_id,
            pulse_id=pulse.id,
            student_user_id=current_user.id,
            qr_token=qr_code_token,
            qr_code_token=qr_code_token,
            quantity=1,
            status=models.ClaimStatus.PENDING.value,
            claimed_at=now,
            claim_deadline=claim_deadline,
            expires_at=claim_deadline,
        )
        db.add(pulse)
        db.add(claim)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(claim)
    karma_engine.schedule_claim_penalty(session_factory, claim.id, claim.claim_deadline)
    return claim


async def verify_student_id(db: Session, current_user: models.User, upload: UploadFile) -> schemas.StudentIdVerificationResponse:
    extracted_text = await _extract_ocr_text(upload)
    matched_keywords = _find_verification_keywords(extracted_text)

    # Temporary product behavior: any uploaded image marks the student as verified.
    current_user.is_verified = True
    current_user.id_verification_status = "verified"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return schemas.StudentIdVerificationResponse(
        verified=True,
        manual_review=False,
        status="verified",
        matched_keywords=matched_keywords,
        message="Student ID upload accepted. Verification is enabled.",
    )
