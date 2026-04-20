import secrets
from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request as FastAPIRequest, status
from sqlalchemy import exists, func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_role
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.agent_profile import AgentProfile
from app.models.email_message import EmailMessage
from app.models.request import Request
from app.models.reminder_config import ReminderConfig
from app.models.system_config import SystemConfig
from app.models.system_log import SystemLog
from app.models.user import User
from app.schemas.advanced_schema import ReminderRuleOut, RemindersListResponse, RemindersPutBody
from app.schemas.admin_schema import (
    VALID_ROLES,
    AdminAgentItem,
    AdminAgentListResponse,
    AdminAgentUpdateRequest,
    AdminConfigItem,
    AdminConfigListResponse,
    AdminConfigUpdateRequest,
    AdminCreateUserRequest,
    AdminCreateUserResponse,
    AdminEmailStatusResponse,
    AdminEmailTestSendRequest,
    AdminEmailTestSendResponse,
    AdminLogItem,
    AdminLogListResponse,
    AdminPasswordResetResponse,
    AdminSimpleMessage,
    AdminStatsResponse,
    AdminUpdateUserRequest,
    AdminUpdateUserResponse,
    AdminUserItem,
    AdminUserListResponse,
    LogActorSummary,
    LogTargetSummary,
)
from app.schemas.email_schema import PollInboxResponse
from app.services.admin_audit import ADMIN_CONFIG_KEYS, ensure_default_system_config, log_admin_action
from app.services.email_service import resend_outbound_summary, resend_test_sender_mode, send_smtp_email
from app.services.imap_inbox_service import poll_inbox_once
from app.services.reminder_runner import ensure_default_reminder_rules, run_reminder_scan

router = APIRouter()

OPEN_REQUEST_STATUSES = ("submitted", "under_review", "rm_pending", "counter_offered")


def _client_ip(http_request: FastAPIRequest) -> str | None:
    if http_request.client:
        return http_request.client.host
    return None


def _format_process_uptime(started: datetime) -> str:
    """Human-readable elapsed time since API process start (UTC)."""
    now = datetime.now(timezone.utc)
    total_sec = max(0, int((now - started).total_seconds()))
    days, rem = divmod(total_sec, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, _ = divmod(rem, 60)
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def _active_admin_count(db: Session, exclude_user_id: UUID | None = None) -> int:
    q = db.query(func.count(User.id)).filter(User.role == "admin", User.is_active.is_(True))
    if exclude_user_id is not None:
        q = q.filter(User.id != exclude_user_id)
    return int(q.scalar() or 0)


def _ensure_role(role: str) -> str:
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_ROLE", "message": f"Role must be one of: {', '.join(sorted(VALID_ROLES))}"}},
        )
    return role


def _get_or_create_agent_profile(db: Session, user: User) -> AgentProfile:
    if user.agent_profile:
        return user.agent_profile
    p = AgentProfile(user_id=user.id, company_name=None, credit_limit=Decimal("0"))
    db.add(p)
    db.flush()
    return p


