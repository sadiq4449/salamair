"""Server-side calls to SalamAir public booking API (same as proxy: booking origin headers)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

API_ORIGIN = "https://api.salamair.com"
BOOKING_ORIGIN = "https://booking.salamair.com"

_BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Origin": BOOKING_ORIGIN,
    "Referer": BOOKING_ORIGIN + "/en/search",
    "Accept": "application/json",
    "cache-control": "no-store",
    # Booking SPA sends these on session; empty POST body alone is often rejected.
    "Culture": "en",
}


def _session_token_from_response(r: httpx.Response) -> Optional[str]:
    """Header names may vary in casing; httpx lookups are case-insensitive."""
    h = r.headers
    return h.get("x-session-token") or h.get("X-Session-Token")


@dataclass
class SalamAirSessionOutcome:
    token: Optional[str]
    """forbidden = HTTP 403 (often cloud IP / WAF); unavailable = other HTTP failure."""
    error: Optional[str] = None


async def create_salamair_session(client: httpx.AsyncClient) -> SalamAirSessionOutcome:
    # Mirror frontend: POST {} as JSON (see salamairApi.ts api.post(..., {})).
    headers = {**_BASE_HEADERS}
    last_status: int | None = None
    saw_network_error = False
    for attempt in range(3):
        try:
            r = await client.post(f"{API_ORIGIN}/api/session", headers=headers, json={})
        except httpx.RequestError as e:
            saw_network_error = True
            logger.warning("SalamAir session request error attempt %s: %s", attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))
            continue
        last_status = r.status_code
        if r.status_code not in (200, 201, 204):
            snippet = (r.text or "")[:300].replace("\n", " ")
            logger.warning("SalamAir session HTTP %s body=%r", r.status_code, snippet)
            if r.status_code == 403:
                logger.warning("SalamAir session 403 — possible IP/WAF block from host network")
                return SalamAirSessionOutcome(None, "forbidden")
            if attempt < 2 and r.status_code in (408, 425, 429, 500, 502, 503, 504):
                await asyncio.sleep(0.6 * (attempt + 1))
                continue
            return SalamAirSessionOutcome(None, "unavailable")
        token = _session_token_from_response(r)
        if token:
            return SalamAirSessionOutcome(token, None)
        logger.warning("SalamAir session OK but no X-Session-Token header (status=%s)", r.status_code)
        if attempt < 2:
            await asyncio.sleep(0.4 * (attempt + 1))
    if saw_network_error and last_status is None:
        return SalamAirSessionOutcome(None, "network")
    return SalamAirSessionOutcome(None, "unavailable")


async def search_flights_oneway(
    client: httpx.AsyncClient,
    session_token: str,
    *,
    origin: str,
    destination: str,
    departure_date: str,
    adults: int = 1,
    days: int = 7,
) -> Optional[dict[str, Any]]:
    """GET api/flights — returns JSON body or None on failure."""
    o, d = origin.strip().upper(), destination.strip().upper()
    dep = departure_date.strip()[:10]
    a = max(1, min(adults, 9))
    qs = (
        f"TripType=1&OriginStationCode={o}&DestinationStationCode={d}"
        f"&DepartureDate={dep}&AdultCount={a}&ChildCount=0&InfantCount=0&extraCount=0&days={days}"
    )
    headers = {**_BASE_HEADERS, "X-Session-Token": session_token, "Culture": "en"}
    r = await client.get(f"{API_ORIGIN}/api/flights?{qs}", headers=headers)
    if r.status_code != 200:
        logger.warning("SalamAir flights HTTP %s", r.status_code)
        return None
    try:
        return r.json()
    except ValueError:
        return None
