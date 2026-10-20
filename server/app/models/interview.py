from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import (
    Difficulty,
    ExperienceLevel,
    InterviewStatus,
    InterviewType,
    enum_column,
)


class InterviewModel(Base):
    __tablename__ = "interview"

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

    role: Mapped[str] = mapped_column(String(255), nullable=False)

    experience_level: Mapped[ExperienceLevel] = mapped_column(
        enum_column(ExperienceLevel), nullable=False
    )

    interview_type: Mapped[InterviewType] = mapped_column(
        enum_column(InterviewType), nullable=False
    )

    topics: Mapped[list[str]] = mapped_column(JSONB, nullable=False)

    difficulty: Mapped[Difficulty] = mapped_column(
        enum_column(Difficulty), nullable=False
    )

    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[InterviewStatus] = mapped_column(
        enum_column(InterviewStatus),
        default=InterviewStatus.CREATED,
        nullable=False,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
