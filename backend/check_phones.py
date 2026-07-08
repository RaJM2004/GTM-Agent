import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import phonenumbers
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["GTM_Leads"]
    
    leads = await db.leads.find({}).to_list(length=None)
    
    invalid = 0
    fixed = 0
    total = len(leads)
    
    for lead in leads:
        phone = lead.get("phone")
        if not phone:
            continue
            
        try:
            parsed = phonenumbers.parse(phone, "IN") # Default to IN if no country code
            if not phonenumbers.is_valid_number(parsed):
                print(f"Invalid phone number found: {phone} (Lead ID: {lead['_id']})")
                invalid += 1
            else:
                formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                if formatted != phone:
                    print(f"Fixing phone {phone} -> {formatted}")
                    await db.leads.update_one({"_id": lead["_id"]}, {"$set": {"phone": formatted}})
                    fixed += 1
        except Exception as e:
            print(f"Could not parse {phone}: {e}")
            invalid += 1
            
    print(f"\nChecked {total} leads.")
    print(f"Invalid/unparseable numbers: {invalid}")
    print(f"Automatically formatted/fixed to E.164: {fixed}")

if __name__ == "__main__":
    asyncio.run(main())
