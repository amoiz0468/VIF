from fastapi import FastAPI, Depends, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas, auth, database
from .database import engine
from .services import insee
from .routers.shopkeeper import router as shopkeeper_router
from .routers.student_portal import router as student_portal_router
from .services import karma_engine
from .services import student_portal as student_portal_service

models.Base.metadata.create_all(bind=engine)


def ensure_student_portal_schema() -> None:
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        if "karma_score" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS karma_score INTEGER NOT NULL DEFAULT 50"))
        if "is_verified" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE"))
        if "id_verification_status" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verification_status TEXT NOT NULL DEFAULT 'pending'"))
        if "student_card_start_date" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_card_start_date DATE"))
        if "student_card_end_date" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS student_card_end_date DATE"))

        pulse_columns = {column["name"] for column in inspector.get_columns("pulses")}
        if "quantity_remaining" not in pulse_columns:
            connection.execute(text("ALTER TABLE pulses ADD COLUMN IF NOT EXISTS quantity_remaining INTEGER NOT NULL DEFAULT 0"))
            connection.execute(text("UPDATE pulses SET quantity_remaining = quantity WHERE quantity_remaining = 0 OR quantity_remaining IS NULL"))

        claim_columns = {column["name"] for column in inspector.get_columns("claims")}
        if "qr_code_token" not in claim_columns:
            connection.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS qr_code_token TEXT"))
        if "claim_deadline" not in claim_columns:
            connection.execute(text("ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_deadline TIMESTAMPTZ"))

        connection.execute(text("UPDATE claims SET qr_code_token = COALESCE(qr_code_token, qr_token)"))
        connection.execute(text("UPDATE claims SET claim_deadline = COALESCE(claim_deadline, expires_at, created_at + INTERVAL '20 minutes')"))
        connection.execute(text("ALTER TABLE claims ALTER COLUMN qr_code_token SET NOT NULL"))
        connection.execute(text("ALTER TABLE claims ALTER COLUMN claim_deadline SET NOT NULL"))


ensure_student_portal_schema()

app = FastAPI(title="ViF - Smart Marketplace")

app.include_router(shopkeeper_router)
app.include_router(student_portal_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def bootstrap_background_workers() -> None:
    karma_engine.bootstrap_pending_claim_tasks(database.SessionLocal)

@app.post("/signup", response_model=schemas.User)
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Email domain validation for students
    if user.role == models.UserRole.STUDENT:
        allowed_domains = [".edu", ".eu", ".ac.uk", ".univ"]
        if not any(user.email.endswith(domain) for domain in allowed_domains):
            raise HTTPException(
                status_code=400, 
                detail="Students must use a university email address (.edu, .eu, .ac.uk, .univ)"
            )
        if not user.student_id_url:
            raise HTTPException(status_code=400, detail="Student ID card is required for students")
            
    # Validation for shopkeepers
    if user.role == models.UserRole.SHOPKEEPER:
        if not user.shop_name or not user.shop_address:
            raise HTTPException(status_code=400, detail="Shop name and address are required for shopkeepers")
        if not user.siret:
            raise HTTPException(status_code=400, detail="SIRET number is required for shopkeepers")
        
        # Validate SIRET with INSEE
        validation = insee.check_siret_with_insee(user.siret)
        if not validation.get("valid"):
            raise HTTPException(status_code=400, detail=f"SIRET validation failed: {validation.get('reason')}")

    return crud.create_user(db=db, user=user)

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(payload: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=payload.email)
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.post("/student/verify-id", response_model=schemas.StudentIdVerificationResponse)
async def verify_student_id(
    upload: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.check_student_role),
):
    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload an image file")
    return await student_portal_service.verify_student_id(db, current_user, upload)

@app.get("/items", response_model=List[schemas.Item])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    items = crud.get_items(db, skip=skip, limit=limit)
    return items

@app.post("/items", response_model=schemas.Item)
def create_item(
    item: schemas.ItemCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.check_admin_role)
):
    return crud.create_user_item(db=db, item=item, user_id=current_user.id)
