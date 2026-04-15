import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(10), nullable=False)  # chat / email / system
    sender_role = Column(String(20), nullable=True)  # agent / sales / rm / system
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, nullable=True)
    is_internal = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sender = relationship("User", foreign_keys=[sender_id], lazy="joined")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan", lazy="joined")
    read_statuses = relationship("MessageReadStatus", back_populates="message", cascade="all, delete-orphan")
