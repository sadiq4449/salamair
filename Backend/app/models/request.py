import uuid
from datetime import date

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.tag import request_tags  # noqa: F401 — registers association table


class Request(Base):
    __tablename__ = "requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_code = Column(String(20), unique=True, nullable=False, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    route = Column(String(100), nullable=False)
    pax = Column(Integer, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    travel_date = Column(Date, nullable=True)
    return_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="draft")
    priority = Column(String(10), default="normal")
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    agent = relationship("User", foreign_keys=[agent_id], backref="requests")
    assignee = relationship("User", foreign_keys=[assigned_to])
    attachments = relationship("Attachment", back_populates="request", cascade="all, delete-orphan")
    history = relationship("RequestHistory", back_populates="request", cascade="all, delete-orphan", order_by="RequestHistory.created_at")
    counter_offers = relationship("CounterOffer", back_populates="request", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=request_tags, back_populates="requests")
    sla_segments = relationship("SlaTracking", back_populates="request", cascade="all, delete-orphan")
    email_threads = relationship("EmailThread", back_populates="request", cascade="all, delete-orphan")
