from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from sqlalchemy import make_url

from app.core.config import settings
from app.models.enums import Difficulty, ExperienceLevel, InterviewType, QuestionType

# Custom types in state must be allowlisted, or LangGraph refuses to load them
# back from a checkpoint (currently a warning, an error in future versions).
serde = JsonPlusSerializer(
    allowed_msgpack_modules=[
        (enum_cls.__module__, enum_cls.__name__)
        for enum_cls in (Difficulty, ExperienceLevel, InterviewType, QuestionType)
    ]
)


def get_conninfo() -> str:
    # DATABASE_URL names the SQLAlchemy driver (postgresql+psycopg://), which
    # psycopg itself doesn't accept.
    url = make_url(settings.database_url.get_secret_value())
    return url.set(drivername="postgresql").render_as_string(hide_password=False)


@asynccontextmanager
async def open_checkpointer() -> AsyncIterator[AsyncPostgresSaver]:
    # A pool rather than from_conn_string's single connection, so concurrent
    # interviews don't queue behind one connection. The saver requires
    # autocommit and dict rows on every connection.
    async with AsyncConnectionPool(
        get_conninfo(),
        kwargs={"autocommit": True, "row_factory": dict_row},
        open=False,
    ) as pool:
        checkpointer = AsyncPostgresSaver(conn=pool, serde=serde)
        # Creates the checkpoint tables on first run and applies any pending
        # migrations; safe to call on every startup.
        await checkpointer.setup()
        yield checkpointer
