"""Security audit logging for authentication and access-control events."""
from __future__ import annotations

import json
import logging
from typing import Any

_security_logger = logging.getLogger("app.security")

_REDACT_KEYS = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "secret",
}


def _safe_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): ("<redacted>" if str(k).lower() in _REDACT_KEYS else _safe_value(v)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_safe_value(v) for v in value]
    if isinstance(value, str) and len(value) > 500:
        return value[:500] + "..."
    return value


def log_security_event(event: str, **fields: Any) -> None:
    payload = {"event": event, **_safe_value(fields)}
    _security_logger.info(json.dumps(payload, default=str, ensure_ascii=True))
