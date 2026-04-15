"""Daily analytics snapshot (Iteration 7). Run via cron, e.g. `0 2 * * *`::

    cd Backend && python -m app.jobs.analytics_snapshot
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

# Allow `python -m app.jobs.analytics_snapshot` from Backend/
_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.db.session import SessionLocal  # noqa: E402
from app.services.analytics_service import snapshot_daily_metrics  # noqa: E402


def main() -> None:
    day = date.today() - timedelta(days=1)
    db = SessionLocal()
    try:
        snapshot_daily_metrics(db, day)
        print(f"analytics_snapshots: wrote daily_kpis for {day.isoformat()}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
