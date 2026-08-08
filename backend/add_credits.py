import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["GTM_Leads"]
    
    result = await db.users.update_one(
        {"user_id": "45832399-7836-4bac-94cd-248b91bc5351"},
        {"$set": {"credits_limit.sms_sent": 1000, "credits_limit.ai_personalizations": 1000}}
    )
    print(f"Credits updated. Modified: {result.modified_count}")

if __name__ == "__main__":
    asyncio.run(main())
