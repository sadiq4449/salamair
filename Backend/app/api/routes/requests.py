import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import extract, func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db, require_role
from app.models.attachment import Attachment
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.user import User
from app.schemas.attachment import AttachmentRead
from app.schemas.request import (
    RequestCreate,
    RequestListItem,
    RequestListResponse,
    RequestRead,
    RequestUpdate,
)
from app.services.notification_service import (
    compute_sla,
    notify_request_created,
    format_notification,
)
from app.services.websocket_manager import manager

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "uploads")


def _generate_request_code(db: Session) -> str:
    year = datetime.utcnow().year
    last = (
        db.query(Request)
        .filter(extract("year", Request.created_at) == year)
        .order_by(Request.request_code.desc())
        .first()
    )
    if last and last.request_code:
        try:
            seq = int(last.request_code.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"REQ-{year}-{seq:03d}"


def _log_history(
    db: Session,
    request_id: uuid.UUID,
    action: str,
    actor_id: uuid.UUID,
    from_status: str | None = None,
    to_status: str | None = None,
    details: str | None = None,
) -> None:
    entry = RequestHistory(
        request_id=request_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        actor_id=actor_id,
        details=details,
    )
    db.add(entry)


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    request_code = _generate_request_code(db)
    new_status = "draft" if payload.is_draft else "submitted"

    req = Request(
        request_code=request_code,
        agent_id=current_user.id,
        route=payload.route,
        pax=payload.pax,
        price=payload.price,
        travel_date=payload.travel_date,
        return_date=payload.return_date,
        notes=payload.notes,
        priority=payload.priority,
        status=new_status,
    )
    db.add(req)
    db.flush()

    action = "created_draft" if payload.is_draft else "submitted"
    _log_history(db, req.id, action, current_user.id, to_status=new_status)

    db.commit()
    db.refresh(req)

    if new_status == "submitted":
        try:
            notifications = notify_request_created(db, req)
            import asyncio
            for n in notifications:
                asyncio.ensure_future(manager.push_to_user(str(n.user_id), {
                    "event": "notification",
                    "data": format_notification(n),
                }))
        except Exception as e:
            logger.warning("Failed to send request-created notifications: %s", e)

    return req


@router.get("", response_model=RequestListResponse)
def list_requests(
    status_filter: str | None = Query(None, alias="status"),
    route: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Request).options(joinedload(Request.agent))

    if current_user.role == "agent":
        query = query.filter(Request.agent_id == current_user.id)

    if status_filter:
        query = query.filter(Request.status == status_filter)
    if route:
        query = query.filter(Request.route.ilike(f"%{route}%"))
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Request.request_code.ilike(term),
                Request.route.ilike(term),
                Request.notes.ilike(term),
            )
        )

    total = query.count()
    requests = (
        query.order_by(Request.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for r in requests:
        items.append(
            RequestListItem(
                id=r.id,
                request_code=r.request_code,
                agent_id=r.agent_id,
                agent_name=r.agent.name if r.agent else None,
                route=r.route,
                pax=r.pax,
                price=r.price,
                status=r.status,
                priority=r.priority,
                travel_date=r.travel_date,
                created_at=r.created_at,
            )
        )

    return RequestListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/{request_id}", response_model=RequestRead)
def get_request(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = (
        db.query(Request)
        .options(joinedload(Request.agent), joinedload(Request.attachments))
        .filter(Request.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You can only view your own requests"}},
        )
    return req


@router.put("/{request_id}", response_model=RequestRead)
def update_request(
    request_id: uuid.UUID,
    payload: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent")),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You can only edit your own requests"}},
        )
    if req.status not in ("draft", "submitted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": f"Cannot edit request in '{req.status}' status"}},
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(req, field, value)

    _log_history(db, req.id, "updated", current_user.id, details=f"Updated fields: {', '.join(update_data.keys())}")
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/attachments", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    request_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You can only upload to your own requests"}},
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_ext = os.path.splitext(file.filename or "file")[1]
    unique_name = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    contents = file.file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        request_id=request_id,
        filename=file.filename or "unknown",
        file_url=f"/uploads/{unique_name}",
        file_type=file.content_type or "application/octet-stream",
        file_size=len(contents),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{request_id}/sla")
def get_request_sla(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    sla = compute_sla(req)
    return {"request_id": str(req.id), "request_code": req.request_code, "status": req.status, "sla": sla}


@router.get("/{request_id}/attachments", response_model=list[AttachmentRead])
def list_attachments(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You can only view your own request attachments"}},
        )
    return db.query(Attachment).filter(Attachment.request_id == request_id).all()
