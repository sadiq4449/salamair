from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: UUID
    type: str
    title: str
    message: str
    request_id: UUID | None = None
    request_code: str | None = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationRead]
    total: int
    unread_count: int
    page: int
    limit: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkReadResponse(BaseModel):
    message: str


class MarkAllReadResponse(BaseModel):
    message: str
    count: int


class NotificationPreferenceRead(BaseModel):
    in_app_enabled: bool
    email_enabled: bool
    sound_enabled: bool
    types_disabled: list[str]

    model_config = {"from_attributes": True}


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    sound_enabled: bool | None = None
    types_disabled: list[str] | None = None
