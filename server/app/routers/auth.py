import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

import jwt
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select, update
from starlette.background import BackgroundTask

from app.core.config import settings
from app.core.cookies import (
    REFRESH_TOKEN_COOKIE,
    clear_auth_cookies,
    set_auth_cookies,
)
from app.core.dependencies import CurrentUser, DbSession
from app.core.emails import send_otp_email
from app.core.exceptions import error_response
from app.core.hashing import (
    hash_password,
    hash_token,
    password_hasher,
    verify_and_update_password,
    verify_password,
)
from app.core.jwt import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.otps import create_otp, verify_otp
from app.core.user_agent import parse_user_agent
from app.models.enums import OtpPurpose
from app.models.user import UserModel
from app.models.user_session import UserSessionModel
from app.schemas.responses import MessageResponse
from app.schemas.session import UserSessionResponse
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)

router = APIRouter()

logger = logging.getLogger(__name__)

# Verified against when the email doesn't exist, so a login for an unknown
# email takes as long as one with a wrong password and can't be told apart.
DUMMY_PASSWORD_HASH = password_hasher.hash("dummy-password-for-timing")

RefreshTokenCookie = Annotated[str | None, Cookie(alias=REFRESH_TOKEN_COOKIE)]


def get_session_id(refresh_token: str | None):
    # The refresh cookie's path is /api/auth, so it reaches every auth route
    # and tells us which session is making the request. None if it's missing
    # or invalid.
    if not refresh_token:
        return None
    try:
        return decode_token(refresh_token, REFRESH_TOKEN_TYPE).get("session_id")
    except jwt.InvalidTokenError:
        return None


@router.post(
    "/register", status_code=status.HTTP_201_CREATED, response_model=MessageResponse
)
async def register(
    data: RegisterRequest, background_tasks: BackgroundTasks, db: DbSession
):
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email.lower())
    )
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already exists"
        )

    new_user = UserModel(
        email=data.email.lower(),
        name=data.name,
        password_hash=await hash_password(data.password),
    )

    db.add(new_user)
    await db.commit()

    code = await create_otp(db, new_user.id, OtpPurpose.EMAIL_VERIFICATION)
    if code:
        background_tasks.add_task(send_otp_email, new_user.email, new_user.name, code)

    return MessageResponse(message="User created successfully")


@router.post("/login", response_model=MessageResponse)
async def login(
    data: LoginRequest, request: Request, response: Response, db: DbSession
):
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email.lower())
    )
    user = result.scalars().first()
    if not user:
        await verify_password(data.password, DUMMY_PASSWORD_HASH)
        raise invalid_credentials

    is_valid, new_hash = await verify_and_update_password(
        data.password, user.password_hash
    )
    if not is_valid:
        raise invalid_credentials

    if new_hash:
        user.password_hash = new_hash

    if user.email_verified_at is None:
        # create_otp commits, which also saves the rehashed password above.
        code = await create_otp(db, user.id, OtpPurpose.EMAIL_VERIFICATION)
        logger.warning("POST /api/auth/login -> 403: email not verified")
        # Returned rather than raised: an HTTPException would drop the
        # background task that sends the email.
        unverified = error_response(
            status.HTTP_403_FORBIDDEN, "Please verify your email"
        )
        if code:
            unverified.background = BackgroundTask(
                send_otp_email, user.email, user.name, code
            )
        return unverified

    session_id = str(uuid4())
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    refresh_token = create_refresh_token(user.id, session_id, expires_at)
    user_agent = request.headers.get("user-agent")

    db.add(
        UserSessionModel(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=hash_token(refresh_token),
            expires_at=expires_at,
            user_agent=user_agent,
            **parse_user_agent(user_agent),
            ip_address=request.client.host if request.client else None,
        )
    )

    await db.commit()

    set_auth_cookies(
        response,
        access_token=create_access_token(user.id, user.name, user.email),
        refresh_token=refresh_token,
    )

    return MessageResponse(message="Logged in successfully")


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: VerifyEmailRequest, db: DbSession):
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email.lower())
    )
    user = result.scalars().first()
    if user and user.email_verified_at is not None:
        return MessageResponse(message="Email already verified")

    # An unknown email gets the same error as a wrong code.
    if not user or not await verify_otp(
        db, user.id, OtpPurpose.EMAIL_VERIFICATION, data.code
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code"
        )

    # Commits the code's deletion too, so it's used up only if this sticks.
    user.email_verified_at = datetime.now(UTC)
    await db.commit()

    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    data: ResendVerificationRequest, background_tasks: BackgroundTasks, db: DbSession
):
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email.lower())
    )
    user = result.scalars().first()
    if user and user.email_verified_at is None:
        code = await create_otp(db, user.id, OtpPurpose.EMAIL_VERIFICATION)
        if code:
            background_tasks.add_task(send_otp_email, user.email, user.name, code)

    # The same reply whether or not the email exists, is already verified or
    # is still in its resend cooldown, so this can't be used to probe accounts.
    return MessageResponse(
        message="If that email needs verifying, a new code is on its way"
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: DbSession
):
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email.lower())
    )
    user = result.scalars().first()
    if user:
        # Also the resend: create_otp's cooldown stops repeats flooding the inbox.
        code = await create_otp(db, user.id, OtpPurpose.PASSWORD_RESET)
        if code:
            background_tasks.add_task(
                send_otp_email, user.email, user.name, code, OtpPurpose.PASSWORD_RESET
            )

    # The same reply whether or not the email exists or is cooling down, so
    # this can't be used to probe accounts.
    return MessageResponse(
        message="If an account exists for that email, a reset code is on its way"
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, db: DbSession):
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email.lower())
    )
    user = result.scalars().first()

    # An unknown email gets the same error as a wrong code.
    if not user or not await verify_otp(
        db, user.id, OtpPurpose.PASSWORD_RESET, data.code
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code"
        )

    user.password_hash = await hash_password(data.new_password)
    # The code arrived by email, which proves the address as well as
    # verifying it would.
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)

    # Log out every device: whoever knew the old password shouldn't keep a
    # session. Unlike change-password there's no current session to keep.
    await db.execute(
        update(UserSessionModel)
        .where(
            UserSessionModel.user_id == user.id,
            UserSessionModel.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )
    # Commits the code's deletion too, so it's used up only if this sticks.
    await db.commit()

    return MessageResponse(message="Password reset. Log in with your new password")


@router.get("/sessions", response_model=list[UserSessionResponse])
async def get_sessions(
    user: CurrentUser,
    db: DbSession,
    refresh_token: RefreshTokenCookie = None,
):
    current_session_id = get_session_id(refresh_token)

    result = await db.execute(
        select(UserSessionModel)
        .where(
            UserSessionModel.user_id == user.id,
            UserSessionModel.revoked_at.is_(None),
            UserSessionModel.expires_at > datetime.now(UTC),
        )
        .order_by(UserSessionModel.updated_at.desc())
    )
    sessions = result.scalars().all()

    return [
        UserSessionResponse.model_validate(session).model_copy(
            update={"is_current": session.id == current_session_id}
        )
        for session in sessions
    ]


def refresh_failed_response(message: str):
    logger.warning("POST /api/auth/refresh -> 401: %s", message)
    # Returned rather than raised: an HTTPException would drop the
    # Set-Cookie headers that clear the dead cookies from the browser.
    response = JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED, content={"message": message}
    )
    clear_auth_cookies(response)
    return response


