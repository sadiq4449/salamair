"""
Create the first admin user when the users table is empty (or add by email if missing).

Usage (set DATABASE_URL to target Postgres first):

    cd Backend
    python scripts/bootstrap_admin.py admin@test.com
    python scripts/bootstrap_admin.py admin@test.com --password 'YourPassword123'
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

from sqlalchemy import func  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an admin user by email.")
    parser.add_argument("email", help="Admin email")
    parser.add_argument("--name", default="Portal Admin", help="Display name")
    parser.add_argument(
        "--password",
        default=None,
        help="Password (min 6 chars). Omit to prompt twice.",
    )
    args = parser.parse_args()

    email_norm = args.email.strip().lower()
    if not email_norm:
        print("Email is required.", file=sys.stderr)
        return 1

    pw = args.password
    if not pw:
        pw = getpass.getpass("New admin password (min 6 chars): ")
        pw2 = getpass.getpass("Confirm password: ")
        if pw != pw2:
            print("Passwords do not match.", file=sys.stderr)
            return 1

    if len(pw) < 6:
        print("Password must be at least 6 characters.", file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        existing = db.query(User).filter(func.lower(User.email) == email_norm).first()
        if existing:
            if existing.role == "admin":
                print(f"Admin already exists: {existing.email}")
                return 0
            existing.role = "admin"
            existing.password = get_password_hash(pw)
            existing.is_active = True
            existing.name = args.name.strip() or existing.name
            db.add(existing)
            db.commit()
            print(f"Promoted to admin: {existing.email}")
            return 0

        user = User(
            name=args.name.strip() or "Portal Admin",
            email=args.email.strip(),
            password=get_password_hash(pw),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Admin created: {user.email}")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
