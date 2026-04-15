from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SendEmailRequest(BaseModel):
    request_id: UUID
    to: EmailStr = "rm@salamair.com"
    message: str
    include_attachments: bool = True


class ReplyEmailRequest(BaseModel):
    request_id: UUID
    thread_id: UUID
    message: str


class SimulateReplyRequest(BaseModel):
    request_id: UUID
    message: str = "Approved with fare as requested. Valid for 7 days."
    from_email: EmailStr = "rm@salamair.com"


class EmailAttachmentRead(BaseModel):
    id: UUID
    filename: str
    file_url: str
    file_type: str
    file_size: int

    model_config = {"from_attributes": True}


class EmailMessageRead(BaseModel):
    id: UUID
    direction: str
    from_email: str
    to_email: str
    subject: str
    body: str
    status: str
    attachments: list[EmailAttachmentRead] = []
    sent_at: datetime
    received_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EmailThreadRead(BaseModel):
    request_code: str
    thread_id: UUID
    subject: str
    rm_email: str
    status: str
    emails: list[EmailMessageRead] = []

    model_config = {"from_attributes": True}


class SendEmailResponse(BaseModel):
    message: str
    email_id: UUID
    request_code: str
    status: str
    sent_at: datetime
    smtp_delivered: bool = True
    smtp_error: str | None = None


class ReplyEmailResponse(BaseModel):
    message: str
    email_id: UUID
    sent_at: datetime
    smtp_delivered: bool = True
    smtp_error: str | None = None


class PollInboxResponse(BaseModel):
    ok: bool
    skipped: bool = False
    reason: str | None = None
    processed: int = 0
    stored: int = 0
    errors: list[str] = Field(default_factory=list)
