from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/salamair"
    # Blank = auto (SSL for common Railway/proxy hosts). Set "require", "disable", or omit from URL.
    DATABASE_SSLMODE: str = ""
    SECRET_KEY: str = "CHANGE-ME-set-a-real-secret-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    # Optional regex (e.g. https://.*\\.up\\.railway\\.app$) so the SPA and API on the same Railway URL work.
    CORS_ORIGIN_REGEX: str = ""
    ENVIRONMENT: str = "development"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "sales@salamair.com"
    SMTP_FROM_NAME: str = "Salam Air Sales"
    SMTP_USE_TLS: bool = True
    # Connection timeout (seconds). Increase if you see "timed out" on slow or distant SMTP.
    SMTP_TIMEOUT_SECONDS: int = 75
    # Use implicit TLS on port 465 (SMTP_SSL) instead of STARTTLS on 587. Try True if 587 times out
    # (some networks block STARTTLS; Gmail: smtp.gmail.com:465 + SMTP_IMPLICIT_SSL=true).
    SMTP_IMPLICIT_SSL: bool = False
    # When False: never send. When True: send (if credentials fail, SMTP errors). When None: send
    # only if SMTP_USER and SMTP_PASSWORD are both set (so Railway can omit this when creds exist).
    EMAIL_ENABLED: Optional[bool] = None
    # Railway Hobby/Free often blocks outbound SMTP (465/587). Use Resend HTTPS API (port 443) instead.
    # https://resend.com — verify your domain (or use onboarding@resend.dev while testing).
    RESEND_API_KEY: str = ""
    # Optional: verified sender in Resend (e.g. noreply@yourdomain.com). If empty, the app picks a valid From.
    RESEND_FROM_EMAIL: str = ""
    RM_DEFAULT_EMAIL: str = "rm@salamair.com"

    # Inbound: IMAP poll (same mailbox as SMTP_USER for typical Gmail setup).
    # False: never poll. True: poll. None: poll only if IMAP_USER and IMAP_PASSWORD are set.
    IMAP_ENABLED: Optional[bool] = None
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_PORT: int = 993
    IMAP_USE_SSL: bool = True
    IMAP_USER: str = ""
    IMAP_PASSWORD: str = ""
    IMAP_MAILBOX: str = "INBOX"
    # Optional: POST /email/poll-inbox with header X-Email-Poll-Secret (for cron without JWT)
    EMAIL_POLL_SECRET: str = ""

    # Analytics (Iteration 7): optional Redis; falls back to in-process TTL cache
    REDIS_URL: str = ""
    ANALYTICS_CACHE_TTL_SECONDS: int = 600

    # Shown on admin dashboard when host-level uptime is not tracked
    REPORTED_SYSTEM_UPTIME: str = "99.9%"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def email_sending_active(self) -> bool:
        """True unless EMAIL_ENABLED is explicitly false; if unset, Resend key or SMTP_USER + SMTP_PASSWORD."""
        if self.EMAIL_ENABLED is False:
            return False
        if self.EMAIL_ENABLED is True:
            return True
        if (self.RESEND_API_KEY or "").strip():
            return True
        u, p = (self.SMTP_USER or "").strip(), (self.SMTP_PASSWORD or "").strip()
        return bool(u and p)

    @property
    def imap_polling_active(self) -> bool:
        """True unless IMAP_ENABLED is explicitly false; if unset, requires IMAP_USER + IMAP_PASSWORD."""
        if self.IMAP_ENABLED is False:
            return False
        if self.IMAP_ENABLED is True:
            return True
        u, p = (self.IMAP_USER or "").strip(), (self.IMAP_PASSWORD or "").strip()
        return bool(u and p)

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
