import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request as FastAPIRequest, status
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.auth import router as auth_router
from app.api.routes.email import router as email_router
from app.api.routes.messages import router as messages_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.admin import router as admin_router
from app.api.routes.admin_data import router as admin_data_router
from app.api.routes.admin_explorer import router as admin_explorer_router
from app.api.routes.requests import router as requests_router
from app.api.routes.search import router as search_router
from app.api.routes.sla import router as sla_router
from app.api.routes.tags import router as tags_router
from app.api.routes.sales import router as sales_router
from app.api.routes.ws import router as ws_router
from app.api.routes.proxy import router as proxy_router
from app.api.routes.salamair_api_proxy import router as salamair_api_proxy_router
from app.api.routes.ai import router as ai_router
from app.core.config import settings, validate_production_settings
from app.core.rate_limit import limiter
from app.core.logging_filters import install_sensitive_log_redaction
from app.db.base import Base
from app.db.schema_sync import apply_runtime_schema_fixes
from app.db.session import engine
from app.services.websocket_manager import manager as ws_manager
from app.models import (  # noqa: F401
    User,
    AgentProfile,
    Request,
    Attachment,
    RequestHistory,
    CounterOffer,
    EmailThread,
    EmailMessage,
    EmailAttachment,
    Message,
    MessageAttachment,
    MessageReadStatus,
    Notification,
    NotificationPreference,
    AnalyticsSnapshot,
    SystemLog,
    SystemConfig,
    Tag,
    SlaTracking,
    ReminderConfig,
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"

# Avoid JWTs and Bearer tokens in uvicorn access/error lines (Railway log history).
install_sensitive_log_redaction()


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_production_settings()
    Base.metadata.create_all(bind=engine)
    apply_runtime_schema_fixes(engine)
    # Capture the running event loop so sync endpoints can schedule WS pushes.
    ws_manager.bind_loop(asyncio.get_running_loop())
    app.state.started_at_utc = datetime.now(timezone.utc)
    yield


app = FastAPI(
    title="Salam Air SmartDeal API",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=(settings.CORS_ORIGIN_REGEX.strip() or None),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: FastAPIRequest, exc: HTTPException):
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        content = {"error": {"code": "HTTP_ERROR", "message": str(exc.detail)}}
    return JSONResponse(status_code=exc.status_code, content=content, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: FastAPIRequest, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"])
        errors.append({"field": field, "message": err["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": errors,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(_request: FastAPIRequest, exc: Exception):
    import logging
    logging.getLogger("uvicorn.error").exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(requests_router, prefix="/api/v1/requests", tags=["Requests"])
app.include_router(sales_router, prefix="/api/v1/sales", tags=["Sales"])
app.include_router(email_router, prefix="/api/v1/email", tags=["Email"])
app.include_router(messages_router, prefix="/api/v1/messages", tags=["Messages"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(admin_data_router, prefix="/api/v1/admin", tags=["Admin Data"])
app.include_router(admin_explorer_router, prefix="/api/v1/admin/db", tags=["Admin DB Explorer"])
app.include_router(sla_router, prefix="/api/v1/sla", tags=["SLA"])
app.include_router(search_router, prefix="/api/v1/search", tags=["Search"])
app.include_router(tags_router, prefix="/api/v1/tags", tags=["Tags"])
app.include_router(ws_router, prefix="/api/v1", tags=["WebSocket"])
app.include_router(proxy_router, prefix="/api/v1/proxy/salamair", tags=["Proxy"])
app.include_router(
    salamair_api_proxy_router,
    prefix="/api/v1/proxy/salamair-api",
    tags=["SalamAir API proxy"],
)
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "Salam Air SmartDeal API"}


# Ensure the upload directory exists before mounting StaticFiles (runs at
# import time, before the lifespan startup hook).
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
