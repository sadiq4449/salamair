"""Heuristic email-thread summary bullets (matches frontend `buildDemoEmailSummaryPoints`) + volume hints."""

from __future__ import annotations

from typing import Any

def _safe_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, bool):
        return int(value)
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, bool):
        return float(int(value))
    try:
        out = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return default
    if out != out:  # NaN
        return default
    return out


def fallback_email_thread_points(p: dict[str, Any]) -> list[str]:
    points: list[str] = []
    tag_names = [str(t).lower() for t in (p.get("tag_names") or [])]
    priority = str(p.get("priority") or "")
    pax = _safe_int(p.get("pax"), 0)
    price = _safe_float(p.get("price"), 0.0)
    status = str(p.get("status") or "")
    raw_notes = p.get("notes")
    notes_s = (str(raw_notes) if raw_notes is not None else "").strip()
    chat_n = _safe_int(p.get("chat_message_count"), 0)
    email_n = _safe_int(p.get("email_message_count"), 0)
    if chat_n or email_n:
        points.append(
            f"Message volume: {chat_n} portal chat message(s), {email_n} RM email message(s) in this request."
        )

    if priority == "urgent":
        points.append("Urgent request — prioritize a timely response.")
    if any("vip" in t for t in tag_names):
        points.append("Tagged as VIP — high-value relationship.")
    if any("corporate" in t for t in tag_names):
        points.append("Corporate booking — potential repeat business.")
    if pax >= 20:
        points.append(f"Large group ({pax} pax) — bulk fare rules may apply.")
    if 0 < price < 90:
        points.append("Price is below typical threshold — align with RM if needed.")

    status_msg = {
        "submitted": "Request newly submitted - initial review.",
        "under_review": "Under sales review - negotiation may be in progress.",
        "rm_pending": "Awaiting RM - revenue verification.",
        "approved": "Approved - proceed with next steps.",
        "rejected": "Rejected - consider counter or revised terms.",
        "counter_offered": "Counter offered - awaiting agent response.",
    }
    if status in status_msg:
        points.append(status_msg[status])

    if notes_s:
        snippet = notes_s[:120]
        if len(notes_s) > 120:
            snippet += "…"
        points.append(f'Agent notes mention: “{snippet}”')

    return points if points else ["No strong signals — standard fare request."]
