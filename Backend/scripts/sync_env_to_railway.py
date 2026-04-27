"""
Sync selected vars from Backend/.env to the linked Railway service (email, Groq AI, etc.).
Skips DATABASE_URL, SECRET_KEY, CORS_ORIGINS, ENVIRONMENT (keep Railway's own).
Run: python Backend/scripts/sync_env_to_railway.py
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent
ENV_PATH = BACKEND / ".env"

SYNC_KEYS = frozenset(
    {
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
        "SMTP_FROM_NAME",
        "SMTP_USE_TLS",
        "SMTP_IMPLICIT_SSL",
        "SMTP_TIMEOUT_SECONDS",
        "SMTP_PREFERRED",
        "EMAIL_ENABLED",
        "RM_DEFAULT_EMAIL",
        "IMAP_ENABLED",
        "IMAP_HOST",
        "IMAP_PORT",
        "IMAP_USE_SSL",
        "IMAP_USER",
        "IMAP_PASSWORD",
        "IMAP_MAILBOX",
        "EMAIL_POLL_SECRET",
        "GROQ_API_KEY",
        "GROQ_MODEL",
        # Gmail API (sales ↔ agent thread); same keys as local .env
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_OAUTH_CLIENT_SECRET",
        "GOOGLE_OAUTH_REDIRECT_URI",
        "GOOGLE_OAUTH_SUCCESS_REDIRECT",
        "GMAIL_AGENT_THREAD_REFRESH_TOKEN",
    }
)

SKIP_VALUES = frozenset({"", '""', "''"})


def parse_env(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        out[k] = v
    return out


def main() -> int:
    if not ENV_PATH.is_file():
        print("Missing Backend/.env", file=sys.stderr)
        return 1
    data = parse_env(ENV_PATH.read_text(encoding="utf-8"))
    to_set = [(k, data[k]) for k in SYNC_KEYS if k in data and data[k] not in SKIP_VALUES]
    if not to_set:
        print("Nothing to sync (no matching keys with values).", file=sys.stderr)
        return 1
    railway = shutil.which("railway")
    if not railway:
        print("railway CLI not in PATH", file=sys.stderr)
        return 1
    for key, val in to_set:
        arg = f"{key}={val}"
        r = subprocess.run(
            [railway, "variable", "set", "--skip-deploys", arg],
            cwd=str(REPO),
            capture_output=True,
            text=True,
            shell=False,
        )
        if r.returncode != 0:
            print(r.stderr or r.stdout, file=sys.stderr)
            return r.returncode
        print(f"OK {key}")
    print(f"Done: {len(to_set)} variable(s) set on Railway (--skip-deploys). Redeploy once from Railway dashboard.")
    if any(
        k in ("GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_SUCCESS_REDIRECT")
        for k, _ in to_set
    ):
        print(
            "Hint: If GOOGLE_OAUTH_* still point to localhost, update them on Railway to your live API/SPA URLs "
            "and add the same redirect URI in Google Cloud → OAuth client.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
