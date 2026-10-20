import logging
from datetime import UTC, datetime
from typing import Annotated

import stripe
from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import (
    CURRENCY,
    INTERVIEW_PRICE,
    MAX_INTERVIEWS_PER_PURCHASE,
)
from app.core.dependencies import CurrentUser, DbSession
from app.core.stripe import stripe_client
from app.models.enums import PaymentStatus
from app.models.payment import PaymentModel
from app.models.user import UserModel
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    PaymentResponse,
    PricingResponse,
)
from app.schemas.responses import MessageResponse, PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=PricingResponse)
async def get_pricing():
    return PricingResponse(
        price_per_interview=INTERVIEW_PRICE,
        currency=CURRENCY,
        max_quantity=MAX_INTERVIEWS_PER_PURCHASE,
    )


async def create_checkout_session(
    user_id: str, email: str, quantity: int
) -> stripe.checkout.Session:
    dashboard_url = f"{settings.frontend_url}/dashboard"
    return await stripe_client.v1.checkout.sessions.create_async(
        {
            "mode": "payment",
            "line_items": [
                {
                    "price_data": {
                        "currency": CURRENCY,
                        "unit_amount": INTERVIEW_PRICE,
                        "product_data": {"name": "Rehearse mock interview"},
                    },
                    "quantity": quantity,
                }
            ],
            "customer_email": email,
            "client_reference_id": user_id,
            # Stripe fills in {CHECKOUT_SESSION_ID}, so the dashboard can look
            # the payment up when the user lands back on it.
            "success_url": (
                f"{dashboard_url}?checkout_session={{CHECKOUT_SESSION_ID}}"
            ),
            "cancel_url": f"{dashboard_url}?checkout=canceled",
        }
    )


@router.post(
    "/checkout", status_code=status.HTTP_201_CREATED, response_model=CheckoutResponse
)
async def create_checkout(data: CheckoutRequest, user: CurrentUser, db: DbSession):
    try:
        session = await create_checkout_session(user.id, user.email, data.quantity)
    except stripe.StripeError:
        logger.exception("Creating a checkout session failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider is unavailable, try again later",
        )

    db.add(
        PaymentModel(
            user_id=user.id,
            stripe_session_id=session.id,
            quantity=data.quantity,
            amount=data.quantity * INTERVIEW_PRICE,
            currency=CURRENCY,
        )
    )
    await db.commit()

    return CheckoutResponse(checkout_url=session.url)


@router.get("/payments", response_model=PaginatedResponse[PaymentResponse])
async def get_payments(
    user: CurrentUser,
    db: DbSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    # Abandoned checkouts are noise in a payment history.
    filters = [
        PaymentModel.user_id == user.id,
        PaymentModel.status != PaymentStatus.EXPIRED,
    ]

    total = await db.scalar(
        select(func.count()).select_from(PaymentModel).where(*filters)
    )

    result = await db.execute(
        select(PaymentModel)
        .where(*filters)
        .order_by(PaymentModel.created_at.desc(), PaymentModel.id)
        .offset(offset)
        .limit(limit)
    )

    return PaginatedResponse[PaymentResponse](
        items=result.scalars().all(), total=total, offset=offset, limit=limit
    )


@router.get("/payments/{session_id}", response_model=PaymentResponse)
async def get_payment_by_session(session_id: str, user: CurrentUser, db: DbSession):
    # Looked up by the Checkout Session ID Stripe puts in the success URL, so
    # the page can poll until the webhook has marked it paid.
    payment = await db.scalar(
        select(PaymentModel).where(
            PaymentModel.stripe_session_id == session_id,
            PaymentModel.user_id == user.id,
        )
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )
    return payment


async def lock_payment(db: AsyncSession, session_id: str) -> PaymentModel:
    # Locked so two deliveries of the same event (Stripe retries, and can send
    # duplicates) settle the payment once.
    payment = await db.scalar(
        select(PaymentModel)
        .where(PaymentModel.stripe_session_id == session_id)
        .with_for_update()
    )
    if not payment:
        # Most likely the webhook beat create_checkout's commit. A non-2xx
        # makes Stripe redeliver later instead of the payment being lost.
        logger.warning("Webhook for unknown checkout session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )
    return payment


async def fulfill_payment(db: AsyncSession, session_id: str):
    payment = await lock_payment(db, session_id)
    if payment.status == PaymentStatus.PAID:
        return

    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.now(UTC)
    await db.execute(
        update(UserModel)
        .where(UserModel.id == payment.user_id)
        .values(interview_credits=UserModel.interview_credits + payment.quantity)
    )
    await db.commit()
    logger.info(
        "Payment %s paid: %s interviews for user %s",
        payment.id,
        payment.quantity,
        payment.user_id,
    )


async def close_payment(db: AsyncSession, session_id: str, new_status: PaymentStatus):
    payment = await lock_payment(db, session_id)
    if payment.status == PaymentStatus.PENDING:
        payment.status = new_status
        await db.commit()


@router.post("/webhook", response_model=MessageResponse, include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: DbSession,
    stripe_signature: Annotated[str | None, Header()] = None,
):
    # The signature covers the raw bytes, so the body is read as-is rather
    # than parsed into a model.
    payload = await request.body()
    try:
        event = stripe_client.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret.get_secret_value()
        )
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook"
        )

    session = event.data.object
    match event.type:
        case "checkout.session.completed":
            # Delayed methods complete the session before the money arrives;
            # those are settled by the async_payment_* events instead.
            if session.payment_status == "paid":
                await fulfill_payment(db, session.id)
        case "checkout.session.async_payment_succeeded":
            await fulfill_payment(db, session.id)
        case "checkout.session.async_payment_failed":
            await close_payment(db, session.id, PaymentStatus.FAILED)
        case "checkout.session.expired":
            await close_payment(db, session.id, PaymentStatus.EXPIRED)

    return MessageResponse(message="Received")
