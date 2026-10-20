import hmac
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import OtpPurpose
from app.models.otp import OtpModel

OTP_LENGTH = 6


def hash_otp(code: str):
    # Keyed with the server secret rather than a plain hash: a 6-digit code
    # has only a million values, so a plain hash leaked from the database could
    # be reversed instantly.
    return hmac.new(
        settings.jwt_secret.get_secret_value().encode(), code.encode(), "sha256"
    ).hexdigest()


async def get_otp(db: AsyncSession, user_id: str, purpose: OtpPurpose):
    # FOR UPDATE so two requests for the same code run one after the other,
    # and parallel guesses can't all read the same attempt count.
    result = await db.execute(
        select(OtpModel)
        .where(OtpModel.user_id == user_id, OtpModel.purpose == purpose)
        .with_for_update()
    )
    return result.scalars().first()


async def create_otp(db: AsyncSession, user_id: str, purpose: OtpPurpose):
    """Replace the user's code for this purpose with a fresh one and commit.

    Returns the plain code to send, or None if the last one was sent too
    recently, so repeated requests can't flood someone's inbox.
    """
    now = datetime.now(UTC)

    otp = await get_otp(db, user_id, purpose)
    if otp:
        cooldown = timedelta(seconds=settings.otp_resend_cooldown_seconds)
        if otp.created_at > now - cooldown:
            return None
        await db.delete(otp)
        # The unit of work runs inserts before deletes, so without this flush
        # the new row would hit the unique constraint while the old one exists.
        await db.flush()

    code = f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"
    db.add(
        OtpModel(
            user_id=user_id,
            purpose=purpose,
            code_hash=hash_otp(code),
            expires_at=now + timedelta(minutes=settings.otp_expire_minutes),
        )
    )
    await db.commit()

    return code


async def verify_otp(db: AsyncSession, user_id: str, purpose: OtpPurpose, code: str):
    """Check a submitted code. A code works once and locks after too many misses.

    A miss is committed here, since the caller will reject the request. A match
    deletes the code but leaves the commit to the caller, so the code is only
    used up together with whatever it unlocks.
    """
    otp = await get_otp(db, user_id, purpose)
    if (
        not otp
        or otp.expires_at <= datetime.now(UTC)
        or otp.attempts >= settings.otp_max_attempts
    ):
        return False

    if not hmac.compare_digest(otp.code_hash, hash_otp(code)):
        otp.attempts += 1
        await db.commit()
        return False

    await db.delete(otp)
    return True
