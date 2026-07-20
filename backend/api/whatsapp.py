from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
import logging
from typing import Dict, Any
from datetime import datetime

from services.whatsapp import openwa_service
from services.auth import get_current_user
from database import save_whatsapp_record, update_whatsapp_status
from services.notifications import create_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

class SendMessageRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code, no +")
    message: str = Field(..., description="Text message to send")

class SendImageRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code, no +")
    image_url: str = Field(..., description="Publicly accessible URL of the image")
    caption: str = Field("", description="Optional caption for the image")

@router.get("/logs")
async def get_whatsapp_logs_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Retrieve WhatsApp logs for the current user."""
    from database import get_whatsapp_logs
    try:
        user_id = current_user.get("user_id", "unknown")
        logs = await get_whatsapp_logs(user_id=user_id)
        return {"status": "success", "logs": logs}
    except Exception as e:
        logger.error(f"Failed to fetch WhatsApp logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch WhatsApp logs")

@router.post("/connect")
async def connect_whatsapp(
    current_user: dict = Depends(get_current_user)
):
    """
    Start a WhatsApp session for the current user and get the QR code.
    """
    try:
        session_id = f"user_{current_user.get('user_id', 'unknown')}"
        result = await openwa_service.start_session(session_id)
        # OpenWA usually returns the QR code as a base64 string or an event
        return {"status": "success", "session_id": session_id, "data": result}
    except Exception as e:
        logger.error(f"Failed to start WhatsApp session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start WhatsApp session")

@router.post("/send")
async def send_whatsapp_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a text message via WhatsApp (OpenWA).
    """
    try:
        session_id = f"user_{current_user.get('user_id', 'unknown')}"
        result = await openwa_service.send_text_message(
            phone_number=request.phone_number,
            message=request.message,
            session_id=session_id
        )
        
        # Save record for dashboard tracking
        await save_whatsapp_record({
            "user_id": current_user.get('user_id', 'unknown'),
            "phone_number": request.phone_number,
            "status": "Sent",
            "type": "text",
            "created_at": datetime.utcnow()
        })
        
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")

@router.post("/send-image")
async def send_whatsapp_image(
    request: SendImageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send an image message via WhatsApp (OpenWA).
    """
    try:
        session_id = f"user_{current_user.get('user_id', 'unknown')}"
        result = await openwa_service.send_image_message(
            phone_number=request.phone_number,
            image_url=request.image_url,
            caption=request.caption,
            session_id=session_id
        )
        
        # Save record for dashboard tracking
        await save_whatsapp_record({
            "user_id": current_user.get('user_id', 'unknown'),
            "phone_number": request.phone_number,
            "status": "Sent",
            "type": "image",
            "created_at": datetime.utcnow()
        })
        
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Failed to send WhatsApp image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp image")

@router.get("/status/{session_id}")
async def get_whatsapp_status_for_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the connection status of the WhatsApp (OpenWA) server for a specific session.
    """
    try:
        # Validate that the user is checking their own session
        expected_session_id = f"user_{current_user.get('user_id', 'unknown')}"
        if session_id != expected_session_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this session")
            
        status = await openwa_service.get_connection_status(session_id=session_id)
        return {"status": "success", "connection_state": status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve WhatsApp status")

@router.get("/status")
async def get_whatsapp_status(
    current_user: dict = Depends(get_current_user)
):
    """
    Get the connection status of the WhatsApp (OpenWA) server.
    """
    try:
        status = await openwa_service.get_connection_status()
        return {"status": "success", "connection_state": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve WhatsApp status")

@router.post("/webhook")
async def openwa_webhook(request: Request):
    """
    Webhook endpoint for Evolution API to send incoming messages and status updates.
    """
    try:
        payload = await request.json()
        logger.info(f"Received WhatsApp webhook payload: {payload}")
        
        event = payload.get("event")
        # Handle incoming messages from leads
        if event == "messages.upsert":
            data = payload.get("data", {})
            message = data.get("message", {})
            key = data.get("key", {})
            
            # Ensure it's not a message we sent out (fromMe = false means it's incoming)
            if not key.get("fromMe") and key.get("remoteJid"):
                # Extract phone number (remove @s.whatsapp.net)
                phone_number = key.get("remoteJid").split("@")[0]
                instance_name = payload.get("instance", "")
                
                # Instance names are formatted as user_{user_id}
                user_id = instance_name.replace("user_", "") if instance_name.startswith("user_") else "unknown"
                
                # Update the message status in the database to Replied
                updated = await update_whatsapp_status(user_id=user_id, phone_number=phone_number)
                
                if updated:
                    # Trigger notification for the user
                    await create_notification(
                        user_id=user_id,
                        title="New WhatsApp Reply",
                        message=f"You received a new WhatsApp reply from {phone_number}.",
                        type="whatsapp_reply",
                        link=f"/app/leads?phone={phone_number}"
                    )
                    logger.info(f"Updated status to Replied and sent notification for {phone_number} to user {user_id}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return {"status": "error", "message": str(e)}
