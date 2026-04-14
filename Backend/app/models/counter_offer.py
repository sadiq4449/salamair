import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class CounterOffer(Base):
    __tablename__ = "counter_offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id", ondelete="CASCADE"), nullable=False)
    original_price = Column(Numeric(12, 2), nullable=False)
    counter_price = Column(Numeric(12, 2), nullable=False)
    message = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    request = relationship("Request", back_populates="counter_offers")
    creator = relationship("User", foreign_keys=[created_by])
