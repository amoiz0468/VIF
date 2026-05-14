from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from uuid import UUID
from .models import UserRole

class ItemBase(BaseModel):
    name: str
    description: str
    price: float

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    owner_id: UUID

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole
    student_id_url: Optional[str] = None
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None
    siret: Optional[str] = None

class User(UserBase):
    id: UUID
    role: UserRole
    student_id_url: Optional[str] = None
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None
    siret: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class InventoryCostItem(BaseModel):
    cost_price: Decimal = Field(..., ge=0)
    unit: Optional[str] = None
    currency: str = "EUR"


class InventoryCostsUpsert(BaseModel):
    inventory_costs: Dict[str, InventoryCostItem]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None


class InventoryCostsResponse(BaseModel):
    shop_id: UUID
    owner_user_id: UUID
    inventory_costs: Dict[str, InventoryCostItem]
    address: Optional[str] = None
    siret: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class PulseCreate(BaseModel):
    item_name: str
    description: Optional[str] = None
    is_donation: bool = True
    quantity: int = Field(..., gt=0)
    expires_at: Optional[datetime] = None


class PulseResponse(BaseModel):
    id: UUID
    shop_id: UUID
    item_name: str
    description: Optional[str] = None
    is_donation: bool
    quantity: int
    expires_at: datetime
    notified_students: int = 0

    class Config:
        from_attributes = True


class ClaimValidateRequest(BaseModel):
    qr_token: str


class ClaimCreateRequest(BaseModel):
    pulse_id: UUID
    quantity: int = Field(1, gt=0)


class ClaimCreateResponse(BaseModel):
    claim_id: UUID
    pulse_id: UUID
    qr_token: str
    status: str
    expires_at: datetime
    message: str


class ClaimValidateResponse(BaseModel):
    claim_id: UUID
    status: str
    collected_at: datetime
    message: str


class TaxReportRequest(BaseModel):
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)


class TaxReportResponse(BaseModel):
    shop_id: UUID
    year: int
    month: int
    total_donated_value: Decimal
    items_count: int
    pdf_filename: str
    message: str
