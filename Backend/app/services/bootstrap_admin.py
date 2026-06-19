"""One-time admin bootstrap from environment variables (hosted DB recovery)."""
from __future__ import annotations

import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User

logger = logging.getLogger("uvicorn.error")


def ensure_bootstrap_admin(db: Session) -> None:
    email = (settings.BOOTSTRAP_ADMIN_EMAIL or "").strip().lower()
    password = settings.BOOTSTRAP_ADMIN_PASSWORD or ""
    name = (settings.BOOTSTRAP_ADMIN_NAME or "Portal Admin").strip() or "Portal Admin"
    if not email or not password:
        return
    if len(password) < 6:
        logger.warning("BOOTSTRAP_ADMIN_PASSWORD ignored: must be at least 6 characters")
        return

    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        if existing.role != "admin":
            existing.role = "admin"
            existing.password = get_password_hash(password)
            existing.is_active = True
            db.commit()
            logger.info("Bootstrap: promoted existing user to admin (%s)", existing.email)
        return

    user = User(
        name=name,
        email=email,
        password=get_password_hash(password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    logger.info("Bootstrap: created admin user (%s)", user.email)
