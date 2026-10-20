from uuid import uuid4

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import Difficulty, QuestionType, enum_column


class InterviewQuestionModel(Base):
    __tablename__ = "interview_question"
    __table_args__ = (
        # Also serves as the index for looking up an interview's questions.
        UniqueConstraint(
            "interview_id", "question_number", name="uq_interview_question_number"
        ),
    )

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        default=lambda: str(uuid4()),
        primary_key=True,
    )

    interview_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("interview.id", ondelete="CASCADE"),
        nullable=False,
    )

    question_number: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped[str] = mapped_column(Text, nullable=False)

    topic: Mapped[str] = mapped_column(String(100), nullable=False)

    difficulty: Mapped[Difficulty] = mapped_column(
        enum_column(Difficulty), nullable=False
    )

    question_type: Mapped[QuestionType] = mapped_column(
        enum_column(QuestionType), nullable=False
    )

    # Set when this question follows up on an earlier one.
    parent_question_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("interview_question.id", ondelete="SET NULL"),
        nullable=True,
    )
