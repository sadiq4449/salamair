from enum import Enum

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserLoginInfo


class RoleEnum(str, Enum):
    agent = "agent"
    sales = "sales"
    admin = "admin"


class SelfRegisterRoleEnum(str, Enum):
    """Only agent can self-register; sales/admin must be created by an admin."""
    agent = "agent"


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: SelfRegisterRoleEnum = SelfRegisterRoleEnum.agent
    city: str | None = Field(None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserLoginInfo
