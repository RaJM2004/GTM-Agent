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
        
        saved_count = 0
        for lead in leads:
            lead_dict = lead.dict()
            lead_dict["discovery_prompt"] = prompt
            lead_dict["user_id"] = user_id
            
            # Create a query to check for existing duplicates for this user
            query = {"user_id": user_id}
            or_conditions = []
            
            if lead_dict.get("email"):
                or_conditions.append({"email": lead_dict["email"]})
            if lead_dict.get("linkedin_url"):
                or_conditions.append({"linkedin_url": lead_dict["linkedin_url"]})
            if lead_dict.get("name") and lead_dict.get("company"):
                or_conditions.append({"name": lead_dict["name"], "company": lead_dict["company"]})
                
            if or_conditions:
                query["$or"] = or_conditions
                result = await collection.update_one(
                    query,
                    {"$setOnInsert": lead_dict},
                    upsert=True
                )
                if result.upserted_id:
                    saved_count += 1
            else:
                await collection.insert_one(lead_dict)
                saved_count += 1
                
        logger.info(f"Saved {saved_count} new leads to MongoDB")
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


# ── WhatsApp Logs (Message Campaigns) ─────────────────────────────────────────

async def save_whatsapp_record(record_data: dict):
    """Save an individual WhatsApp message record to the whatsapp_logs collection."""
    if db is None:
        logger.warning("MongoDB is not connected. WhatsApp log will not be saved.")
        return None
    try:
        result = await db.whatsapp_logs.insert_one(record_data)
        logger.info(f"Saved WhatsApp log: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Failed to save WhatsApp log: {e}")
        return None


async def update_whatsapp_status(user_id: str, phone_number: str, new_status: str = "Replied"):
    """Update a WhatsApp log's status based on phone number (for replies)."""
    if db is None:
        return False
    try:
        # Find the most recent message sent to this phone number by this user and update it
        result = await db.whatsapp_logs.update_one(
            {"user_id": user_id, "phone_number": phone_number},
            {"$set": {"status": new_status}},
            sort=[("created_at", -1)]
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Failed to update WhatsApp log for {phone_number}: {e}")
        return False


async def get_whatsapp_logs(user_id: str, limit: int = 100):
    """Retrieve WhatsApp logs for a user."""
    if db is None:
        return []
    try:
        query = {"user_id": user_id}
        cursor = db.whatsapp_logs.find(query).sort("created_at", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        for log in logs:
            log["id"] = str(log["_id"])
            del log["_id"]
        return logs
    except Exception as e:
        logger.error(f"Failed to get WhatsApp logs: {e}")
        return []

async def get_whatsapp_stats(user_id: str) -> dict:
    """Get aggregated WhatsApp statistics for a user's dashboard."""
    if db is None:
        return {"total_sent": 0, "total_replies": 0}
    try:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": None,
                "total_sent": {"$sum": 1},
                "total_replies": {
                    "$sum": {"$cond": [{"$eq": ["$status", "Replied"]}, 1, 0]}
                },
            }},
        ]
        result = await db.whatsapp_logs.aggregate(pipeline).to_list(length=1)
        if result:
            stats = result[0]
            del stats["_id"]
            return stats
        return {"total_sent": 0, "total_replies": 0}
    except Exception as e:
        logger.error(f"Failed to get WhatsApp stats: {e}")
        return {"total_sent": 0, "total_replies": 0}

