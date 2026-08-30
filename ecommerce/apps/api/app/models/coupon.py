import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any
from sqlalchemy import String, Integer, Boolean, Enum as SQLEnum, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import UUID
from app.core.database import Base
from app.models.enums import DiscountType


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(
        SQLEnum(DiscountType, name="discounttype", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=DiscountType.FIXED,
    )
    discount_value: Mapped[int] = mapped_column(Integer, nullable=False)  # cents or % basis
    minimum_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # cents
    maximum_discount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # cents
    usage_limit: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_platform: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    applicable_categories: Mapped[Optional[List[Any]]] = mapped_column(JSON, default=list, nullable=True)
    applicable_products: Mapped[Optional[List[Any]]] = mapped_column(JSON, default=list, nullable=True)
    applicable_companies: Mapped[Optional[List[Any]]] = mapped_column(JSON, default=list, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Coupon id={self.id} code={self.code} is_platform={self.is_platform}>"
