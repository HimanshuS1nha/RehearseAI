from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt

from app.core.config import settings

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def create_access_token(user_id: str, name: str, email: str):
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "name": name,
        "email": email,
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(
        payload, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm
    )


def create_refresh_token(user_id: str, session_id: str, expires_at: datetime):
    payload = {
        "sub": user_id,
        "session_id": session_id,
        # Makes every token unique, even two issued in the same second for the
        # same session, so a rotated-out token never matches the current hash.
        "jti": str(uuid4()),
        "type": REFRESH_TOKEN_TYPE,
        "iat": datetime.now(UTC),
        "exp": expires_at,
    }
    return jwt.encode(
        payload, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm
    )


def decode_token(token: str, expected_type: str):
    payload = jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "iat", "sub", "type"]},
    )
    if payload["type"] != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload
