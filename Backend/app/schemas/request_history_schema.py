from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class HistoryRead(BaseModel):
    id: UUID
    request_id: UUID
    action: str
    from_status: str | None = None
    to_status: str | None = None
    actor_id: UUID
    actor_name: str | None = None
    details: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
