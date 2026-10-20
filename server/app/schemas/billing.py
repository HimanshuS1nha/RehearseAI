from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import MAX_INTERVIEWS_PER_PURCHASE
from app.models.enums import PaymentStatus


class PricingResponse(BaseModel):
    # In the currency's smallest unit (paise for INR).
    price_per_interview: int
    currency: str
    max_quantity: int


class CheckoutRequest(BaseModel):
    quantity: int = Field(ge=1, le=MAX_INTERVIEWS_PER_PURCHASE)


class CheckoutResponse(BaseModel):
    # Stripe's hosted payment page; the frontend redirects the browser to it.
    checkout_url: str


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quantity: int
    amount: int
    currency: str
    status: PaymentStatus
    created_at: datetime
    paid_at: datetime | None
