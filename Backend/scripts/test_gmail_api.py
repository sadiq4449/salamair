"""
Verify Gmail API credentials (refresh + profile). Does NOT send email.

Run from repo root:
  python Backend/scripts/test_gmail_api.py

Requires Backend/.env with GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
and GMAIL_AGENT_THREAD_REFRESH_TOKEN (or rely on Connect flow DB — not used here).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Load .env before importing app settings
Backend = Path(__file__).resolve().parents[1]
os.chdir(Backend)
if str(Backend) not in sys.path:
    sys.path.insert(0, str(Backend))

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings


def main() -> int:
    cid = (settings.GOOGLE_OAUTH_CLIENT_ID or "").strip()
    csec = (settings.GOOGLE_OAUTH_CLIENT_SECRET or "").strip()
    rt = (settings.GMAIL_AGENT_THREAD_REFRESH_TOKEN or "").strip()

    print("=== Gmail API credential check (no email sent) ===\n")
    if not cid or not csec:
        print("FAIL: GOOGLE_OAUTH_CLIENT_ID and/or GOOGLE_OAUTH_CLIENT_SECRET missing in env.")
        return 1
    print("OK: Client ID and client secret are set.")

    if not rt:
        print("WARN: GMAIL_AGENT_THREAD_REFRESH_TOKEN is empty — cannot test shared mailbox send path.")
        print("      (Per-user Connect tokens are in the database; this script only tests env refresh token.)")
        return 2

    # Do not pass scopes: must match the original OAuth grant (see gmail_api_service._make_credentials).
    creds = Credentials(
        token=None,
        refresh_token=rt,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=cid,
        client_secret=csec,
    )
    try:
        creds.refresh(Request())
        print("OK: Refresh token exchanged for access token (OAuth working).")
    except Exception as e:
        print(f"FAIL: Could not refresh token: {e}")
        print("      Common: wrong client secret, revoked token, or token from a different OAuth client.")
        return 1

    try:
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        prof = service.users().getProfile(userId="me").execute()
        addr = prof.get("emailAddress", "?")
        print(f"OK: Gmail API profile: send as <{addr}>")
    except Exception as e:
        print(f"FAIL: Gmail API getProfile: {e}")
        return 1

    print("\nConclusion: Shared-token Gmail path can obtain an access token and talk to Gmail API.")
    print("If live send still fails, check send-time errors (403 = enable Gmail API or fix scope).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
