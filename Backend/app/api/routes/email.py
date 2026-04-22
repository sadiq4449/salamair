import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_current_user_optional, get_db, require_role
from app.core.config import settings
from app.models.email_attachment import EmailAttachment
from app.models.email_message import EmailMessage
from app.models.email_thread import (
    EmailThread,
    THREAD_CHANNEL_AGENT_SALES,
    THREAD_CHANNEL_RM,
)
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.user import User
from app.schemas.email_schema import (
    EmailAttachmentRead,
    EmailInboxItem,
    EmailInboxResponse,
    EmailMessageRead,
    EmailThreadRead,
    PollInboxResponse,
    ReplyEmailRequest,
    ReplyEmailResponse,
    SendEmailRequest,
    SendEmailResponse,
    SendToAgentEmailRequest,
    SimulateReplyRequest,
)
from app.services.email_service import (
    build_html_body,
    build_plain_body,
    build_subject,
    build_thread_reply_html,
    build_thread_reply_plain,
    send_smtp_email,
)
from app.services.gmail_api_service import send_outgoing_agent_sales
from app.services.imap_inbox_service import poll_inbox_once
from app.services.incoming_email_body import sanitize_incoming_rm_body
from app.services.sla_service import sync_sla_for_request
from app.services.request_access import user_can_access_request

router = APIRouter()


