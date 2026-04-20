from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.ai_schema import PricingAssistantRequest, PricingAssistantResponse
from app.services.groq_service import fetch_pricing_insight

router = APIRouter()


def _fallback_response(body: PricingAssistantRequest) -> PricingAssistantResponse:
    """Match frontend demo heuristics when Groq is unavailable."""
    p = float(body.price)
    if p <= 0 or p != p:  # NaN
        suggested = 0.0
    elif p > 100:
        suggested = float(round(p * 0.9))
    else:
        suggested = float(round(p * 0.95))

    conf = 75 if body.priority == "urgent" else 88

    if body.status == "approved":
        rec = "Recommendation: Approved"
    elif body.status == "rejected":
        rec = "Recommendation: Review terms"
    elif suggested < p * 0.92:
        rec = "Recommendation: Negotiate or counter"
    else:
        rec = "Recommendation: Accept"

    return PricingAssistantResponse(
        suggested_price_omr=suggested,
        confidence_percent=conf,
        recommendation=rec,
        source="fallback",
    )


@router.post("/pricing-assistant", response_model=PricingAssistantResponse)
@limiter.limit("30/minute")
async def pricing_assistant(
    request: Request,
    body: PricingAssistantRequest,
    _user: User = Depends(get_current_user),
) -> PricingAssistantResponse:
    insight = await fetch_pricing_insight(body)
    if insight:
        return insight
    return _fallback_response(body)
