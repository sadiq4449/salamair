from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AttachmentRead(BaseModel):
    id: UUID
    request_id: UUID
    filename: str
    file_url: str
    file_type: str
    file_size: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}
