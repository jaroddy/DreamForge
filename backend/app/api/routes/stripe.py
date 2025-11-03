from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from app.db.database import get_db
from app.services.stripe_service import StripeService
from app.middleware.session_manager import SessionManager
from app.middleware.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


class PaymentIntentRequest(BaseModel):
    amount: int = Field(..., ge=50)  # Minimum 50 cents
    currency: str = Field(default="usd")
    metadata: Optional[Dict[str, Any]] = None


class CheckoutSessionRequest(BaseModel):
    amount: int = Field(..., ge=50)
    description: str
    currency: str = Field(default="usd")
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/create-payment-intent")
async def create_payment_intent(
    request: Request,
    payment_req: PaymentIntentRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe payment intent"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get or create session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    try:
        stripe_service = StripeService()
        result = await stripe_service.create_payment_intent(
            amount=payment_req.amount,
            currency=payment_req.currency,
            metadata=payment_req.metadata
        )
        
        return {
            "success": True,
            "clientSecret": result["clientSecret"],
            "paymentIntentId": result["id"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    checkout_req: CheckoutSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe checkout session"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get or create session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    try:
        stripe_service = StripeService()
        result = await stripe_service.create_checkout_session(
            amount=checkout_req.amount,
            description=checkout_req.description,
            currency=checkout_req.currency,
            success_url=checkout_req.success_url,
            cancel_url=checkout_req.cancel_url,
            metadata=checkout_req.metadata
        )
        
        return {
            "success": True,
            "sessionId": result["sessionId"],
            "url": result["url"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
