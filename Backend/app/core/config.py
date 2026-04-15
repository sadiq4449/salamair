from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/salamair"
    SECRET_KEY: str = "CHANGE-ME-set-a-real-secret-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ENVIRONMENT: str = "development"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "sales@salamair.com"
    SMTP_FROM_NAME: str = "Salam Air Sales"
    SMTP_USE_TLS: bool = True
    # When True, send_mail uses real SMTP. When False, sends are skipped (no fake "sent").
    EMAIL_ENABLED: bool = False
    RM_DEFAULT_EMAIL: str = "rm@salamair.com"

    # Inbound: IMAP poll (same mailbox as SMTP_USER for typical Gmail setup)
    IMAP_ENABLED: bool = False
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_PORT: int = 993
    IMAP_USE_SSL: bool = True
    IMAP_USER: str = ""
    IMAP_PASSWORD: str = ""
    IMAP_MAILBOX: str = "INBOX"
    # Optional: POST /email/poll-inbox with header X-Email-Poll-Secret (for cron without JWT)
    EMAIL_POLL_SECRET: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
