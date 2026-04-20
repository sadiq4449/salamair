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
