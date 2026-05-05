"""Request tracing + metrics middleware."""

from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.observability import metrics_registry

logger = logging.getLogger("uvicorn.error")


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-Id") or str(uuid4())
        request.state.trace_id = trace_id
        started = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - started) * 1000.0
        response.headers["X-Trace-Id"] = trace_id
        metrics_registry.record(duration_ms=duration_ms, status_code=response.status_code)

        logger.info(
            "request_completed method=%s path=%s status=%s duration_ms=%.2f trace_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            trace_id,
        )
        return response
