import logging
import json
import os
import re
import struct
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
    "ÉTUDIANT",
    "STUDENT",
    "IZLY",
    "PASS CULTURE",
    "UNIVERSITE",
    "UNIVERSITÉ",
    "CAMPUS",
    "EPITECH",
    "ECOLE",
    "ÉCOLE",
    "FACULTE",
    "FACULTÉ",
    "CARTE D'ETUDIANT",
    "CARTE D'ÉTUDIANT",
    "CARTE ETUDIANT",
    "CARTE ÉTUDIANT",
    "SCOLARITE",
    "SCOLARITÉ",
    "ENSEIGNEMENT",
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


def _extract_point_coordinates(point_value) -> Tuple[Optional[float], Optional[float]]:
    """Extract (latitude, longitude) from WKTElement, WKBElement, or raw bytes."""
    if not point_value:
        return None, None
    data = getattr(point_value, "data", None) or point_value
    if isinstance(data, memoryview):
        data = bytes(data)
    if isinstance(data, (bytes, bytearray)):
        if len(data) >= 21:
            byte_order = "<" if data[0] == 1 else ">"
            geom_type = struct.unpack(f"{byte_order}I", data[1:5])[0]
            offset = 5
            # If EWKB has SRID flag (0x20000000)
            if geom_type & 0x20000000:
                offset += 4
            x, y = struct.unpack(f"{byte_order}dd", data[offset : offset + 16])
            return float(y), float(x)
    elif isinstance(data, str):
        match = re.search(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)", data, re.IGNORECASE)
        if match:
            return float(match.group(2)), float(match.group(1))
    return None, None


def _academic_year_tokens(now: Optional[datetime] = None) -> Tuple[str, ...]:
    current = now or datetime.now(timezone.utc)
    if current.month >= 9:
        start_year = current.year
    else:
        start_year = current.year - 1
    end_year = start_year + 1
    tokens = [
        str(start_year),
        str(end_year),
        f"{start_year}-{end_year}",
        f"{start_year}/{end_year}",
        # Fall transition: students holding card from the preceding year (e.g. 2025-2026 in fall 2026)
        f"{start_year - 1}-{start_year}",
        f"{start_year - 1}/{start_year}",
    ]
    return tuple(tokens)


async def _extract_ocr_text(upload: UploadFile) -> str:
    file_bytes = await upload.read()
    if not file_bytes:
        return ""
    try:
        await upload.seek(0)
    except Exception:
        pass

    # 1. Primary OCR path: Docling DocumentConverter (if installed)
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
        if output_text and output_text.strip():
            return output_text
    except ImportError:
        pass
    except Exception as exc:
        log.debug("Docling OCR extraction failed: %s", exc)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

    # 2. Secondary OCR path: Pytesseract with Pillow image preprocessing
    try:
        from PIL import Image, ImageEnhance  # type: ignore
        import pytesseract  # type: ignore

        image = Image.open(BytesIO(file_bytes))
        # Pre-process for better OCR detection
        gray = image.convert("L")
        if gray.width < 1200:
            scale = 1200.0 / gray.width
            gray = gray.resize((int(gray.width * scale), int(gray.height * scale)), Image.Resampling.LANCZOS)
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.8)

        # Try fra+eng first, fallback to eng or default
        try:
            text = pytesseract.image_to_string(enhanced, lang="fra+eng")
        except pytesseract.TesseractError:
            try:
                text = pytesseract.image_to_string(enhanced, lang="eng")
            except Exception:
                text = pytesseract.image_to_string(enhanced)

        if text and text.strip():
            return text
    except ImportError:
        log.warning("Pillow or pytesseract not available.")
    except Exception as exc:
        if "TesseractNotFoundError" in type(exc).__name__:
            log.warning("Tesseract binary not installed on system PATH. Install it via: sudo dnf install tesseract tesseract-langpack-fra")
        else:
            log.warning("Pytesseract OCR failed: %s", exc)

    # 3. Fallback to plain utf-8 decode (for mock payloads in tests)
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


