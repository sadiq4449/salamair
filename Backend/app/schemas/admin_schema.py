from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

VALID_ROLES = frozenset({"agent", "sales", "admin"})


class AdminUserItem(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    city: str | None
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    limit: int


class AdminCreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(..., description="agent | sales | admin")
    city: str | None = Field(None, max_length=100)
    company_name: str | None = Field(None, max_length=200)
    credit_limit: Decimal | None = Field(None, ge=0, description="For new agent accounts only")


class AdminCreateUserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    city: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUpdateUserRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    role: str | None = Field(None, description="agent | sales | admin")
    city: str | None = Field(None, max_length=100)
    new_password: str | None = Field(
        default=None,
        min_length=6,
        max_length=128,
        description="When set, replaces the user login password. Omit to leave unchanged.",
    )


class AdminUpdateUserResponse(BaseModel):
    message: str
    user: AdminUserItem


class LogActorSummary(BaseModel):
    id: UUID | None
    name: str
    role: str


class LogTargetSummary(BaseModel):
    type: str
    id: UUID | None = None
    name: str | None = None


class AdminLogItem(BaseModel):
    id: UUID
    action: str
    actor: LogActorSummary
    target: LogTargetSummary | None = None
    details: str | None
    ip_address: str | None
    timestamp: datetime


class AdminLogListResponse(BaseModel):
    items: list[AdminLogItem]
    total: int
    page: int
    limit: int


class AdminConfigItem(BaseModel):
    key: str
    value: str
    description: str | None


class AdminConfigListResponse(BaseModel):
    items: list[AdminConfigItem]


class AdminConfigEntry(BaseModel):
    key: str = Field(..., max_length=100)
    value: str


class AdminConfigUpdateRequest(BaseModel):
    items: list[AdminConfigEntry]


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users_today: int
    total_agents: int
    total_sales: int
    total_admins: int
    requests_today: int
    pending_requests: int
    emails_sent_today: int
    system_uptime: str


class AdminAgentItem(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    city: str | None
    company_name: str | None
    credit_limit: Decimal
    requests_count: int
    is_active: bool


class AdminAgentListResponse(BaseModel):
    items: list[AdminAgentItem]
    total: int
    page: int
    limit: int


class AdminAgentUpdateRequest(BaseModel):
    company_name: str | None = Field(None, max_length=200)
    credit_limit: Decimal | None = Field(None, ge=0)


class AdminPasswordResetResponse(BaseModel):
    message: str
    email_sent: bool
    temporary_password: str | None = Field(
        None,
        description="Only returned when outbound email is disabled",
    )


class AdminSimpleMessage(BaseModel):
    message: str


class AdminEmailStatusResponse(BaseModel):
    """Non-secret mail configuration for deploy verification."""

    email_sending_active: bool
    imap_polling_active: bool
    smtp_host: str
    smtp_port: int
    smtp_from_email: str
    smtp_use_tls: bool
    smtp_implicit_ssl: bool
    smtp_timeout_seconds: int
    resend_configured: bool
    resend_outbound_summary: str | None = Field(
        None,
        description="Actual Resend From / Reply-To (SMTP_FROM_EMAIL alone is not the envelope when using Gmail+Resend).",
    )
    resend_test_sender_mode: bool = Field(
        False,
        description="True if Resend sandbox sender — only the Resend account email may receive until a domain is verified.",
    )
    smtp_user_configured: bool
    smtp_password_configured: bool
    email_enabled_env: bool | None = Field(None, description="Raw EMAIL_ENABLED from env, if set")
    imap_host: str
    imap_port: int
    imap_use_ssl: bool
    imap_user_configured: bool
    imap_password_configured: bool
    imap_enabled_env: bool | None = Field(None, description="Raw IMAP_ENABLED from env, if set")
    rm_default_email: str


class AdminEmailTestSendRequest(BaseModel):
    to: EmailStr | None = Field(None, description="Recipient; defaults to the admin user email")


class AdminEmailTestSendResponse(BaseModel):
    success: bool
    message: str
    sent_to: str
    smtp_error: str | None = None
