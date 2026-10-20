import re
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from langgraph.types import Command
from sqlalchemy import Text, cast, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, DbSession, InterviewGraph
from app.models.enums import InterviewStatus
from app.models.interview import InterviewModel
from app.models.interview_answer import InterviewAnswerModel
from app.models.interview_evaluation import InterviewEvaluationModel
from app.models.interview_question import InterviewQuestionModel
from app.models.user import UserModel
from app.schemas.interview import (
    AnswerRequest,
    InterviewCreateRequest,
    InterviewProgressResponse,
    InterviewResponse,
    InterviewResultsResponse,
    InterviewUpdateRequest,
    QuestionResponse,
    QuestionResultResponse,
)
from app.schemas.responses import PaginatedResponse
from app.services.interview_flow import (
    get_pending_question,
    graph_config,
    initial_state,
    is_awaiting_answer,
    is_stalled,
    run_graph,
    sync_from_graph,
)

router = APIRouter()


async def get_owned_interview(
    interview_id: UUID, user_id: str, db: AsyncSession, for_update: bool = False
):
    # NOTE: An interview that exists but belongs to another user returns 404,
    # not 403. A 403 would confirm the ID exists, letting a caller probe for
    # other users' interviews; filtering by user_id in the query makes both
    # cases indistinguishable.
    query = select(InterviewModel).where(
        InterviewModel.id == interview_id,
        InterviewModel.user_id == user_id,
    )
    if for_update:
        query = query.with_for_update()
    result = await db.execute(query)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
        )
    return interview


@router.post("", status_code=status.HTTP_201_CREATED, response_model=InterviewResponse)
async def create_interview(
    data: InterviewCreateRequest, user: CurrentUser, db: DbSession
):
    # A conditional UPDATE so two creates at once can't both spend the last
    # credit; it commits together with the interview.
    remaining = await db.scalar(
        update(UserModel)
        .where(UserModel.id == user.id, UserModel.interview_credits > 0)
        .values(interview_credits=UserModel.interview_credits - 1)
        .returning(UserModel.interview_credits)
    )
    if remaining is None:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No interviews left, buy more to continue",
        )

    interview = InterviewModel(user_id=user.id, **data.model_dump())

    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    return interview


@router.get("", response_model=PaginatedResponse[InterviewResponse])
async def get_interviews(
    user: CurrentUser,
    db: DbSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=100)] = None,
):
    filters = [InterviewModel.user_id == user.id]
    if search and search.strip():
        # Escaped so a % or _ typed by the user matches literally.
        escaped = re.sub(r"([\\%_])", r"\\\1", search.strip())
        pattern = f"%{escaped}%"
        filters.append(
            or_(
                InterviewModel.role.ilike(pattern, escape="\\"),
                # Topics are a JSONB list; matching its text form is enough
                # for a substring search.
                cast(InterviewModel.topics, Text).ilike(pattern, escape="\\"),
            )
        )

    total = await db.scalar(
        select(func.count()).select_from(InterviewModel).where(*filters)
    )

    result = await db.execute(
        select(InterviewModel)
        .where(*filters)
        .order_by(InterviewModel.updated_at.desc(), InterviewModel.id)
        .offset(offset)
        .limit(limit)
    )

    return PaginatedResponse[InterviewResponse](
        items=result.scalars().all(), total=total, offset=offset, limit=limit
    )


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: UUID, user: CurrentUser, db: DbSession):
    return await get_owned_interview(interview_id, user.id, db)


@router.patch("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: UUID,
    data: InterviewUpdateRequest,
    user: CurrentUser,
    db: DbSession,
):
    interview = await get_owned_interview(interview_id, user.id, db)

    # The graph generates questions from this configuration, so changing it
    # mid-interview would leave earlier questions out of step with it.
    if interview.status != InterviewStatus.CREATED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview can only be edited before it starts",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)

    await db.commit()
    # updated_at is set by the database on update, so it has to be read back.
    await db.refresh(interview)

    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: UUID, user: CurrentUser, db: DbSession, graph: InterviewGraph
):
    interview = await get_owned_interview(interview_id, user.id, db, for_update=True)

    # Nothing was used yet, so the credit spent creating it is given back. The
    # row lock stops a concurrent start from slipping in before the delete.
    if interview.status == InterviewStatus.CREATED:
        await db.execute(
            update(UserModel)
            .where(UserModel.id == user.id)
            .values(interview_credits=UserModel.interview_credits + 1)
        )

    # Questions, answers and the evaluation go with it (ON DELETE CASCADE).
    await db.delete(interview)
    await db.commit()

    await graph.checkpointer.adelete_thread(interview.id)


def require_status(interview: InterviewModel, expected: InterviewStatus):
    if interview.status != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Interview is {interview.status}, expected {expected}",
        )


async def progress_response(db: AsyncSession, interview: InterviewModel):
    question = None
    if interview.status == InterviewStatus.IN_PROGRESS:
        question = await get_pending_question(db, interview.id)
    return InterviewProgressResponse(status=interview.status, question=question)


