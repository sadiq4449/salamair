from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CounterOfferCreate(BaseModel):
    counter_price: float = Field(..., gt=0)
    message: str | None = None


class CounterOfferRead(BaseModel):
    id: UUID
    request_id: UUID
    original_price: float
    counter_price: float
    message: str | None = None
    created_by: UUID
    creator_name: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
