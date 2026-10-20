import json
from types import SimpleNamespace

import stripe
from app.routers import billing
from tests.test_interview_api import INTERVIEW, create_and_start

WEBHOOK_SECRET = "whsec_test"


async def balance(client) -> int:
    return (await client.get("/users/me")).json()["interview_credits"]


async def send_event(client, event_type, session_id, payment_status="paid"):
    payload = json.dumps(
        {
            "id": "evt_test",
            "object": "event",
            "type": event_type,
            "data": {
                "object": {
                    "id": session_id,
                    "object": "checkout.session",
                    "payment_status": payment_status,
                }
            },
        }
    )
    signature = stripe.WebhookSignature.generate_signature_header(
        payload, WEBHOOK_SECRET
    )
    return await client.post(
        "/billing/webhook",
        content=payload,
        headers={"Stripe-Signature": signature, "Content-Type": "application/json"},
    )


async def checkout(client, monkeypatch, quantity, session_id="cs_test_1"):
    async def fake_create(user_id, email, quantity):
        return SimpleNamespace(id=session_id, url=f"https://stripe.test/{session_id}")

    monkeypatch.setattr(billing, "create_checkout_session", fake_create)
    response = await client.post("/billing/checkout", json={"quantity": quantity})
    assert response.status_code == 201
    return response.json()


async def test_free_interview_then_payment_required(make_client):
    client = await make_client(credits=None)
    assert (await client.get("/billing")).json() == {
        "price_per_interview": 10000,
        "currency": "inr",
        "max_quantity": 50,
    }
    assert await balance(client) == 1

    assert (await client.post("/interviews", json=INTERVIEW)).status_code == 201
    assert await balance(client) == 0
    assert (await client.post("/interviews", json=INTERVIEW)).status_code == 402


async def test_deleting_unstarted_interview_refunds_credit(make_client, fake_llm):
    client = await make_client(credits=2)
    interview_id = (await client.post("/interviews", json=INTERVIEW)).json()["id"]
    assert await balance(client) == 1
    await client.delete(f"/interviews/{interview_id}")
    assert await balance(client) == 2

    # Once started, the interview has been used.
    interview_id, _ = await create_and_start(client)
    await client.delete(f"/interviews/{interview_id}")
    assert await balance(client) == 1


async def test_paid_checkout_adds_credits_once(make_client, monkeypatch):
    client = await make_client(credits=None)
    body = await checkout(client, monkeypatch, quantity=3)
    assert body == {"checkout_url": "https://stripe.test/cs_test_1"}

    payment = (await client.get("/billing/payments/cs_test_1")).json()
    assert payment["status"] == "pending"
    assert payment["amount"] == 30000

    response = await send_event(client, "checkout.session.completed", "cs_test_1")
    assert response.status_code == 200
    assert await balance(client) == 4
    # Stripe can deliver an event more than once.
    await send_event(client, "checkout.session.completed", "cs_test_1")
    assert await balance(client) == 4

    payment = (await client.get("/billing/payments/cs_test_1")).json()
    assert payment["status"] == "paid" and payment["paid_at"]


async def test_delayed_payment_waits_for_async_event(make_client, monkeypatch):
    client = await make_client(credits=None)
    await checkout(client, monkeypatch, quantity=2)

    await send_event(client, "checkout.session.completed", "cs_test_1", "unpaid")
    assert await balance(client) == 1

    await send_event(client, "checkout.session.async_payment_succeeded", "cs_test_1")
    assert await balance(client) == 3


async def test_expired_checkout_is_hidden_and_credits_nothing(make_client, monkeypatch):
    client = await make_client(credits=None)
    await checkout(client, monkeypatch, quantity=2)
    await send_event(client, "checkout.session.expired", "cs_test_1", "unpaid")

    assert await balance(client) == 1
    assert (await client.get("/billing/payments")).json()["items"] == []


async def test_webhook_rejects_bad_signature_and_retries_unknown(client):
    response = await client.post(
        "/billing/webhook", content="{}", headers={"Stripe-Signature": "t=1,v1=bad"}
    )
    assert response.status_code == 400

    # Not a 2xx, so Stripe redelivers it later.
    response = await send_event(client, "checkout.session.completed", "cs_unknown")
    assert response.status_code == 404


async def test_other_users_payment_is_not_found(make_client, monkeypatch):
    owner = await make_client("owner@example.com")
    intruder = await make_client("intruder@example.com")
    await checkout(owner, monkeypatch, quantity=1)

    assert (await intruder.get("/billing/payments/cs_test_1")).status_code == 404
    assert (await intruder.get("/billing/payments")).json()["items"] == []
