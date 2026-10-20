from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, DateTime, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import FREE_INTERVIEW_CREDITS
from app.core.database import Base


class UserModel(Base):
    __tablename__ = "user"
    # Credits are taken with a conditional UPDATE; this is the backstop.
    __table_args__ = (
        CheckConstraint(
            "interview_credits >= 0", name="interview_credits_non_negative"
        ),
    )

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        default=lambda: str(uuid4()),
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # Interviews the user can still create. One is used per interview created
    # and given back if that interview is deleted before it starts.
    interview_credits: Mapped[int] = mapped_column(
        Integer,
        default=FREE_INTERVIEW_CREDITS,
        server_default=str(FREE_INTERVIEW_CREDITS),
        nullable=False,
    )
