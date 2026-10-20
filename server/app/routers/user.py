from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import delete, select

from app.core.cookies import clear_auth_cookies
from app.core.dependencies import CurrentUser, DbSession, InterviewGraph
from app.core.hashing import verify_password
from app.models.interview import InterviewModel
from app.models.user import UserModel
from app.schemas.responses import MessageResponse
from app.schemas.user import DeleteAccountRequest, MeResponse

router = APIRouter()


@router.get("/me", response_model=MeResponse)
async def me(user: CurrentUser, db: DbSession):
    db_user = await db.scalar(select(UserModel).where(UserModel.id == user.id))
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return db_user


@router.delete("/me", response_model=MessageResponse)
async def delete_me(
    data: DeleteAccountRequest,
    response: Response,
    user: CurrentUser,
    db: DbSession,
    graph: InterviewGraph,
):
    result = await db.execute(select(UserModel).where(UserModel.id == user.id))
    db_user = result.scalars().first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    # 400 rather than 401: the user is authenticated, and a 401 would make the
    # frontend think the session is dead and try to refresh it.
    if not await verify_password(data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect"
        )

    interview_ids = (
        await db.scalars(
            select(InterviewModel.id).where(InterviewModel.user_id == user.id)
        )
    ).all()

    # Interviews (with their questions, answers and evaluations), sessions and
    # codes go with it (ON DELETE CASCADE).
    await db.execute(delete(UserModel).where(UserModel.id == user.id))
    await db.commit()

    # Checkpoints aren't linked to the user by a foreign key, so they're
    # removed here, after the commit, as delete_interview does.
    for interview_id in interview_ids:
        await graph.checkpointer.adelete_thread(interview_id)

    clear_auth_cookies(response)

    return MessageResponse(message="Account deleted")
