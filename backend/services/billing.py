import logging
from fastapi import HTTPException, status
from database import db

logger = logging.getLogger(__name__)

async def check_and_deduct_credits(user_id: str, action_type: str, amount: int = 1, dry_run: bool = False) -> bool:
    """
    Checks if a user has enough credits for an action and deducts them.
    action_type should be one of: emails_sent, ai_leads_discovered, linkedin_posts, ai_personalizations
    Raises HTTPException(402) if not enough credits.
    """
    if db is None:
        logger.warning("DB not connected in billing check. Skipping credit check.")
        return True
        
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        logger.error(f"User {user_id} not found in billing check.")
        return True
        
    credits_used = user.get("credits_used", {})
    credits_limit = user.get("credits_limit", {})
    
    current_used = credits_used.get(action_type, 0)
    current_limit = credits_limit.get(action_type, 0)
    
    if current_used + amount > current_limit:
        raise HTTPException(
            status_code=402, # Payment Required
            detail=f"You have exhausted your {action_type.replace('_', ' ').title()} quota ({current_limit}). Please upgrade your plan to continue."
        )
        
    if not dry_run:
        # Deduct credits
        await db.users.update_one(
            {"user_id": user_id},
            {"$inc": {f"credits_used.{action_type}": amount}}
        )
    
    return True
