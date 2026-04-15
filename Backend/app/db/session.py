from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _pg_connect_args(url: str) -> dict:
    mode = (settings.DATABASE_SSLMODE or "").strip().lower()
    if mode == "disable":
        return {}
    if mode == "require":
        return {"sslmode": "require"}
    u = url.lower()
    if "localhost" in u or "127.0.0.1" in u:
        return {}
    if "sslmode=" in u:
        return {}
    if "railway.internal" in u:
        return {}
    if ".rlwy.net" in u or ".amazonaws.com" in u:
        return {"sslmode": "require"}
    return {}


_connect_args = _pg_connect_args(settings.DATABASE_URL)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
