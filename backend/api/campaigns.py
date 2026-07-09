import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from groq import AsyncGroq

from config import settings
from services.image_gen import generate_campaign_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

class ContentRequest(BaseModel):
    channel: str # linkedin, email, whatsapp, voice, sms
    objective: str # follow_up, engagement, product_launch, event_management
    action: str # post, dm
    product_name: str
    target_customer: str
    call_to_action: str
    product_info: str

class ContentResponse(BaseModel):
    content: str

class ImageRequest(BaseModel):
    content: str

class ImageResponse(BaseModel):
    prompt: str
    image_url: str

class PublishRequest(BaseModel):
    action: str
    content: str
    image_url: Optional[str] = None
    accounts: list[str] = ["Account 1", "Account 2", "Account 3"]
    user_id: str

class DraftRequest(BaseModel):
    action: str
    content: str
    image_url: Optional[str] = None
    user_id: str
    name: str

class EmailSendRequest(BaseModel):
    campaign_id: str
    user_id: str
    subject: str
    content: str
    method: str
    leads: list[dict] = []

class EmailPublishRequest(BaseModel):
    action: str
    content: str
    user_id: str
    name: str
    method: str
    leads: list[dict] = []

class SmsSendRequest(BaseModel):
    campaign_id: str
    user_id: str
    content: str
    image_url: Optional[str] = None
    leads: list[dict] = []

class SmsPublishRequest(BaseModel):
    action: str
    content: str
    image_url: Optional[str] = None
    user_id: str
    name: str
    leads: list[dict] = []

# ── Voice Campaign Models ─────────────────────────────────────────────────────

class VoicePromptRefineRequest(BaseModel):
    user_id: str
    raw_prompt: str
    product_name: str = ""
    target_customer: str = ""
    call_to_action: str = ""

class VoicePublishRequest(BaseModel):
    user_id: str
    name: str
    prompt: str  # The refined system prompt for the AI agent
    first_message: str = "Hello! Thanks for taking my call."
    leads: list[dict] = []  # [{name, phone}]
    send_followup_sms: bool = True

class VoiceDraftRequest(BaseModel):
    user_id: str
    name: str
    prompt: str
    first_message: str = "Hello! Thanks for taking my call."
    leads: list[dict] = []

def get_groq_client():
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    return AsyncGroq(api_key=settings.GROQ_API_KEY)

@router.post("/generate-content", response_model=ContentResponse)
async def generate_campaign_content(req: ContentRequest):
    client = get_groq_client()
    model = "llama-3.3-70b-versatile"
    
    from prompts.campaign_prompts import fill_prompt
    import json
    
    try:
        # Use the user's new helper function
        prompt = fill_prompt(
            channel=req.channel.lower(),
            campaign_type=req.objective.lower(),
            product_name=req.product_name,
            target_customer=req.target_customer,
            product_info=req.product_info,
            call_to_action=req.call_to_action
        )
        
        # The prompt demands JSON, so we enforce it
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content.strip()
        
        # Extract the 'message' from the JSON object to display in the frontend
        try:
            parsed_json = json.loads(raw_content)
            content_to_display = parsed_json.get("message", raw_content)
        except json.JSONDecodeError:
            content_to_display = raw_content
            
        return ContentResponse(content=content_to_display)
    except Exception as e:
        logger.error(f"Failed to generate content: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/generate-image", response_model=ImageResponse)
async def generate_linkedin_image(req: ImageRequest):
    client = get_groq_client()
    model = "llama-3.3-70b-versatile"
    import json
    from prompts.campaign_prompts import get_image_prompt
    
    # Generate image prompt using the new structured prompts
    # Since this endpoint is currently hardcoded for linkedin, we'll pass 'linkedin' and a generic campaign_type for now.
    # We can default to 'engagement' as the safest bet if the frontend doesn't send the campaign_type in ImageRequest.
    prompt = get_image_prompt(
        channel="linkedin", 
        campaign_type="engagement", 
        campaign_content=req.content
    )
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        raw_content = response.choices[0].message.content.strip()
        
        # Parse the JSON and extract the image_prompt (<=20 words)
        try:
            parsed = json.loads(raw_content)
            image_prompt = parsed.get("image_prompt", raw_content)
        except json.JSONDecodeError:
            image_prompt = raw_content
        
        # Output path
        import time
        import os
        output_filename = f"poster_{int(time.time())}.png"
        output_path = os.path.abspath(output_filename)
        
        # Generate image using diffusers
        generate_campaign_image(image_prompt, output_path)
        
        return ImageResponse(prompt=image_prompt, image_url=f"/static/{output_filename}") # Assuming a static mount or returning just the name
    except Exception as e:
        logger.error(f"Failed to generate image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/upload-image")
