import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.notification_schema import (
    MarkAllReadResponse,
    MarkReadResponse,
    NotificationListResponse,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    UnreadCountResponse,
)
from app.services.notification_service import (
    get_notifications,
    get_or_create_preferences,
    get_unread_count,
    mark_all_read,
    mark_read,
    update_preferences,
)

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    is_read: bool | None = Query(None),
    type: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total, unread_count = get_notifications(
        db, current_user.id,
        is_read=is_read,
        notif_type=type,
        page=page,
        limit=limit,
    )
    return NotificationListResponse(
        items=[
            NotificationRead(
                id=n.id,
                type=n.type,
                title=n.title,
                message=n.message,
                request_id=n.request_id,
                request_code=n.request_code,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in items
        ],
        total=total,
        unread_count=unread_count,
        page=page,
        limit=limit,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def notification_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UnreadCountResponse(unread_count=get_unread_count(db, current_user.id))


@router.put("/{notification_id}/read", response_model=MarkReadResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = mark_read(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Notification not found"}},
        )
    return MarkReadResponse(message="Notification marked as read")


@router.put("/read-all", response_model=MarkAllReadResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = mark_all_read(db, current_user.id)
    return MarkAllReadResponse(message="All notifications marked as read", count=count)


@router.get("/preferences", response_model=NotificationPreferenceRead)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = get_or_create_preferences(db, current_user.id)
    return NotificationPreferenceRead(
        in_app_enabled=pref.in_app_enabled,
        email_enabled=pref.email_enabled,
        sound_enabled=pref.sound_enabled,
        types_disabled=pref.types_disabled or [],
    )


@router.put("/preferences", response_model=NotificationPreferenceRead)
def save_preferences(
    payload: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = update_preferences(
        db,
        current_user.id,
        in_app_enabled=payload.in_app_enabled,
        email_enabled=payload.email_enabled,
        sound_enabled=payload.sound_enabled,
        types_disabled=payload.types_disabled,
    )
    return NotificationPreferenceRead(
        in_app_enabled=pref.in_app_enabled,
        email_enabled=pref.email_enabled,
        sound_enabled=pref.sound_enabled,
        types_disabled=pref.types_disabled or [],
    )
