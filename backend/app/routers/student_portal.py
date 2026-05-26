from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import auth, database, models, schemas
from ..services import student_portal as student_portal_service

router = APIRouter(tags=["student-portal"])


@router.get("/pulses/nearby", response_model=List[schemas.NearbyPulseResponse])
async def get_nearby_pulses(
    lat: float,
    lng: float,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_student_role),
):
    return await student_portal_service.get_nearby_pulses(db, current_user, lat, lng)


@router.post("/claims/create", response_model=schemas.StudentClaimCreateResponse)
async def create_claim(
    payload: schemas.StudentClaimCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_student_role),
):
    claim = await student_portal_service.create_claim(db, current_user, payload.pulse_id, database.SessionLocal)
    return schemas.StudentClaimCreateResponse(
        claim_id=claim.id,
        pulse_id=claim.pulse_id,
        qr_code_token=claim.qr_code_token or claim.qr_token,
        status=str(claim.status),
        claim_deadline=claim.claim_deadline,
        message="Reservation confirmed. Your QR token is now active.",
    )


@router.get("/claims/active", response_model=schemas.StudentClaimCreateResponse)
async def get_active_claim(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_student_role),
):
    claim = await student_portal_service.get_active_claim(db, current_user)
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active reservation found")
    return schemas.StudentClaimCreateResponse(
        claim_id=claim.id,
        pulse_id=claim.pulse_id,
        qr_code_token=claim.qr_code_token or claim.qr_token,
        status=str(claim.status),
        claim_deadline=claim.claim_deadline,
        message="Active reservation found.",
    )


@router.post("/student/location", response_model=schemas.StudentLocationResponse)
async def register_student_location(
    payload: schemas.StudentLocationRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_student_role),
):
    student_location = student_portal_service.register_location(
        db, current_user, payload.latitude, payload.longitude, payload.push_token
    )
    return schemas.StudentLocationResponse(
        student_user_id=student_location.student_user_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        push_token=student_location.push_token,
        is_verified=student_location.is_verified,
        message="Location registered successfully.",
    )


@router.post("/student/verify-id", response_model=schemas.StudentIdVerificationResponse)
async def verify_student_id(
    upload: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_student_role),
):
    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload an image file")
    return await student_portal_service.verify_student_id(db, current_user, upload)

