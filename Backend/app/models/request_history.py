import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class RequestHistory(Base):
    __tablename__ = "request_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    request = relationship("Request", back_populates="history")
    actor = relationship("User", foreign_keys=[actor_id])
