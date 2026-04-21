"""Schemas for admin database explorer (full data access)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# --- Requests ---
class AdminDbRequestRow(BaseModel):
    id: UUID
    request_code: str
    agent_id: UUID
    agent_name: str | None
    route: str
    pax: int
    price: float
    status: str
    priority: str
    travel_date: str | None
    return_date: str | None
    notes: str | None
    assigned_to: UUID | None
    created_at: datetime
    updated_at: datetime


class AdminDbRequestListResponse(BaseModel):
    items: list[AdminDbRequestRow]
    total: int
    page: int
    limit: int


class AdminDbRequestUpdate(BaseModel):
    route: str | None = Field(None, max_length=100)
    pax: int | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)
    status: str | None = Field(None, max_length=20)
    priority: str | None = Field(None, max_length=10)
    notes: str | None = None
    travel_date: str | None = None
    return_date: str | None = None
    assigned_to: UUID | None = None


# --- Platform messages (chat / system / email timeline) ---
class AdminDbMessageRow(BaseModel):
    id: UUID
    request_id: UUID
    request_code: str
    sender_id: UUID | None
    sender_name: str | None
    type: str
    sender_role: str | None
    content: str
    is_internal: bool
    created_at: datetime


class AdminDbMessageListResponse(BaseModel):
    items: list[AdminDbMessageRow]
    total: int
    page: int
    limit: int


class AdminDbMessageUpdate(BaseModel):
    content: str | None = None
    type: str | None = Field(None, max_length=10)
    sender_role: str | None = Field(None, max_length=20)
    is_internal: bool | None = None


# --- Request history ---
class AdminDbHistoryRow(BaseModel):
    id: UUID
    request_id: UUID
    request_code: str
    action: str
    from_status: str | None
    to_status: str | None
    actor_id: UUID
    actor_name: str | None
    details: str | None
    created_at: datetime


class AdminDbHistoryListResponse(BaseModel):
    items: list[AdminDbHistoryRow]
    total: int
    page: int
    limit: int


class AdminDbHistoryUpdate(BaseModel):
    details: str | None = None


# --- Notifications (all users) ---
class AdminDbNotificationRow(BaseModel):
    id: UUID
    user_id: UUID
    user_email: str
    type: str
    title: str
    message: str
    request_id: UUID | None
    request_code: str | None
    is_read: bool
    is_email_sent: bool
    created_at: datetime


class AdminDbNotificationListResponse(BaseModel):
    items: list[AdminDbNotificationRow]
    total: int
    page: int
    limit: int


class AdminDbNotificationUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    message: str | None = None
    is_read: bool | None = None


# --- Counter offers ---
class AdminDbCounterOfferRow(BaseModel):
    id: UUID
    request_id: UUID
    request_code: str
    original_price: float
    counter_price: float
    message: str | None
    created_by: UUID
    creator_name: str | None
    status: str
    created_at: datetime


class AdminDbCounterOfferListResponse(BaseModel):
    items: list[AdminDbCounterOfferRow]
    total: int
    page: int
    limit: int


class AdminDbCounterOfferUpdate(BaseModel):
    counter_price: float | None = Field(None, gt=0)
    message: str | None = None
    status: str | None = Field(None, max_length=20)


# --- SLA tracking rows ---
class AdminDbSlaRow(BaseModel):
    id: UUID
    request_id: UUID
    request_code: str
    status: str
    started_at: datetime
    deadline_at: datetime
    completed_at: datetime | None
    is_breached: bool


class AdminDbSlaListResponse(BaseModel):
    items: list[AdminDbSlaRow]
    total: int
    page: int
    limit: int


class AdminDbSlaUpdate(BaseModel):
    deadline_at: datetime | None = None
    completed_at: datetime | None = None
    is_breached: bool | None = None


# --- Chat message attachments ---
class AdminDbChatAttachmentRow(BaseModel):
    id: UUID
    message_id: UUID
    # Nullable so orphaned attachments surface honestly instead of being
    # papered over with a fabricated UUID.
    request_id: UUID | None = None
    request_code: str | None = None
    filename: str
    file_url: str
    file_type: str
    file_size: int


class AdminDbChatAttachmentListResponse(BaseModel):
    items: list[AdminDbChatAttachmentRow]
    total: int
    page: int
    limit: int


class AdminDbChatAttachmentUpdate(BaseModel):
    filename: str | None = Field(None, max_length=255)
    file_url: str | None = Field(None, max_length=500)
    file_type: str | None = Field(None, max_length=50)
