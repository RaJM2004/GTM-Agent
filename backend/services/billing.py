import logging
from fastapi import HTTPException, status
from database import db

logger = logging.getLogger(__name__)

# Define the token economy
TOKEN_COSTS = {
    "LLM_PROMPT_TOKEN": 1,        # 1 model prompt token = 1 billing token
    "LLM_COMPLETION_TOKEN": 3,    # 1 model completion token = 3 billing tokens
    "WEB_SEARCH": 500,            # 1 web search = 500 billing tokens
    "VOICE_CALL_MINUTE": 10000    # 1 minute of voice calling = 10,000 billing tokens
}

async def check_and_deduct_credits(user_id: str, action_type: str, amount: float = 1.0, dry_run: bool = False) -> bool:
    """
    Checks if a user has enough tokens for an action and deducts them.
    Raises HTTPException(402) if not enough tokens.
    """
    if db is None:
        logger.warning("DB not connected in billing check. Skipping credit check.")
        return True
        
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        logger.error(f"User {user_id} not found in billing check.")
        return True
        
    current_balance = user.get("token_balance", 0.0)
    
    if current_balance < amount:
        raise HTTPException(
            status_code=402, # Payment Required
            detail=f"You have insufficient tokens for this action ({action_type}). Please recharge your account."
        )
        
    if not dry_run:
        # Deduct tokens
        new_balance = current_balance - amount
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"token_balance": new_balance}}
        )
        logger.info(f"Deducted {amount} tokens from user {user_id} for {action_type}. New balance: {new_balance}")
    
    return True
