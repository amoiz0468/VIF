import logging
import json
import os
import re
import tempfile
from io import BytesIO
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from geoalchemy2.elements import WKTElement
import httpx
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
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")


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

    # Primary OCR path: Docling DocumentConverter
    temp_path: Optional[str] = None
    try:
        from docling.document_converter import DocumentConverter  # type: ignore

        suffix = ".png"
        if upload.filename and "." in upload.filename:
            suffix = f".{upload.filename.rsplit('.', 1)[-1]}"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        converter = DocumentConverter()
        result = converter.convert(temp_path)
        output_text = result.document.export_to_markdown()
        if output_text:
            return output_text
    except Exception:
        # Fall back to pytesseract/plain decode when Docling is unavailable
        log.exception("Docling OCR extraction failed; falling back to secondary extractor")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

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


def _parse_date_token(value: str, *, prefer_end_of_month: bool = False) -> Optional[date]:
    cleaned = value.strip().replace(".", "/").replace("-", "/")
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y/%m/%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue

    month_year = re.fullmatch(r"(\d{1,2})/(\d{4})", cleaned)
    if month_year:
        month = int(month_year.group(1))
        year = int(month_year.group(2))
        if 1 <= month <= 12:
            day = monthrange(year, month)[1] if prefer_end_of_month else 1
            return date(year, month, day)

    return None


def _extract_json_object(content: str) -> Optional[dict]:
    try:
        return json.loads(content)
    except Exception:
        pass

    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(content[start : end + 1])
    except Exception:
        return None


def _record_ocr_output(extracted_text: str) -> None:
    normalized_preview = re.sub(r"\s+", " ", (extracted_text or "")).strip()
    log.info("OCR output captured | chars=%d | preview=%s", len(extracted_text or ""), normalized_preview[:500])

    if os.getenv("OCR_DEBUG_SAVE_TEXT", "false").lower() != "true":
        return

    debug_dir = os.getenv("OCR_DEBUG_DIR", tempfile.gettempdir())
    try:
        os.makedirs(debug_dir, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        path = os.path.join(debug_dir, f"ocr_output_{timestamp}.txt")
        with open(path, "w", encoding="utf-8") as file:
            file.write(extracted_text or "")
        log.info("OCR output saved for debugging at %s", path)
    except Exception:
        log.exception("Failed to save OCR debug output")


async def _llm_correct_student_card_dates(
    extracted_text: str,
) -> Tuple[Optional[date], Optional[date]]:
    if not OPENROUTER_API_KEY:
        return None, None

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract student card validity dates from OCR text. "
                    "Return strict JSON only with keys: start_date, end_date. "
                    "Use ISO format YYYY-MM-DD or null."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "task": "Extract and correct student card validity dates from OCR output.",
                        "ocr_text": extracted_text,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "temperature": 0,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        parsed = _extract_json_object(content) or {}

        llm_start = _parse_date_token(str(parsed.get("start_date"))) if parsed.get("start_date") else None
        llm_end = _parse_date_token(str(parsed.get("end_date")), prefer_end_of_month=True) if parsed.get("end_date") else None

        return llm_start, llm_end
    except Exception:
        log.exception("OpenRouter correction failed; no card dates extracted")
        return None, None


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
    _record_ocr_output(extracted_text)
    matched_keywords = _find_verification_keywords(extracted_text)
    start_date, end_date = await _llm_correct_student_card_dates(extracted_text)
    today = datetime.now(timezone.utc).date()

    current_user.student_card_start_date = start_date
    current_user.student_card_end_date = end_date

    if not end_date:
        current_user.is_verified = False
        current_user.id_verification_status = "manual_review"
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return schemas.StudentIdVerificationResponse(
            verified=False,
            manual_review=True,
            status="manual_review",
            matched_keywords=matched_keywords,
            extracted_start_date=start_date,
            extracted_end_date=end_date,
            message="Could not read the student card end date. Please upload a clearer card image.",
        )

    if start_date and start_date > today:
        current_user.is_verified = False
        current_user.id_verification_status = "manual_review"
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return schemas.StudentIdVerificationResponse(
            verified=False,
            manual_review=True,
            status="manual_review",
            matched_keywords=matched_keywords,
            extracted_start_date=start_date,
            extracted_end_date=end_date,
            message="The student card start date is in the future and needs manual review.",
        )

    if end_date < today:
        current_user.is_verified = False
        current_user.id_verification_status = "expired"
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return schemas.StudentIdVerificationResponse(
            verified=False,
            manual_review=False,
            status="expired",
            matched_keywords=matched_keywords,
            extracted_start_date=start_date,
            extracted_end_date=end_date,
            message="Student card is expired.",
        )

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
        extracted_start_date=start_date,
        extracted_end_date=end_date,
        message="Student card is currently valid. Verification is enabled.",
    )


async def get_active_claim(db: Session, current_user: models.User) -> Optional[models.Claim]:
    """Return the student's current pending claim, or None if no active claim exists."""
    return (
        db.query(models.Claim)
        .filter(models.Claim.student_user_id == current_user.id)
        .filter(models.Claim.status == models.ClaimStatus.PENDING.value)
        .first()
    )


def register_location(
    db: Session,
    current_user: models.User,
    latitude: float,
    longitude: float,
    push_token: Optional[str] = None,
) -> models.StudentLocation:
    """Create or update the student's location and push token for proximity notifications."""
    point = _student_point(latitude, longitude)

    existing = (
        db.query(models.StudentLocation)
        .filter(models.StudentLocation.student_user_id == current_user.id)
        .first()
    )

    if existing:
        existing.location = point
        if push_token is not None:
            existing.push_token = push_token
        existing.is_verified = current_user.is_verified or False
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    student_location = models.StudentLocation(
        student_user_id=current_user.id,
        location=point,
        push_token=push_token,
        is_verified=current_user.is_verified or False,
    )
    db.add(student_location)
    db.commit()
    db.refresh(student_location)
    return student_location