# NOTE: start, answer and end lock the interview row for the whole request,
# graph run included, so concurrent requests for one interview run one after
# the other and each sees the state the previous one left.


@router.post("/{interview_id}/start", response_model=InterviewProgressResponse)
async def start_interview(
    interview_id: UUID, user: CurrentUser, db: DbSession, graph: InterviewGraph
):
    interview = await get_owned_interview(interview_id, user.id, db, for_update=True)
    require_status(interview, InterviewStatus.CREATED)

    snapshot = await graph.aget_state(graph_config(interview.id))
    if is_stalled(snapshot):
        # An earlier start failed part-way; carry on from where it stopped.
        snapshot = await run_graph(graph, interview.id, None)
    elif not is_awaiting_answer(snapshot):
        snapshot = await run_graph(graph, interview.id, initial_state(interview))
    # Otherwise an earlier start ran but its commit failed: only sync below.

    await sync_from_graph(db, interview, snapshot)
    interview.status = InterviewStatus.IN_PROGRESS
    interview.started_at = datetime.now(UTC)
    await db.commit()

    return await progress_response(db, interview)


@router.post("/{interview_id}/answer", response_model=InterviewProgressResponse)
async def answer_question(
    interview_id: UUID,
    data: AnswerRequest,
    user: CurrentUser,
    db: DbSession,
    graph: InterviewGraph,
):
    interview = await get_owned_interview(interview_id, user.id, db, for_update=True)
    require_status(interview, InterviewStatus.IN_PROGRESS)

    snapshot = await graph.aget_state(graph_config(interview.id))
    if is_stalled(snapshot):
        # The previous answer reached the graph but its run failed, so this is
        # a retry of it: finish that run instead of taking a new answer.
        snapshot = await run_graph(graph, interview.id, None)
    else:
        await sync_from_graph(db, interview, snapshot)
        pending = await get_pending_question(db, interview.id)
        if not pending or pending.id != str(data.question_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This question has already been answered",
            )
        snapshot = await run_graph(graph, interview.id, Command(resume=data.answer))

    await sync_from_graph(db, interview, snapshot)
    await db.commit()

    return await progress_response(db, interview)


@router.post("/{interview_id}/end", response_model=InterviewProgressResponse)
async def end_interview_early(
    interview_id: UUID, user: CurrentUser, db: DbSession, graph: InterviewGraph
):
    interview = await get_owned_interview(interview_id, user.id, db, for_update=True)
    require_status(interview, InterviewStatus.IN_PROGRESS)

    config = graph_config(interview.id)
    snapshot = await graph.aget_state(config)
    if is_stalled(snapshot):
        snapshot = await run_graph(graph, interview.id, None)

    if is_awaiting_answer(snapshot):
        if not snapshot.values["turns"]:
            # Nothing answered, so there is nothing to evaluate.
            interview.status = InterviewStatus.ABANDONED
            await db.commit()
            return await progress_response(db, interview)

        # Rewrite the state as if decide_action had chosen to finish, so the
        # run continues into end_interview with the answers so far.
        await graph.aupdate_state(
            config,
            {"decision": "finish", "current_question": None},
            as_node="decide_action",
        )
        snapshot = await run_graph(graph, interview.id, None)

    await sync_from_graph(db, interview, snapshot)
    await db.commit()

    return await progress_response(db, interview)


@router.get("/{interview_id}/current-question", response_model=QuestionResponse)
async def get_current_question(interview_id: UUID, user: CurrentUser, db: DbSession):
    interview = await get_owned_interview(interview_id, user.id, db)
    require_status(interview, InterviewStatus.IN_PROGRESS)

    question = await get_pending_question(db, interview.id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No question pending"
        )
    return question


@router.get("/{interview_id}/results", response_model=InterviewResultsResponse)
async def get_results(interview_id: UUID, user: CurrentUser, db: DbSession):
    interview = await get_owned_interview(interview_id, user.id, db)
    require_status(interview, InterviewStatus.COMPLETED)

    evaluation = await db.scalar(
        select(InterviewEvaluationModel).where(
            InterviewEvaluationModel.interview_id == interview.id
        )
    )

    result = await db.execute(
        select(InterviewQuestionModel, InterviewAnswerModel)
        .outerjoin(
            InterviewAnswerModel,
            InterviewAnswerModel.question_id == InterviewQuestionModel.id,
        )
        .where(InterviewQuestionModel.interview_id == interview.id)
        .order_by(InterviewQuestionModel.question_number)
    )
    questions = [
        QuestionResultResponse(
            **QuestionResponse.model_validate(question).model_dump(),
            parent_question_id=question.parent_question_id,
            answer=answer.answer if answer else None,
            score=answer.score if answer else None,
            feedback=answer.feedback if answer else None,
        )
        for question, answer in result.all()
    ]

    return InterviewResultsResponse(evaluation=evaluation, questions=questions)
