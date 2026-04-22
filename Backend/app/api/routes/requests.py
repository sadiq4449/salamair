import logging
import os
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from pydantic import BaseModel, Field

from app.api.deps import get_current_user, get_db, require_role
from app.models.attachment import Attachment
from app.models.counter_offer import CounterOffer
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.tag import Tag
from app.models.user import User
from app.schemas.advanced_schema import RequestTagsBody, TagBrief
from app.schemas.attachment import AttachmentRead
from app.schemas.counter_offer_schema import CounterOfferRead
from app.schemas.request import (
    RequestCreate,
    RequestListItem,
    RequestListResponse,
    RequestRead,
    RequestUpdate,
)
from app.services.bulk_request_excel import build_template_workbook, commit_bulk_upload, preview_bulk
from app.services.request_codes import generate_request_code
from app.services.request_access import user_can_access_request
from app.services.request_export_service import build_export_bytes
from app.services.upload_limits import get_max_upload_bytes
from app.services.notification_service import (
    compute_sla,
    notify_counter_accepted,
    notify_counter_rejected,
    notify_request_created,
    format_notification,
)
from app.services.sla_service import sync_sla_for_request
from app.services.websocket_manager import manager

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "uploads")


def _enforce_upload_size(raw: bytes, db: Session) -> None:
    max_b = get_max_upload_bytes(db)
    if len(raw) > max_b:
        mb = max(max_b // (1024 * 1024), 1)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": f"File exceeds maximum size ({mb} MB)"}},
        )


# Backwards-compatible alias; the canonical implementation lives in
# ``app.services.request_codes`` so the bulk-upload service can share it
# without creating a circular import.
_generate_request_code = generate_request_code


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


def _build_counter_offer_reads(db: Session, request_id: uuid.UUID) -> list[CounterOfferRead]:
    """Load counter offers with creator in one query — do not rely on ORM lazy/selectinload on Request."""
    rows = (
        db.query(CounterOffer)
        .options(joinedload(CounterOffer.creator))
        .filter(CounterOffer.request_id == request_id)
        .order_by(CounterOffer.created_at.desc())
        .all()
    )
    out: list[CounterOfferRead] = []
    for o in rows:
        st = (o.status or "pending").strip() or "pending"
        out.append(
            CounterOfferRead(
                id=o.id,
                request_id=o.request_id,
                original_price=float(o.original_price),
                counter_price=float(o.counter_price),
                message=o.message,
                created_by=o.created_by,
                creator_name=o.creator.name if o.creator else None,
                status=st,
                created_at=o.created_at,
            )
        )
    return out


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "admin")),
):
    if current_user.role == "admin":
        if not payload.agent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "AGENT_REQUIRED", "message": "agent_id is required when creating a request as administrator"}},
            )
        agent_user = db.query(User).filter(User.id == payload.agent_id, User.role == "agent").first()
        if not agent_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "INVALID_AGENT", "message": "agent_id must refer to an active agent user"}},
            )
        owner_id = agent_user.id
    else:
        if payload.agent_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "FORBIDDEN", "message": "Agents cannot set agent_id"}},
            )
        owner_id = current_user.id

    request_code = generate_request_code(db)
    new_status = "draft" if payload.is_draft else "submitted"

    req = Request(
        request_code=request_code,
        agent_id=owner_id,
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
    hist_details = None
    if current_user.role == "admin":
        hist_details = f"Created by administrator for agent {owner_id}"
    _log_history(db, req.id, action, current_user.id, to_status=new_status, details=hist_details)

    if new_status == "submitted":
        try:
            sync_sla_for_request(db, req)
        except Exception as e:
            logger.warning("SLA sync on create failed: %s", e)

    db.commit()
    req_out = (
        db.query(Request)
        .options(joinedload(Request.agent), joinedload(Request.attachments), joinedload(Request.tags))
        .filter(Request.id == req.id)
        .first()
    )

    if new_status == "submitted":
        try:
            notifications = notify_request_created(db, req)
            for n in notifications:
                manager.push_to_user_threadsafe(str(n.user_id), {
                    "event": "notification",
                    "data": format_notification(n),
                })
        except Exception as e:
            logger.warning("Failed to send request-created notifications: %s", e)

    return req_out or req


@router.get("", response_model=RequestListResponse)
def list_requests(
    status_filter: str | None = Query(None, alias="status"),
    route: str | None = None,
    search: str | None = None,
    tag_ids: str | None = Query(None, description="Comma-separated tag UUIDs (match any)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Request).options(joinedload(Request.agent), joinedload(Request.tags))

    if current_user.role == "agent":
        query = query.filter(Request.agent_id == current_user.id)

    if status_filter:
        query = query.filter(Request.status == status_filter)
    if route:
        query = query.filter(Request.route.ilike(f"%{route}%"))
    if tag_ids:
        parts: list[uuid.UUID] = []
        for chunk in tag_ids.split(","):
            chunk = chunk.strip()
            if not chunk:
                continue
            try:
                parts.append(uuid.UUID(chunk))
            except ValueError:
                continue
        if parts:
            query = query.filter(Request.tags.any(Tag.id.in_(parts)))
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

    request_ids = [r.id for r in requests]
    counts_by_request: dict[uuid.UUID, int] = {}
    if request_ids:
        rows = (
            db.query(Attachment.request_id, func.count(Attachment.id))
            .filter(Attachment.request_id.in_(request_ids))
            .group_by(Attachment.request_id)
            .all()
        )
        counts_by_request = {rid: int(c) for rid, c in rows}

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
                tags=[TagBrief.model_validate(t) for t in (r.tags or [])],
                attachments_count=counts_by_request.get(r.id, 0),
                created_at=r.created_at,
            )
        )

    return RequestListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/bulk-template")
def download_bulk_template(
    _user: User = Depends(require_role("agent", "admin")),
):
    data = build_template_workbook()
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="bulk_requests_template.xlsx"'},
    )