def _extract_card_dates_locally(extracted_text: str, now: Optional[datetime] = None) -> Tuple[Optional[date], Optional[date]]:
    """
    Extracts start and end validity dates from student card OCR text.
    Handles French and International university formats without requiring an external LLM:
    - Academic year spans: '2024-2025', '2025/2026', '2025-26', '2025 / 2026'
    - Expiration phrases: 'Valable jusqu'au 31/08/2025', 'Expire le: 30/09/2025', 'Validité: 08/2026'
    - Date ranges: 'Du 01/09/2024 au 31/08/2025'
    - Single academic years: 'Année 2025', 'Promo 2026'
    """
    if not extracted_text:
        return None, None

    normalized = extracted_text.upper()

    # 1. Academic year spans: 4-digit year to 4-digit year (e.g. 2024-2025, 2025-2026)
    span_matches = re.findall(r"\b(20\d{2})\s*[-/–—]\s*(20\d{2})\b", normalized)
    for y1_str, y2_str in span_matches:
        y1, y2 = int(y1_str), int(y2_str)
        if y2 == y1 + 1 or y2 == y1:
            return date(y1, 9, 1), date(y2, 12, 31)

    # 2. Academic year spans: 4-digit year to 2-digit year (e.g. 2024-25, 2025/26)
    short_span_matches = re.findall(r"\b(20\d{2})\s*[-/–—]\s*(\d{2})\b", normalized)
    for y1_str, y2_str in short_span_matches:
        y1 = int(y1_str)
        y2 = int(y1_str[:2] + y2_str)
        if y2 == y1 + 1:
            return date(y1, 9, 1), date(y2, 12, 31)

    # 3. Explicit expiration / validity phrases
    expiry_patterns = [
        r"(?:JUSQU[\'\s]*AU|VALIDE\s+AU|EXPIRE\s+LE|EXPIRATION|VALIDIT[EÉ]|FIN|ECHEANCE)\D{0,15}(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})",
        r"(?:JUSQU[\'\s]*AU|VALIDE\s+AU|EXPIRE\s+LE|EXPIRATION|VALIDIT[EÉ]|FIN|ECHEANCE)\D{0,15}(\d{1,2}[\/\.-]\d{4})",
    ]
    for pattern in expiry_patterns:
        match = re.search(pattern, normalized)
        if match:
            end_date = _parse_date_token(match.group(1), prefer_end_of_month=True)
            if end_date:
                start_year = end_date.year - 1 if end_date.month <= 10 else end_date.year
                return date(start_year, 9, 1), end_date

    # 4. Explicit date ranges: "Du DD/MM/YYYY au DD/MM/YYYY"
    range_match = re.search(
        r"(?:DU\s+)?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(?:AU|A)\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})",
        normalized,
    )
    if range_match:
        d1 = _parse_date_token(range_match.group(1))
        d2 = _parse_date_token(range_match.group(2), prefer_end_of_month=True)
        if d1 and d2:
            return (d1, d2) if d1 <= d2 else (d2, d1)

    # 5. Extract all standard dates found in the text
    raw_dates = []
    for token in re.findall(r"\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}\b", normalized):
        parsed = _parse_date_token(token)
        if parsed and 2020 <= parsed.year <= 2035:
            raw_dates.append(parsed)
    for token in re.findall(r"\b(?:0[1-9]|1[0-2])[\/\.-]20\d{2}\b", normalized):
        parsed = _parse_date_token(token, prefer_end_of_month=True)
        if parsed and 2020 <= parsed.year <= 2035:
            raw_dates.append(parsed)

    if raw_dates:
        raw_dates.sort()
        if len(raw_dates) >= 2:
            return raw_dates[0], raw_dates[-1]
        else:
            single = raw_dates[0]
            start_year = single.year - 1 if single.month <= 10 else single.year
            return date(start_year, 9, 1), single

    # 6. Single academic year keyword match (e.g. "Année 2025", "Promo 2026")
    single_year_match = re.search(r"(?:ANN[EÉ]E|PROMO(?:TION)?|SESSION|INSCRIPTION)\D{0,10}\b(20\d{2})\b", normalized)
    if single_year_match:
        y = int(single_year_match.group(1))
        return date(y - 1, 9, 1), date(y, 10, 31)

    return None, None


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

        shop_lat, shop_lng = _extract_point_coordinates(shop.location)

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
                latitude=shop_lat,
                longitude=shop_lng,
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

    # 1. Try local extraction first (handles academic years and expiration dates)
    start_date, end_date = _extract_card_dates_locally(extracted_text)

    # 2. If local extraction couldn't parse the dates, fallback to LLM (if configured)
    if not end_date:
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


