# Rehearse

Rehearse is an AI mock interviewer you talk to out loud. It asks questions tailored to your role, level and topics, follows up based on your answers, and gives you a scored report afterwards.

## Screenshots

![Landing page](https://github.com/user-attachments/assets/0c823617-2da7-4ef6-894a-0f4bc1f8b760)

![Auth page](https://github.com/user-attachments/assets/f8869a48-823d-4cb9-96c8-67580a6a95da)

![Dashboard page](https://github.com/user-attachments/assets/e9d8f870-d97e-488e-941d-28738d1d995e)

![Interview page](https://github.com/user-attachments/assets/f08a7bed-f228-433a-9d97-884118cbaef9)

![Results page](https://github.com/user-attachments/assets/77c61deb-6392-4907-bdfa-c049a2fc9e50)

## Setup

### Prerequisites

| Tool | Version | Install |
| --- | --- | --- |
| Python | 3.13+ | `uv python install 3.13` (or your OS package manager) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 22+ | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| pnpm | latest | `npm install -g pnpm` (or `corepack enable pnpm`) |
| PostgreSQL | 15+ | `sudo apt install postgresql` / `brew install postgresql` |
| Stripe CLI | latest | [docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli) (only needed to test payments locally) |

You'll also need:

- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- An SMTP account for sending verification and password reset emails (for Gmail, use an [app password](https://myaccount.google.com/apppasswords))
- A Stripe account in test mode

### 1. Clone the repo

```bash
git clone https://github.com/HimanshuS1nha/RehearseAI.git rehearse
cd rehearse
```

### 2. Create the database

```bash
createdb rehearse
```

### 3. Set up the server

```bash
cd server
cp .env.example .env
```

Fill in the values in `server/.env`. For local development, set `COOKIE_SECURE=false` since you won't be on HTTPS. A JWT secret can be generated with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Then install dependencies and run the migrations:

```bash
uv sync
uv run alembic upgrade head
```

### 4. Set up the client

```bash
cd ../client
cp .env.example .env
pnpm install
```

## Running

Start the API server (runs on http://localhost:8000, docs at http://localhost:8000/docs):

```bash
cd server
uv run fastapi dev app/main.py
```

Start the client (runs on http://localhost:3000):

```bash
cd client
pnpm dev
```

To test payments locally, forward Stripe webhooks to the server and put the signing secret it prints into `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

### Tests

The tests run against a separate `<your db>_test` database, so create that first:

```bash
createdb rehearse_test
cd server
uv run pytest
```

## Features

- **Voice interviews**: the interviewer reads each question aloud and your spoken answer is transcribed live in the browser, so it feels like a real call.
- **Tailored interviews**: pick the role, experience level (entry to staff), interview type (technical, behavioral, system design or mixed), difficulty and topics, and optionally paste a job description.
- **Adaptive questioning**: a LangGraph workflow powered by Gemini evaluates every answer and decides whether to follow up, move to a new question or wrap up.
- **Pause and resume**: interview state is checkpointed in Postgres, so you can leave mid-interview and continue later.
- **Detailed results**: an overall score and summary, plus a per-question breakdown with feedback on each answer.
- **Accounts and security**: email verification and password reset via OTP, JWT auth in HTTP-only cookies with refresh tokens, and a list of active sessions you can sign out of individually.
- **Credits and billing**: every new account gets one free interview, and more can be bought through Stripe Checkout, with payment history in the dashboard.
- **Dashboard**: search, edit and delete your interviews and track their status.

## TECH STACK USED

- React.js
- Tailwind CSS
- Shadcn UI
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Google Gemini
- Stripe
- Zustand
- Zod

## Demo

Live Demo - [Click Here](https://www.youtube.com/watch?v=ybvmJk5_PjU)

## 🚀 About Me

My name is Himanshu Sinha and I'm a full stack developer.