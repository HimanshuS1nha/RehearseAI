import stripe

from app.core.config import settings

# HTTPXClient so the *_async methods make real async requests; the default
# requests-based client would block the event loop.
stripe_client = stripe.StripeClient(
    settings.stripe_secret_key.get_secret_value(),
    http_client=stripe.HTTPXClient(),
)
