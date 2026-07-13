import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)

CASHFREE_API_URL = "https://sandbox.cashfree.com/pg/orders"  # Use production URL in prod

async def create_cashfree_order(order_id: str, amount: float, customer_id: str, customer_email: str, customer_phone: str) -> dict:
    """
    Creates an order on Cashfree and returns the payment_session_id.
    """
    if not settings.CASHFREE_APP_ID or not settings.CASHFREE_SECRET_KEY:
        logger.warning("Cashfree credentials not set in environment.")
        return {"payment_session_id": "dummy_session_id_for_testing"}

    headers = {
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json"
    }

    payload = {
        "order_amount": amount,
        "order_currency": "INR",
        "order_id": order_id,
        "customer_details": {
            "customer_id": customer_id,
            "customer_email": customer_email,
            "customer_phone": customer_phone or "9999999999"
        },
        "order_meta": {
            "return_url": f"{settings.FRONTEND_URL}/app/billing?order_id={{order_id}}"
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(CASHFREE_API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            logger.error(f"Failed to create Cashfree order: {response.text}")
            raise Exception(f"Cashfree Order Error: {response.text}")

async def verify_cashfree_signature(signature: str, payload: str) -> bool:
    """
    Verifies the webhook signature from Cashfree.
    """
    import hmac
    import hashlib
    import base64
    
    if not settings.CASHFREE_SECRET_KEY:
        return True # Bypass in dev
        
    secret_key = settings.CASHFREE_SECRET_KEY.encode('utf-8')
    payload_bytes = payload.encode('utf-8')
    
    mac = hmac.new(secret_key, payload_bytes, hashlib.sha256).digest()
    computed_signature = base64.b64encode(mac).decode('utf-8')
    
    return computed_signature == signature
