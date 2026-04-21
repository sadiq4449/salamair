import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.message import Message
from app.models.message_attachment import MessageAttachment
from app.models.request import Request
from app.models.user import User
from app.schemas.message_schema import AdminMessagePatch, SendMessageRequest
from app.services.message_service import (
    create_chat_message,
    filter_message_ids_for_user,
    format_message,
    get_timeline,
    mark_messages_read,
)
from app.services.request_access import user_can_access_request
from app.services.upload_limits import get_max_upload_bytes

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "chat"


def _get_request_or_404(db: Session, request_id: uuid.UUID) -> Request:
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    return req


def _check_access(req: Request, user: User):
    if not user_can_access_request(user, req):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )


@router.patch("/chat/{message_id}", status_code=status.HTTP_200_OK)
def admin_patch_message(
    message_id: uuid.UUID,
    payload: AdminMessagePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}},
        )
    if msg.type != "chat":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TYPE", "message": "Only chat messages can be edited"}},
        )
    req = _get_request_or_404(db, msg.request_id)
    _check_access(req, current_user)
    msg.content = payload.content
    db.commit()
    db.refresh(msg)
    return format_message(msg, current_user.id, db)


@router.delete("/chat/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}},
        )
    if msg.type != "chat":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TYPE", "message": "Only chat messages can be deleted"}},
        )
    req = _get_request_or_404(db, msg.request_id)
    _check_access(req, current_user)
    db.delete(msg)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("", status_code=status.HTTP_201_CREATED)
def send_message(
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "sales", "admin")),
):
    req = _get_request_or_404(db, payload.request_id)
    _check_access(req, current_user)

    msg = create_chat_message(db, payload.request_id, current_user, payload.content)
    return format_message(msg, current_user.id, db)


@router.get("/{request_id}")
def get_messages(
    request_id: uuid.UUID,
    type: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "sales", "admin")),
):
    req = _get_request_or_404(db, request_id)
    _check_access(req, current_user)

    messages, total = get_timeline(db, request_id, current_user.id, type, page, limit)
    items = [format_message(m, current_user.id, db) for m in messages]

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.post("/attachment", status_code=status.HTTP_201_CREATED)
async def upload_chat_attachment(
    request_id: uuid.UUID = Query(...),
    message_id: uuid.UUID = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "sales", "admin")),
):
    req = _get_request_or_404(db, request_id)
    _check_access(req, current_user)

    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg or msg.request_id != request_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}},
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "file").suffix
    safe_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / safe_name

    max_bytes = get_max_upload_bytes(db)
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"File exceeds maximum size ({max_bytes // (1024 * 1024)} MB)",
                }
            },
        )
    file_path.write_bytes(content)

    att = MessageAttachment(
        message_id=message_id,
        filename=file.filename or "file",
        file_url=f"/uploads/chat/{safe_name}",
        file_type=file.content_type or "application/octet-stream",
        file_size=len(content),
    )
    db.add(att)
    db.commit()
    db.refresh(att)

    return {
        "id": str(att.id),
        "filename": att.filename,
        "file_url": att.file_url,
        "file_type": att.file_type,
        "file_size": att.file_size,
    }


@router.post("/read")
def mark_read(
    message_ids: list[uuid.UUID],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "sales", "admin")),
):
    allowed = filter_message_ids_for_user(db, current_user, message_ids)
    marked = mark_messages_read(db, allowed, current_user.id)
    return {"marked": marked}