PARTNER_BOULANGERIES_SEED = [
    {
        "email": "poilane.marais@vif-bakery.fr",
        "shop_name": "Boulangerie Poilâne du Marais",
        "shop_address": "38 Rue de Bretagne, 75003 Paris",
        "siret": "31298471000018",
        "lat": 48.8615,
        "lng": 2.3622,
        "item_name": "10 Baguettes de Tradition & Pains au Levain",
        "description": "Baguettes traditionnelles au levain croustillantes, cuites dans l’après-midi.",
        "quantity": 8,
    },
    {
        "email": "landemaine.saintpaul@vif-bakery.fr",
        "shop_name": "Maison Landemaine Saint-Paul",
        "shop_address": "26 Rue des Rosiers, 75004 Paris",
        "siret": "49821735000024",
        "lat": 48.8568,
        "lng": 2.3585,
        "item_name": "8 Croissants & Viennoiseries Pur Beurre",
        "description": "Assortiment de croissants artisanaux, pains au chocolat et brioches.",
        "quantity": 6,
    },
    {
        "email": "tenbelles.bastille@vif-bakery.fr",
        "shop_name": "Ten Belles Bread Bastille",
        "shop_address": "17-19 Rue Breguet, 75011 Paris",
        "siret": "52190843000019",
        "lat": 48.8555,
        "lng": 2.3718,
        "item_name": "Panier Sandwiches & Focaccias Bio",
        "description": "Sandwiches frais au levain naturel, focaccias aux herbes et quiches du jour.",
        "quantity": 5,
    },
    {
        "email": "isabelle.sorbonne@vif-bakery.fr",
        "shop_name": "La Maison d’Isabelle",
        "shop_address": "47ter Bd Saint-Germain, 75005 Paris",
        "siret": "41289301000015",
        "lat": 48.8502,
        "lng": 2.3482,
        "item_name": "Lot de Croissants Primés & Pâtisseries",
        "description": "Croissants pur beurre bio (1er prix Paris) et tartelettes aux fruits.",
        "quantity": 9,
    },
    {
        "email": "rabineau.quartierlatin@vif-bakery.fr",
        "shop_name": "Boulangerie Moderne Rabineau",
        "shop_address": "16 Rue des Fossés Saint-Jacques, 75005 Paris",
        "siret": "38912045000021",
        "lat": 48.8452,
        "lng": 2.3448,
        "item_name": "6 Sandwiches Baguette & Pains Spéciaux",
        "description": "Sandwiches jambon-beurre-emmental et pains complets bio.",
        "quantity": 6,
    },
    {
        "email": "dupainetdesidees.republique@vif-bakery.fr",
        "shop_name": "Du Pain et des Idées",
        "shop_address": "34 Rue Yves Toudic, 75010 Paris",
        "siret": "44109283000012",
        "lat": 48.8710,
        "lng": 2.3628,
        "item_name": "Escargots Chocolat-Pistache & Pain des Amis",
        "description": "Spécialités feuilletées et pavés de pain des amis au levain.",
        "quantity": 7,
    },
    {
        "email": "utopie.republique@vif-bakery.fr",
        "shop_name": "Boulangerie Utopie",
        "shop_address": "20 Rue Jean-Pierre Timbaud, 75011 Paris",
        "siret": "79823410000016",
        "lat": 48.8648,
        "lng": 2.3682,
        "item_name": "Baguettes Charbon & Pâtisseries Créatives",
        "description": "Assortiment de pains spéciaux et viennoiseries artisanales de fin de journée.",
        "quantity": 5,
    },
    {
        "email": "kayser.montparnasse@vif-bakery.fr",
        "shop_name": "Maison Kayser Montparnasse",
        "shop_address": "14 Rue du Départ, 75015 Paris",
        "siret": "40918273000033",
        "lat": 48.8428,
        "lng": 2.3235,
        "item_name": "Panier Repas Étudiant: Sandwich + Dessert",
        "description": "Grand sandwich céréales, flan pâtissier artisanal et petite baguette.",
        "quantity": 10,
    },
    {
        "email": "thierrymarx.vaugirard@vif-bakery.fr",
        "shop_name": "Boulangerie Thierry Marx",
        "shop_address": "51 Rue de Vaugirard, 75015 Paris",
        "siret": "81290345000011",
        "lat": 48.8442,
        "lng": 2.3185,
        "item_name": "Breadmakis & Pains de Campagne Bio",
        "description": "Créations boulangères bio et miches de pain au levain naturel.",
        "quantity": 6,
    },
    {
        "email": "pasteur.docteurroux@vif-bakery.fr",
        "shop_name": "Boulangerie-Pâtisserie Pasteur",
        "shop_address": "25 Boulevard Pasteur, 75015 Paris",
        "siret": "43198276000014",
        "lat": 48.8448,
        "lng": 2.3125,
        "item_name": "12 Baguettes Tradition & Pains au Chocolat",
        "description": "Baguettes traditionnelles chaudes et viennoiseries pur beurre à 200m de l'Institut Pasteur.",
        "quantity": 8,
    },
    {
        "email": "moulindelavierge.volontaires@vif-bakery.fr",
        "shop_name": "Le Moulin de la Vierge Volontaires",
        "shop_address": "105 Rue Vercingétorix / Rue Lecourbe, 75015 Paris",
        "siret": "32891047000028",
        "lat": 48.8458,
        "lng": 2.3068,
        "item_name": "Pains au Levain Bio & Quiches Lorraines",
        "description": "Pains biologiques cuits au four à pierre et parts de quiches artisanales.",
        "quantity": 7,
    },
    {
        "email": "pichard.cambronne@vif-bakery.fr",
        "shop_name": "Maison Pichard Cambronne",
        "shop_address": "88 Rue Cambronne, 75015 Paris",
        "siret": "51209384000019",
        "lat": 48.8439,
        "lng": 2.3032,
        "item_name": "Panier Étudiant: Sandwiches + Éclairs Chocolat",
        "description": "Sandwiches poulet-crudités sur baguette tradition et pâtisseries du jour.",
        "quantity": 6,
    },
]


