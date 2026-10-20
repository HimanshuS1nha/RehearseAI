from datetime import datetime
from typing import Annotated
from uuid import UUID

from annotated_types import Len
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    StringConstraints,
    field_validator,
)

from app.models.enums import (
    Difficulty,
    ExperienceLevel,
    InterviewStatus,
    InterviewType,
    QuestionType,
)


def dedupe_topics(value: list[str]) -> list[str]:
    # Case-insensitive, keeping the first spelling and the original order.
    seen = set()
    unique = []
    for topic in value:
        if topic.lower() not in seen:
            seen.add(topic.lower())
            unique.append(topic)
    return unique


def empty_to_none(value: str | None) -> str | None:
    return value or None


# Shared by the create and update requests so both enforce the same rules.
Role = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]
Topic = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
Topics = Annotated[list[Topic], Len(1, 10), AfterValidator(dedupe_topics)]
JobDescription = Annotated[
    str | None,
    StringConstraints(strip_whitespace=True, max_length=10_000),
    AfterValidator(empty_to_none),
]


class InterviewCreateRequest(BaseModel):
    role: Role
    experience_level: ExperienceLevel
    interview_type: InterviewType
    topics: Topics
    difficulty: Difficulty
    job_description: JobDescription = None


class InterviewUpdateRequest(BaseModel):
    # Unknown fields are rejected, so a typo or a read-only field like status
    # fails loudly instead of silently changing nothing.
    model_config = ConfigDict(extra="forbid")

    # Every field is optional; only the ones sent are changed.
    role: Role | None = None
    experience_level: ExperienceLevel | None = None
    interview_type: InterviewType | None = None
    topics: Topics | None = None
    difficulty: Difficulty | None = None
    job_description: JobDescription = None

    @field_validator(
        "role", "experience_level", "interview_type", "topics", "difficulty"
    )
    @classmethod
    def reject_null(cls, value):
        # Leaving a field out means "don't change it"; sending null would try to
        # clear a column that can't be empty. job_description can be cleared.
        if value is None:
            raise ValueError("Field cannot be null")
        return value


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    experience_level: ExperienceLevel
    interview_type: InterviewType
    topics: list[str]
    difficulty: Difficulty
    job_description: str | None
    status: InterviewStatus
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AnswerRequest(BaseModel):
    # The question being answered, so a double submit or a stale tab can't
    # land an answer on the next question.
    question_id: UUID
    answer: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)
    ]


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_number: int
    question: str
    topic: str
    question_type: QuestionType
    difficulty: Difficulty


class InterviewProgressResponse(BaseModel):
    status: InterviewStatus
    # The question to answer next; null once the interview has ended.
    question: QuestionResponse | None


class QuestionResultResponse(QuestionResponse):
    parent_question_id: str | None
    # Null for the question left unanswered when an interview is ended early.
    answer: str | None
    score: int | None
    feedback: str | None


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    overall_score: int
    technical_score: int
    communication_score: int
    problem_solving_score: int
    strengths: list[str]
    weaknesses: list[str]
    suggested_learning: list[str]
    summary: str


class InterviewResultsResponse(BaseModel):
    evaluation: EvaluationResponse
    questions: list[QuestionResultResponse]
