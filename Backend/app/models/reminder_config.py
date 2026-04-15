import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class ReminderConfig(Base):
    __tablename__ = "reminder_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger_status = Column(String(20), nullable=False, index=True)
    delay_hours = Column(Integer, nullable=False)
    reminder_type = Column(String(20), nullable=False)  # email / in_app / both
    message_template = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
