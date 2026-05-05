"""Reject oversized API request bodies to reduce DOS risk."""

from __future__ import annotations

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Checks body size for mutating API requests before route handlers run."""

    def __init__(self, app, max_bytes: int):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        if request.method not in {"POST", "PUT", "PATCH"}:
            return await call_next(request)
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        content_type = (request.headers.get("content-type") or "").lower()
        # Multipart file uploads are already constrained by dedicated upload-size guards.
        if "multipart/form-data" in content_type:
            return await call_next(request)

        cl = request.headers.get("content-length")
        if cl:
            try:
                if int(cl) > self.max_bytes:
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content={
                            "error": {
                                "code": "REQUEST_TOO_LARGE",
                                "message": f"Request body exceeds maximum size ({self.max_bytes // (1024 * 1024)} MB)",
                            }
                        },
                    )
            except ValueError:
                # Ignore malformed content-length; body read check below handles it.
                pass

        body = await request.body()
        if len(body) > self.max_bytes:
            return JSONResponse(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                content={
                    "error": {
                        "code": "REQUEST_TOO_LARGE",
                        "message": f"Request body exceeds maximum size ({self.max_bytes // (1024 * 1024)} MB)",
                    }
                },
            )

        # Rehydrate body for downstream handlers after reading it in middleware.
        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        request._receive = receive
        return await call_next(request)
