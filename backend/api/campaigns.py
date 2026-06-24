import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from groq import AsyncGroq

from config import settings
from services.image_gen import generate_campaign_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

class ContentRequest(BaseModel):
    action: str # "post" or "dm"
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

def get_groq_client():
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    return AsyncGroq(api_key=settings.GROQ_API_KEY)

@router.post("/linkedin/generate-content", response_model=ContentResponse)
async def generate_linkedin_content(req: ContentRequest):
    client = get_groq_client()
    model = "llama-3.3-70b-versatile"
    
    if req.action == "post":
        prompt = f"""Create an engaging, professional LinkedIn post with the following details:
- Product/Service: {req.product_name}
- Target Audience: {req.target_customer}
- Key Information/Details: {req.product_info}
- Goal/Call to Action: {req.call_to_action}

Make it sound authentic, include appropriate emojis, use spacing for readability, and include 3-5 relevant hashtags at the end."""
    else:
        prompt = f"""Create a professional, highly personalized LinkedIn direct message (DM) to a prospect with the following details:
- Product/Service: {req.product_name}
- Target Audience Persona: {req.target_customer}
- Value Proposition/Details: {req.product_info}
- Goal/Call to Action: {req.call_to_action}

Keep it concise, friendly, and focused on starting a conversation without being overly salesy. Do not include subject lines, just the message body."""
        
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        content = response.choices[0].message.content.strip()
        return ContentResponse(content=content)
    except Exception as e:
        logger.error(f"Failed to generate content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/generate-image", response_model=ImageResponse)
async def generate_linkedin_image(req: ImageRequest):
    client = get_groq_client()
    model = "llama-3.3-70b-versatile"
    
    # Generate image prompt
    prompt = f"Based on this LinkedIn post content, generate a short, highly descriptive image generation prompt (max 20 words) suitable for an AI image generator. The image should be a photorealistic, high-quality, professional marketing photograph. Avoid cartoons or illustrations:\n\n{req.content}"
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        image_prompt = response.choices[0].message.content.strip()
        
        # Output path
        import time
        output_filename = f"poster_{int(time.time())}.png"
        output_path = f"d:/Zerokost/GTM/backend/{output_filename}"
        
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
    output_path = f"d:/Zerokost/GTM/backend/{output_filename}"
    
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
            local_image_path = f"d:/Zerokost/GTM/backend/{filename}"
            
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
            "created_at": datetime.datetime.utcnow()
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
