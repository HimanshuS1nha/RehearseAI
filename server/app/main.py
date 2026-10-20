import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.graph.checkpointer import open_checkpointer
from app.graph.workflow import build_graph
from app.routers import auth, billing, interview, user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with open_checkpointer() as checkpointer:
        app.state.graph = build_graph(checkpointer)
        yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

# Before CORSMiddleware, so CORS headers are added to error responses too.
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(user.router, prefix="/api/users", tags=["users"])
app.include_router(interview.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])


@app.get("/")
async def home():
    return "Hello World"
