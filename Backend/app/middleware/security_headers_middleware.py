"""Security headers + HTTPS enforcement middleware."""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

from fastapi import Request
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware


_CSP_POLICY = "; ".join(
    [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "connect-src 'self' ws: wss: https:",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ]
)


def _is_local_host(host: str) -> bool:
    host = (host or "").split(":", 1)[0].lower()
    return host in {"localhost", "127.0.0.1", "::1", "testserver"}


def _request_uses_https(req: Request) -> bool:
    xf_proto = (req.headers.get("x-forwarded-proto") or "").split(",")[0].strip().lower()
    if xf_proto:
        return xf_proto == "https"
    return req.url.scheme == "https"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "")
        is_local = _is_local_host(host)
        is_https = _request_uses_https(request)

        # Force HTTPS for non-local traffic.
        if not is_local and not is_https:
            parts = urlsplit(str(request.url))
            https_url = urlunsplit(("https", parts.netloc, parts.path, parts.query, parts.fragment))
            return RedirectResponse(url=https_url, status_code=307)

        response = await call_next(request)

        response.headers["Content-Security-Policy"] = _CSP_POLICY
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"

        if is_https and not is_local:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response