async def upload_linkedin_image(file: UploadFile = File(...)):
    import time
    import os
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    output_filename = f"poster_upload_{int(time.time())}.{ext}"
    output_path = os.path.abspath(output_filename)
    
    try:
        content = await file.read()
        with open(output_path, "wb") as f:
            f.write(content)
        return {"image_url": f"/static/{output_filename}"}
    except Exception as e:
        logger.error(f"Failed to upload image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/publish")
async def publish_linkedin_campaign(req: PublishRequest):
    import httpx
    import os
    from database import db
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    from services.billing import check_and_deduct_credits
    await check_and_deduct_credits(req.user_id, "linkedin_posts", amount=1, dry_run=False)
        
    # 1. Fetch the user's LinkedIn Token from MongoDB
    user = await db.users.find_one({"user_id": req.user_id})
    if not user or "integrations" not in user or "linkedin" not in user["integrations"]:
        raise HTTPException(status_code=400, detail="LinkedIn account is not connected. Please connect it first.")
        
    token = user["integrations"]["linkedin"]["access_token"]
    
    async with httpx.AsyncClient() as client:
        # 2. Get the User's LinkedIn Profile URN
        profile_res = await client.get(
            "https://api.linkedin.com/v2/userinfo", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if profile_res.status_code != 200:
            logger.error(f"Failed to fetch LinkedIn profile: {profile_res.text}")
            raise HTTPException(status_code=400, detail="LinkedIn token expired or invalid. Please reconnect.")
            
        person_urn = profile_res.json().get("sub")
        
        # 3. Handle Image Upload if an image exists
        media_urn = None
        if req.image_url:
            # Extract local filename from the URL (e.g., /static/poster_123.png)
            filename = req.image_url.split("/")[-1]
            local_image_path = os.path.abspath(filename)
            
            if os.path.exists(local_image_path):
                # Step A: Register the upload
                reg_payload = {
                    "registerUploadRequest": {
                        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                        "owner": f"urn:li:person:{person_urn}",
                        "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]
                    }
                }
                
                reg_res = await client.post(
                    "https://api.linkedin.com/v2/assets?action=registerUpload",
                    json=reg_payload,
                    headers={"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0"}
                )
                
                if reg_res.status_code in [200, 201]:
                    reg_data = reg_res.json()
                    upload_url = reg_data["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
                    media_urn = reg_data["value"]["asset"]
                    
                    # Step B: Upload the actual image bytes to the URL LinkedIn provided
                    with open(local_image_path, "rb") as img_file:
                        img_bytes = img_file.read()
                        
                    upload_res = await client.put(
                        upload_url,
                        content=img_bytes,
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    
                    if upload_res.status_code not in [200, 201, 204]:
                        logger.error(f"Failed to upload image bytes to LinkedIn: {upload_res.status_code}")
                        media_urn = None # Fallback to text-only if the image bytes fail
        
        # 4. Create the Post on LinkedIn
        specific_content = {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": req.content},
                "shareMediaCategory": "NONE"
            }
        }
        
        # Attach the image to the post if we successfully uploaded it
        if media_urn:
            specific_content["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
            specific_content["com.linkedin.ugc.ShareContent"]["media"] = [
                {
                    "status": "READY",
                    "description": {"text": "Campaign Image"},
                    "media": media_urn,
                    "title": {"text": "Genquantaa Campaign"}
                }
            ]
            
        post_url = "https://api.linkedin.com/v2/ugcPosts"
        post_payload = {
            "author": f"urn:li:person:{person_urn}",
            "lifecycleState": "PUBLISHED",
            "specificContent": specific_content,
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
        }
        
        # Make the request to create a live post!
        publish_res = await client.post(
            post_url,
            json=post_payload,
            headers={"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0"}
        )
        
        if publish_res.status_code not in [200, 201]:
            logger.error(f"LinkedIn Publishing Error: {publish_res.text}")
            raise HTTPException(status_code=400, detail=f"Failed to publish to LinkedIn: {publish_res.text}")

        # Store campaign in MongoDB
        import datetime
        new_campaign = {
            "user_id": req.user_id,
            "name": req.content[:30].strip() + "..." if len(req.content) > 30 else req.content.strip(),
            "status": "Active",
            "type": "LinkedIn",
            "progress": 100,
            "sent": 1,
            "replied": 0,
            "booked": 0,
            "date": datetime.datetime.utcnow().strftime("%b %d, %Y"),
            "created_at": datetime.datetime.utcnow(),
            "content": req.content,
            "image_url": req.image_url,
            "action": req.action
        }
        await db.campaigns.insert_one(new_campaign)

    return {"status": "success", "message": "Successfully published directly to your live LinkedIn account (with image)!"}

@router.get("/")
async def get_campaigns(user_id: str):
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    campaigns_cursor = db.campaigns.find({"user_id": user_id}).sort("created_at", -1)
    campaigns = await campaigns_cursor.to_list(length=100)
    
    for c in campaigns:
        c["id"] = str(c["_id"])
        del c["_id"]
        
    return campaigns

@router.post("/linkedin/draft")
async def save_linkedin_draft(req: DraftRequest):
    from database import db
    import datetime
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    new_draft = {
        "user_id": req.user_id,
        "name": req.name,
        "status": "Draft",
        "type": "LinkedIn",
        "progress": 0,
        "sent": 0,
        "replied": 0,
        "booked": 0,
        "date": datetime.datetime.utcnow().strftime("%b %d, %Y"),
        "created_at": datetime.datetime.utcnow(),
        "content": req.content,
        "image_url": req.image_url,
        "action": req.action
    }
    
    await db.campaigns.insert_one(new_draft)
    return {"status": "success", "message": "Campaign successfully saved as a draft!"}

async def _dispatch_emails(user_id: str, leads: list, subject: str, content: str, method: str) -> int:
    from database import db
    from services.email_sender import send_email_via_gmail_api, send_email_via_smtp
    
    user = await db.users.find_one({"user_id": user_id})
    logger.info(f"Dispatching emails for user {user_id}. Initial method: {method}. Leads count: {len(leads)}")
    if not user or "integrations" not in user:
        logger.warning(f"User {user_id} not found or has no integrations.")
        raise ValueError("No email integrations connected. Please go to Integrations and connect an email account.")
        
    creds = user["integrations"].get(method.lower())
    if not creds:
        # Fallback to any available email provider
        for p in ["gmail", "outlook", "smtp"]:
            if p in user["integrations"]:
                creds = user["integrations"][p]
                method = p
                logger.info(f"Fell back to email provider: {p}")
                break
                
    if not creds:
        logger.warning(f"No email credentials found for user {user_id}.")
        raise ValueError("No valid email provider connected. Please go to Integrations and connect your email.")
        
    logger.info(f"Proceeding with email provider {method} for {len(leads)} leads.")
    successful_sends = 0
    import re
    import time
    from services.email_fetcher import refresh_gmail_token
    from services.billing import check_and_deduct_credits
    
    # Pre-flight check: Make sure they have at least 1 email token
    await check_and_deduct_credits(user_id, "emails_sent", amount=1, dry_run=True)
    
    # Pre-refresh Gmail token if needed
    if method.lower() == "gmail" and creds.get("auth_type") == "oauth":
        if time.time() >= creds.get("expires_at", 0) - 60:
            refresh_token = creds.get("refresh_token")
            if refresh_token:
                try:
                    refreshed = await refresh_gmail_token(refresh_token)
                    creds["access_token"] = refreshed["access_token"]
                    creds["expires_at"] = time.time() + refreshed["expires_in"]
                    
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "integrations.gmail.access_token": creds["access_token"],
                            "integrations.gmail.expires_at": creds["expires_at"]
                        }}
                    )
                except Exception as e:
                    logger.error(f"Failed to refresh gmail token in dispatcher: {e}")

    import datetime
    from services.personalization import personalize_email_content
    from services.billing import check_and_deduct_credits

    for lead in leads:
        lead_email = lead.get("email")
        if not lead_email:
            continue

        lead_name = lead.get("name") or "there"
        sender_name = user.get("name", "Sales Team")

        # Use AI to perfectly craft the email for this specific lead
        personalized_content = await personalize_email_content(content, lead, sender_name)
        await check_and_deduct_credits(user_id, "ai_personalizations", amount=1, dry_run=False)

        send_result = None
        if method.lower() == "gmail":
            send_result = await send_email_via_gmail_api(
                access_token=creds.get("access_token"),
                to=lead_email,
                subject=subject,
                body=personalized_content
            )
        else:
            send_result = await send_email_via_smtp(
                email=creds.get("email"),
                password=creds.get("password"),
                host=creds.get("host", "smtp.gmail.com"),
                port=int(creds.get("port", 587) if creds.get("port") else 587),
                to=lead_email,
                subject=subject,
                body=personalized_content
            )

        # send_result is a dict: {"success": bool, "message_id": str|None}
        if send_result and send_result.get("success"):
            successful_sends += 1
            await check_and_deduct_credits(user_id, "emails_sent", amount=1, dry_run=False)

            message_id = send_result.get("message_id")

            if db is not None:
                try:
                    # Mark lead as emailed so we can filter for reply tracking later
                    await db.leads.update_many(
                        {"email": lead_email, "user_id": user_id},
                        {"$set": {"emailed_via_gtm": True}}
                    )

                    # Insert a record into the emails collection linking this send to the campaign
                    # We'll use this record to match inbound replies via In-Reply-To == message_id
                    lead_doc = await db.leads.find_one({"email": lead_email, "user_id": user_id})
                    email_record = {
                        "user_id": user_id,
                        "campaign_id": None,   # filled in by the caller (send/publish route)
                        "lead_id": str(lead_doc["_id"]) if lead_doc else None,
                        "lead_email": lead_email,
                        "message_id": message_id,
                        "subject": subject,
                        "body": personalized_content,
                        "status": "sent",
                        "reply_body": None,
                        "reply_status": None,
                        "sent_at": datetime.datetime.utcnow(),
                    }
                    await db.emails.insert_one(email_record)
                    logger.info(f"Email record saved for lead {lead_email} (Message-ID: {message_id})")
                except Exception as e:
                    logger.error(f"Failed to update lead/email record for {lead_email}: {e}")

    return successful_sends

