import asyncio, json
from motor.motor_asyncio import AsyncIOMotorClient
async def main():
    client = AsyncIOMotorClient('mongodb+srv://zerokosthealthcare_db_user:A1lTgdTpx33lUzo4@gtm.u7rfbsz.mongodb.net/?appName=GTM')
    db = client.get_database('GTM_Leads')
    docs = await db.campaigns.find({}).to_list(1)
    print(json.dumps(docs, default=str).encode('utf-8'))
asyncio.run(main())
