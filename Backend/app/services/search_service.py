"""Global search across requests, agents (users), and chat messages."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.agent_profile import AgentProfile
from app.models.message import Message
from app.models.request import Request
from app.models.user import User


def _highlight(text: str, query: str) -> str:
    if not text or not query:
        return text
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    return pattern.sub(lambda m: f"**{m.group(0)}**", text)


def global_search(
    db: Session,
    q: str,
    current_user: User,
    type_filter: str = "all",
    page: int = 1,
    limit: int = 20,
) -> dict[str, Any]:
    q = (q or "").strip()
    if len(q) < 2:
        return {"query": q, "results": {"requests": [], "agents": [], "messages": []}, "total": 0}

    term = f"%{q}%"
    per_bucket = max(5, min(limit, 50))

    requests_out: list[dict[str, Any]] = []
    agents_out: list[dict[str, Any]] = []
    messages_out: list[dict[str, Any]] = []

    if type_filter in ("all", "requests"):
        rq = db.query(Request).options(joinedload(Request.agent))
        if current_user.role == "agent":
            rq = rq.filter(Request.agent_id == current_user.id)
        rq = rq.filter(
            or_(
                Request.request_code.ilike(term),
                Request.route.ilike(term),
                Request.notes.ilike(term),
            )
        ).order_by(Request.updated_at.desc()).limit(per_bucket).offset(0 if type_filter == "requests" else 0)
        for r in rq.limit(per_bucket).all():
            hl = _highlight(f"{r.request_code} - {r.route}", q)
            requests_out.append(
                {
                    "id": str(r.id),
                    "request_code": r.request_code,
                    "route": r.route,
                    "status": r.status,
                    "highlight": hl,
                }
            )

    if type_filter in ("all", "agents") and current_user.role in ("sales", "admin"):
        aq = (
            db.query(User)
            .outerjoin(AgentProfile, AgentProfile.user_id == User.id)
            .filter(User.role == "agent", User.is_active.is_(True))
            .filter(or_(User.name.ilike(term), User.email.ilike(term), AgentProfile.company_name.ilike(term)))
            .order_by(User.name.asc())
            .limit(per_bucket)
        )
        for u in aq.all():
            prof = u.agent_profile
            company = prof.company_name if prof else ""
            line = f"{u.name} ({u.email})" + (f" — {company}" if company else "")
            agents_out.append(
                {
                    "id": str(u.id),
                    "name": u.name,
                    "email": u.email,
                    "highlight": _highlight(line, q),
                }
            )

    if type_filter in ("all", "messages"):
        mq = (
            db.query(Message)
            .join(Request, Request.id == Message.request_id)
            .filter(Message.is_internal.is_(False))
        )
        if current_user.role == "agent":
            mq = mq.filter(Request.agent_id == current_user.id)
        mq = mq.filter(Message.content.ilike(term)).order_by(Message.created_at.desc()).limit(per_bucket)
        for m in mq.all():
            req = db.query(Request).filter(Request.id == m.request_id).first()
            code = req.request_code if req else ""
            preview = m.content if len(m.content) <= 200 else m.content[:197] + "..."
            messages_out.append(
                {
                    "id": str(m.id),
                    "request_code": code,
                    "request_id": str(m.request_id),
                    "content": preview,
                    "highlight": _highlight(preview, q),
                }
            )

    total = len(requests_out) + len(agents_out) + len(messages_out)
    return {
        "query": q,
        "results": {
            "requests": requests_out,
            "agents": agents_out,
            "messages": messages_out,
        },
        "total": total,
    }