@router.post("/email/send")
async def send_email_campaign(req: EmailSendRequest):
    logger.info(f"Sending email campaign '{req.subject}' to {len(req.leads)} leads via {req.method}.")

    try:
        successful_sends = await _dispatch_emails(
            user_id=req.user_id,
            leads=req.leads,
            subject=req.subject,
            content=req.content,
            method=req.method
        )
    except ValueError as e:
        return {"status": "error", "message": str(e)}

    from database import db
    from bson.objectid import ObjectId
    if db is not None:
        try:
            await db.campaigns.update_one(
                {"_id": ObjectId(req.campaign_id)},
                {"$inc": {"sent": successful_sends}, "$set": {"status": "Active"}}
            )
            # Backfill campaign_id into all email records written during this dispatch
            lead_emails = [l.get("email") for l in req.leads if l.get("email")]
            await db.emails.update_many(
                {"user_id": req.user_id, "campaign_id": None, "lead_email": {"$in": lead_emails}},
                {"$set": {"campaign_id": req.campaign_id}}
            )
        except Exception as e:
            logger.error(f"Failed to update campaign sent count or backfill campaign_id: {e}")

    return {
        "status": "success",
        "message": f"Successfully sent email campaign to {successful_sends} out of {len(req.leads)} contacts!"
    }

