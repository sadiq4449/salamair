"""Flight availability Q&A: Groq parses the question, SalamAir API supplies live search facts."""

from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime
from typing import Any, Optional

import httpx
from zoneinfo import ZoneInfo

from app.schemas.ai_schema import FlightChatContext, FlightChatResponse
from app.services.groq_service import groq_chat_text, parse_llm_json_object
from app.services.salamair_booking_client import create_salamair_session, search_flights_oneway

logger = logging.getLogger(__name__)

_IATA = re.compile(r"^[A-Z]{3}$")


def _date_key(iso: str) -> str:
    if not iso:
        return ""
    s = str(iso).strip()
    return s[:10] if len(s) >= 10 else s


def _same_calendar_day(a: str, b: str) -> bool:
    return _date_key(a) == _date_key(b)


def _compact_availability(payload: dict[str, Any], want_date: str) -> dict[str, Any]:
    """Shrink SalamAir flights JSON for the LLM."""
    want = _date_key(want_date)
    trips = payload.get("trips") or []
    if not isinstance(trips, list) or not trips:
        return {
            "search_ok": True,
            "target_date": want,
            "trip_summary": None,
            "day_row": None,
            "nearby_priced_dates": [],
            "additional_message": payload.get("additionalMessage"),
        }
    trip = trips[0]
    if not isinstance(trip, dict):
        return {"search_ok": False, "target_date": want, "parse_error": "unexpected trip shape"}

    markets = trip.get("markets") or []
    if not isinstance(markets, list):
        markets = []

    day_row: dict[str, Any] | None = None
    for m in markets:
        if not isinstance(m, dict):
            continue
        if _same_calendar_day(str(m.get("date") or ""), want):
            fare = m.get("lowestFare")
            flights = m.get("flights")
            has_price = isinstance(fare, (int, float)) and fare > 0
            day_row = {
                "date": _date_key(str(m.get("date") or "")),
                "lowest_fare": fare,
                "has_positive_fare": has_price,
                "has_flight_objects": bool(flights),
            }
            break

    priced: list[str] = []
    for m in markets:
        if not isinstance(m, dict):
            continue
        fare = m.get("lowestFare")
        if isinstance(fare, (int, float)) and fare > 0 and m.get("date"):
            priced.append(_date_key(str(m.get("date"))))

    return {
        "search_ok": True,
        "target_date": want,
        "origin": trip.get("origin") or trip.get("originCity"),
        "destination": trip.get("destination") or trip.get("destinationCity"),
        "currency": trip.get("currencyCode"),
        "day_row": day_row,
        "nearby_priced_dates": priced[:21],
        "additional_message": payload.get("additionalMessage"),
    }


def _merge_context(
    plan: dict[str, Any],
    ctx: Optional[FlightChatContext],
) -> dict[str, Any]:
    if not ctx:
        return plan
    if ctx.route:
        parts = ctx.route.upper().split("-")
        if len(parts) == 2 and _IATA.match(parts[0]) and _IATA.match(parts[1]):
            plan.setdefault("origin_code", parts[0])
            plan.setdefault("destination_code", parts[1])
    if ctx.travel_date:
        td = str(ctx.travel_date).strip()[:10]
        if len(td) == 10:
            plan.setdefault("departure_date", td)
    return plan


def _valid_iso_date(s: str) -> bool:
    try:
        date.fromisoformat(s[:10])
        return True
    except ValueError:
        return False


