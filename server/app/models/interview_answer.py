from uuid import uuid4

from sqlalchemy import ForeignKey, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InterviewAnswerModel(Base):
    __tablename__ = "interview_answer"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        default=lambda: str(uuid4()),
        primary_key=True,
    )

    # Unique: one answer per question, so a duplicate submission fails.
    question_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("interview_question.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    answer: Mapped[str] = mapped_column(Text, nullable=False)

    # Filled in once the answer has been evaluated.
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
