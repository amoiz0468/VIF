from datetime import datetime
from uuid import uuid4

from geoalchemy2 import Geography
from sqlalchemy import Column, Integer, String, Float, Enum, Boolean, DateTime, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, ENUM as PG_ENUM
from .database import Base
import enum

class UserRole(str, enum.Enum):
    STUDENT = "student"
    SHOPKEEPER = "shopkeeper"

class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.STUDENT.value)
    
    # New fields
    student_id_url = Column(String, nullable=True)
    shop_name = Column(String, nullable=True)
    shop_address = Column(String, nullable=True)
    siret = Column(String(14), nullable=True, unique=True, index=True)

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    owner_id = Column(PG_UUID(as_uuid=True)) # For simplicity, we just store the ID of the shopkeeper


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    COLLECTED = "collected"
    GHOSTED = "ghosted"


class PulseType(str, enum.Enum):
    DONATION = "donation"
    WHOLESALE = "wholesale"


class Shop(Base):
    __tablename__ = "shops"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    owner_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    siret = Column(String(14), nullable=False, unique=True, index=True)
    address = Column(String, nullable=True)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    inventory_costs = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class StudentLocation(Base):
    __tablename__ = "student_locations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    student_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    push_token = Column(String, nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Pulse(Base):
    __tablename__ = "pulses"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    shop_id = Column(PG_UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False, index=True)
    type = Column(PG_ENUM(PulseType, name="pulse_type", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False)
    item_name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    is_donation = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    quantity = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Claim(Base):
    __tablename__ = "claims"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    shop_id = Column(PG_UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False, index=True)
    pulse_id = Column(PG_UUID(as_uuid=True), ForeignKey("pulses.id"), nullable=False, index=True)
    student_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    qr_token = Column(String, nullable=False, unique=True, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    status = Column(PG_ENUM(ClaimStatus, name="claim_status", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False, default=ClaimStatus.PENDING.value, server_default=text("'pending'"))
    claimed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    qr_scanned_at = Column(DateTime(timezone=True), nullable=True)
    ghosted_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class TaxReport(Base):
    __tablename__ = "tax_reports"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, index=True, default=uuid4, server_default=text("uuid_generate_v4()"))
    shop_id = Column(PG_UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    total_donated_value = Column(Float, nullable=False, default=0.0)
    items_count = Column(Integer, nullable=False, default=0)
    cerfa_payload = Column(JSONB, nullable=True)
    generated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