@router.post("/bulk-preview")
def bulk_preview_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("agent", "admin")),
):
    raw = file.file.read()
    _enforce_upload_size(raw, db)
    return preview_bulk(raw)


@router.post("/bulk-upload")
def bulk_upload_endpoint(
    file: UploadFile = File(...),
    agent_id: uuid.UUID | None = Query(None, description="Target agent user id (required for administrators)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "admin")),
):
    raw = file.file.read()
    _enforce_upload_size(raw, db)
    try:
        if current_user.role == "admin":
            if not agent_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "AGENT_REQUIRED", "message": "agent_id query parameter is required for bulk upload as administrator"}},
                )
            target = db.query(User).filter(User.id == agent_id, User.role == "agent").first()
            if not target:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "INVALID_AGENT", "message": "agent_id must refer to an agent user"}},
                )
            return commit_bulk_upload(db, current_user, target, raw)
        return commit_bulk_upload(db, current_user, current_user, raw)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "BULK_UPLOAD_ERROR", "message": str(e)}},
        )


@router.get("/{request_id}", response_model=RequestRead)
def get_request(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = (
        db.query(Request)
        .options(
            joinedload(Request.agent),
            joinedload(Request.attachments),
            joinedload(Request.tags),
        )
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

    offers_out = _build_counter_offer_reads(db, request_id)

    out = RequestRead.model_validate(req)
    out.counter_offers = offers_out
    return out


@router.get("/{request_id}/export")
def download_request_export(
    request_id: uuid.UUID,
    format: Literal["zip", "txt", "pdf"] = Query(
        "zip",
        description="zip: separate files; txt or pdf: one combined file (plain text or PDF)",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "sales", "admin")),
):
    """Download this request's deal, activity log, and portal chat; sales/admin also get RM email copy when present."""
    req = (
        db.query(Request)
        .options(
            joinedload(Request.agent),
            joinedload(Request.attachments),
            joinedload(Request.tags),
        )
        .filter(Request.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if not user_can_access_request(current_user, req):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    content, media_type, filename = build_export_bytes(db, req, current_user, format)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.put("/{request_id}", response_model=RequestRead)
def update_request(
    request_id: uuid.UUID,
    payload: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "admin")),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if current_user.role == "agent":
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

    detail_note = f"Updated fields: {', '.join(update_data.keys())}"
    if current_user.role == "admin":
        detail_note = f"[Admin] {detail_note}"
    _log_history(db, req.id, "updated", current_user.id, details=detail_note)
    try:
        sync_sla_for_request(db, req)
    except Exception as e:
        logger.warning("SLA sync on update failed: %s", e)
    db.commit()
    req_out = (
        db.query(Request)
        .options(joinedload(Request.agent), joinedload(Request.attachments), joinedload(Request.tags))
        .filter(Request.id == request_id)
        .first()
    )
    return req_out or req


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
    _enforce_upload_size(contents, db)
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
    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You can only view your own request SLA"}},
        )
    sla = compute_sla(req, db)
    return {"request_id": str(req.id), "request_code": req.request_code, "status": req.status, "sla": sla}


@router.post("/{request_id}/tags")
def update_request_tags(
    request_id: uuid.UUID,
    payload: RequestTagsBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "sales", "admin")),
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
            detail={"error": {"code": "FORBIDDEN", "message": "You can only tag your own requests"}},
        )
    tags = db.query(Tag).filter(Tag.id.in_(payload.tag_ids)).all() if payload.tag_ids else []
    req.tags = tags
    db.commit()
    db.refresh(req)
    return {
        "message": "Tags updated",
        "tags": [{"id": str(t.id), "name": t.name, "color": t.color} for t in req.tags],
    }


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


