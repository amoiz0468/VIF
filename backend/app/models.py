from sqlalchemy import Column, Integer, String, Float, Enum
from .database import Base
import enum

class UserRole(str, enum.Enum):
    STUDENT = "student"
    SHOPKEEPER = "shopkeeper"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.STUDENT.value)
    
    # New fields
    student_id_url = Column(String, nullable=True)
    shop_name = Column(String, nullable=True)
    shop_address = Column(String, nullable=True)

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    owner_id = Column(Integer) # For simplicity, we just store the ID of the shopkeeper
