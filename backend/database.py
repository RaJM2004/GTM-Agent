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

async def save_leads(leads: list, prompt: str):
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
