import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["GTM_Leads"]
    
    # First, delete the dummy Ammar I just created
    await db.leads.delete_many({"industry": "Testing", "name": "Ammar"})
    
    # Second, find the real Ammar and update his phone number
    # Using regex to match "Ammar" case-insensitively
    result = await db.leads.update_many(
        {"name": {"$regex": "ammar", "$options": "i"}},
        {"$set": {"phone": "+917337726482"}}
    )
    
    print(f"Updated phone numbers for {result.modified_count} existing leads named Ammar.")

if __name__ == "__main__":
    asyncio.run(main())