@router.post("/email/publish")
async def publish_email_campaign(req: EmailPublishRequest):
    from database import db
    import datetime

    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    logger.info(f"Publishing email campaign '{req.name}' to {len(req.leads)} leads via {req.method}.")

    try:
        successful_sends = await _dispatch_emails(
            user_id=req.user_id,
            leads=req.leads,
            subject=req.name,
            content=req.content,
            method=req.method
        )
    except ValueError as e:
        return {"status": "error", "message": str(e)}

    new_campaign = {
        "user_id": req.user_id,
        "name": req.name,
        "status": "Active",
        "type": "Email",
        "progress": 100,
        "sent": successful_sends,
        "replied": 0,
        "booked": 0,
        "date": datetime.datetime.utcnow().strftime("%b %d, %Y"),
        "created_at": datetime.datetime.utcnow(),
        "content": req.content,
        "action": req.action
    }

    result = await db.campaigns.insert_one(new_campaign)
    campaign_id_str = str(result.inserted_id)

    # Backfill campaign_id into all email records written during this dispatch
    try:
        lead_emails = [l.get("email") for l in req.leads if l.get("email")]
        await db.emails.update_many(
            {"user_id": req.user_id, "campaign_id": None, "lead_email": {"$in": lead_emails}},
            {"$set": {"campaign_id": campaign_id_str}}
        )
    except Exception as e:
        logger.error(f"Failed to backfill campaign_id in emails collection: {e}")

    return {"status": "success", "message": f"Successfully published and sent email campaign to {successful_sends} contacts!"}

