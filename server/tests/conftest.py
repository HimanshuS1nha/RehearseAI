import os
import re
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import make_url

SERVER_DIR = Path(__file__).parents[1]

# Settings are read when app modules are first imported, and environment
# variables beat .env, so this has to run before anything from app is imported.
# Tests get their own <dev db>_test database, and a fake Gemini key so a test
# that forgets to stub the LLM fails instead of making a real (billed) call.
dev_url = make_url(dotenv_values(SERVER_DIR / ".env")["DATABASE_URL"])
os.environ["DATABASE_URL"] = dev_url.set(
    database=f"{dev_url.database}_test"
).render_as_string(hide_password=False)
os.environ["GOOGLE_API_KEY"] = "test-key"
os.environ["COOKIE_SECURE"] = "false"
os.environ["SMTP_USERNAME"] = "rehearse@example.com"
os.environ["SMTP_PASSWORD"] = "test-password"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test"

import httpx
import pytest
from alembic import command
from alembic.config import Config
from app.core import emails
from app.core.database import engine
from app.graph.nodes import (
    ask_question,
    decide_action,
    end_interview,
    evaluate_answer,
)
from app.graph.nodes.ask_question import GeneratedQuestion
from app.graph.nodes.decide_action import Decision
from app.graph.nodes.end_interview import FinalEvaluation
from app.graph.nodes.evaluate_answer import AnswerEvaluation
from app.main import app, lifespan
from sqlalchemy import text

PASSWORD = "password123"


def questions_answered(messages) -> int:
    # Both prompts that see the whole interview include this line.
    return int(re.search(r"Questions answered: (\d+)", messages[1].content)[1])


class FakeLLM:
    """Scripted stand-in for the four structured-output LLMs in the graph."""

    def __init__(self):
        self.calls = {"ask": 0, "decide": 0, "evaluate": 0, "end": 0}
        self.failures = {}
        # decide_action finishes once this many questions are answered.
        self.finish_after = 3

    def fail(self, name: str, times: int = 1):
        self.failures[name] = times

    def stub(self, name: str, respond: str):
        fake = self

        class Stub:
            async def ainvoke(self, messages):
                fake.calls[name] += 1
                if fake.failures.get(name):
                    fake.failures[name] -= 1
                    raise RuntimeError(f"simulated {name} failure")
                # Looked up per call, so a test can replace e.g. fake.question.
                return getattr(fake, respond)(messages)

        return Stub()

    def question(self, messages):
        answered = questions_answered(messages)
        return GeneratedQuestion(
            question=f"Question {answered + 1}",
            topic="Python",
            question_type="follow_up" if answered else "technical",
            difficulty="medium",
            follows_up_on=answered or None,
        )

    def decision(self, messages):
        done = questions_answered(messages) >= self.finish_after
        return Decision(decision="finish" if done else "continue", reason="test")

    def evaluation(self, messages):
        return AnswerEvaluation(score=80, feedback="Good answer.")

    def final_evaluation(self, messages):
        return FinalEvaluation(
            technical_score=70,
            communication_score=80,
            problem_solving_score=75,
            strengths=["Clear"],
            weaknesses=["Brief"],
            suggested_learning=["Asyncio"],
            summary="Solid practice run.",
        )


def latest_code(sent_emails: list[dict], email: str) -> str:
    # The subject starts with the code, e.g. "042517 is your ... code".
    subject = [sent for sent in sent_emails if sent["to"] == email][-1]["subject"]
    return subject.split()[0]


@pytest.fixture(autouse=True)
def sent_emails(monkeypatch) -> list[dict]:
    # Every test records emails instead of sending them over SMTP.
    sent = []

    async def fake_send_email(to: str, subject: str, text: str, html: str):
        sent.append({"to": to, "subject": subject, "text": text, "html": html})

    monkeypatch.setattr(emails, "send_email", fake_send_email)
    return sent


@pytest.fixture
def fake_llm(monkeypatch) -> FakeLLM:
    fake = FakeLLM()
    monkeypatch.setattr(ask_question, "question_llm", fake.stub("ask", "question"))
    monkeypatch.setattr(decide_action, "decision_llm", fake.stub("decide", "decision"))
    monkeypatch.setattr(
        evaluate_answer, "evaluation_llm", fake.stub("evaluate", "evaluation")
    )
    monkeypatch.setattr(
        end_interview, "final_evaluation_llm", fake.stub("end", "final_evaluation")
    )
    return fake


@pytest.fixture(scope="session")
def migrated_db():
    # Down then up, so every run starts from an empty schema and exercises the
    # migrations in both directions. Sync on purpose: env.py calls
    # asyncio.run, which can't run inside the test event loop.
    config = Config(SERVER_DIR / "alembic.ini")
    command.downgrade(config, "base")
    command.upgrade(config, "head")


@pytest.fixture(scope="session")
async def started_app(migrated_db):
    async with lifespan(app):
        yield app


@pytest.fixture
async def make_client(started_app, sent_emails):
    async with engine.begin() as conn:
        await conn.execute(
            text(
                'TRUNCATE "user", checkpoints, checkpoint_blobs, checkpoint_writes '
                "CASCADE"
            )
        )

    clients = []

    async def make(
        email: str = "candidate@example.com", credits: int | None = 10
    ) -> httpx.AsyncClient:
        client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=started_app), base_url="http://test/api"
        )
        clients.append(client)
        await client.post(
            "/auth/register",
            json={
                "name": "Candidate",
                "email": email,
                "password": PASSWORD,
                "confirm_password": PASSWORD,
            },
        )
        response = await client.post(
            "/auth/verify-email",
            json={"email": email, "code": latest_code(sent_emails, email)},
        )
        assert response.status_code == 200
        response = await client.post(
            "/auth/login", json={"email": email, "password": PASSWORD}
        )
        assert response.status_code == 200
        # Most tests create several interviews; None keeps the signup default.
        if credits is not None:
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        'UPDATE "user" SET interview_credits = :credits '
                        "WHERE email = :email"
                    ),
                    {"credits": credits, "email": email},
                )
        return client

    yield make

    for client in clients:
        await client.aclose()


@pytest.fixture
async def client(make_client) -> httpx.AsyncClient:
    return await make_client()
