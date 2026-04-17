"""Schemas for admin data explorer (emails, attachments)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AdminEmailThreadListItem(BaseModel):
    thread_id: UUID
    request_id: UUID
    request_code: str
    route: str
    request_status: str
    agent_name: str | None
    subject: str
    rm_email: str
    thread_status: str
    message_count: int
    last_activity_at: datetime
    preview: str


class AdminEmailThreadListResponse(BaseModel):
    items: list[AdminEmailThreadListItem]
    total: int
    page: int
    limit: int


class AdminEmailAttachmentItem(BaseModel):
    id: UUID
    filename: str
    file_url: str
    file_type: str
    file_size: int

    model_config = {"from_attributes": True}


class AdminEmailMessageDetail(BaseModel):
    id: UUID
    thread_id: UUID
    direction: str
    from_email: str
    to_email: str
    subject: str
    body: str
    html_body: str | None
    message_id: str | None
    in_reply_to: str | None
    status: str
    sent_at: datetime
    received_at: datetime | None
    created_at: datetime
    attachments: list[AdminEmailAttachmentItem] = []

    model_config = {"from_attributes": True}


class AdminEmailThreadDetailResponse(BaseModel):
    thread_id: UUID
    request_id: UUID
    request_code: str
    route: str
    request_status: str
    subject: str
    rm_email: str
    thread_status: str
    created_at: datetime
    updated_at: datetime
    messages: list[AdminEmailMessageDetail]


class AdminEmailThreadUpdate(BaseModel):
    subject: str | None = Field(None, max_length=500)
    rm_email: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=20)


class AdminEmailMessageUpdate(BaseModel):
    subject: str | None = Field(None, max_length=500)
    body: str | None = None
    html_body: str | None = None
    from_email: str | None = Field(None, max_length=255)
    to_email: str | None = Field(None, max_length=255)
    direction: str | None = Field(None, max_length=20)
    status: str | None = Field(None, max_length=20)


class AdminEmailAttachmentUpdate(BaseModel):
    filename: str | None = Field(None, max_length=255)
    file_url: str | None = Field(None, max_length=500)
    file_type: str | None = Field(None, max_length=50)


class AdminRequestAttachmentListItem(BaseModel):
    id: UUID
    request_id: UUID
    request_code: str
    route: str
    request_status: str
    agent_name: str | None
    filename: str
    file_url: str
    file_type: str
    file_size: int
    uploaded_at: datetime


class AdminRequestAttachmentListResponse(BaseModel):
    items: list[AdminRequestAttachmentListItem]
    total: int
    page: int
    limit: int


class AdminRequestAttachmentUpdate(BaseModel):
    filename: str | None = Field(None, max_length=255)
    file_url: str | None = Field(None, max_length=500)
    file_type: str | None = Field(None, max_length=50)
