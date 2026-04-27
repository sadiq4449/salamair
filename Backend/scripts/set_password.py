"""
Set a user's password hash in Postgres (same bcrypt as the API).

Use when you forgot the password on a hosted DB (Render, Railway, etc.).

1. Set DATABASE_URL to the target database (Render Dashboard → Postgres → External URL).
2. Run from repo root or Backend:

     cd Backend
     set DATABASE_URL=postgresql://...
     python scripts/set_password.py admin@salamair.com

   Password is prompted if not passed as the second argument (safer than shell history).

Requires dependencies from Backend/requirements.txt (passlib, sqlalchemy, psycopg2).
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys
from pathlib import Path

Backend = Path(__file__).resolve().parents[1]
os.chdir(Backend)
if str(Backend) not in sys.path:
    sys.path.insert(0, str(Backend))

# DATABASE_URL must be set in the environment before settings/db connect.
if not (os.environ.get("DATABASE_URL") or "").strip():
    # Still allow loading from Backend/.env via pydantic after chdir
    pass

from sqlalchemy import func  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Set portal password for a user by email.")
    parser.add_argument("email", help="User email (must exist in users table)")
    parser.add_argument(
        "password",
        nargs="?",
        default=None,
        help="New password (min 6 chars). Omit to prompt twice (recommended).",
    )
    args = parser.parse_args()

    email_norm = args.email.strip().lower()
    if not email_norm:
        print("Email is required.", file=sys.stderr)
        return 1

    pw = args.password
    if not pw:
        pw = getpass.getpass("New password (min 6 chars): ")
        pw2 = getpass.getpass("Confirm new password: ")
        if pw != pw2:
            print("Passwords do not match.", file=sys.stderr)
            return 1

    if len(pw) < 6:
        print("Password must be at least 6 characters.", file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        user = db.query(User).filter(func.lower(User.email) == email_norm).first()
        if not user:
            print(f"No user found with email matching: {args.email.strip()}", file=sys.stderr)
            return 1

        user.password = get_password_hash(pw)
        db.add(user)
        db.commit()
        print(f"Password updated for: {user.email} (role={user.role})")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
