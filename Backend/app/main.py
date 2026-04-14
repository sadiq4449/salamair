from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request as FastAPIRequest, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.auth import router as auth_router
from app.api.routes.requests import router as requests_router
from app.api.routes.sales import router as sales_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import User, Request, Attachment, RequestHistory, CounterOffer  # noqa: F401

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="Salam Air SmartDeal API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
async def generic_exception_handler(_request: FastAPIRequest, _exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(requests_router, prefix="/api/v1/requests", tags=["Requests"])
app.include_router(sales_router, prefix="/api/v1/sales", tags=["Sales"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "Salam Air SmartDeal API"}


if UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
