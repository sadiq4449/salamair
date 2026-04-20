"""Server-side calls to SalamAir public booking API (same as proxy: booking origin headers)."""

from __future__ import annotations

import logging
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
}


async def create_salamair_session(client: httpx.AsyncClient) -> Optional[str]:
    r = await client.post(f"{API_ORIGIN}/api/session", headers=_BASE_HEADERS, content=b"")
    if r.status_code not in (200, 204):
        logger.warning("SalamAir session HTTP %s", r.status_code)
        return None
    return r.headers.get("x-session-token") or r.headers.get("X-Session-Token")


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
