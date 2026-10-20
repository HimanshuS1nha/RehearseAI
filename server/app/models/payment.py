from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import PaymentStatus, enum_column


class PaymentModel(Base):
    """One Stripe Checkout Session, created pending and settled by the webhook."""

    __tablename__ = "payment"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        default=lambda: str(uuid4()),
        primary_key=True,
    )

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    stripe_session_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )

    # Interviews bought. Stored here rather than read back from Stripe so the
    # webhook credits exactly what this server priced.
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    # Total charged, in the currency's smallest unit.
    amount: Mapped[int] = mapped_column(Integer, nullable=False)

    currency: Mapped[str] = mapped_column(String(3), nullable=False)

    status: Mapped[PaymentStatus] = mapped_column(
        enum_column(PaymentStatus),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
