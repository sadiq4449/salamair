import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.csrf import CSRF_COOKIE_NAME, CSRF_HEADER_NAME

_UNSAFE = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _csrf_exempt(path: str, method: str) -> bool:
    """Paths that must not require CSRF (browser preflight, public, or non-cookie clients)."""
    if path == "/api/health":
        return True
    if path == "/api/v1/auth/csrf" and method == "GET":
        return True
    # Swagger / OpenAPI OAuth2 password flow cannot set custom headers easily.
    if path == "/api/v1/auth/login/token" and method == "POST":
        return True
    # Cron / server callers use X-Email-Poll-Secret or JWT; no browser CSRF cookie.
    if path == "/api/v1/email/poll-inbox" and method == "POST":
        return True
    return False


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        if method not in _UNSAFE:
            return await call_next(request)

        path = request.url.path
        if not path.startswith("/api/") or _csrf_exempt(path, method):
            return await call_next(request)

        cookie = request.cookies.get(CSRF_COOKIE_NAME) or ""
        header = request.headers.get(CSRF_HEADER_NAME) or ""
        if not cookie or not header or not secrets.compare_digest(cookie, header):
            return JSONResponse(
                status_code=403,
                content={
                    "error": {
                        "code": "CSRF_FAILED",
                        "message": "Missing or invalid CSRF token. Call GET /api/v1/auth/csrf first, then send the same value in the X-CSRF-Token header on mutating requests.",
                    }
                },
            )

        return await call_next(request)
