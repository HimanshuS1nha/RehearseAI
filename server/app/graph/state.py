from typing import Literal, TypedDict

from app.models.enums import Difficulty, ExperienceLevel, InterviewType, QuestionType


class Question(TypedDict):
    question: str
    topic: str
    question_type: QuestionType
    difficulty: Difficulty
    # 1-based number of the earlier turn this question builds on, if any.
    follows_up_on: int | None


class Turn(Question):
    answer: str
    score: int
    feedback: str


class Evaluation(TypedDict):
    overall_score: int
    technical_score: int
    communication_score: int
    problem_solving_score: int
    strengths: list[str]
    weaknesses: list[str]
    suggested_learning: list[str]
    summary: str


class InterviewState(TypedDict):
    role: str
    experience_level: ExperienceLevel
    interview_type: InterviewType
    topics: list[str]
    difficulty: Difficulty
    job_description: str | None

    # Only fully answered and evaluated questions, so len(turns) is the number
    # of questions answered. The question in flight lives in current_question
    # and current_answer until evaluate_answer folds them into a Turn.
    turns: list[Turn]
    current_question: Question | None
    current_answer: str | None
    decision: Literal["continue", "finish"] | None
    evaluation: Evaluation | None
