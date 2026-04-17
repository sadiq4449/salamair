from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.advanced_schema import TagBrief


class RequestCreate(BaseModel):
    route: str = Field(..., min_length=1, max_length=100)
    pax: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    travel_date: date | None = None
    return_date: date | None = None
    notes: str | None = None
    priority: str = Field("normal", pattern=r"^(normal|urgent)$")
    is_draft: bool = False
    agent_id: UUID | None = Field(
        None,
        description="Required when an administrator creates a request on behalf of an agent",
    )


class RequestUpdate(BaseModel):
    route: str | None = Field(None, min_length=1, max_length=100)
    pax: int | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)
    travel_date: date | None = None
    return_date: date | None = None
    notes: str | None = None
    priority: str | None = Field(None, pattern=r"^(normal|urgent)$")


class AgentInfo(BaseModel):
    id: UUID
    name: str
    email: str
    city: str | None = None

    model_config = {"from_attributes": True}


class RequestRead(BaseModel):
    id: UUID
    request_code: str
    agent_id: UUID
    agent: AgentInfo | None = None
    route: str
    pax: int
    price: float
    travel_date: date | None = None
    return_date: date | None = None
    notes: str | None = None
    status: str
    priority: str
    assigned_to: UUID | None = None
    tags: list[TagBrief] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RequestListItem(BaseModel):
    id: UUID
    request_code: str
    agent_id: UUID
    agent_name: str | None = None
    route: str
    pax: int
    price: float
    status: str
    priority: str
    travel_date: date | None = None
    tags: list[TagBrief] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class RequestListResponse(BaseModel):
    items: list[RequestListItem]
    total: int
    page: int
    limit: int


class StatusUpdate(BaseModel):
    status: str
    reason: str | None = None
    force: bool = Field(
        False,
        description="If true (admin only), set status directly without workflow transition checks",
    )
