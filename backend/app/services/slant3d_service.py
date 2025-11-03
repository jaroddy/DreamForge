import httpx
from typing import Dict, Any
from app.core.config import settings


class Slant3DService:
    def __init__(self):
        self.base_url = settings.SLANT3D_API_BASE_URL
        self.api_key = settings.SLANT3D_API_KEY
        self.headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def estimate_cost(self, file_url: str) -> Dict[str, Any]:
        """
        Get cost estimate from SLANT3D slicer API
        """
        payload = {
            "fileURL": file_url
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/slicer",
                json=payload,
                headers=self.headers,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    
    async def create_order(
        self,
        email: str,
        name: str,
        filename: str,
        file_url: str,
        order_number: str,
        order_sku: str,
        order_quantity: int,
        order_item_color: str,
        bill_to_street_1: str,
        bill_to_city: str,
        bill_to_state: str,
        bill_to_zip: str,
        ship_to_name: str,
        ship_to_street_1: str,
        ship_to_city: str,
        ship_to_state: str,
        ship_to_zip: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create an order with SLANT3D
        """
        payload = {
            "email": email,
            "phone": kwargs.get("phone", ""),
            "name": name,
            "orderNumber": order_number,
            "filename": filename,
            "fileURL": file_url,
            "bill_to_street_1": bill_to_street_1,
            "bill_to_street_2": kwargs.get("bill_to_street_2", ""),
            "bill_to_street_3": kwargs.get("bill_to_street_3", ""),
            "bill_to_city": bill_to_city,
            "bill_to_state": bill_to_state,
            "bill_to_zip": bill_to_zip,
            "bill_to_country_as_iso": kwargs.get("bill_to_country_as_iso", "US"),
            "bill_to_is_US_residential": kwargs.get("bill_to_is_US_residential", "true"),
            "ship_to_name": ship_to_name,
            "ship_to_street_1": ship_to_street_1,
            "ship_to_street_2": kwargs.get("ship_to_street_2", ""),
            "ship_to_street_3": kwargs.get("ship_to_street_3", ""),
            "ship_to_city": ship_to_city,
            "ship_to_state": ship_to_state,
            "ship_to_zip": ship_to_zip,
            "ship_to_country_as_iso": kwargs.get("ship_to_country_as_iso", "US"),
            "ship_to_is_US_residential": kwargs.get("ship_to_is_US_residential", "true"),
            "order_item_name": filename,
            "order_quantity": str(order_quantity),
            "order_image_url": kwargs.get("order_image_url", ""),
            "order_sku": order_sku,
            "order_item_color": order_item_color
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/order",
                json=payload,
                headers=self.headers,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