def _target_display_name(db: Session, target_type: str | None, target_id: UUID | None) -> str | None:
    if not target_type or not target_id:
        return None
    if target_type == "user":
        u = db.query(User).filter(User.id == target_id).first()
        return u.name if u else None
    return None


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    started = getattr(request.app.state, "started_at_utc", None)
    uptime_str = _format_process_uptime(started) if isinstance(started, datetime) else settings.REPORTED_SYSTEM_UPTIME

    total_users = int(db.query(func.count(User.id)).scalar() or 0)
    active_users_today = int(
        db.query(func.count(User.id)).filter(User.last_login.isnot(None), User.last_login >= today_start).scalar() or 0
    )
    total_agents = int(db.query(func.count(User.id)).filter(User.role == "agent").scalar() or 0)
    total_sales = int(db.query(func.count(User.id)).filter(User.role == "sales").scalar() or 0)
    total_admins = int(db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0)

    requests_today = int(db.query(func.count(Request.id)).filter(Request.created_at >= today_start).scalar() or 0)
    pending_requests = int(db.query(func.count(Request.id)).filter(Request.status.in_(OPEN_REQUEST_STATUSES)).scalar() or 0)

    emails_sent_today = int(
        db.query(func.count(EmailMessage.id))
        .filter(EmailMessage.direction == "outgoing", EmailMessage.created_at >= today_start)
        .scalar()
        or 0
    )

    return AdminStatsResponse(
        total_users=total_users,
        active_users_today=active_users_today,
        total_agents=total_agents,
        total_sales=total_sales,
        total_admins=total_admins,
        requests_today=requests_today,
        pending_requests=pending_requests,
        emails_sent_today=emails_sent_today,
        system_uptime=uptime_str,
    )


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = Query(None, description="agent | sales | admin"),
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(User)
    if role:
        _ensure_role(role)
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(User.name.ilike(term), User.email.ilike(term)))

    total = q.count()
    rows = (
        q.order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [AdminUserItem.model_validate(u) for u in rows]
    return AdminUserListResponse(items=items, total=total, page=page, limit=limit)


@router.post("/users", response_model=AdminCreateUserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    payload: AdminCreateUserRequest,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    role = _ensure_role(payload.role)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "EMAIL_EXISTS", "message": "A user with this email already exists"}},
        )

    user = User(
        name=payload.name,
        email=str(payload.email),
        password=get_password_hash(payload.password),
        role=role,
        city=payload.city,
        is_active=True,
    )
    db.add(user)
    db.flush()

    if role == "agent":
        lim = payload.credit_limit if payload.credit_limit is not None else Decimal("0")
        db.add(AgentProfile(user_id=user.id, company_name=payload.company_name, credit_limit=lim))

    log_admin_action(
        db,
        action="user_created",
        actor_id=actor.id,
        target_type="user",
        target_id=user.id,
        details=f"Created user {user.email} as {role}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    db.refresh(user)
    return AdminCreateUserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=AdminUpdateUserResponse)
