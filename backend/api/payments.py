import logging
import uuid
import datetime
from fastapi import APIRouter, Request, HTTPException, status, Depends
from pydantic import BaseModel

from database import db
from services.auth import get_current_user
from services.cashfree import create_cashfree_order, verify_cashfree_signature

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

class CreateOrderRequest(BaseModel):
    package_id: str # e.g., "bundle_1M", "bundle_5M"

TOKEN_BUNDLES = {
    "bundle_1M": {"tokens": 1000000, "price": 1000}, # Price in INR (e.g. Rs 1000)
    "bundle_5M": {"tokens": 5000000, "price": 4000},
}

@router.post("/create-order")
async def create_order(req: CreateOrderRequest, current_user: dict = Depends(get_current_user)):
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    bundle = TOKEN_BUNDLES.get(req.package_id)
    if not bundle:
        raise HTTPException(status_code=400, detail="Invalid package ID")
        
    order_id = f"order_{uuid.uuid4().hex}"
    
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    email = user.get("email", "customer@example.com")
    phone = "9999999999" # Default or fetch from user profile if available
    
    try:
        cf_response = await create_cashfree_order(
            order_id=order_id,
            amount=bundle["price"],
            customer_id=current_user["user_id"],
            customer_email=email,
            customer_phone=phone
        )
        
        # Save order intention in DB
        await db.orders.insert_one({
            "order_id": order_id,
            "user_id": current_user["user_id"],
            "package_id": req.package_id,
            "amount": bundle["price"],
            "tokens": bundle["tokens"],
            "status": "pending",
            "created_at": datetime.datetime.utcnow()
        })
        
        return {
            "status": "success", 
            "payment_session_id": cf_response.get("payment_session_id"),
            "order_id": order_id
        }
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize payment")


@router.post("/webhook")
async def cashfree_webhook(request: Request):
    """
    Webhook endpoint to receive payment success events from Cashfree.
    """
    payload_bytes = await request.body()
    payload_str = payload_bytes.decode('utf-8')
    
    # Get signature from headers
    signature = request.headers.get("x-webhook-signature")
    
    if not signature:
        logger.warning("Missing webhook signature")
        return {"status": "error", "message": "Missing signature"}
        
    is_valid = await verify_cashfree_signature(signature, payload_str)
    if not is_valid:
        logger.warning("Invalid webhook signature")
        return {"status": "error", "message": "Invalid signature"}
        
    try:
        from database import db
        data = await request.json()
        event_type = data.get("type")
        
        if event_type == "PAYMENT_SUCCESS_WEBHOOK":
            order_id = data.get("data", {}).get("order", {}).get("order_id")
            if not order_id:
                return {"status": "success", "message": "No order_id in payload"}
                
            # Find order
            order = await db.orders.find_one({"order_id": order_id})
            if not order or order["status"] == "paid":
                return {"status": "success"} # Already processed or invalid
                
            # Update order
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {"status": "paid", "paid_at": datetime.datetime.utcnow()}}
            )
            
            # Add tokens to user
            await db.users.update_one(
                {"user_id": order["user_id"]},
                {"$inc": {"token_balance": order["tokens"]}}
            )
            
            logger.info(f"Successfully processed payment for order {order_id}. Added {order['tokens']} tokens to user {order['user_id']}.")
            
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        
    return {"status": "success"}
