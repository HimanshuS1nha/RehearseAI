import logging
from datetime import UTC, datetime

from fastapi import HTTPException, status
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import StateSnapshot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.graph.state import InterviewState, Question
from app.models.enums import InterviewStatus
from app.models.interview import InterviewModel
from app.models.interview_answer import InterviewAnswerModel
from app.models.interview_evaluation import InterviewEvaluationModel
from app.models.interview_question import InterviewQuestionModel

logger = logging.getLogger(__name__)

# The checkpointed graph state is the source of truth for an interview in
# progress; the question, answer and evaluation tables are a projection of it,
# written by sync_from_graph after every run.


def graph_config(interview_id: str) -> dict:
    return {"configurable": {"thread_id": interview_id}}


def initial_state(interview: InterviewModel) -> InterviewState:
    return {
        "role": interview.role,
        "experience_level": interview.experience_level,
        "interview_type": interview.interview_type,
        "topics": interview.topics,
        "difficulty": interview.difficulty,
        "job_description": interview.job_description,
        "turns": [],
        "current_question": None,
        "current_answer": None,
        "decision": None,
        "evaluation": None,
    }


def is_awaiting_answer(snapshot: StateSnapshot) -> bool:
    return snapshot.next == ("collect_answer",)


def is_stalled(snapshot: StateSnapshot) -> bool:
    # A run that stopped somewhere other than the answer interrupt, i.e. a
    # node raised (usually an LLM error). Invoking with None continues it from
    # the last completed node.
    return bool(snapshot.next) and not is_awaiting_answer(snapshot)


async def run_graph(
    graph: CompiledStateGraph, interview_id: str, graph_input
) -> StateSnapshot:
    config = graph_config(interview_id)
    try:
        await graph.ainvoke(graph_input, config)
    except Exception:
        # Whatever failed, the checkpoint holds the last completed node, so the
        # client can retry the same request and the run picks up from there.
        logger.exception("Interview graph run failed for %s", interview_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The interviewer is unavailable right now, please try again",
        )
    return await graph.aget_state(config)


async def get_pending_question(
    db: AsyncSession, interview_id: str
) -> InterviewQuestionModel | None:
    result = await db.execute(
        select(InterviewQuestionModel)
        .outerjoin(
            InterviewAnswerModel,
            InterviewAnswerModel.question_id == InterviewQuestionModel.id,
        )
        .where(
            InterviewQuestionModel.interview_id == interview_id,
            InterviewAnswerModel.id.is_(None),
        )
        .order_by(InterviewQuestionModel.question_number.desc())
        .limit(1)
    )
    return result.scalars().first()


async def sync_from_graph(
    db: AsyncSession, interview: InterviewModel, snapshot: StateSnapshot
):
    # Idempotent: writes only the rows that are missing, so it also repairs the
    # tables if an earlier request's commit failed after its graph run.
    state = snapshot.values

    result = await db.execute(
        select(InterviewQuestionModel).where(
            InterviewQuestionModel.interview_id == interview.id
        )
    )
    questions = {row.question_number: row for row in result.scalars()}

    answered = set(
        await db.scalars(
            select(InterviewAnswerModel.question_id)
            .join(InterviewQuestionModel)
            .where(InterviewQuestionModel.interview_id == interview.id)
        )
    )

    async def ensure_question(number: int, question: Question):
        if number not in questions:
            parent = questions.get(question["follows_up_on"])
            row = InterviewQuestionModel(
                interview_id=interview.id,
                question_number=number,
                question=question["question"],
                topic=question["topic"],
                difficulty=question["difficulty"],
                question_type=question["question_type"],
                parent_question_id=parent.id if parent else None,
            )
            db.add(row)
            # Flush so the row has its ID for answers and later follow-ups.
            await db.flush()
            questions[number] = row
        return questions[number]

    for number, turn in enumerate(state["turns"], start=1):
        question = await ensure_question(number, turn)
        if question.id not in answered:
            db.add(
                InterviewAnswerModel(
                    question_id=question.id,
                    answer=turn["answer"],
                    score=turn["score"],
                    feedback=turn["feedback"],
                )
            )

    if is_awaiting_answer(snapshot):
        await ensure_question(len(state["turns"]) + 1, state["current_question"])

    if state["evaluation"] and interview.status != InterviewStatus.COMPLETED:
        db.add(
            InterviewEvaluationModel(interview_id=interview.id, **state["evaluation"])
        )
        interview.status = InterviewStatus.COMPLETED
        interview.completed_at = datetime.now(UTC)
