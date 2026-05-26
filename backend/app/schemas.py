from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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

    model_config = ConfigDict(from_attributes=True)


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
    karma_score: int = 50
    is_verified: bool = False
    id_verification_status: str = "pending"
    student_card_start_date: Optional[date] = None
    student_card_end_date: Optional[date] = None
    student_id_url: Optional[str] = None
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None
    siret: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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
    quantity_remaining: int = 0
    expires_at: datetime
    created_at: Optional[datetime] = None
    notified_students: int = 0

    model_config = ConfigDict(from_attributes=True)


class ClaimValidateRequest(BaseModel):
    qr_token: Optional[str] = None
    qr_code_token: Optional[str] = None

    @property
    def resolved_token(self) -> str:
        token = self.qr_code_token or self.qr_token
        if not token:
            raise ValueError("qr_code_token or qr_token is required")
        return token


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


class NearbyPulseResponse(BaseModel):
    pulse_id: UUID
    shop_id: UUID
    shop_name: str
    shop_address: Optional[str] = None
    item_name: str
    description: Optional[str] = None
    quantity_remaining: int
    created_at: datetime
    expires_at: datetime
    distance_meters: float
    priority_window_active: bool

    model_config = ConfigDict(from_attributes=True)


class NearbyPulseFeedResponse(BaseModel):
    pulses: List[NearbyPulseResponse]


class StudentClaimCreateRequest(BaseModel):
    pulse_id: UUID


class StudentClaimCreateResponse(BaseModel):
    claim_id: UUID
    pulse_id: UUID
    qr_code_token: str
    status: str
    claim_deadline: datetime
    message: str


class StudentIdVerificationResponse(BaseModel):
    verified: bool
    manual_review: bool
    status: str
    matched_keywords: List[str]
    extracted_start_date: Optional[date] = None
    extracted_end_date: Optional[date] = None
    message: str


class StudentLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    push_token: Optional[str] = None


class StudentLocationResponse(BaseModel):
    student_user_id: UUID
    latitude: float
    longitude: float
    push_token: Optional[str] = None
    is_verified: bool
    message: str

    model_config = ConfigDict(from_attributes=True)


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
