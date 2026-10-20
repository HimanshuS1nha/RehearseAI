from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, status
from langgraph.graph.state import CompiledStateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cookies import ACCESS_TOKEN_COOKIE
from app.core.database import get_db
from app.core.jwt import ACCESS_TOKEN_TYPE, decode_token
from app.schemas.user import UserResponse

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    access_token: Annotated[str | None, Cookie(alias=ACCESS_TOKEN_COOKIE)] = None,
):
    # Built from the access token's claims alone, with no database lookup.
    not_authenticated = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )
    if not access_token:
        raise not_authenticated

    try:
        payload = decode_token(access_token, ACCESS_TOKEN_TYPE)
    except jwt.InvalidTokenError:
        raise not_authenticated

    return UserResponse(
        id=payload["sub"], name=payload["name"], email=payload["email"]
    )


CurrentUser = Annotated[UserResponse, Depends(get_current_user)]


def get_graph(request: Request) -> CompiledStateGraph:
    # Compiled once in the app's lifespan, with the checkpointer attached.
    return request.app.state.graph


InterviewGraph = Annotated[CompiledStateGraph, Depends(get_graph)]
