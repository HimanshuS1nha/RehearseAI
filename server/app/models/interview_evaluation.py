from uuid import uuid4

from sqlalchemy import ForeignKey, Integer, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InterviewEvaluationModel(Base):
    __tablename__ = "interview_evaluation"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        default=lambda: str(uuid4()),
        primary_key=True,
    )

    interview_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("interview.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)

    technical_score: Mapped[int] = mapped_column(Integer, nullable=False)

    communication_score: Mapped[int] = mapped_column(Integer, nullable=False)

    problem_solving_score: Mapped[int] = mapped_column(Integer, nullable=False)

    strengths: Mapped[list[str]] = mapped_column(JSONB, nullable=False)

    weaknesses: Mapped[list[str]] = mapped_column(JSONB, nullable=False)

    suggested_learning: Mapped[list[str]] = mapped_column(JSONB, nullable=False)

    summary: Mapped[str] = mapped_column(Text, nullable=False)