async def run_flight_chat(
    *,
    message: str,
    context: Optional[FlightChatContext],
) -> FlightChatResponse:
    text = (message or "").strip()
    if not text:
        return FlightChatResponse(
            answer="Please type a question — for example whether a route has flights on a given date.",
            source="clarify",
        )

    today = datetime.now(ZoneInfo("Asia/Muscat")).date().isoformat()
    ctx_json: dict[str, Any] = {}
    if context:
        if context.route:
            ctx_json["route"] = context.route
        if context.travel_date:
            ctx_json["travel_date"] = context.travel_date

    extract_system = (
        "You extract structured flight-search parameters from user questions. "
        "Users may write in Urdu, Roman Urdu, or English. "
        "Salam Air is an Omani LCC; use 3-letter IATA airport codes only. "
        "Common: MCT Muscat, DXB Dubai, AUH Abu Dhabi, KHI Karachi, LHE Lahore, ISB Islamabad, "
        "BKK Bangkok, COK Kochi, TRV Trivandrum, MLE Malé, DMM Dammam, RUH Riyadh, JED Jeddah.\n"
        f"Today's calendar date in Oman is {today}. Resolve relative phrases (tomorrow, next Friday, etc.) to YYYY-MM-DD.\n"
        "Return ONLY valid JSON (no markdown): "
        '{"intent":"flight_availability"|"other",'
        '"origin_code":null or string,"destination_code":null or string,"departure_date":null or string}\n'
        "If the question is clearly about flight availability / schedule / seats on a route and date, use intent flight_availability. "
        "If the user only greets or asks unrelated things, intent other."
    )
    extract_user = json.dumps({"user_message": text, "page_context": ctx_json or None}, ensure_ascii=False)

    raw_plan = await groq_chat_text(
        system=extract_system,
        user=extract_user,
        temperature=0.1,
        max_tokens=220,
    )
    if not raw_plan:
        return FlightChatResponse(
            answer=(
                "Flight answers need the Groq API key (GROQ_API_KEY) on the server. "
                "You can still use Find flights in the portal for live availability."
            ),
            source="no_groq",
        )

    plan = parse_llm_json_object(raw_plan) or {}
    plan = _merge_context(plan, context)

    intent = str(plan.get("intent") or "").lower()
    if intent == "other":
        ans = await groq_chat_text(
            system=(
                "You are Salam Air SmartDeal portal assistant. The user asked something not about "
                "flight availability. Reply in one short sentence: invite them to ask if flights exist "
                "on a date and route, in their language (match Urdu/Roman Urdu/English if obvious)."
            ),
            user=text,
            temperature=0.4,
            max_tokens=120,
        )
        return FlightChatResponse(answer=ans or "Ask me if Salam Air has flights on your route and date.", source="clarify")

    origin = plan.get("origin_code")
    dest = plan.get("destination_code")
    dep = plan.get("departure_date")

    origin = origin.strip().upper() if isinstance(origin, str) else None
    dest = dest.strip().upper() if isinstance(dest, str) else None
    dep = dep.strip()[:10] if isinstance(dep, str) else None

    if origin and not _IATA.match(origin):
        origin = None
    if dest and not _IATA.match(dest):
        dest = None
    if dep and not _valid_iso_date(dep):
        dep = None

    if not origin or not dest or not dep:
        clarify = await groq_chat_text(
            system=(
                "The user wants flight availability but origin airport, destination airport, or travel date is missing. "
                "Reply briefly in the same language they used (Urdu, Roman Urdu, or English). "
                "Ask them to specify: from city/airport, to city/airport, and date (or confirm using this request's route and travel date)."
            ),
            user=json.dumps({"user_message": text, "parsed": plan, "page_context": ctx_json}, ensure_ascii=False),
            temperature=0.35,
            max_tokens=200,
        )
        return FlightChatResponse(
            answer=clarify or "Please specify origin, destination, and travel date so I can check live availability.",
            source="clarify",
        )

    pax = 1
    if context and context.pax is not None and context.pax > 0:
        pax = min(int(context.pax), 9)

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(90.0, connect=30.0),
            follow_redirects=True,
        ) as client:
            session = await create_salamair_session(client)
            if not session.token:
                if session.error == "forbidden":
                    return FlightChatResponse(
                        answer=(
                            "Salam Air’s booking API blocked this server (common on some cloud datacenters). "
                            "Open Find flights in the portal on your PC — that uses your browser and usually works."
                        ),
                        source="api_error",
                    )
                if session.error == "network":
                    return FlightChatResponse(
                        answer=(
                            "Could not connect to Salam Air (network). Try again in a minute or use Find flights."
                        ),
                        source="api_error",
                    )
                return FlightChatResponse(
                    answer="Could not reach Salam Air booking services right now. Try again shortly or use Find flights.",
                    source="api_error",
                )
            data = await search_flights_oneway(
                client,
                session.token,
                origin=origin,
                destination=dest,
                departure_date=dep,
                adults=pax,
                days=7,
            )
    except httpx.HTTPError as e:
        logger.warning("SalamAir search failed: %s", e)
        return FlightChatResponse(
            answer="The live availability check timed out or failed. Please try Find flights or retry in a moment.",
            source="api_error",
        )

    if not data:
        return FlightChatResponse(
            answer="No response from the booking search. Please try Find flights in the portal.",
            source="api_error",
        )

    facts = _compact_availability(data, dep)
    answer_system = (
        "You are Salam Air internal sales support. Answer using ONLY the JSON facts from the live booking search. "
        "The user question may be Urdu, Roman Urdu, or English — reply in the same language when obvious, else English.\n"
        "Rules:\n"
        "- If day_row.has_positive_fare is true, say flights/fares were returned for that calendar day and mention lowest_fare and currency.\n"
        "- If day_row exists but no positive fare, say no bookable fare showed for that exact day in this search window (still suggest checking Find flights).\n"
        "- If day_row is null, say that exact date did not appear in the returned calendar slice; mention nearby_priced_dates if useful.\n"
        "- Always note figures are from the public booking API snapshot, not a group-quote guarantee.\n"
        "Keep the answer to 2–4 short sentences."
    )
    answer_user = json.dumps(
        {
            "user_question": text,
            "search_params": {"origin": origin, "destination": dest, "departure_date": dep, "adults": pax},
            "facts": facts,
        },
        ensure_ascii=False,
    )

    final = await groq_chat_text(
        system=answer_system,
        user=answer_user,
        temperature=0.25,
        max_tokens=350,
    )
    if not final:
        # Template fallback without second LLM call
        dr = facts.get("day_row")
        if isinstance(dr, dict) and dr.get("has_positive_fare"):
            fare = dr.get("lowest_fare")
            cur = facts.get("currency") or "USD"
            return FlightChatResponse(
                answer=(
                    f"Live search shows fares for {origin}→{dest} around {_date_key(dep)}: "
                    f"lowest seen about {fare} {cur} (booking API snapshot; not a contract quote)."
                ),
                source="live_api",
            )
        return FlightChatResponse(
            answer=(
                f"Live search for {origin}→{dest} near {_date_key(dep)} did not return a positive fare for that day "
                "in this window. Open Find flights for the full calendar."
            ),
            source="live_api",
        )

    return FlightChatResponse(answer=final, source="live_api")
