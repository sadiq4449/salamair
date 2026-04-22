from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.ai_schema import (
    EmailThreadSummaryRequest,
    EmailThreadSummaryResponse,
    FlightChatRequest,
    FlightChatResponse,
    PricingAssistantRequest,
    PricingAssistantResponse,
)
from app.services.flight_assistant_service import run_flight_chat
from app.services.groq_service import (
    email_thread_summary_fallback,
    fetch_email_thread_insight,
    fetch_pricing_insight,
)

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


@router.post("/flight-chat", response_model=FlightChatResponse)
@limiter.limit("20/minute")
async def flight_chat(
    request: Request,
    body: FlightChatRequest,
    _user: User = Depends(get_current_user),
) -> FlightChatResponse:
    """Answer availability-style questions using SalamAir live search + Groq."""
    return await run_flight_chat(message=body.message, context=body.context)


@router.post("/email-thread-summary", response_model=EmailThreadSummaryResponse)
@limiter.limit("30/minute")
async def email_thread_summary(
    request: Request,
    body: EmailThreadSummaryRequest,
    _user: User = Depends(get_current_user),
) -> EmailThreadSummaryResponse:
    """Bullet summary for the sales “AI summary” card; Groq when configured, else heuristics."""
    insight = await fetch_email_thread_insight(body)
    if insight:
        return insight
    return email_thread_summary_fallback(body)