@router.post("/refresh", response_model=MessageResponse)
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: RefreshTokenCookie = None,
):
    if not refresh_token:
        return refresh_failed_response("Not authenticated")

    try:
        payload = decode_token(refresh_token, REFRESH_TOKEN_TYPE)
    except jwt.InvalidTokenError:
        return refresh_failed_response("Invalid refresh token")

    now = datetime.now(UTC)

    # FOR UPDATE locks the row, so two refreshes of the same session run one
    # after the other instead of both rotating from the same old token.
    result = await db.execute(
        select(UserSessionModel)
        .where(
            UserSessionModel.id == payload.get("session_id"),
            UserSessionModel.user_id == payload["sub"],
        )
        .with_for_update()
    )
    session = result.scalars().first()
    if (
        not session
        or session.revoked_at is not None
        or session.expires_at <= now
    ):
        return refresh_failed_response("Session expired")

    if session.refresh_token_hash != hash_token(refresh_token):
        # A validly signed token for a live session that isn't the current
        # one was already rotated out, so it has been used before: someone
        # else may hold a copy. Revoke the session to log out both parties.
        session.revoked_at = now
        await db.commit()
        return refresh_failed_response("Session revoked")

    result = await db.execute(select(UserModel).where(UserModel.id == session.user_id))
    user = result.scalars().first()
    if not user:
        return refresh_failed_response("Not authenticated")

    # Sliding expiry: every refresh pushes the session another full lifetime
    # forward, so an active user is never logged out.
    expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    new_refresh_token = create_refresh_token(user.id, session.id, expires_at)

    session.refresh_token_hash = hash_token(new_refresh_token)
    session.expires_at = expires_at
    await db.commit()

    # The access token is rebuilt from the user row, so a changed name or
    # email shows up here.
    set_auth_cookies(
        response,
        access_token=create_access_token(user.id, user.name, user.email),
        refresh_token=new_refresh_token,
    )

    return MessageResponse(message="Token refreshed")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    user: CurrentUser,
    db: DbSession,
    refresh_token: RefreshTokenCookie = None,
):
    result = await db.execute(select(UserModel).where(UserModel.id == user.id))
    db_user = result.scalars().first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    # 400 rather than 401: the user is authenticated, and a 401 would make the
    # frontend think the session is dead and try to refresh it.
    if not await verify_password(data.current_password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    db_user.password_hash = await hash_password(data.new_password)

    current_session_id = get_session_id(refresh_token)

    # Log out every other device, in case the old password was compromised.
    revoke_others = update(UserSessionModel).where(
        UserSessionModel.user_id == user.id,
        UserSessionModel.revoked_at.is_(None),
    )
    # Only filter when there's a session to keep: "id != NULL" is never true
    # in SQL, so it would silently revoke nothing.
    if current_session_id:
        revoke_others = revoke_others.where(UserSessionModel.id != current_session_id)
    await db.execute(
        revoke_others.values(revoked_at=datetime.now(UTC))
    )
    await db.commit()

    return MessageResponse(message="Password changed successfully")


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response, db: DbSession, refresh_token: RefreshTokenCookie = None
):
    # Works without a valid access token (it may already have expired), and
    # always clears the cookies, so logging out can't fail from the user's side.
    session_id = get_session_id(refresh_token)
    if session_id:
        await db.execute(
            delete(UserSessionModel).where(UserSessionModel.id == session_id)
        )
        await db.commit()

    clear_auth_cookies(response)

    return MessageResponse(message="Logged out successfully")


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    response: Response,
    user: CurrentUser,
    db: DbSession,
    refresh_token: RefreshTokenCookie = None,
):
    # NOTE: A session that exists but belongs to another user returns 404,
    # not 403, so the caller can't tell whether the ID exists.
    result = await db.execute(
        select(UserSessionModel).where(
            UserSessionModel.id == session_id,
            UserSessionModel.user_id == user.id,
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    await db.delete(session)
    await db.commit()

    # Deleting the session you're using is the same as logging out.
    if str(session_id) == get_session_id(refresh_token):
        clear_auth_cookies(response)
