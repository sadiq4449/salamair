from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageSender(BaseModel):
    id: UUID | None = None
    name: str
    role: str

    model_config = {"from_attributes": True}


class MessageAttachmentRead(BaseModel):
    id: UUID
    filename: str
    file_url: str
    file_type: str
    file_size: int

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    id: UUID
    request_id: UUID
    type: str
    sender: MessageSender | None = None
    content: str
    attachments: list[MessageAttachmentRead] = []
    is_read: bool = False
    timestamp: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    request_id: UUID
    content: str
    type: str = "chat"


class AdminMessagePatch(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)


class MessageListResponse(BaseModel):
    items: list[MessageRead]
    total: int
    page: int
    limit: int