async def _dispatch_sms(user_id: str, leads: list, content: str, image_url: str = None) -> int:
    from database import db
    from services.sms_sender import send_sms_via_twilio
    import os
    from config import settings
    
    user = await db.users.find_one({"user_id": user_id})
    logger.info(f"Dispatching SMS for user {user_id}. Leads count: {len(leads)}")
    if not user or "integrations" not in user or "twilio" not in user["integrations"]:
        logger.warning(f"User {user_id} not found or Twilio not connected.")
        raise ValueError("Twilio account is not connected. Please go to Integrations and connect your Twilio account.")
        
    creds = user["integrations"]["twilio"]
    account_sid = creds.get("account_sid")
    auth_token = creds.get("auth_token")
    from_number = creds.get("from_number")
    
    if not account_sid or not auth_token or not from_number:
        raise ValueError("Incomplete Twilio credentials. Please check your Integrations.")
        
    successful_sends = 0
    from services.billing import check_and_deduct_credits
    await check_and_deduct_credits(user_id, "sms_sent", amount=1, dry_run=True)
    
    for lead in leads:
        lead_phone = lead.get("phone")
        if not lead_phone:
            continue
            
        # Basic personalization replacement if needed (can be extended to AI)
        lead_name = lead.get("name", "there")
        personalized_content = content.replace("[Name]", lead_name).replace("{Name}", lead_name)
        
        # Format image URL for Twilio
        formatted_media_url = None
        if image_url:
            if image_url.startswith("http") and "localhost" not in image_url:
                formatted_media_url = image_url
            else:
                # Twilio cannot reach localhost URLs. For local testing, we fallback to a public placeholder.
                # In production, this would be the actual deployed URL (e.g., https://yourdomain.com/static/...)
                formatted_media_url = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"

        success = await send_sms_via_twilio(
            account_sid=account_sid,
            auth_token=auth_token,
            from_number=from_number,
            to=lead_phone,
            body=personalized_content,
            media_url=formatted_media_url
        )
            
        if success:
            successful_sends += 1
            await check_and_deduct_credits(user_id, "sms_sent", amount=1, dry_run=False)
            
            # Mark the lead as SMSed
            if db is not None:
                try:
                    await db.leads.update_many(
                        {"phone": lead_phone, "user_id": user_id},
                        {"$set": {"sms_sent_via_gtm": True}}
                    )
                except Exception as e:
                    logger.error(f"Failed to update sms_sent_via_gtm for {lead_phone}: {e}")
            
    return successful_sends