def admin_update_user(
    user_id: UUID,
    payload: AdminUpdateUserRequest,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "User not found"}})

    old_role = target.role
    role_changed = False
    if payload.name is not None:
        target.name = payload.name
    if payload.email is not None:
        other = db.query(User).filter(User.email == str(payload.email), User.id != user_id).first()
        if other:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "EMAIL_EXISTS", "message": "Email already in use"}},
            )
        target.email = str(payload.email)
    if payload.city is not None:
        target.city = payload.city
    if payload.role is not None:
        new_role = _ensure_role(payload.role)
        if old_role == "admin" and new_role != "admin" and target.is_active:
            if _active_admin_count(db, exclude_user_id=target.id) < 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "LAST_ADMIN", "message": "Cannot change role of the last active administrator"}},
                )
        role_changed = new_role != old_role
        target.role = new_role
        if old_role != "agent" and new_role == "agent" and not target.agent_profile:
            db.add(AgentProfile(user_id=target.id, company_name=None, credit_limit=Decimal("0")))
        if old_role == "agent" and new_role != "agent" and target.agent_profile:
            db.delete(target.agent_profile)

    log_admin_action(
        db,
        action="role_changed" if role_changed else "user_updated",
        actor_id=actor.id,
        target_type="user",
        target_id=target.id,
        details=f"Updated user {target.email}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    db.refresh(target)
    return AdminUpdateUserResponse(message="User updated successfully", user=AdminUserItem.model_validate(target))


@router.put("/users/{user_id}/deactivate", response_model=AdminSimpleMessage)
def admin_deactivate_user(
    user_id: UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    if user_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "SELF_DEACTIVATE", "message": "You cannot deactivate your own account"}},
        )
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "User not found"}})
    if not target.is_active:
        return AdminSimpleMessage(message="User is already inactive")

    if target.role == "admin" and _active_admin_count(db, exclude_user_id=target.id) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "LAST_ADMIN", "message": "Cannot deactivate the last active administrator"}},
        )

    target.is_active = False
    log_admin_action(
        db,
        action="user_deactivated",
        actor_id=actor.id,
        target_type="user",
        target_id=target.id,
        details=f"Deactivated {target.email}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    return AdminSimpleMessage(message="User deactivated successfully")


@router.put("/users/{user_id}/activate", response_model=AdminSimpleMessage)
def admin_activate_user(
    user_id: UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "User not found"}})
    if target.is_active:
        return AdminSimpleMessage(message="User is already active")

    target.is_active = True
    log_admin_action(
        db,
        action="user_reactivated",
        actor_id=actor.id,
        target_type="user",
        target_id=target.id,
        details=f"Reactivated {target.email}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    return AdminSimpleMessage(message="User activated successfully")


@router.post("/users/{user_id}/reset-password", response_model=AdminPasswordResetResponse)
def admin_reset_password(
    user_id: UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "User not found"}})

    temp_password = secrets.token_urlsafe(12)
    target.password = get_password_hash(temp_password)

    subject = "Salam Air SmartDeal — password reset"
    body_text = (
        f"Hello {target.name},\n\n"
        "An administrator reset your portal password.\n"
        f"Your new temporary password is: {temp_password}\n\n"
        "Sign in at the SmartDeal portal and change your password from your profile when available.\n"
    )
    body_html = f"<p>Hello {target.name},</p><p>An administrator reset your portal password.</p><p><strong>Temporary password:</strong> {temp_password}</p>"

    email_sent = False
    smtp_error: str | None = None
    if settings.email_sending_active:
        _, smtp_error = send_smtp_email(target.email, subject, body_text, body_html)
        email_sent = smtp_error is None
    else:
        smtp_error = "SMTP disabled (set EMAIL_ENABLED or SMTP_USER + SMTP_PASSWORD)"

    log_admin_action(
        db,
        action="password_reset",
        actor_id=actor.id,
        target_type="user",
        target_id=target.id,
        details=f"Password reset for {target.email}; email_sent={email_sent}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()

    return AdminPasswordResetResponse(
        message="Password has been reset."
        + (" Credentials were emailed to the user." if email_sent else f" Email was not sent ({smtp_error})."),
        email_sent=email_sent,
        temporary_password=temp_password if not email_sent else None,
    )


@router.get("/email/status", response_model=AdminEmailStatusResponse)
def admin_email_status(_user: User = Depends(require_role("admin"))):
    """Shows whether SMTP/IMAP are active (no secrets). Use after deploy to verify env vars."""
    return AdminEmailStatusResponse(
        email_sending_active=settings.email_sending_active,
        imap_polling_active=settings.imap_polling_active,
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_from_email=settings.SMTP_FROM_EMAIL,
        smtp_use_tls=settings.SMTP_USE_TLS,
        smtp_implicit_ssl=settings.SMTP_IMPLICIT_SSL,
        smtp_timeout_seconds=max(15, int(settings.SMTP_TIMEOUT_SECONDS)),
        resend_configured=bool((settings.RESEND_API_KEY or "").strip()),
        resend_outbound_summary=resend_outbound_summary(),
        resend_test_sender_mode=resend_test_sender_mode(),
        smtp_user_configured=bool((settings.SMTP_USER or "").strip()),
        smtp_password_configured=bool((settings.SMTP_PASSWORD or "").strip()),
        email_enabled_env=settings.EMAIL_ENABLED,
        imap_host=settings.IMAP_HOST,
        imap_port=settings.IMAP_PORT,
        imap_use_ssl=settings.IMAP_USE_SSL,
        imap_user_configured=bool((settings.IMAP_USER or "").strip()),
        imap_password_configured=bool((settings.IMAP_PASSWORD or "").strip()),
        imap_enabled_env=settings.IMAP_ENABLED,
        rm_default_email=settings.RM_DEFAULT_EMAIL,
    )


@router.post("/email/test-send", response_model=AdminEmailTestSendResponse)
def admin_email_test_send(
    payload: AdminEmailTestSendRequest,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    """Send a short test message via SMTP (defaults to admin’s own email)."""
    to_addr = str(payload.to) if payload.to else actor.email
    subject = "Salam Air SmartDeal — SMTP test"
    body_text = (
        "This is a test message from the SmartDeal admin panel.\n\n"
        "If you received this, outbound SMTP is configured correctly.\n"
    )
    body_html = (
        "<p>This is a <strong>test</strong> message from the SmartDeal admin panel.</p>"
        "<p>If you received this, outbound SMTP is configured correctly.</p>"
    )
    if not settings.email_sending_active:
        log_admin_action(
            db,
            action="email_test_send",
            actor_id=actor.id,
            target_type="system",
            details=f"skipped (SMTP inactive); would send to {to_addr}",
            ip_address=_client_ip(http_request),
            user_agent=http_request.headers.get("user-agent"),
        )
        db.commit()
        return AdminEmailTestSendResponse(
            success=False,
            message="SMTP is not active. Set SMTP_USER and SMTP_PASSWORD on the server (and do not set EMAIL_ENABLED=false).",
            sent_to=to_addr,
            smtp_error="email_sending_active is false",
        )
    mid, err = send_smtp_email(to_addr, subject, body_text, body_html)
    log_admin_action(
        db,
        action="email_test_send",
        actor_id=actor.id,
        target_type="system",
        details=f"sent to {to_addr}; ok={mid is not None}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    return AdminEmailTestSendResponse(
        success=mid is not None,
        message="Test email accepted by the mail server." if mid else "The mail server rejected the message.",
        sent_to=to_addr,
        smtp_error=err,
    )


@router.post("/email/test-inbox", response_model=PollInboxResponse)
def admin_email_test_inbox(
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    """Run one IMAP poll (same as Sync inbox). Use after sending a reply that includes [REQ-…] in the subject."""
    result = poll_inbox_once(db)
    log_admin_action(
        db,
        action="email_test_inbox_poll",
        actor_id=actor.id,
        target_type="system",
        details=(
            f"ok={result.get('ok')} skipped={result.get('skipped')} "
            f"processed={result.get('processed')} stored={result.get('stored')}"
        ),
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    return PollInboxResponse(
        ok=result.get("ok", False),
        skipped=result.get("skipped", False),
        reason=result.get("reason"),
        processed=result.get("processed", 0),
        stored=result.get("stored", 0),
        errors=result.get("errors") or [],
    )


@router.get("/agents", response_model=AdminAgentListResponse)
def admin_list_agents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(User).options(joinedload(User.agent_profile)).filter(User.role == "agent")
    if search:
        term = f"%{search.strip()}%"
        company_match = exists().where(AgentProfile.user_id == User.id, AgentProfile.company_name.ilike(term))
        q = q.filter(or_(User.name.ilike(term), User.email.ilike(term), company_match))
    total = q.count()
    rows = q.order_by(User.name.asc()).offset((page - 1) * limit).limit(limit).all()
    ids = [u.id for u in rows]
    counts: dict[UUID, int] = {}
    if ids:
        for aid, n in (
            db.query(Request.agent_id, func.count(Request.id)).filter(Request.agent_id.in_(ids)).group_by(Request.agent_id).all()
        ):
            counts[aid] = int(n)

    items: list[AdminAgentItem] = []
    for u in rows:
        prof = u.agent_profile
        items.append(
            AdminAgentItem(
                id=u.id,
                name=u.name,
                email=u.email,
                city=u.city,
                company_name=prof.company_name if prof else None,
                credit_limit=prof.credit_limit if prof else Decimal("0"),
                requests_count=counts.get(u.id, 0),
                is_active=u.is_active,
            )
        )
    return AdminAgentListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/agents/{agent_user_id}", response_model=AdminAgentItem)
def admin_update_agent(
    agent_user_id: UUID,
    payload: AdminAgentUpdateRequest,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    user = db.query(User).options(joinedload(User.agent_profile)).filter(User.id == agent_user_id, User.role == "agent").first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Agent not found"}})

    prof = _get_or_create_agent_profile(db, user)
    if payload.company_name is not None:
        prof.company_name = payload.company_name
    if payload.credit_limit is not None:
        prof.credit_limit = payload.credit_limit

    log_admin_action(
        db,
        action="agent_profile_updated",
        actor_id=actor.id,
        target_type="user",
        target_id=user.id,
        details=f"Updated agent profile for {user.email}",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    db.refresh(user)
    req_count = int(
        db.query(func.count(Request.id)).filter(Request.agent_id == user.id).scalar() or 0
    )
    return AdminAgentItem(
        id=user.id,
        name=user.name,
        email=user.email,
        city=user.city,
        company_name=prof.company_name,
        credit_limit=prof.credit_limit,
        requests_count=req_count,
        is_active=user.is_active,
    )


@router.get("/logs", response_model=AdminLogListResponse)
def admin_list_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    action: str | None = None,
    actor_id: UUID | None = None,
    from_: date | None = Query(None, alias="from"),
    to: date | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(SystemLog)
    if action:
        q = q.filter(SystemLog.action == action)
    if actor_id:
        q = q.filter(SystemLog.actor_id == actor_id)
    if from_:
        q = q.filter(SystemLog.created_at >= datetime.combine(from_, time.min, tzinfo=timezone.utc))
    if to:
        end = datetime.combine(to, time.max, tzinfo=timezone.utc)
        q = q.filter(SystemLog.created_at <= end)

    total = q.count()
    rows = (
        q.order_by(SystemLog.created_at.desc())
        .options(joinedload(SystemLog.actor))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items: list[AdminLogItem] = []
    for log in rows:
        if log.actor:
            actor_summary = LogActorSummary(id=log.actor.id, name=log.actor.name, role=log.actor.role)
        else:
            actor_summary = LogActorSummary(id=None, name="System", role="system")
        tgt: LogTargetSummary | None = None
        if log.target_type:
            tgt = LogTargetSummary(
                type=log.target_type,
                id=log.target_id,
                name=_target_display_name(db, log.target_type, log.target_id),
            )
        items.append(
            AdminLogItem(
                id=log.id,
                action=log.action,
                actor=actor_summary,
                target=tgt,
                details=log.details,
                ip_address=log.ip_address,
                timestamp=log.created_at,
            )
        )
    return AdminLogListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/config", response_model=AdminConfigListResponse)
def admin_get_config(
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    ensure_default_system_config(db)
    rows = db.query(SystemConfig).order_by(SystemConfig.key.asc()).all()
    return AdminConfigListResponse(
        items=[AdminConfigItem(key=r.key, value=r.value, description=r.description) for r in rows]
    )


@router.put("/config", response_model=AdminConfigListResponse)
def admin_put_config(
    payload: AdminConfigUpdateRequest,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    ensure_default_system_config(db)
    for entry in payload.items:
        if entry.key not in ADMIN_CONFIG_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "UNKNOWN_CONFIG_KEY", "message": f"Unknown configuration key: {entry.key}"}},
            )
        row = db.query(SystemConfig).filter(SystemConfig.key == entry.key).first()
        if not row:
            row = SystemConfig(key=entry.key, value=entry.value, description=None, updated_by=actor.id)
            db.add(row)
        else:
            row.value = entry.value
            row.updated_by = actor.id

    log_admin_action(
        db,
        action="config_updated",
        actor_id=actor.id,
        target_type="config",
        target_id=None,
        details="Updated system configuration",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    rows = db.query(SystemConfig).order_by(SystemConfig.key.asc()).all()
    return AdminConfigListResponse(
        items=[AdminConfigItem(key=r.key, value=r.value, description=r.description) for r in rows]
    )


@router.get("/reminders", response_model=RemindersListResponse)
def admin_get_reminders(
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    ensure_default_reminder_rules(db)
    rules = (
        db.query(ReminderConfig)
        .order_by(ReminderConfig.trigger_status.asc(), ReminderConfig.delay_hours.asc())
        .all()
    )
    return RemindersListResponse(rules=[ReminderRuleOut.model_validate(r) for r in rules])


@router.put("/reminders", response_model=RemindersListResponse)
def admin_put_reminders(
    payload: RemindersPutBody,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    ensure_default_reminder_rules(db)
    for item in payload.rules:
        row = db.query(ReminderConfig).filter(ReminderConfig.id == item.id).first()
        if not row:
            continue
        if item.delay_hours is not None:
            row.delay_hours = item.delay_hours
        if item.reminder_type is not None:
            row.reminder_type = item.reminder_type
        if item.message_template is not None:
            row.message_template = item.message_template
        if item.is_active is not None:
            row.is_active = item.is_active
    log_admin_action(
        db,
        action="reminders_updated",
        actor_id=actor.id,
        target_type="reminder_config",
        target_id=None,
        details="Updated reminder rules",
        ip_address=_client_ip(http_request),
        user_agent=http_request.headers.get("user-agent"),
    )
    db.commit()
    rules = (
        db.query(ReminderConfig)
        .order_by(ReminderConfig.trigger_status.asc(), ReminderConfig.delay_hours.asc())
        .all()
    )
    return RemindersListResponse(rules=[ReminderRuleOut.model_validate(r) for r in rules])


@router.post("/reminders/run", response_model=dict)
def admin_run_reminders(
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    """Process reminder rules once (for ops / testing). Prefer an external scheduler in production."""
    return run_reminder_scan(db)
