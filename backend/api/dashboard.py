from fastapi import APIRouter, Depends, HTTPException
import logging
from api.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/stats")
async def get_dashboard_stats(user_id: str = Depends(get_current_user)):
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    try:
        actual_user_id = user_id["user_id"] if isinstance(user_id, dict) else user_id
        
        # Get total leads
        total_leads = await db.leads.count_documents({"user_id": actual_user_id})
        
        # Get active campaigns
        active_campaigns = await db.campaigns.count_documents({"user_id": actual_user_id, "status": "Active"})
        
        # Mocking meetings booked and conversion rate for now since we don't have dedicated collections
        # We can update these queries later when the collections/logic exist
        total_contacts = await db.contacts.count_documents({"user_id": actual_user_id})
        
        # Simple approximation for demo
        meetings_booked = min(total_contacts // 10, 142) if total_contacts > 0 else 0
        conversion_rate = 3.8 if active_campaigns > 0 else 0.0
        
        # Fetch user document to get billing usage
        user = await db.users.find_one({"user_id": actual_user_id})
        
        return {
            "status": "success",
            "stats": {
                "total_leads": total_leads,
                "active_campaigns": active_campaigns,
                "meetings_booked": meetings_booked,
                "conversion_rate": conversion_rate,
                "billing": user.get("credits_used", {}) if user else {},
                "billing_limit": user.get("credits_limit", {}) if user else {}
            }
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
