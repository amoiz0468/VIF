from pydantic import BaseModel, EmailStr
from typing import Optional, List
from .models import UserRole

class ItemBase(BaseModel):
    name: str
    description: str
    price: float

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    owner_id: int

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

class User(UserBase):
    id: int
    role: UserRole
    student_id_url: Optional[str] = None
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
