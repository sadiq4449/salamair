"""Shared guards: sales isolation on requests (same agent rules unchanged)."""

from fastapi import HTTPException, status

from app.models.request import Request
from app.models.user import User


def ensure_sales_can_view_request(req: Request, user: User) -> None:
    """
    Sales may open request metadata (queue/detail, attachments) only if the request is
    unassigned or assigned to them—not when a colleague owns it.
    """
    if user.role != "sales":
        return
    if req.assigned_to and req.assigned_to != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "This request is assigned to another sales user.",
                }
            },
        )


def ensure_sales_conversation_access(req: Request, user: User) -> None:
    """Chat, email, history, internal notes: only the assigned sales user."""
    if user.role != "sales":
        return
    if req.assigned_to != user.id:
        msg = (
            "Claim this request before viewing messages or email."
            if req.assigned_to is None
            else "Only the assigned sales user can access this conversation."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": msg}},
        )


def ensure_sales_can_mutate(req: Request, user: User) -> None:
    """
    Approve/reject/counter/email-RM/etc.: may not act on a colleague's request;
    unassigned requests can be picked up (assign in handler).
    """
    if user.role != "sales":
        return
    if req.assigned_to and req.assigned_to != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "This request is assigned to another sales user.",
                }
            },
        )


def sales_assign_if_unset(req: Request, user: User) -> None:
    """First-touch assignment for sales actions on unclaimed requests."""
    if user.role == "sales" and user.id and not req.assigned_to:
        req.assigned_to = user.id
