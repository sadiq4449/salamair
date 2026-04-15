from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class AdminUserItem(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    city: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    limit: int


class AdminStatsResponse(BaseModel):
    users_total: int
    agents_count: int
    sales_count: int
    admins_count: int
    requests_total: int
    requests_open: int
    requests_today: int
