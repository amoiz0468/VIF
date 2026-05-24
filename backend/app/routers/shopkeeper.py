from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import auth, database, models, schemas
from ..services import shopkeeper as shopkeeper_service

router = APIRouter(tags=["shopkeeper"])


@router.post("/shopkeeper/inventory-costs", response_model=schemas.InventoryCostsResponse)
async def set_inventory_costs(
    payload: schemas.InventoryCostsUpsert,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_admin_role),
):
    shop = shopkeeper_service.upsert_inventory_costs(db, current_user, payload)
    latitude = None
    longitude = None
    response_payload = schemas.InventoryCostsResponse(
        shop_id=shop.id,
        owner_user_id=shop.owner_user_id,
        inventory_costs=shopkeeper_service._decode_inventory_costs(shop.inventory_costs),
        address=shop.address,
        siret=shop.siret,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return response_payload


@router.post("/pulses", response_model=schemas.PulseResponse)
async def create_pulse(
    payload: schemas.PulseCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_admin_role),
):
    pulse, notified_students = await shopkeeper_service.create_pulse(db, current_user, payload)
    return schemas.PulseResponse(
        id=pulse.id,
        shop_id=pulse.shop_id,
        item_name=pulse.item_name,
        description=pulse.description,
        is_donation=pulse.is_donation,
        quantity=pulse.quantity,
        quantity_remaining=pulse.quantity_remaining,
        expires_at=pulse.expires_at,
        created_at=pulse.created_at,
        notified_students=notified_students,
    )


@router.post("/student/claims", response_model=schemas.ClaimCreateResponse)
async def create_claim(
    payload: schemas.ClaimCreateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    claim = await shopkeeper_service.create_student_claim(db, current_user, payload.pulse_id, payload.quantity)
    return schemas.ClaimCreateResponse(
        claim_id=claim.id,
        pulse_id=claim.pulse_id,
        qr_token=claim.qr_token,
        status=str(claim.status),
        expires_at=claim.expires_at,
        message="Claim created. Show this code to the shopkeeper before it expires.",
    )


@router.post("/validate-claim", response_model=schemas.ClaimValidateResponse)
async def validate_claim(
    payload: schemas.ClaimValidateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_admin_role),
):
    token = payload.qr_code_token or payload.qr_token
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="qr_token or qr_code_token is required")
    claim = await shopkeeper_service.validate_claim(db, current_user, token)
    return schemas.ClaimValidateResponse(
        claim_id=claim.id,
        status=str(claim.status),
        collected_at=claim.collected_at,
        message="Claim collected successfully",
    )


@router.post("/shops/{shop_id}/tax-report/{year}/{month}")
async def generate_tax_report(
    shop_id: UUID,
    year: int,
    month: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_admin_role),
):
    shop = shopkeeper_service.get_or_create_shop(db, current_user)
    if shop.id != shop_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to access this shop")

    report, pdf_path = shopkeeper_service.generate_cerfa_report(db, shop_id, year, month)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"cerfa_{shop.siret}_{year}_{month:02d}.pdf",
        headers={
            "X-Shop-ID": str(report.shop_id),
            "X-Total-Donated-Value": str(report.total_donated_value),
        },
    )