@router.post("/sms/send")
async def send_sms_campaign(req: SmsSendRequest):
    logger.info(f"Sending SMS campaign to {len(req.leads)} leads.")
    
    try:
        successful_sends = await _dispatch_sms(
            user_id=req.user_id,
            leads=req.leads,
            content=req.content,
            image_url=req.image_url
        )
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    
    from database import db
    from bson.objectid import ObjectId
    if db is not None:
        try:
            await db.campaigns.update_one(
                {"_id": ObjectId(req.campaign_id)},
                {"$inc": {"sent": successful_sends}, "$set": {"status": "Active"}}
            )
        except Exception as e:
            logger.error(f"Failed to update campaign sent count: {e}")

    return {
        "status": "success", 
        "message": f"Successfully sent SMS campaign to {successful_sends} out of {len(req.leads)} contacts!"
    }

@router.post("/sms/publish")
async def publish_sms_campaign(req: SmsPublishRequest):
    from database import db
    import datetime
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    logger.info(f"Publishing SMS campaign '{req.name}' to {len(req.leads)} leads.")
    
    try:
        successful_sends = await _dispatch_sms(
            user_id=req.user_id,
            leads=req.leads,
            content=req.content,
            image_url=req.image_url
        )
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    
    new_campaign = {
        "user_id": req.user_id,
        "name": req.name,
        "status": "Active",
        "type": "SMS",
        "progress": 100,
        "sent": successful_sends,
        "replied": 0,
        "booked": 0,
        "date": datetime.datetime.utcnow().strftime("%b %d, %Y"),
        "created_at": datetime.datetime.utcnow(),
        "content": req.content,
        "image_url": req.image_url,
        "action": req.action
    }
    
    await db.campaigns.insert_one(new_campaign)
    
    return {"status": "success", "message": f"Successfully published and sent SMS campaign to {successful_sends} contacts!"}


# ══════════════════════════════════════════════════════════════════════════════
# VOICE CALL CAMPAIGN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/voice/refine-prompt")
async def refine_voice_prompt_endpoint(req: VoicePromptRefineRequest):
    """Refines a user's raw voice prompt into a professional AI agent script."""
    from services.vapi_service import refine_voice_prompt
    
    try:
        refined = await refine_voice_prompt(
            raw_prompt=req.raw_prompt,
            product_name=req.product_name,
            target_customer=req.target_customer,
            call_to_action=req.call_to_action,
        )
        return {"status": "success", "refined_prompt": refined}
    except Exception as e:
        logger.error(f"Failed to refine voice prompt: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/publish")
