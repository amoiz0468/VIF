from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas, auth, database
from .database import engine
from .services import insee
from .routers.shopkeeper import router as shopkeeper_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ViF - Smart Marketplace")

app.include_router(shopkeeper_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
