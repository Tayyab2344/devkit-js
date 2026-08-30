import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import UUID
from app.core.database import Base
from app.models.enums import InfluencerStatus, CampaignStatus


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Influencer(Base):
    __tablename__ = "influencers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    handle: Mapped[str] = mapped_column(String(100), nullable=False)
    followers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[InfluencerStatus] = mapped_column(
        SQLEnum(InfluencerStatus, name="influencerstatus", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=InfluencerStatus.PENDING,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    influencer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("influencers.id", ondelete="CASCADE"), index=True, nullable=False
    )
    coupon_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True
    )
    clicks_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    orders_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_revenue: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # cents
    commission_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # cents
    status: Mapped[CampaignStatus] = mapped_column(
        SQLEnum(CampaignStatus, name="campaignstatus", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=CampaignStatus.ACTIVE,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
