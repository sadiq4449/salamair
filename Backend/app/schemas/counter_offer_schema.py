from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CounterOfferCreate(BaseModel):
    counter_price: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    message: str | None = None


class CounterOfferRead(BaseModel):
    id: UUID
    request_id: UUID
    original_price: Decimal
    counter_price: Decimal
    message: str | None = None
    created_by: UUID
    creator_name: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
