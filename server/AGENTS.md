# Server

The Rehearse API: **FastAPI** on async **SQLAlchemy 2** (psycopg 3,
PostgreSQL), with **Alembic** for migrations. The interview itself is a
**LangGraph** state graph that calls Gemini through `langchain-google-genai`
and saves its checkpoints in Postgres. Payments go through Stripe and email
through aiosmtplib. Python 3.13, managed with **uv**.

```bash
uv sync
uv run fastapi dev app/main.py                         # http://localhost:8000
uv run pytest                                          # needs Postgres, see Tests
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
```

Configuration comes from `.env` through `app/core/config.py` (pydantic-settings).
`.env.example` lists every variable. Read settings with `from app.core.config import settings`,
never from `os.environ`, and wrap secrets in `SecretStr`.

## Folders

| Path                | What goes there                                                                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/main.py`       | App setup: the lifespan (opens the checkpointer, compiles the graph into `app.state.graph`), exception handlers, CORS, and the routers mounted under `/api/auth`, `/api/users`, `/api/interviews`, `/api/billing`.                                              |
| `app/routers/`      | One `APIRouter` per resource. Endpoints, request checks and the DB queries specific to that endpoint.                                                                                                                                                            |
| `app/services/`     | Logic shared across endpoints that's too big for a router. `interview_flow.py` runs the graph and mirrors its state into the tables.                                                                                                                             |
| `app/graph/`        | The interview as a LangGraph graph. `state.py` holds the `TypedDict` state, `workflow.py` the nodes and edges, `nodes/` one file per node, `prompts.py` the system prompts, `context.py` how state is formatted for the LLM, `llm.py` the shared Gemini client, and `checkpointer.py` the Postgres saver. |
| `app/models/`       | SQLAlchemy models, one per file, named `FooModel`. `enums.py` holds the `StrEnum`s and `enum_column()`. A new model must be re-exported from `models/__init__.py` so Alembic sees it.                                                                            |
| `app/schemas/`      | Pydantic request and response models (`FooRequest`, `FooResponse`). `responses.py` holds the shared `MessageResponse` and `PaginatedResponse[T]`.                                                                                                                 |
| `app/core/`         | Infrastructure: `config`, `database` (engine, `Base` with `created_at`/`updated_at`, `get_db`), `dependencies` (`DbSession`, `CurrentUser`, `InterviewGraph`), `exceptions`, `jwt`, `cookies`, `hashing`, `otps`, `emails`, `stripe`, `constants`.             |
| `migrations/`       | Alembic. `env.py` reads the URL from settings and skips LangGraph's `checkpoint*` tables, which the checkpointer creates and migrates itself.                                                                                                                     |
| `tests/`            | pytest against a real Postgres database. `conftest.py` holds the fixtures and `FakeLLM`.                                                                                                                                                                          |

## Request conventions

- **Dependencies** are `Annotated` aliases from `app/core/dependencies.py`:
  `db: DbSession`, `user: CurrentUser`, `graph: InterviewGraph`. `CurrentUser`
  is built from the access-token cookie's claims alone, with no DB lookup.
- **Auth** uses httpOnly cookies. The access token goes to every path, and the
  refresh token only to `/api/auth`. Refresh tokens rotate on each use, and
  reusing an old one revokes the session (`user_session` table).
- **Ownership**: load a user's resource by filtering on both the ID and
  `user_id`, as `get_owned_interview` does. Another user's resource returns
  **404, never 403**, so nobody can probe for IDs that exist.
- **Errors**: raise `HTTPException(status_code=status.HTTP_..., detail="...")`.
  The handlers in `core/exceptions.py` turn every error into
  `{"message": ...}`, and validation errors into
  `{"message", "errors": [{field, message}]}`. The client reads `message`, so
  write it for the user. A unique-constraint race becomes a 409 by itself.
- **Responses**: set `response_model=` on every route. Plain acknowledgements
  return `MessageResponse`. Lists use `offset` and `limit` and return
  `PaginatedResponse[T]`.
- **Concurrency**: shared counters change through a conditional
  `UPDATE ... RETURNING` (spending an interview credit), and state
  transitions take a row lock with `for_update=True`. Don't read, then write.
- **Async throughout**: every I/O call is awaited. Third-party clients must be
  async, which is why Stripe uses `HTTPXClient` and the `*_async` methods.
- **Timestamps** are `DateTime(timezone=True)` and set with `datetime.now(UTC)`.
  IDs are `Uuid(as_uuid=False)` strings.

## The interview flow: the graph is the source of truth

An interview in progress lives in the LangGraph checkpoint, keyed by
`thread_id = interview.id`. The `interview_question`, `interview_answer` and
`interview_evaluation` tables are a **projection** of that state.
`services/interview_flow.sync_from_graph` writes them after every graph run.
Routers never write those rows directly.

```
START → decide_action ─continue→ ask_question → collect_answer → evaluate_answer ─┐
            ↑  └─finish→ end_interview → END                                       │
            └──────────────────────────────────────────────────────────────────────┘
```

- `collect_answer` calls `interrupt()`. The run pauses there and
  `/answer` resumes it with `Command(resume=answer)`. On resume the node
  re-runs from the top, so nothing with side effects may come before
  `interrupt()`.
- `start`, `answer` and `end` lock the interview row for the whole request,
  graph run included, so requests for one interview run one at a time.
- Every LLM call can fail. `run_graph` turns any failure into a 503, and the
  checkpoint keeps the last node that finished. A run that stopped anywhere
  other than the interrupt is **stalled** (`is_stalled`), and the next
  request resumes it with `graph.ainvoke(None, ...)` instead of starting over.
- `sync_from_graph` is idempotent and only adds missing rows, so it also
  repairs the tables when a commit failed after its graph run.
- Each node calls a `llm.with_structured_output(SomeModel)` defined as a
  module-level variable in its file (`question_llm`, `evaluation_llm`, …).
  Tests monkeypatch those names, so keep them module-level.
- A new enum stored in graph state must be added to `allowed_msgpack_modules`
  in `graph/checkpointer.py`, or it won't load back from a checkpoint.
- Deleting an interview also calls `graph.checkpointer.adelete_thread`.

## Database changes

Edit or add the model, export it from `app/models/__init__.py`, then run
`alembic revision --autogenerate`. Read the generated migration before
applying it, and make sure `downgrade()` works: the test suite runs
`downgrade base` then `upgrade head` on every run.

## Tests

`uv run pytest` uses `<dev database>_test`, taken from `DATABASE_URL` in
`.env`. That database must exist, but the fixtures migrate it and truncate the
tables between tests. All tests share one event loop (see `pyproject.toml`).

- Make API calls through the `client` fixture (an `httpx.AsyncClient` already
  signed in, with credits) or `make_client(email=..., credits=...)` for more users.
- Any test that runs the graph takes the `fake_llm` fixture. `FakeLLM`
  scripts the answers, finishes after `finish_after` questions, and can make
  a node fail with `fake_llm.fail("ask")`. The test environment uses a fake
  Gemini key, so a test that forgets the stub fails rather than making a billed call.
- Emails are captured by the autouse `sent_emails` fixture. `latest_code()`
  pulls the OTP out of them.

## Style

- ruff handles formatting and import order.
- Comments explain *why*, briefly. Use `# NOTE:` for decisions that look
  wrong at first sight, such as 404 instead of 403. Match the existing density.
- This app helps candidates practise. Scores and evaluations are feedback for
  the candidate, never hiring recommendations, so don't add recruiter-facing features.
