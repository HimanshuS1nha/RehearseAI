from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import OtpPurpose, enum_column


class OtpModel(Base):
    __tablename__ = "otp"
    # One live code per user and purpose: sending a new one replaces the old.
    __table_args__ = (UniqueConstraint("user_id", "purpose"),)

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        default=lambda: str(uuid4()),
        primary_key=True,
    )

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )

    purpose: Mapped[OtpPurpose] = mapped_column(
        enum_column(OtpPurpose), nullable=False
    )

    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
