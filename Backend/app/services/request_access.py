"""Shared rules: who may access a Request (REST, WebSocket, reads)."""

from __future__ import annotations

import uuid

from app.models.request import Request
from app.models.user import User


def user_can_access_request(user: User, req: Request) -> bool:
    """Aligns with messages/requests REST: agents only see own requests; sales/admin see all."""
    if user.role == "agent":
        return req.agent_id == user.id
    return user.role in ("sales", "admin")