async def publish_voice_campaign(req: VoicePublishRequest):
    """
    Publishes and launches a voice call campaign.
    Creates a per-user VAPI assistant, then calls each lead sequentially.
    Runs the calling loop as a background task.
    """
    from database import db, save_call_log
    from services.vapi_service import (
        create_or_update_assistant,
        make_outbound_call,
        poll_call_status,
        process_call_transcript,
    )
    from services.sms_sender import send_sms_via_twilio
    from services.billing import check_and_deduct_credits
    import datetime
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # 1. Get user's Twilio credentials from MongoDB
    user = await db.users.find_one({"user_id": req.user_id})
    if not user or "integrations" not in user or "twilio" not in user["integrations"]:
        return {
            "status": "error",
            "message": "Twilio account is not connected. Please go to Integrations and connect your Twilio account."
        }
    
    twilio_creds = user["integrations"]["twilio"]
    account_sid = twilio_creds.get("account_sid")
    auth_token = twilio_creds.get("auth_token")
    from_number = twilio_creds.get("from_number")
    
    if not account_sid or not auth_token or not from_number:
        return {
            "status": "error",
            "message": "Incomplete Twilio credentials. Please check your Integrations."
        }
    
    # 2. Check credits
    try:
        await check_and_deduct_credits(req.user_id, "voice_calls", amount=1, dry_run=True)
    except Exception:
        pass  # Allow if billing not fully set up
    
    # 3. Create/update per-user VAPI assistant with the refined prompt
    try:
        assistant_id = await create_or_update_assistant(
            user_id=req.user_id,
            system_prompt=req.prompt,
            assistant_name=req.name,
            first_message=req.first_message,
        )
    except Exception as e:
        logger.error(f"Failed to create VAPI assistant: {e}", exc_info=True)
        return {"status": "error", "message": f"Failed to set up voice agent: {str(e)}"}
    
    # 4. Create campaign record in MongoDB
    campaign_doc = {
        "user_id": req.user_id,
        "name": req.name,
        "status": "Active",
        "type": "Voice",
        "progress": 0,
        "sent": 0,
        "replied": 0,
        "booked": 0,
        "total_leads": len(req.leads),
        "date": datetime.datetime.utcnow().strftime("%b %d, %Y"),
        "created_at": datetime.datetime.utcnow(),
        "prompt": req.prompt,
        "first_message": req.first_message,
        "assistant_id": assistant_id,
        "action": "call",
    }
    result = await db.campaigns.insert_one(campaign_doc)
    campaign_id = str(result.inserted_id)
    
    # 5. Launch calls as a background task
    import asyncio
    
    async def _run_voice_campaign():
        """Background task: call each lead sequentially."""
        from bson.objectid import ObjectId
        successful_calls = 0
        positive_count = 0
        
        for idx, lead in enumerate(req.leads):
            lead_name = lead.get("name", "there")
            lead_phone = lead.get("phone", "")
            
            if not lead_phone:
                logger.warning(f"Skipping lead {lead_name}: no phone number")
                continue
            
            logger.info(f"[Voice Campaign {campaign_id}] Calling {idx+1}/{len(req.leads)}: {lead_name}")
            
            # Make the call
            call_id, call_status = await make_outbound_call(
                assistant_id=assistant_id,
                phone=lead_phone,
                name=lead_name,
                twilio_account_sid=account_sid,
                twilio_auth_token=auth_token,
                twilio_from_number=from_number,
            )
            
            # Save initial call log
            call_log = {
                "user_id": req.user_id,
                "campaign_id": campaign_id,
                "call_id": call_id or "",
                "lead_name": lead_name,
                "lead_phone": lead_phone,
                "status": call_status,
                "transcript": "",
                "recording_url": "",
                "summary": "",
                "checklist": [],
                "sentiment": "",
                "sms_status": "",
                "sms_content": "",
                "duration": 0,
                "created_at": datetime.datetime.utcnow(),
            }
            await save_call_log(call_log)
            
            if not call_id:
                logger.error(f"Call to {lead_name} failed to initiate: {call_status}")
                continue
            
            # Poll for call completion
            result_data = await poll_call_status(call_id, timeout=300)
            
            # Process transcript if available
            transcript = result_data.get("transcript", "")
            analysis = {"summary": "", "checklist": [], "sms_message": "", "sentiment": "Neutral"}
            if transcript:
                analysis = await process_call_transcript(transcript)
            
            # Update call log
            from database import update_call_log
            update_data = {
                "status": result_data.get("status", "unknown"),
                "transcript": transcript,
                "recording_url": result_data.get("recording_url", ""),
                "duration": result_data.get("duration", 0),
                "summary": analysis.get("summary", ""),
                "checklist": analysis.get("checklist", []),
                "sentiment": analysis.get("sentiment", "Neutral"),
                "ended_reason": result_data.get("ended_reason", ""),
                "updated_at": datetime.datetime.utcnow(),
            }
            await update_call_log(call_id, update_data)
            
            successful_calls += 1
            if analysis.get("sentiment") == "Positive":
                positive_count += 1
            
            # Send follow-up SMS if enabled and transcript was captured
            if req.send_followup_sms and analysis.get("sms_message"):
                sms_success = await send_sms_via_twilio(
                    account_sid=account_sid,
                    auth_token=auth_token,
                    from_number=from_number,
                    to=lead_phone,
                    body=analysis["sms_message"],
                )
                sms_update = {
                    "sms_status": "sent" if sms_success else "failed",
                    "sms_content": analysis["sms_message"],
                }
                await update_call_log(call_id, sms_update)
            
            # Deduct credits
            try:
                await check_and_deduct_credits(req.user_id, "voice_calls", amount=1, dry_run=False)
            except Exception:
                pass
            
            # Update campaign progress
            progress = int(((idx + 1) / len(req.leads)) * 100)
            try:
                await db.campaigns.update_one(
                    {"_id": ObjectId(campaign_id)},
                    {"$set": {
                        "sent": successful_calls,
                        "booked": positive_count,
                        "progress": progress,
                    }}
                )
            except Exception as e:
                logger.error(f"Failed to update campaign progress: {e}")
            
            # Small delay between calls to avoid rate limits
            await asyncio.sleep(2)
        
        # Mark campaign as completed
        try:
            await db.campaigns.update_one(
                {"_id": ObjectId(campaign_id)},
                {"$set": {
                    "progress": 100,
                    "sent": successful_calls,
                    "booked": positive_count,
                    "status": "Completed" if successful_calls > 0 else "Failed",
                }}
            )
        except Exception as e:
            logger.error(f"Failed to finalize campaign: {e}")
        
        logger.info(f"[Voice Campaign {campaign_id}] Completed. {successful_calls}/{len(req.leads)} calls made.")
    
    # Fire and forget the background task
    asyncio.create_task(_run_voice_campaign())
    
    return {
        "status": "success",
        "message": f"Voice campaign '{req.name}' launched! Calling {len(req.leads)} leads.",
        "campaign_id": campaign_id,
        "assistant_id": assistant_id,
    }