def ensure_partner_boulangeries_seeded(session_factory: sessionmaker) -> None:
    """Ensure Paris partner bakeries and active surplus pulses exist in PostgreSQL so map and feed match."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=24)
    created = now - timedelta(minutes=15)

    try:
        with session_factory() as db:
            for item in PARTNER_BOULANGERIES_SEED:
                shop = db.query(models.Shop).filter(models.Shop.siret == item["siret"]).first()
                if not shop:
                    owner = db.query(models.User).filter(models.User.email == item["email"]).first()
                    if not owner:
                        owner = models.User(
                            email=item["email"],
                            hashed_password="seeded_partner_account",
                            role=models.UserRole.SHOPKEEPER.value,
                            is_verified=True,
                            id_verification_status="verified",
                            shop_name=item["shop_name"],
                            shop_address=item["shop_address"],
                            siret=item["siret"],
                        )
                        db.add(owner)
                        db.flush()

                    shop = models.Shop(
                        owner_user_id=owner.id,
                        name=item["shop_name"],
                        siret=item["siret"],
                        address=item["shop_address"],
                        location=WKTElement(f"POINT({item['lng']} {item['lat']})", srid=4326),
                        inventory_costs={"baguette": 0.45, "croissant": 0.50, "sandwich": 1.25},
                    )
                    db.add(shop)
                    db.flush()
                else:
                    # Ensure location is set
                    shop.location = WKTElement(f"POINT({item['lng']} {item['lat']})", srid=4326)
                    shop.address = item["shop_address"]
                    db.add(shop)

                # Ensure an active pulse exists for this shop
                active_pulse = (
                    db.query(models.Pulse)
                    .filter(models.Pulse.shop_id == shop.id)
                    .first()
                )
                if not active_pulse:
                    pulse = models.Pulse(
                        shop_id=shop.id,
                        type=models.PulseType.DONATION.value,
                        item_name=item["item_name"],
                        description=item["description"],
                        is_donation=True,
                        quantity=item["quantity"],
                        quantity_remaining=item["quantity"],
                        created_at=created,
                        expires_at=expires,
                    )
                    db.add(pulse)
                else:
                    if _ensure_aware_utc(active_pulse.expires_at) <= now or (active_pulse.quantity_remaining or 0) <= 0:
                        active_pulse.expires_at = expires
                        active_pulse.quantity_remaining = item["quantity"]
                        db.add(active_pulse)

            db.commit()
    except Exception:
        log.exception("Failed to seed partner boulangeries")
