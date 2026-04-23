import re
from datetime import datetime
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, EmailStr, Field, field_validator


_EMAIL_SPLIT_RE = re.compile(r"[,;\s]+")


def _normalize_recipient_list(value: str | None) -> str:
    """Accept one or more emails separated by commas / semicolons / whitespace.

    Returns a canonical ``"a@x.com, b@y.com"`` string or raises ``ValueError`` on any
    invalid address. Duplicates (case-insensitive) are removed.
    """
    raw = (value or "").strip()
    if not raw:
        return ""
    parts = [p.strip() for p in _EMAIL_SPLIT_RE.split(raw) if p.strip()]
    validated: list[str] = []
    seen: set[str] = set()
    for p in parts:
        try:
            info = validate_email(p, check_deliverability=False)
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email address: {p} ({e})") from e
        addr = info.normalized
        low = addr.lower()
        if low in seen:
            continue
        seen.add(low)
        validated.append(addr)
    if not validated:
        raise ValueError("Provide at least one recipient email address.")
    if len(validated) > 10:
        raise ValueError("Too many recipients (max 10).")
    return ", ".join(validated)


class SendEmailRequest(BaseModel):
    request_id: UUID
    to: str = Field(
        default="",
        description="One or more recipient emails, comma/semicolon separated.",
    )
    message: str
    include_attachments: bool = True

    @field_validator("to")
    @classmethod
    def _to_validator(cls, v: str) -> str:
        return _normalize_recipient_list(v)


class SendToAgentEmailRequest(BaseModel):
    """First / ongoing formal email to the agent’s mailbox (separate from RM thread)."""
    request_id: UUID
    message: str = Field(min_length=1, max_length=20_000)
    include_attachments: bool = False
    # If empty, the API uses a default subject with request code and route.
    subject: str | None = Field(None, max_length=500)


class ReplyEmailRequest(BaseModel):
    request_id: UUID
    thread_id: UUID
    message: str
    # Only for thread_channel agent_sales. Ignored for RM (always "Re: …").
    subject: str | None = None


class SimulateReplyRequest(BaseModel):
    request_id: UUID
    message: str = "Approved with fare as requested. Valid for 7 days."
    from_email: EmailStr = "rm@salamair.com"


class EmailAttachmentRead(BaseModel):
    id: UUID
    filename: str
    file_url: str
    file_type: str
    file_size: int

    model_config = {"from_attributes": True}


class EmailMessageRead(BaseModel):
    id: UUID
    direction: str
    from_email: str
    to_email: str
    subject: str
    body: str
    html_body: str | None = None
    status: str
    attachments: list[EmailAttachmentRead] = []
    sent_at: datetime
    received_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EmailThreadRead(BaseModel):
    request_code: str
    thread_id: UUID
    subject: str
    rm_email: str
    status: str
    emails: list[EmailMessageRead] = []
    thread_channel: str = Field(
        default="rm",
        description="rm = Revenue Management; agent_sales = sales ↔ agent (SMTP).",
    )

    model_config = {"from_attributes": True}


class EmailInboxItem(BaseModel):
    thread_id: UUID
    request_id: UUID
    request_code: str
    route: str
    request_status: str
    agent_name: str | None
    subject: str
    rm_email: str
    message_count: int
    last_activity_at: datetime
    preview: str


class EmailInboxResponse(BaseModel):
    items: list[EmailInboxItem]
    total: int
    page: int
    limit: int


class SendEmailResponse(BaseModel):
    message: str
    email_id: UUID
    request_code: str
    status: str
    sent_at: datetime
    smtp_delivered: bool = True
    smtp_error: str | None = None


class ReplyEmailResponse(BaseModel):
    message: str
    email_id: UUID
    sent_at: datetime
    smtp_delivered: bool = True
    smtp_error: str | None = None


class PollInboxResponse(BaseModel):
    ok: bool
    skipped: bool = False
    reason: str | None = None
    processed: int = 0
    stored: int = 0
    errors: list[str] = Field(default_factory=list)
