"""
Proxy to SalamAir's public booking API (https://api.salamair.com).

The React app on booking.salamair.com calls this host with X-Session-Token + Culture
(see minified bundle: REACT_APP_API_HOST). CloudFront CORS only allows the booking
origin, so the SmartDeal portal cannot call it from the browser; we forward requests
server-side with Origin/Referer set to the booking site.

Typical flow:
  1. POST api/session  (empty body) → 204 + X-Session-Token header
  2. GET  api/flights?TripType=1&OriginStationCode=...&...  with session header
"""

from __future__ import annotations

from urllib.parse import urljoin

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

API_ORIGIN = "https://api.salamair.com"
BOOKING_ORIGIN = "https://booking.salamair.com"

# Do not forward these from upstream to the client
STRIP_RESPONSE_HEADERS = {
    "transfer-encoding",
    "content-encoding",
    "content-length",
    "connection",
    "strict-transport-security",
}

_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(60.0, connect=15.0),
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=10),
        )
    return _client


def _pick_request_headers(request: Request) -> dict[str, str]:
    """Mirror the booking SPA's fetch headers (Ne(token, culture) in their bundle)."""
    h: dict[str, str] = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Origin": BOOKING_ORIGIN,
        "Referer": BOOKING_ORIGIN + "/en/search",
        "Accept": request.headers.get("accept") or "application/json",
        "cache-control": "no-store",
    }
    token = request.headers.get("x-session-token")
    if token:
        h["X-Session-Token"] = token
    culture = request.headers.get("culture") or "en"
    h["Culture"] = culture
    ct = request.headers.get("content-type")
    if ct and request.method in ("POST", "PUT", "PATCH"):
        h["Content-Type"] = ct
    return h


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_salamair_public_api(
    path: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    target = urljoin(API_ORIGIN + "/", path)
    if request.url.query:
        target += "?" + str(request.url.query)

    client = await _get_client()
    headers = _pick_request_headers(request)
    body = await request.body() if request.method in ("POST", "PUT", "PATCH") else None

    resp = await client.request(request.method, target, headers=headers, content=body)

    out_headers: dict[str, str] = {}
    for key, val in resp.headers.items():
        if key.lower() not in STRIP_RESPONSE_HEADERS:
            out_headers[key] = val

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=out_headers,
    )
