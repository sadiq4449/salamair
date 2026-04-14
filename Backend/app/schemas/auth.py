from enum import Enum

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserLoginInfo


class RoleEnum(str, Enum):
    agent = "agent"
    sales = "sales"
    admin = "admin"


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: RoleEnum
    city: str | None = Field(None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserLoginInfo
