"""Double-submit cookie CSRF protection (header must match readable cookie)."""
import os
import secrets

from starlette.responses import Response

from app.core.config import settings

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def _cookie_secure() -> bool:
    env = (settings.ENVIRONMENT or "").strip().lower()
    if env in ("production", "prod"):
        return True
    if os.environ.get("RENDER", "").strip().lower() == "true":
        return True
    return False


def set_csrf_cookie(response: Response, token: str) -> None:
    """Non-HttpOnly cookie so the SPA can mirror the value into X-CSRF-Token on mutating requests."""
    max_age = max(60, int(settings.ACCESS_TOKEN_EXPIRE_MINUTES) * 60)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=False,
        samesite="lax",
        secure=_cookie_secure(),
        path="/",
    )
