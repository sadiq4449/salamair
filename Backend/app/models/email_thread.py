import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base

# Second thread per request: formal SMTP email between sales and the agent (vs "rm" = Revenue Management).
THREAD_CHANNEL_RM = "rm"
THREAD_CHANNEL_AGENT_SALES = "agent_sales"


class EmailThread(Base):
    __tablename__ = "email_threads"
    __table_args__ = (
        UniqueConstraint("request_id", "thread_channel", name="uq_email_threads_request_channel"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id", ondelete="CASCADE"), nullable=False, index=True)
    thread_channel = Column(
        String(32),
        nullable=False,
        default=THREAD_CHANNEL_RM,
        server_default=THREAD_CHANNEL_RM,
    )
    subject = Column(String(500), nullable=False)
    # Counterparty: RM address for thread_channel=rm; agent's mailbox for thread_channel=agent_sales.
    rm_email = Column(String(255), nullable=False)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    request = relationship("Request", back_populates="email_threads")
    messages = relationship("EmailMessage", back_populates="thread", cascade="all, delete-orphan", order_by="EmailMessage.sent_at")
