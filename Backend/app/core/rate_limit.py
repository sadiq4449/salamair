from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Stricter outside development (abuse: public booking HTML proxy).
_env = (settings.ENVIRONMENT or "").strip().lower()
_is_dev = _env in ("development", "dev", "local", "")

# Security requirement: cap login attempts to 3 per minute.
AUTH_RATE = "3/minute"
BOOKING_PROXY_RATE = "180/minute" if _is_dev else "45/minute"

limiter = Limiter(key_func=get_remote_address)