class CounterOfferRejectBody(BaseModel):
    reason: str | None = Field(None, max_length=500)


def _load_counter_offer_for_response(
    db: Session,
    request_id: uuid.UUID,
    offer_id: uuid.UUID,
    current_user: User,
) -> tuple[Request, CounterOffer]:
    """Shared guard for the agent accept/reject endpoints."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "You can only respond to counter offers on your own requests"}},
        )
    if req.status != "counter_offered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": f"Request is not awaiting a counter-offer response (status='{req.status}')"}},
        )

    offer = (
        db.query(CounterOffer)
        .filter(CounterOffer.id == offer_id, CounterOffer.request_id == request_id)
        .first()
    )
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Counter offer not found for this request"}},
        )
    eff = ((offer.status or "").strip().lower() or "pending")
    if eff != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "OFFER_RESOLVED", "message": f"Counter offer is already '{offer.status}'"}},
        )
    return req, offer


@router.post(
    "/{request_id}/counter/{offer_id}/accept",
    response_model=CounterOfferRead,
)
def accept_counter_offer(
    request_id: uuid.UUID,
    offer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "admin")),
):
    req, offer = _load_counter_offer_for_response(db, request_id, offer_id, current_user)

    offer.status = "accepted"
    old_status = req.status
    req.status = "approved"

    _log_history(
        db,
        req.id,
        "counter_accepted",
        current_user.id,
        from_status=old_status,
        to_status="approved",
        details=f"Agent accepted counter offer of {float(offer.counter_price)} (original {float(offer.original_price)})",
    )
    try:
        sync_sla_for_request(db, req)
    except Exception as e:
        logger.warning("SLA sync on counter_accepted failed: %s", e)
    db.commit()
    db.refresh(offer)

    try:
        notifications = notify_counter_accepted(db, req, offer)
        for n in notifications:
            manager.push_to_user_threadsafe(str(n.user_id), {
                "event": "notification",
                "data": format_notification(n),
            })
    except Exception as e:
        logger.warning("Failed to send counter-accepted notifications: %s", e)

    return CounterOfferRead(
        id=offer.id,
        request_id=offer.request_id,
        original_price=float(offer.original_price),
        counter_price=float(offer.counter_price),
        message=offer.message,
        created_by=offer.created_by,
        creator_name=offer.creator.name if offer.creator else None,
        status=offer.status,
        created_at=offer.created_at,
    )


@router.post(
    "/{request_id}/counter/{offer_id}/reject",
    response_model=CounterOfferRead,
)
def reject_counter_offer(
    request_id: uuid.UUID,
    offer_id: uuid.UUID,
    payload: CounterOfferRejectBody | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("agent", "admin")),
):
    req, offer = _load_counter_offer_for_response(db, request_id, offer_id, current_user)

    reason = (payload.reason if payload else None) or None

    offer.status = "rejected"
    old_status = req.status
    req.status = "submitted"

    detail_parts = [f"Agent rejected counter offer of {float(offer.counter_price)}"]
    if reason:
        detail_parts.append(f"reason: {reason}")
    _log_history(
        db,
        req.id,
        "counter_rejected",
        current_user.id,
        from_status=old_status,
        to_status="submitted",
        details=" — ".join(detail_parts),
    )
    try:
        sync_sla_for_request(db, req)
    except Exception as e:
        logger.warning("SLA sync on counter_rejected failed: %s", e)
    db.commit()
    db.refresh(offer)

    try:
        notifications = notify_counter_rejected(db, req, offer, reason)
        for n in notifications:
            manager.push_to_user_threadsafe(str(n.user_id), {
                "event": "notification",
                "data": format_notification(n),
            })
    except Exception as e:
        logger.warning("Failed to send counter-rejected notifications: %s", e)

    return CounterOfferRead(
        id=offer.id,
        request_id=offer.request_id,
        original_price=float(offer.original_price),
        counter_price=float(offer.counter_price),
        message=offer.message,
        created_by=offer.created_by,
        creator_name=offer.creator.name if offer.creator else None,
        status=offer.status,
        created_at=offer.created_at,
    )