@router.get("/inbox", response_model=EmailInboxResponse)
def list_email_inbox(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Filter by request code or route"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    """All RM email threads (sales / admin)."""
    q = (
        db.query(EmailThread)
        .join(Request, Request.id == EmailThread.request_id)
        .options(joinedload(EmailThread.request).joinedload(Request.agent))
        .filter(EmailThread.thread_channel == THREAD_CHANNEL_RM)
    )
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Request.request_code.ilike(term), Request.route.ilike(term)))

    total = q.count()
    threads = (
        q.order_by(EmailThread.updated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items: list[EmailInboxItem] = []
    for t in threads:
        req = t.request
        agent = req.agent if req else None
        msg_count = (
            db.query(func.count(EmailMessage.id))
            .filter(EmailMessage.thread_id == t.id)
            .scalar()
            or 0
        )
        last = (
            db.query(EmailMessage)
            .filter(EmailMessage.thread_id == t.id)
            .order_by(EmailMessage.sent_at.desc())
            .first()
        )
        preview = ""
        last_at = t.updated_at
        if last:
            last_at = last.sent_at or last.created_at
            body = last.body or ""
            if last.direction == "incoming":
                body = sanitize_incoming_rm_body(body)
            preview = body if len(body) <= 160 else body[:157] + "..."
        items.append(
            EmailInboxItem(
                thread_id=t.id,
                request_id=req.id,
                request_code=req.request_code,
                route=req.route,
                request_status=req.status,
                agent_name=agent.name if agent else None,
                subject=t.subject,
                rm_email=t.rm_email,
                message_count=int(msg_count),
                last_activity_at=last_at,
                preview=preview,
            )
        )

    return EmailInboxResponse(items=items, total=total, page=page, limit=limit)


def _require_poll_access(
    x_email_poll_secret: str | None = Header(None, alias="X-Email-Poll-Secret"),
    user: User | None = Depends(get_current_user_optional),
) -> None:
    """Allow sales/admin JWT, or X-Email-Poll-Secret when EMAIL_POLL_SECRET is set.
    Authenticated agents get 403 — not 401 — so the SPA does not wipe the session (axios 401 interceptor).
    """
    if settings.EMAIL_POLL_SECRET and x_email_poll_secret == settings.EMAIL_POLL_SECRET:
        return
    if user and user.role in ("sales", "admin"):
        return
    if user is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "POLL_INBOX_FORBIDDEN",
                    "message": "Inbox poll is only available to sales and administrators (or server poll secret).",
                }
            },
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Login as sales/admin or send X-Email-Poll-Secret matching EMAIL_POLL_SECRET",
            }
        },
    )


def _get_request_or_404(db: Session, request_id: uuid.UUID) -> Request:
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    return req


def _log_history(db: Session, request_id: uuid.UUID, action: str, actor_id: uuid.UUID,
                 from_status: str | None = None, to_status: str | None = None, details: str | None = None):
    db.add(RequestHistory(
        request_id=request_id, action=action, actor_id=actor_id,
        from_status=from_status, to_status=to_status, details=details,
    ))


def _thread_by_channel(db: Session, request_id: uuid.UUID, channel: str) -> EmailThread | None:
    return (
        db.query(EmailThread)
        .filter(EmailThread.request_id == request_id, EmailThread.thread_channel == channel)
        .first()
    )


def _sales_inbox_for_request(db: Session, req: Request) -> str:
    if req.assigned_to:
        u = db.query(User).filter(User.id == req.assigned_to).first()
        if u and (u.email or "").strip():
            return u.email.strip()
    u = (
        db.query(User)
        .filter(User.role == "sales", User.is_active.is_(True))
        .order_by(User.created_at.asc())
        .first()
    )
    if u and (u.email or "").strip():
        return u.email.strip()
    return (settings.SMTP_FROM_EMAIL or "noreply@salamair.com").strip()


@router.post("/send", response_model=SendEmailResponse)
def send_email_to_rm(
    payload: SendEmailRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = _get_request_or_404(db, payload.request_id)

    # Queue can show "submitted"; sending to RM means sales has started review.
    if req.status == "submitted":
        _log_history(
            db, req.id, "status_changed", current_user.id,
            from_status="submitted", to_status="under_review",
            details="Moved to under_review (Send to RM)",
        )
        req.status = "under_review"
        if not req.assigned_to:
            req.assigned_to = current_user.id
        db.flush()

    if req.status not in ("under_review", "rm_pending"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_STATE",
                    "message": "Cannot email RM in the current status (e.g. draft, approved, or rejected).",
                }
            },
        )

    rm_email = payload.to or settings.RM_DEFAULT_EMAIL
    subject = build_subject(req.request_code, req.route)

    travel_date_str = str(req.travel_date) if req.travel_date else None
    # Show configured outbound mailbox in template (falls back to login email)
    contact_email = (settings.SMTP_FROM_EMAIL or "").strip() or (current_user.email or "")
    html_body = build_html_body(
        req.request_code, req.route, req.pax, float(req.price),
        travel_date_str, payload.message, current_user.name,
        contact_email, current_user.id,
    )
    plain_body = build_plain_body(
        req.request_code, req.route, req.pax, float(req.price),
        travel_date_str, payload.message, current_user.name,
        contact_email, current_user.id,
    )

    message_id, smtp_err = send_smtp_email(rm_email, subject, plain_body, html_body)

    thread = _thread_by_channel(db, req.id, THREAD_CHANNEL_RM)
    if not thread:
        thread = EmailThread(
            request_id=req.id,
            subject=subject,
            rm_email=rm_email,
            thread_channel=THREAD_CHANNEL_RM,
        )
        db.add(thread)
        db.flush()

    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="outgoing",
        from_email=settings.SMTP_FROM_EMAIL,
        to_email=rm_email,
        subject=subject,
        body=plain_body,
        html_body=html_body,
        message_id=message_id,
        status="sent" if message_id else "failed",
        sent_at=now,
    )
    db.add(email_msg)
    db.flush()

    if payload.include_attachments and req.attachments:
        for att in req.attachments:
            db.add(EmailAttachment(
                email_id=email_msg.id,
                filename=att.filename,
                file_url=att.file_url,
                file_type=att.file_type,
                file_size=att.file_size,
            ))

    old_status = req.status
    if req.status == "under_review":
        req.status = "rm_pending"

    _log_history(
        db, req.id, "email_sent_to_rm", current_user.id,
        from_status=old_status, to_status=req.status,
        details=(
            f"Email sent to {rm_email}"
            if message_id
            else f"SMTP failed to {rm_email}: {smtp_err or 'unknown error'}"
        ),
    )

    sync_sla_for_request(db, req)
    db.commit()
    db.refresh(email_msg)

    delivered = message_id is not None
    response.headers["X-Email-Delivered"] = "true" if delivered else "false"
    msg = (
        "Email sent successfully"
        if delivered
        else (
            "Request saved, but the message was not delivered. "
            "On Railway Hobby set RESEND_API_KEY (outbound SMTP is blocked); verify sender in Resend. "
            "Locally you can use SMTP_USER + SMTP_PASSWORD."
        )
    )
    return SendEmailResponse(
        message=msg,
        email_id=email_msg.id,
        request_code=req.request_code,
        status=req.status,
        sent_at=email_msg.sent_at,
        smtp_delivered=delivered,
        smtp_error=smtp_err,
    )


@router.post("/send-to-agent", response_model=SendEmailResponse)
def send_email_to_agent(
    payload: SendToAgentEmailRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    """Email the agent on the sales↔agent thread (Gmail API if the sender connected Google, else SMTP/Resend)."""
    req = (
        db.query(Request)
        .options(joinedload(Request.agent), joinedload(Request.attachments))
        .filter(Request.id == payload.request_id)
        .first()
    )
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if not req.agent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "NO_AGENT", "message": "Request has no agent."}},
        )
    agent_email = (req.agent.email or "").strip()
    if not agent_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "NO_AGENT_EMAIL",
                    "message": "Agent has no email on their profile. Update the user, then try again.",
                }
            },
        )
    if not req.assigned_to:
        req.assigned_to = current_user.id
        db.flush()
    subject = f"[{req.request_code}] {req.route} — Message from sales"
    contact_email = (settings.SMTP_FROM_EMAIL or "").strip() or (current_user.email or "")
    plain_body = build_thread_reply_plain(
        req.request_code, req.route, payload.message, current_user.name, contact_email,
    )
    html_body = build_thread_reply_html(
        req.request_code, req.route, payload.message, current_user.name, contact_email,
    )
    message_id, smtp_err, from_hdr = send_outgoing_agent_sales(
        db, current_user, agent_email, subject, plain_body, html_body,
        in_reply_to=None,
        smtp_user_email_first=False,
    )

    thread = _thread_by_channel(db, req.id, THREAD_CHANNEL_AGENT_SALES)
    if not thread:
        thread = EmailThread(
            request_id=req.id,
            subject=subject[:500],
            rm_email=agent_email,
            thread_channel=THREAD_CHANNEL_AGENT_SALES,
        )
        db.add(thread)
        db.flush()

    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="outgoing",
        from_email=from_hdr,
        to_email=agent_email,
        subject=subject,
        body=plain_body,
        html_body=html_body,
        message_id=message_id,
        status="sent" if message_id else "failed",
        sent_at=now,
    )
    db.add(email_msg)
    db.flush()
    if payload.include_attachments and req.attachments:
        for att in req.attachments:
            db.add(
                EmailAttachment(
                    email_id=email_msg.id,
                    filename=att.filename,
                    file_url=att.file_url,
                    file_type=att.file_type,
                    file_size=att.file_size,
                )
            )
    _log_history(
        db,
        req.id,
        "email_sent_to_agent",
        current_user.id,
        details=f"Email to agent {agent_email}" if message_id else f"SMTP error: {smtp_err or 'unknown'}",
    )
    sync_sla_for_request(db, req)
    db.commit()
    db.refresh(email_msg)

    delivered = message_id is not None
    response.headers["X-Email-Delivered"] = "true" if delivered else "false"
    msg = "Email to agent sent" if delivered else (
        "Request saved, but the message to the agent was not delivered. Check SMTP/Resend."
    )
    return SendEmailResponse(
        message=msg,
        email_id=email_msg.id,
        request_code=req.request_code,
        status=req.status,
        sent_at=email_msg.sent_at,
        smtp_delivered=delivered,
        smtp_error=smtp_err,
    )


@router.get("/thread/{request_id}", response_model=EmailThreadRead)
def get_email_thread(
    request_id: uuid.UUID,
    channel: str = Query(THREAD_CHANNEL_RM, description="rm or agent_sales"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View RM thread or the sales↔agent email thread (Gmail or SMTP). Agents: own request only, read (and reply for agent thread)."""
    if channel not in (THREAD_CHANNEL_RM, THREAD_CHANNEL_AGENT_SALES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_CHANNEL", "message": "channel must be 'rm' or 'agent_sales'."}},
        )
    if current_user.role not in ("agent", "sales", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INSUFFICIENT_PERMISSIONS", "message": "Not allowed to view this thread."}},
        )
    req = (
        db.query(Request)
        .options(joinedload(Request.agent))
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
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied."}},
        )

    thread = (
        db.query(EmailThread)
        .options(joinedload(EmailThread.messages).joinedload(EmailMessage.attachments))
        .filter(EmailThread.request_id == request_id, EmailThread.thread_channel == channel)
        .first()
    )

    if not thread:
        peer = settings.RM_DEFAULT_EMAIL
        subj = build_subject(req.request_code, req.route)
        if channel == THREAD_CHANNEL_AGENT_SALES and req.agent:
            peer = (req.agent.email or "").strip() or "agent@…"
            subj = f"[{req.request_code}] {req.route} — Sales / Agent (email)"
        return EmailThreadRead(
            request_code=req.request_code,
            thread_id=uuid.UUID(int=0),
            subject=subj,
            rm_email=peer,
            status="empty",
            emails=[],
            thread_channel=channel,
        )

    msgs = sorted(thread.messages, key=lambda m: (m.sent_at, m.created_at))
    emails = [
        EmailMessageRead(
            id=m.id,
            direction=m.direction,
            from_email=m.from_email,
            to_email=m.to_email,
            subject=m.subject,
            body=sanitize_incoming_rm_body(m.body) if m.direction == "incoming" else m.body,
            html_body=m.html_body,
            status=m.status,
            attachments=[EmailAttachmentRead.model_validate(a) for a in m.attachments],
            sent_at=m.sent_at,
            received_at=m.received_at,
            created_at=m.created_at,
        )
        for m in msgs
    ]

    return EmailThreadRead(
        request_code=req.request_code,
        thread_id=thread.id,
        subject=thread.subject,
        rm_email=thread.rm_email,
        status=thread.status,
        emails=emails,
        thread_channel=thread.thread_channel,
    )


@router.post("/reply", response_model=ReplyEmailResponse)
def reply_email(
    payload: ReplyEmailRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = _get_request_or_404(db, payload.request_id)
    if not user_can_access_request(current_user, req):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied."}},
        )
    thread = (
        db.query(EmailThread)
        .filter(EmailThread.id == payload.thread_id)
        .first()
    )
    if not thread or thread.request_id != req.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Email thread not found"}},
        )
    ch = (thread.thread_channel or THREAD_CHANNEL_RM)
    to_addr: str
    if ch == THREAD_CHANNEL_AGENT_SALES and current_user.role == "agent":
        if req.agent_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Not your request."}},
            )
        to_addr = _sales_inbox_for_request(db, req)
    elif current_user.role in ("sales", "admin"):
        to_addr = thread.rm_email
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Only sales or the assigned agent can reply on this thread."}},
        )
    is_agent_on_agent_thread = ch == THREAD_CHANNEL_AGENT_SALES and current_user.role == "agent"
    if ch == THREAD_CHANNEL_RM and current_user.role == "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Agents cannot post on the RM email thread."}},
        )

    subject = f"Re: {thread.subject}"
    contact_email = (settings.SMTP_FROM_EMAIL or "").strip() or (current_user.email or "")
    plain_body = build_thread_reply_plain(
        req.request_code, req.route, payload.message, current_user.name, contact_email,
    )
    html_body = build_thread_reply_html(
        req.request_code, req.route, payload.message, current_user.name, contact_email,
    )

    last_msg = (
        db.query(EmailMessage)
        .filter(EmailMessage.thread_id == thread.id)
        .order_by(EmailMessage.sent_at.desc())
        .first()
    )
    in_reply_to = last_msg.message_id if last_msg and last_msg.message_id else None

    if ch == THREAD_CHANNEL_AGENT_SALES:
        message_id, smtp_err, from_hdr = send_outgoing_agent_sales(
            db,
            current_user,
            to_addr,
            subject,
            plain_body,
            html_body,
            in_reply_to=in_reply_to,
            smtp_user_email_first=is_agent_on_agent_thread,
        )
    else:
        message_id, smtp_err = send_smtp_email(
            to_addr,
            subject,
            plain_body,
            html_body,
            in_reply_to=in_reply_to,
        )
        if is_agent_on_agent_thread:
            from_hdr = (current_user.email or settings.SMTP_FROM_EMAIL or "").strip() or to_addr
        else:
            from_hdr = (settings.SMTP_FROM_EMAIL or current_user.email or "").strip() or to_addr
    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="outgoing",
        from_email=from_hdr,
        to_email=to_addr,
        subject=subject,
        body=plain_body,
        html_body=html_body,
        message_id=message_id,
        in_reply_to=in_reply_to,
        status="sent" if message_id else "failed",
        sent_at=now,
    )
    db.add(email_msg)
    _log_history(
        db,
        req.id,
        "email_reply_sent" if ch == THREAD_CHANNEL_RM else "email_reply_agent_thread",
        current_user.id,
        details=(f"Reply to {to_addr}" if message_id else f"SMTP failed: {smtp_err}"),
    )
    db.commit()
    db.refresh(email_msg)
    delivered = message_id is not None
    response.headers["X-Email-Delivered"] = "true" if delivered else "false"
    msg = (
        "Reply sent successfully"
        if delivered
        else "Reply not delivered. Set RESEND_API_KEY or SMTP for outbound email."
    )
    return ReplyEmailResponse(
        message=msg,
        email_id=email_msg.id,
        sent_at=email_msg.sent_at,
        smtp_delivered=delivered,
        smtp_error=smtp_err,
    )


