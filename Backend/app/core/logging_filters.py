"""Remove secrets from log lines (JWT query params, Bearer tokens)."""
from __future__ import annotations

import logging
import re


def redact_log_line(text: str) -> str:
    if not text:
        return text
    # WebSocket / HTTP: ?token=eyJ... or &token=...
    text = re.sub(
        r"([?&])(token|access_token)=([^&\s'\"]+)",
        r"\1\2=<redacted>",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"(?i)(authorization:\s*)(bearer\s+)(\S+)",
        r"\1\2<redacted>",
        text,
    )
    text = re.sub(
        r"(?i)(bearer\s+)([A-Za-z0-9._\-]+)",
        r"\1<redacted>",
        text,
    )
    return text


class RedactSensitiveLogFilter(logging.Filter):
    """Mutates LogRecord so getMessage() never prints JWTs in URLs or Bearer tokens."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            original = record.getMessage()
        except Exception:
            return True
        redacted = redact_log_line(original)
        if redacted != original:
            record.msg = redacted
            record.args = ()
        return True


def install_sensitive_log_redaction() -> None:
    f = RedactSensitiveLogFilter()
    for name in ("uvicorn.access", "uvicorn.error"):
        logging.getLogger(name).addFilter(f)
