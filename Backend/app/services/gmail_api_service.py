"""Gmail API send for the sales ↔ agent email thread only (not RM)."""

from __future__ import annotations

import base64
import logging
from typing import TYPE_CHECKING

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user_gmail_credential import UserGmailCredential
from app.services.email_service import _normalize_msg_id_header, send_smtp_email

if TYPE_CHECKING:
    from app.models.user import User

logger = logging.getLogger("uvicorn.error")

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
GMAIL_SCOPES = [GMAIL_SEND_SCOPE]


def _oauth_client_config() -> dict:
    return {
        "web": {
            "client_id": (settings.GOOGLE_OAUTH_CLIENT_ID or "").strip(),
            "client_secret": (settings.GOOGLE_OAUTH_CLIENT_SECRET or "").strip(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [(settings.GOOGLE_OAUTH_REDIRECT_URI or "").strip()],
        }
    }


def google_oauth_configured() -> bool:
    c = _oauth_client_config()["web"]
    return bool(c["client_id"] and c["client_secret"] and c["redirect_uris"][0])


def gmail_client_id_secret_configured() -> bool:
    """Client id+secret (required to refresh any token)."""
    c = _oauth_client_config()["web"]
    return bool(c["client_id"] and c["client_secret"])


def shared_gmail_agent_thread_configured() -> bool:
    """Server env: send sales↔agent via Gmail as one shared mailbox (no per-user Connect)."""
    if not (settings.GMAIL_AGENT_THREAD_REFRESH_TOKEN or "").strip():
        return False
    return gmail_client_id_secret_configured()


def build_flow(redirect_uri: str | None = None):
    from google_auth_oauthlib.flow import Flow

    uri = (redirect_uri or settings.GOOGLE_OAUTH_REDIRECT_URI or "").strip()
    return Flow.from_client_config(
        _oauth_client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=uri,
    )


def _make_credentials(refresh_token: str) -> Credentials | None:
    cid = (settings.GOOGLE_OAUTH_CLIENT_ID or "").strip()
    csec = (settings.GOOGLE_OAUTH_CLIENT_SECRET or "").strip()
    if not cid or not csec or not (refresh_token or "").strip():
        return None
    return Credentials(
        token=None,
        refresh_token=refresh_token.strip(),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=cid,
        client_secret=csec,
        scopes=GMAIL_SCOPES,
    )


def credentials_for_user(db: Session, user_id) -> Credentials | None:
    row = db.query(UserGmailCredential).filter(UserGmailCredential.user_id == user_id).first()
    if not row:
        return None
    return _make_credentials(row.refresh_token)


def credentials_for_agent_sales_send(db: Session, user_id) -> Credentials | None:
    """Per-user Connect wins; else optional shared env token (agent↔sales thread only; not RM)."""
    u = credentials_for_user(db, user_id)
    if u is not None:
        return u
    return _make_credentials((settings.GMAIL_AGENT_THREAD_REFRESH_TOKEN or ""))


def _gmail_credential_chain_for_send(db: Session, user_id) -> list[Credentials]:
    """
    All Gmail credential attempts, in order: per-user, then server shared token.
    A bad or expired *user* token must not block the shared app mailbox.
    """
    u = credentials_for_user(db, user_id)
    s = _make_credentials((settings.GMAIL_AGENT_THREAD_REFRESH_TOKEN or ""))
    out: list[Credentials] = []
    if u is not None:
        out.append(u)
    if s is not None and (u is None or s.refresh_token != u.refresh_token):
        out.append(s)
    return out


def _rfc_message_id_from_gmail_message(service, gmail_id: str) -> str | None:
    m = (
        service.users()
        .messages()
        .get(userId="me", id=gmail_id, format="metadata", metadataHeaders=["Message-ID"])
        .execute()
    )
    for h in m.get("payload", {}).get("headers", []):
        if (h.get("name") or "").lower() == "message-id":
            v = (h.get("value") or "").strip()
            return v if v else None
    return None


def send_via_gmail(
    creds: Credentials,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str,
    *,
    in_reply_to: str | None = None,
) -> tuple[str | None, str | None, str]:
    """Returns (rfc Message-ID or None, error or None, from_email for display)."""
    from email.message import EmailMessage

    try:
        creds.refresh(Request())
    except Exception as e:
        logger.exception("Gmail credential refresh failed")
        return None, str(e), ""
    try:
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        prof = service.users().getProfile(userId="me").execute()
        from_addr = (prof.get("emailAddress") or "").strip() or ""
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = to_email
        if in_reply_to:
            irt = _normalize_msg_id_header(in_reply_to)
            msg["In-Reply-To"] = irt
            msg["References"] = irt
        msg.set_content(body_text, charset="utf-8")
        msg.add_alternative(body_html, subtype="html", charset="utf-8")
        raw_b64 = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")
        sent = service.users().messages().send(userId="me", body={"raw": raw_b64}).execute()
        gid = sent.get("id")
        if not gid:
            return None, "Gmail API returned no message id", from_addr
        rfc = _rfc_message_id_from_gmail_message(service, gid) or f"<gmailapi.{gid}@gmailapi.invalid>"
        return rfc, None, from_addr
    except Exception as e:
        logger.exception("Gmail send failed")
        detail = str(e)
        try:
            from googleapiclient.errors import HttpError

            if isinstance(e, HttpError):
                raw = e.content
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8", errors="replace")
                status = e.resp.status if e.resp else "?"
                detail = f"Gmail API {status}: {raw[:1000] if raw else e}"
        except Exception:
            pass
        return None, detail, ""


def send_outgoing_agent_sales(
    db: Session,
    user: User,
    to_email: str,
    subject: str,
    plain_body: str,
    html_body: str,
    *,
    in_reply_to: str | None = None,
    smtp_user_email_first: bool = False,
) -> tuple[str | None, str | None, str]:
    """
    Sales ↔ agent thread only. If the user has linked Gmail, send via Gmail API; else SMTP/Resend.
    smtp_user_email_first: for SMTP only, when True (e.g. agent replying) prefer the user's email for display.
    Returns (message_id, smtp/gmail error string or None, from_email for storage).
    """
    gchain = _gmail_credential_chain_for_send(db, user.id)
    last_gmail_err: str | None = None
    last_from = ""
    for g in gchain:
        mid, err, from_addr = send_via_gmail(
            g, to_email, subject, plain_body, html_body, in_reply_to=in_reply_to
        )
        last_from = from_addr
        if not err and mid:
            return mid, None, from_addr
        if err:
            last_gmail_err = err
            logger.warning(
                "Gmail send attempt failed, trying next if any: %s", err[:500] if err else err
            )
    if gchain and last_gmail_err:
        return None, last_gmail_err, last_from
    if gchain and not last_gmail_err:
        return None, "Gmail send failed with no error detail", last_from
    smtp_id, smtp_err = send_smtp_email(
        to_email, subject, plain_body, html_body, in_reply_to=in_reply_to
    )
    if smtp_user_email_first:
        from_addr = (user.email or settings.SMTP_FROM_EMAIL or "").strip() or to_email
    else:
        from_addr = (settings.SMTP_FROM_EMAIL or user.email or "").strip() or to_email
    return smtp_id, smtp_err, from_addr
