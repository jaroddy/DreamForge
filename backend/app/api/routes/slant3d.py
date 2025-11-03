from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional

from app.db.database import get_db
from app.services.slant3d_service import Slant3DService
from app.middleware.session_manager import SessionManager
from app.middleware.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/slant3d", tags=["slant3d"])


class EstimateRequest(BaseModel):
    file_url: str


class OrderRequest(BaseModel):
    email: str
    name: str
    filename: str
    file_url: str
    order_number: str
    order_sku: str
    order_quantity: int = Field(ge=1)
    order_item_color: str
    bill_to_street_1: str
    bill_to_city: str
    bill_to_state: str
    bill_to_zip: str
    ship_to_name: str
    ship_to_street_1: str
    ship_to_city: str
    ship_to_state: str
    ship_to_zip: str
    phone: Optional[str] = ""
    bill_to_street_2: Optional[str] = ""
    bill_to_country_as_iso: Optional[str] = "US"
    ship_to_street_2: Optional[str] = ""
    ship_to_country_as_iso: Optional[str] = "US"


@router.post("/estimate")
async def estimate_cost(
    request: Request,
    estimate_req: EstimateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Get cost estimate from SLANT3D"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get or create session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    try:
        slant3d_service = Slant3DService()
        result = await slant3d_service.estimate_cost(estimate_req.file_url)
        
        return {
            "success": True,
            "estimate": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/order")
async def create_order(
    request: Request,
    order_req: OrderRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create an order with SLANT3D"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get or create session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    try:
        slant3d_service = Slant3DService()
        result = await slant3d_service.create_order(
            email=order_req.email,
            name=order_req.name,
            filename=order_req.filename,
            file_url=order_req.file_url,
            order_number=order_req.order_number,
            order_sku=order_req.order_sku,
            order_quantity=order_req.order_quantity,
            order_item_color=order_req.order_item_color,
            bill_to_street_1=order_req.bill_to_street_1,
            bill_to_city=order_req.bill_to_city,
            bill_to_state=order_req.bill_to_state,
            bill_to_zip=order_req.bill_to_zip,
            ship_to_name=order_req.ship_to_name,
            ship_to_street_1=order_req.ship_to_street_1,
            ship_to_city=order_req.ship_to_city,
            ship_to_state=order_req.ship_to_state,
            ship_to_zip=order_req.ship_to_zip,
            phone=order_req.phone,
            bill_to_street_2=order_req.bill_to_street_2,
            bill_to_country_as_iso=order_req.bill_to_country_as_iso,
            ship_to_street_2=order_req.ship_to_street_2,
            ship_to_country_as_iso=order_req.ship_to_country_as_iso
        )
        
        return {
            "success": True,
            "order": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
