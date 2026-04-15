import uuid

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class MessageReadStatus(Base):
    __tablename__ = "message_read_status"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_read"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    message = relationship("Message", back_populates="read_statuses")
