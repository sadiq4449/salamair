import uuid
from datetime import date

from sqlalchemy import Column, Date, DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"
    __table_args__ = (UniqueConstraint("snapshot_date", "metric_type", name="uq_analytics_snapshots_date_type"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_date = Column(Date, nullable=False, index=True)
    metric_type = Column(String(50), nullable=False)
    metric_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
