"""
Reverse proxy for booking.salamair.com so the real site can load inside an
iframe on the portal (their server sends X-Frame-Options: DENY which blocks
direct embedding).

How it works
────────────
  Browser iframe  →  /api/v1/proxy/salamair/{path}
                          ↓
  Backend fetches  →  https://booking.salamair.com/{path}
                          ↓
  Strips X-Frame-Options / CSP frame-ancestors from the response
                          ↓
  Rewrites absolute URLs so sub-resources also go through the proxy
                          ↓
  Returns to the browser as if it were our own page
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.core.rate_limit import BOOKING_PROXY_RATE, limiter

router = APIRouter()

TARGET_ORIGIN = "https://booking.salamair.com"

STRIP_RESPONSE_HEADERS = {
    "x-frame-options",
    "content-security-policy",
    "content-security-policy-report-only",
    "strict-transport-security",
    "transfer-encoding",
    "content-encoding",
    "content-length",
}

_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )
    return _client


def _rewrite_html(html: str, proxy_prefix: str) -> str:
    """Rewrite absolute references to booking.salamair.com so they route
    through the proxy and sub-requests don't break."""
    html = html.replace("https://booking.salamair.com", proxy_prefix)
    html = html.replace("http://booking.salamair.com", proxy_prefix)
    html = html.replace("//booking.salamair.com", proxy_prefix)
    return html


def _rewrite_css(css: str, proxy_prefix: str) -> str:
    """Rewrite url(...) inside CSS that point to the target origin."""
    css = css.replace("https://booking.salamair.com", proxy_prefix)
    css = css.replace("http://booking.salamair.com", proxy_prefix)
    return css


@router.get("/{path:path}")
@limiter.limit(BOOKING_PROXY_RATE)
async def proxy_salamair(request: Request, path: str):
    target_url = urljoin(TARGET_ORIGIN + "/", path)

    if request.url.query:
        target_url += "?" + str(request.url.query)

    client = await _get_client()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": request.headers.get("accept", "*/*"),
        "Accept-Language": request.headers.get("accept-language", "en-US,en;q=0.9"),
        "Referer": TARGET_ORIGIN + "/",
    }

    resp = await client.get(target_url, headers=headers)

    content_type = resp.headers.get("content-type", "")
    proxy_prefix = str(request.url_for("proxy_salamair", path="")).rstrip("/")

    body = resp.content

    if "text/html" in content_type:
        text = resp.text
        text = _rewrite_html(text, proxy_prefix)
        # Inject a <base> so relative URLs resolve correctly
        base_tag = f'<base href="{proxy_prefix}/">'
        text = re.sub(r"(<head[^>]*>)", rf"\1{base_tag}", text, count=1, flags=re.IGNORECASE)
        body = text.encode("utf-8")
    elif "text/css" in content_type:
        text = resp.text
        text = _rewrite_css(text, proxy_prefix)
        body = text.encode("utf-8")

    out_headers: dict[str, str] = {}
    for key, val in resp.headers.items():
        if key.lower() not in STRIP_RESPONSE_HEADERS:
            out_headers[key] = val

    out_headers["content-type"] = content_type

    return Response(
        content=body,
        status_code=resp.status_code,
        headers=out_headers,
    )
