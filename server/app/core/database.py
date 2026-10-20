from collections.abc import AsyncGenerator
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings

engine = create_async_engine(
    url=settings.database_url.get_secret_value(),
    pool_pre_ping=True,
    # Columns are timestamptz, so stored values are correct in any zone; running
    # every connection in UTC just makes them come back with a +00:00 offset
    # rather than the server's local one.
    connect_args={"options": "-c timezone=UTC"},
)

AsyncSessionLocal = async_sessionmaker(
    expire_on_commit=False,
    bind=engine,
)


class Base(DeclarativeBase):
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