@router.post("/poll-inbox", response_model=PollInboxResponse)
def poll_inbox(
    db: Session = Depends(get_db),
    _auth: None = Depends(_require_poll_access),
):
    """
    Fetch recent IMAP messages (rolling SINCE window), match subjects containing [REQ-YYYY-NNN],
    store incoming rows (Message-ID dedupes). Replies already read in Gmail are still imported.
    Configure IMAP_* env vars. Call from UI (sales) or cron with X-Email-Poll-Secret.
    """
    result = poll_inbox_once(db)
    return PollInboxResponse(
        ok=result.get("ok", False),
        skipped=result.get("skipped", False),
        reason=result.get("reason"),
        processed=result.get("processed", 0),
        stored=result.get("stored", 0),
        errors=result.get("errors") or [],
    )


@router.post("/simulate-reply", response_model=dict)
def simulate_rm_reply(
    payload: SimulateReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    """Dev/demo endpoint: simulate an incoming RM reply."""
    req = _get_request_or_404(db, payload.request_id)
    thread = _thread_by_channel(db, req.id, THREAD_CHANNEL_RM)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NO_THREAD", "message": "No email thread exists for this request. Send an email first."}},
        )

    last_outgoing = (
        db.query(EmailMessage)
        .filter(EmailMessage.thread_id == thread.id, EmailMessage.direction == "outgoing")
        .order_by(EmailMessage.sent_at.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="incoming",
        from_email=payload.from_email,
        to_email=settings.SMTP_FROM_EMAIL,
        subject=f"Re: {thread.subject}",
        body=payload.message,
        message_id=f"<{uuid.uuid4()}@rm.salamair.com>",
        in_reply_to=last_outgoing.message_id if last_outgoing else None,
        status="received",
        sent_at=now,
        received_at=now,
    )
    db.add(email_msg)

    _log_history(db, req.id, "rm_reply_received", current_user.id,
                 details=f"RM reply received from {payload.from_email}")

    db.commit()

    return {
        "message": "RM reply simulated successfully",
        "email_id": str(email_msg.id),
        "request_id": str(req.id),
    }
