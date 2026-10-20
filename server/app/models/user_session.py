from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserSessionModel(Base):
    __tablename__ = "user_session"

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

    refresh_token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    browser_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    os_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    device_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
