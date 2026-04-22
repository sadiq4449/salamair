"""Groq OpenAI-compatible chat API for pricing assistant."""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings
from app.schemas.ai_schema import (
    EmailThreadSummaryRequest,
    EmailThreadSummaryResponse,
    PricingAssistantRequest,
    PricingAssistantResponse,
)
from app.services.email_summary_fallback import fallback_email_thread_points

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


def parse_llm_json_object(content: str) -> Optional[dict]:
    text = (content or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


async def groq_chat_text(
    *,
    system: str,
    user: str,
    temperature: float = 0.35,
    max_tokens: int = 500,
) -> Optional[str]:
    """Single chat completion; returns assistant message text or None."""
    api_key = (settings.GROQ_API_KEY or "").strip()
    if not api_key:
        return None
    model = (settings.GROQ_MODEL or "llama-3.3-70b-versatile").strip()
    payload: dict = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        logger.warning("Groq request failed: %s", e)
        return None
    try:
        return str(data["choices"][0]["message"]["content"] or "").strip() or None
    except (KeyError, IndexError, TypeError):
        return None


async def fetch_pricing_insight(body: PricingAssistantRequest) -> Optional[PricingAssistantResponse]:
    ctx_bits: list[str] = []
    if body.request_code:
        ctx_bits.append(f"request_code: {body.request_code}")
    if body.route:
        ctx_bits.append(f"route: {body.route}")
    if body.pax is not None:
        ctx_bits.append(f"pax: {body.pax}")
    context = ", ".join(ctx_bits) if ctx_bits else "none"

    system = (
        "You are a B2B group/charter pricing assistant for Salam Air. Currency is OMR. "
        "Given the quoted price, priority, internal request status, and optional route/pax, "
        "propose one rounded suggested price and a one-line recommendation for sales "
        "(accept, negotiate, counter, or wait for RM). "
        "Respond with ONLY valid JSON (no markdown): "
        '{"suggested_price_omr": <number>, "confidence_percent": <integer 0-100>, '
        '"recommendation": "<short string, max 120 chars>"}'
    )
    user_msg = json.dumps(
        {
            "quoted_price_omr": body.price,
            "priority": body.priority,
            "request_status": body.status,
            "extra_context": context,
        }
    )

    content = await groq_chat_text(system=system, user=user_msg, temperature=0.35, max_tokens=220)
    if not content:
        return None

    parsed = parse_llm_json_object(content)
    if not parsed:
        return None

    try:
        sug = float(parsed["suggested_price_omr"])
        conf = int(parsed["confidence_percent"])
        rec = str(parsed["recommendation"]).strip()
    except (KeyError, TypeError, ValueError):
        return None

    if sug < 0 or not rec:
        return None
    conf = max(0, min(100, conf))

    return PricingAssistantResponse(
        suggested_price_omr=float(round(sug)),
        confidence_percent=conf,
        recommendation=rec,
        source="groq",
    )


async def fetch_email_thread_insight(
    body: EmailThreadSummaryRequest,
) -> Optional[EmailThreadSummaryResponse]:
    """3–6 bullet points for the sales 'AI summary' card."""
    data = {
        "request_code": body.request_code,
        "route": body.route,
        "pax": body.pax,
        "price": body.price,
        "priority": body.priority,
        "status": body.status,
        "tag_names": body.tag_names,
        "notes": body.notes,
        "chat_message_count": body.chat_message_count,
        "email_message_count": body.email_message_count,
    }
    system = (
        "You summarize B2B charter/group flight deal threads for Salam Air sales. "
        "Output ONLY valid JSON, no markdown: "
        '{"points": ["bullet 1", "bullet 2", ...]}. '
        "3 to 6 concise bullets. Mention message counts if useful. OMR. No fluff."
    )
    user_msg = json.dumps(data, ensure_ascii=False)
    content = await groq_chat_text(system=system, user=user_msg, temperature=0.3, max_tokens=400)
    if not content:
        return None
    parsed = parse_llm_json_object(content)
    if not parsed:
        return None
    raw = parsed.get("points")
    if not isinstance(raw, list):
        return None
    points: list[str] = []
    for x in raw[:8]:
        s = str(x).strip()
        if s:
            points.append(s)
    if not points:
        return None
    return EmailThreadSummaryResponse(points=points[:6], source="groq")


def email_thread_summary_fallback(body: EmailThreadSummaryRequest) -> EmailThreadSummaryResponse:
    p = {
        "request_code": body.request_code,
        "route": body.route,
        "pax": body.pax,
        "price": body.price,
        "priority": body.priority,
        "status": body.status,
        "tag_names": body.tag_names,
        "notes": body.notes,
        "chat_message_count": body.chat_message_count,
        "email_message_count": body.email_message_count,
    }
    return EmailThreadSummaryResponse(points=fallback_email_thread_points(p), source="fallback")
