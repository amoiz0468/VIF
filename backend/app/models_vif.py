from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, func, text
from sqlalchemy import Integer, Text, String, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ENUM as PG_ENUM, JSONB
from geoalchemy2 import Geography


class UserRole(str, Enum):
    student = "student"
    shopkeeper = "shopkeeper"


class PulseType(str, Enum):
    donation = "donation"
    wholesale = "wholesale"


class ClaimStatus(str, Enum):
    pending = "pending"
    collected = "collected"
    ghosted = "ghosted"


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), primary_key=True),
    )
    email: str = Field(sa_column=Column(Text, unique=True, nullable=False))
    full_name: Optional[str] = Field(default=None, sa_column=Column(Text))
    role: UserRole = Field(sa_column=Column(PG_ENUM(UserRole, name="user_role"), nullable=False))
    karma_score: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    student_id_verified: bool = Field(default=False, sa_column=Column(Boolean, nullable=False))
    student_id_document_url: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    shops: List["Shop"] = Relationship(back_populates="owner")
    claims: List["Claim"] = Relationship(back_populates="student")


class Shop(SQLModel, table=True):
    __tablename__ = "shops"
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), primary_key=True),
    )
    owner_user_id: Optional[UUID] = Field(default=None, sa_column=Column(PG_UUID(as_uuid=True)))
    name: str = Field(sa_column=Column(Text, nullable=False))
    siret: str = Field(sa_column=Column(String(14), unique=True, nullable=False))
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    location = Field(default=None, sa_column=Column(Geography(geometry_type="POINT", srid=4326)))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    owner: Optional[User] = Relationship(back_populates="shops")
    pulses: List["Pulse"] = Relationship(back_populates="shop")


class Pulse(SQLModel, table=True):
    __tablename__ = "pulses"
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), primary_key=True),
    )
    shop_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=False))
    type: PulseType = Field(sa_column=Column(PG_ENUM(PulseType, name="pulse_type"), nullable=False))
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    quantity: int = Field(default=1, sa_column=Column(Integer, nullable=False))
    unit: Optional[str] = Field(default=None, sa_column=Column(String(64)))
    cost_price: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10,2), nullable=False))
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    available_from: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    shop: Optional[Shop] = Relationship(back_populates="pulses")
    claims: List["Claim"] = Relationship(back_populates="pulse")


class Claim(SQLModel, table=True):
    __tablename__ = "claims"
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), primary_key=True),
    )
    pulse_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=False))
    student_user_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=False))
    quantity: int = Field(default=1, sa_column=Column(Integer, nullable=False))
    status: ClaimStatus = Field(sa_column=Column(PG_ENUM(ClaimStatus, name="claim_status"), nullable=False, server_default=text("'pending'")))
    claimed_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    qr_scanned_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    ghosted_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    student: Optional[User] = Relationship(back_populates="claims")
    pulse: Optional[Pulse] = Relationship(back_populates="claims")


class TaxReport(SQLModel, table=True):
    __tablename__ = "tax_reports"
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), primary_key=True),
    )
    shop_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=False))
    year: int = Field(sa_column=Column(Integer, nullable=False))
    month: int = Field(sa_column=Column(Integer, nullable=False))
    total_donated_value: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(12,2), nullable=False))
    items_count: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    cerfa_payload: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    generated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True), server_default=func.now()))
