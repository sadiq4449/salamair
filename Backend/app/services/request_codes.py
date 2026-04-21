"""Sequence generator for human-readable request codes (REQ-YYYY-NNN).

Correctness notes:
- We compute ``max(seq)`` from the *parsed* numeric suffix rather than a
  lexicographic ``ORDER BY request_code DESC``, so ``REQ-YYYY-100`` sorts
  after ``REQ-YYYY-99``.
- A Postgres advisory transaction lock (scoped per year) serializes
  concurrent generators within the same transaction, eliminating the
  read-compute-write race. The lock is a no-op on engines that don't
  support it (e.g. SQLite in tests).
- The unique constraint on ``Request.request_code`` remains the last-line
  defence against any remaining collisions.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.request import Request


def generate_request_code(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    try:
        db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": int(year)})
    except Exception:
        # Advisory locks are a Postgres-only construct; ignore elsewhere.
        pass

    prefix = f"REQ-{year}-"
    rows = (
        db.query(Request.request_code)
        .filter(Request.request_code.like(f"{prefix}%"))
        .all()
    )
    max_seq = 0
    for (code,) in rows:
        if not code:
            continue
        try:
            n = int(code[len(prefix):])
        except (ValueError, TypeError):
            continue
        if n > max_seq:
            max_seq = n
    return f"{prefix}{max_seq + 1:03d}"
