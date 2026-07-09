import logging
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger(__name__)

client = None
db = None

def connect_to_mongo():
    global client, db
    if not settings.MONGODB_URI:
        logger.warning("MONGODB_URI not found in environment variables.")
        return
        
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        # Database name defaults to 'GTM' based on the connection string or can be explicit
        db = client.get_database("GTM_Leads")
        logger.info("Successfully connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")

def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")

async def save_leads(leads: list, prompt: str, user_id: str = ""):
    """Save discovered leads to MongoDB"""
    if db is None:
        logger.warning("MongoDB is not connected. Leads will not be saved.")
        return False
        
    try:
        collection = db.leads
        
        # Convert leads to dicts and add metadata
        docs = []
        for lead in leads:
            lead_dict = lead.dict()
            lead_dict["discovery_prompt"] = prompt
            lead_dict["user_id"] = user_id
            docs.append(lead_dict)
            
        if docs:
            # Insert many documents
            await collection.insert_many(docs)
            logger.info(f"Saved {len(docs)} leads to MongoDB")
            return True
    except Exception as e:
        logger.error(f"Failed to save leads to MongoDB: {e}")
        return False

async def save_integration_token(user_id: str, platform: str, token_data: dict):
    """Save an OAuth token for a specific user and platform."""
    if db is None:
        logger.warning("MongoDB is not connected. Token will not be saved.")
        return False
        
    try:
        collection = db.users
        # Upsert the token data into the user's document under the 'integrations' field
        await collection.update_one(
            {"user_id": user_id},
            {"$set": {f"integrations.{platform}": token_data}},
            upsert=True
        )
        logger.info(f"Saved {platform} token for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to save token to MongoDB: {e}")
        return False


# ── Call Logs (Voice Campaigns) ───────────────────────────────────────────────

async def save_call_log(call_data: dict):
    """Save an individual call log record to the call_logs collection."""
    if db is None:
        logger.warning("MongoDB is not connected. Call log will not be saved.")
        return None
    try:
        result = await db.call_logs.insert_one(call_data)
        logger.info(f"Saved call log: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Failed to save call log: {e}")
        return None


async def update_call_log(call_id: str, update_data: dict):
    """Update a call log by VAPI call_id."""
    if db is None:
        return False
    try:
        result = await db.call_logs.update_one(
            {"call_id": call_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Failed to update call log {call_id}: {e}")
        return False


async def get_call_logs(user_id: str, campaign_id: str = None, limit: int = 100):
    """Retrieve call logs for a user, optionally filtered by campaign."""
    if db is None:
        return []
    try:
        query = {"user_id": user_id}
        if campaign_id:
            query["campaign_id"] = campaign_id
        cursor = db.call_logs.find(query).sort("created_at", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        for log in logs:
            log["id"] = str(log["_id"])
            del log["_id"]
        return logs
    except Exception as e:
        logger.error(f"Failed to get call logs: {e}")
        return []


async def get_call_stats(user_id: str) -> dict:
    """Get aggregated call statistics for a user's dashboard."""
    if db is None:
        return {"total_calls": 0, "total_duration": 0, "meetings_booked": 0, "sentiments": {}}
    try:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": None,
                "total_calls": {"$sum": 1},
                "total_duration": {"$sum": {"$ifNull": ["$duration", 0]}},
                "meetings_booked": {
                    "$sum": {"$cond": [{"$eq": ["$sentiment", "Positive"]}, 1, 0]}
                },
            }},
        ]
        result = await db.call_logs.aggregate(pipeline).to_list(length=1)
        if result:
            stats = result[0]
            del stats["_id"]
            return stats
        return {"total_calls": 0, "total_duration": 0, "meetings_booked": 0}
    except Exception as e:
        logger.error(f"Failed to get call stats: {e}")
        return {"total_calls": 0, "total_duration": 0, "meetings_booked": 0}

