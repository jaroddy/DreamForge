import stripe
from typing import Dict, Any
from app.core.config import settings

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    @staticmethod
    async def create_payment_intent(
        amount: int,
        currency: str = "usd",
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe payment intent
        amount: in cents
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                payment_method_types=["card"],
                metadata=metadata or {}
            )
            return {
                "clientSecret": intent.client_secret,
                "id": intent.id
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    async def create_checkout_session(
        amount: int,
        description: str,
        currency: str = "usd",
        success_url: str = None,
        cancel_url: str = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe checkout session
        """
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": currency,
                        "product_data": {
                            "name": description or "3D Print Order",
                        },
                        "unit_amount": amount,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url or f"{settings.FRONTEND_URL}/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=cancel_url or f"{settings.FRONTEND_URL}/?canceled=true",
                metadata=metadata or {}
            )
            return {
                "sessionId": session.id,
                "url": session.url
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
