"""Heuristic email-thread summary bullets (matches frontend `buildDemoEmailSummaryPoints`) + volume hints."""

from __future__ import annotations

from typing import Any


def fallback_email_thread_points(p: dict[str, Any]) -> list[str]:
    points: list[str] = []
    tag_names = [str(t).lower() for t in (p.get("tag_names") or [])]
    priority = str(p.get("priority") or "")
    pax = int(p.get("pax") or 0)
    price = float(p.get("price") or 0)
    status = str(p.get("status") or "")
    notes = p.get("notes")
    notes_s = (notes or "").strip() if notes is not None else ""
    chat_n = int(p.get("chat_message_count") or 0)
    email_n = int(p.get("email_message_count") or 0)
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
