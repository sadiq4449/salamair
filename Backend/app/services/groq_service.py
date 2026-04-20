"""Groq OpenAI-compatible chat API for pricing assistant."""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings
from app.schemas.ai_schema import PricingAssistantRequest, PricingAssistantResponse

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


def _parse_json_object(content: str) -> Optional[dict]:
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


async def fetch_pricing_insight(body: PricingAssistantRequest) -> Optional[PricingAssistantResponse]:
    api_key = (settings.GROQ_API_KEY or "").strip()
    if not api_key:
        return None

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

    model = (settings.GROQ_MODEL or "llama-3.3-70b-versatile").strip()
    payload: dict = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.35,
        "max_tokens": 220,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
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
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None

    parsed = _parse_json_object(content)
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
