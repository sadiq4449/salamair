from uuid import UUID

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")


class TagBrief(BaseModel):
    id: UUID
    name: str
    color: str

    model_config = {"from_attributes": True}


class TagOut(TagBrief):
    usage_count: int = 0


class RequestTagsBody(BaseModel):
    tag_ids: list[UUID] = Field(default_factory=list)


class ReminderRuleOut(BaseModel):
    id: UUID
    trigger_status: str
    delay_hours: int
    reminder_type: str
    message_template: str
    is_active: bool

    model_config = {"from_attributes": True}


class ReminderRuleItemUpdate(BaseModel):
    id: UUID
    delay_hours: int | None = Field(None, ge=1, le=720)
    reminder_type: str | None = Field(None, pattern=r"^(email|in_app|both)$")
    message_template: str | None = Field(None, min_length=1, max_length=2000)
    is_active: bool | None = None


class RemindersListResponse(BaseModel):
    rules: list[ReminderRuleOut]


class RemindersPutBody(BaseModel):
    rules: list[ReminderRuleItemUpdate] = Field(default_factory=list)


class SearchResultMessage(BaseModel):
    id: str
    request_code: str
    request_id: str
    content: str
    highlight: str


class SearchResultRequest(BaseModel):
    id: str
    request_code: str
    route: str
    status: str
    highlight: str


class SearchResultAgent(BaseModel):
    id: str
    name: str
    email: str
    highlight: str


class SearchResponse(BaseModel):
    query: str
    results: dict
    total: int
