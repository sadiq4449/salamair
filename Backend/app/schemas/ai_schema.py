from typing import Literal, Optional

from pydantic import BaseModel, Field


class PricingAssistantRequest(BaseModel):
    price: float = Field(ge=0)
    priority: str
    status: str
    route: Optional[str] = None
    pax: Optional[int] = Field(default=None, ge=0)
    request_code: Optional[str] = None


class PricingAssistantResponse(BaseModel):
    suggested_price_omr: float
    confidence_percent: int = Field(ge=0, le=100)
    recommendation: str
    source: Literal["groq", "fallback"]


class FlightChatContext(BaseModel):
    """Optional request-page hints so vague questions (“us date pe?”) still resolve."""

    route: Optional[str] = None
    travel_date: Optional[str] = None
    pax: Optional[int] = Field(default=None, ge=1, le=99)


class FlightChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: Optional[FlightChatContext] = None


class FlightChatResponse(BaseModel):
    answer: str
    source: Literal["live_api", "clarify", "no_groq", "api_error"]


class EmailThreadSummaryRequest(BaseModel):
    request_code: str
    route: str
    pax: int = Field(ge=0)
    price: float = Field(ge=0)
    priority: str
    status: str
    tag_names: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    chat_message_count: int = Field(default=0, ge=0)
    email_message_count: int = Field(default=0, ge=0)


class EmailThreadSummaryResponse(BaseModel):
    points: list[str] = Field(min_length=1)
    source: Literal["groq", "fallback"]
