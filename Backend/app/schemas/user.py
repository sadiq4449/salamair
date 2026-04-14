from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    city: str | None = None


class UserRead(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLoginInfo(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    city: str | None = None

    model_config = {"from_attributes": True}
