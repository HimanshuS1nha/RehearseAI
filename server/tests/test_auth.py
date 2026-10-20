import re

from app.core.config import settings
from app.core.cookies import REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_PATH
from app.core.database import AsyncSessionLocal
from app.core.otps import create_otp, verify_otp
from app.models.enums import OtpPurpose
from app.models.otp import OtpModel
from app.models.user import UserModel
from sqlalchemy import delete, select

from tests.conftest import PASSWORD, latest_code


async def test_register_and_login(client):
    me = await client.get("/users/me")
    assert me.status_code == 200
    assert me.json()["email"] == "candidate@example.com"

    # Emails are matched case-insensitively.
    response = await client.post(
        "/auth/register",
        json={
            "name": "Copy",
            "email": "Candidate@Example.com",
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        },
    )
    assert response.status_code == 409

    response = await client.post(
        "/auth/login",
        json={"email": "candidate@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


async def register_unverified(client, email: str = "unverified@example.com"):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Unverified",
            "email": email,
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        },
    )
    assert response.status_code == 201


async def test_login_requires_verified_email(client, sent_emails):
    sent_emails.clear()
    await register_unverified(client)

    # A wrong password still gets the generic error, so this doesn't reveal
    # whether the account exists.
    response = await client.post(
        "/auth/login",
        json={"email": "unverified@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401

    response = await client.post(
        "/auth/login",
        json={"email": "unverified@example.com", "password": PASSWORD},
    )
    assert response.status_code == 403
    assert response.json()["message"] == "Please verify your email"

    # Registering sent a code; logging in again straight away doesn't send
    # another, so repeated logins can't flood the inbox.
    assert [email["to"] for email in sent_emails] == ["unverified@example.com"]
    assert re.fullmatch(r"\d{6} is your Rehearse verification code", sent_emails[0]["subject"])


async def test_verify_email(client, sent_emails):
    await register_unverified(client)
    code = latest_code(sent_emails, "unverified@example.com")

    # A wrong code and an unknown email get the same error.
    for email, guess in [
        ("unverified@example.com", f"{(int(code) + 1) % 10**6:06d}"),
        ("nobody@example.com", code),
    ]:
        response = await client.post(
            "/auth/verify-email", json={"email": email, "code": guess}
        )
        assert response.status_code == 400
        assert response.json()["message"] == "Invalid or expired code"

    response = await client.post(
        "/auth/verify-email",
        json={"email": "Unverified@Example.com", "code": code},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Email verified successfully"

    response = await client.post(
        "/auth/verify-email", json={"email": "unverified@example.com", "code": code}
    )
    assert response.json()["message"] == "Email already verified"

    response = await client.post(
        "/auth/login",
        json={"email": "unverified@example.com", "password": PASSWORD},
    )
    assert response.status_code == 200


async def test_resend_verification(client, sent_emails, monkeypatch):
    await register_unverified(client)
    first_code = latest_code(sent_emails, "unverified@example.com")
    sent_emails.clear()

    async def resend(email: str):
        response = await client.post(
            "/auth/resend-verification", json={"email": email}
        )
        assert response.status_code == 200
        return response.json()["message"]

    # Unknown, already verified and cooling-down emails all get the same
    # reply, and none of them sends anything.
    replies = {
        await resend("nobody@example.com"),
        await resend("candidate@example.com"),
        await resend("unverified@example.com"),
    }
    assert len(replies) == 1
    assert sent_emails == []

    monkeypatch.setattr(settings, "otp_resend_cooldown_seconds", 0)
    await resend("unverified@example.com")
    new_code = latest_code(sent_emails, "unverified@example.com")

    # The new code replaces the old one (unless they happen to match).
    if new_code != first_code:
        response = await client.post(
            "/auth/verify-email",
            json={"email": "unverified@example.com", "code": first_code},
        )
        assert response.status_code == 400
    response = await client.post(
        "/auth/verify-email",
        json={"email": "unverified@example.com", "code": new_code},
    )
    assert response.status_code == 200


async def test_otp_verification(client):
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(
                select(UserModel).where(UserModel.email == "candidate@example.com")
            )
        ).scalar_one()
        purpose = OtpPurpose.EMAIL_VERIFICATION

        code = await create_otp(db, user.id, purpose)
        wrong = f"{(int(code) + 1) % 10**6:06d}"
        assert not await verify_otp(db, user.id, purpose, wrong)
        assert await verify_otp(db, user.id, purpose, code)
        await db.commit()
        # A code works only once.
        assert not await verify_otp(db, user.id, purpose, code)

        # Too many misses lock the code, even against the right guess.
        await db.execute(delete(OtpModel))
        code = await create_otp(db, user.id, purpose)
        for _ in range(settings.otp_max_attempts):
            assert not await verify_otp(db, user.id, purpose, wrong)
        assert not await verify_otp(db, user.id, purpose, code)

async def test_routes_require_authentication(client):
    client.cookies.clear()
    assert (await client.get("/users/me")).status_code == 401
    assert (await client.get("/interviews")).status_code == 401


async def test_reused_refresh_token_revokes_session(client):
    old_token = client.cookies.get(REFRESH_TOKEN_COOKIE)
    assert (await client.post("/auth/refresh")).status_code == 200
    new_token = client.cookies.get(REFRESH_TOKEN_COOKIE)
    assert new_token != old_token

    # Replaying the rotated-out token means someone else may hold a copy, so
    # the whole session is revoked: neither token works afterwards.
    for token in (old_token, new_token):
        client.cookies.set(REFRESH_TOKEN_COOKIE, token, path=REFRESH_TOKEN_COOKIE_PATH)
        assert (await client.post("/auth/refresh")).status_code == 401


async def test_forgot_and_reset_password(client, sent_emails):
    sent_emails.clear()

    async def forgot(email: str):
        response = await client.post("/auth/forgot-password", json={"email": email})
        assert response.status_code == 200
        return response.json()["message"]

    # Unknown and known emails get the same reply; only the known one is sent a
    # code, and asking again straight away doesn't send another.
    assert await forgot("nobody@example.com") == await forgot("candidate@example.com")
    await forgot("candidate@example.com")
    assert [email["to"] for email in sent_emails] == ["candidate@example.com"]
    assert re.fullmatch(
        r"\d{6} is your Rehearse password reset code", sent_emails[0]["subject"]
    )
    code = latest_code(sent_emails, "candidate@example.com")

    def reset(code: str, email: str = "candidate@example.com", confirm=None):
        return client.post(
            "/auth/reset-password",
            json={
                "email": email,
                "code": code,
                "new_password": "new-password-123",
                "confirm_new_password": confirm or "new-password-123",
            },
        )

    response = await reset(code, confirm="something-else")
    assert response.status_code == 422

    for email, guess in [
        ("candidate@example.com", f"{(int(code) + 1) % 10**6:06d}"),
        ("nobody@example.com", code),
    ]:
        response = await reset(guess, email=email)
        assert response.status_code == 400
        assert response.json()["message"] == "Invalid or expired code"

    response = await reset(code, email="Candidate@Example.com")
    assert response.status_code == 200

    # The code works once.
    assert (await reset(code)).status_code == 400

    # Every session is logged out, the old password stops working and the new
    # one works.
    assert (await client.post("/auth/refresh")).status_code == 401
    response = await client.post(
        "/auth/login", json={"email": "candidate@example.com", "password": PASSWORD}
    )
    assert response.status_code == 401
    response = await client.post(
        "/auth/login",
        json={"email": "candidate@example.com", "password": "new-password-123"},
    )
    assert response.status_code == 200


async def test_reset_codes_are_separate_from_verification(client, sent_emails):
    await register_unverified(client)
    verification_code = latest_code(sent_emails, "unverified@example.com")

    # A verification code can't reset a password.
    response = await client.post(
        "/auth/reset-password",
        json={
            "email": "unverified@example.com",
            "code": verification_code,
            "new_password": "new-password-123",
            "confirm_new_password": "new-password-123",
        },
    )
    assert response.status_code == 400

    # Resetting with a real reset code also verifies the email, since the code
    # came through it.
    await client.post("/auth/forgot-password", json={"email": "unverified@example.com"})
    response = await client.post(
        "/auth/reset-password",
        json={
            "email": "unverified@example.com",
            "code": latest_code(sent_emails, "unverified@example.com"),
            "new_password": "new-password-123",
            "confirm_new_password": "new-password-123",
        },
    )
    assert response.status_code == 200
    response = await client.post(
        "/auth/login",
        json={"email": "unverified@example.com", "password": "new-password-123"},
    )
    assert response.status_code == 200