@router.post("/voice/webhook")
async def voice_webhook(request: Request):
    """
    Receives VAPI call-ended webhooks.
    Updates the call log with transcript, recording, and processes via Groq.
    """
    from database import update_call_log
    from services.vapi_service import process_call_transcript
    from services.sms_sender import send_sms_via_twilio
    import datetime
    
    try:
        data = await request.json()
        if not data:
            return {"success": False, "error": "Empty body"}
        
        message_type = data.get("message", {}).get("type", "")
        call = data.get("message", {}).get("call", data)
        call_id = call.get("id", "")
        status = call.get("status", "")
        
        logger.info(f"Voice webhook received: type={message_type}, call_id={call_id}, status={status}")
        
        if status in ("ended", "fulfilled"):
            transcript = call.get("transcript", "")
            recording_url = call.get("recordingUrl", "")
            duration = call.get("duration", 0)
            
            # Process transcript
            analysis = {"summary": "", "checklist": [], "sms_message": "", "sentiment": "Neutral"}
            if transcript:
                analysis = await process_call_transcript(transcript)
            
            update_data = {
                "status": status,
                "transcript": transcript,
                "recording_url": recording_url,
                "duration": duration,
                "summary": analysis.get("summary", ""),
                "checklist": analysis.get("checklist", []),
                "sentiment": analysis.get("sentiment", "Neutral"),
                "ended_reason": call.get("endedReason", ""),
                "updated_at": datetime.datetime.utcnow(),
            }
            
            await update_call_log(call_id, update_data)
            logger.info(f"Updated call log {call_id} via webhook")
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Voice webhook error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.get("/voice/calls")
async def get_voice_calls(user_id: str, campaign_id: str = None):
    """Get call logs for a user, optionally filtered by campaign."""
    from database import get_call_logs
    
    logs = await get_call_logs(user_id, campaign_id)
    return {"calls": logs}


@router.get("/voice/stats")
async def get_voice_stats(user_id: str):
    """Get aggregated call statistics for the Calls dashboard."""
    from database import get_call_stats
    
    stats = await get_call_stats(user_id)
    return stats


@router.post("/voice/draft")
async def save_voice_draft(req: VoiceDraftRequest):
    """Save a voice campaign as a draft without launching calls."""
    from database import db
    import datetime
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    new_draft = {
        "user_id": req.user_id,
        "name": req.name,
        "status": "Draft",
        "type": "Voice",
        "progress": 0,
        "sent": 0,
        "replied": 0,
        "booked": 0,
        "total_leads": len(req.leads),
        "date": datetime.datetime.utcnow().strftime("%b %d, %Y"),
        "created_at": datetime.datetime.utcnow(),
        "prompt": req.prompt,
        "first_message": req.first_message,
        "leads": req.leads,
        "action": "call",
    }
    
    await db.campaigns.insert_one(new_draft)
    return {"status": "success", "message": "Voice campaign saved as draft!"}

