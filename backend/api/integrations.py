import logging
import urllib.parse
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
import httpx
from pydantic import BaseModel

from config import settings
from database import save_integration_token
from services.auth import get_current_user
from services.email_fetcher import fetch_real_emails

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

# These should ideally come from settings/.env
# Using placeholder variables if they don't exist
LINKEDIN_CLIENT_ID = getattr(settings, "LINKEDIN_CLIENT_ID", "YOUR_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = getattr(settings, "LINKEDIN_CLIENT_SECRET", "YOUR_CLIENT_SECRET")
# The frontend URL where the user will be redirected after successful auth
FRONTEND_URL = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

# LinkedIn OAuth URLs
AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization"
ACCESS_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"

# Dynamically set redirect URIs based on settings or request headers
def get_backend_base(request: Request = None) -> str:
    if getattr(settings, "BACKEND_URL", None):
        return settings.BACKEND_URL.rstrip("/")
    if request:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host", request.url.netloc)
        if host:
            return f"{proto}://{host}"
        return str(request.base_url).rstrip("/")
    IS_PROD = not settings.DEBUG
    return "https://gtm-backend1-hmgygeahadebdyc7.canadacentral-01.azurewebsites.net" if IS_PROD else "http://localhost:8000"

@router.get("/linkedin/login")
async def linkedin_login(request: Request, user_id: str = "default_user", frontend_url: str = None):
    """Returns the LinkedIn authorization URL to redirect the user to."""
    backend_base = get_backend_base(request)
    redirect_uri = f"{backend_base}/api/integrations/linkedin/callback"
    state_val = user_id
    if frontend_url:
        state_val = f"{user_id}|{frontend_url}"
    # Scope for sharing on LinkedIn: w_member_social, r_liteprofile or r_basicprofile
    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "state": state_val,  # Pass the user_id through the OAuth flow!
        "scope": "openid profile email w_member_social"
    }
    url = f"{AUTHORIZATION_URL}?{urllib.parse.urlencode(params)}"
    return {"auth_url": url}

@router.get("/linkedin/callback")
async def linkedin_callback(
    request: Request,
    state: str,
    code: str = None, 
    error: str = None, 
    error_description: str = None
):
    """Handles the OAuth callback from LinkedIn and exchanges the code for an access token."""
    user_id = state
    target_frontend_url = FRONTEND_URL
    if state and "|" in state:
        parts = state.split("|", 1)
        user_id = parts[0]
        target_frontend_url = parts[1]

    if error:
        logger.error(f"LinkedIn OAuth Error: {error} - {error_description}")
        return RedirectResponse(f"{target_frontend_url}/app/integrations?error={error}")
        
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    backend_base = get_backend_base(request)
    redirect_uri = f"{backend_base}/api/integrations/linkedin/callback"

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            ACCESS_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if response.status_code != 200:
            logger.error(f"Failed to get LinkedIn access token: {response.text}")
            # Redirect back to frontend with error
            return RedirectResponse(f"{target_frontend_url}/app/integrations?error=linkedin_auth_failed")
            
        data = response.json()
        
        # Save the access token to the database attached to this specific user
        await save_integration_token(
            user_id=user_id, 
            platform="linkedin", 
            token_data={
                "access_token": data.get("access_token"),
                "expires_in": data.get("expires_in")
            }
        )
        
        # Redirect back to the frontend with a success flag
        return RedirectResponse(f"{target_frontend_url}/app/integrations?success=linkedin_connected")


@router.get("/google/login")
async def google_login(request: Request, user_id: str = "default_user", frontend_url: str = None):
    """Returns the Google authorization URL to redirect the user to."""
    backend_base = get_backend_base(request)
    google_redirect_uri = f"{backend_base}/api/integrations/google/callback"
    state_val = user_id
    if frontend_url:
        state_val = f"{user_id}|{frontend_url}"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": google_redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send openid profile email",
        "access_type": "offline",
        "prompt": "consent",
        "state": state_val
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return {"auth_url": url}


@router.get("/google/callback")
async def google_callback(
    request: Request,
    state: str = None,
    code: str = None,
    error: str = None,
    error_description: str = None
):
    """Handles the Google OAuth callback and exchanges the code for tokens."""
    user_id = state
    target_frontend_url = FRONTEND_URL
    if state and "|" in state:
        parts = state.split("|", 1)
        user_id = parts[0]
        target_frontend_url = parts[1]

    if error:
        logger.error(f"Google OAuth Error: {error} - {error_description}")
        return RedirectResponse(f"{target_frontend_url}/app/integrations?error={error}")
        
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")
        
    backend_base = get_backend_base(request)
    google_redirect_uri = f"{backend_base}/api/integrations/google/callback"
    # Exchange code for access & refresh tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": google_redirect_uri
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get Google tokens: {response.text}")
            return RedirectResponse(f"{target_frontend_url}/app/integrations?error=google_auth_failed")
            
        data = response.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        
        # Get user email
        profile_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if profile_res.status_code != 200:
            logger.error(f"Failed to get Google user info: {profile_res.text}")
            return RedirectResponse(f"{target_frontend_url}/app/integrations?error=google_profile_failed")
            
        profile = profile_res.json()
        email = profile.get("email")
        
        # Save token to MongoDB (preserve refresh token if Google didn't send one this time)
        import time
        from database import db
        
        final_refresh_token = refresh_token
        if db is not None:
            existing_user = await db.users.find_one({"user_id": user_id})
            if existing_user:
                existing_creds = existing_user.get("integrations", {}).get("gmail", {})
                if not final_refresh_token:
                    final_refresh_token = existing_creds.get("refresh_token")
                    
        expires_at = time.time() + expires_in
        
        await save_integration_token(
            user_id=user_id,
            platform="gmail",
            token_data={
                "email": email,
                "access_token": access_token,
                "refresh_token": final_refresh_token,
                "expires_at": expires_at,
                "auth_type": "oauth"
            }
        )
        
        return RedirectResponse(f"{target_frontend_url}/app/integrations?success=gmail_connected")


class EmailConnectRequest(BaseModel):
    provider: str
    user_id: str
    email: str
    password: str
    host: str = ""
    port: str = ""

@router.post("/email/connect")
async def connect_email(req: EmailConnectRequest):
    # In a real scenario, you would verify the credentials via smtplib here before saving
    # e.g., import smtplib; server = smtplib.SMTP(req.host, req.port); server.login(req.email, req.password)
    
    await save_integration_token(
        user_id=req.user_id,
        platform=req.provider,
        token_data={
            "email": req.email,
            "password": req.password, # Note: Should be encrypted in a production environment
            "host": req.host,
            "port": req.port
        }
    )
    return {"status": "success", "message": f"{req.provider} connected successfully"}


class TwilioConnectRequest(BaseModel):
    user_id: str
    account_sid: str
    auth_token: str
    from_number: str

@router.post("/twilio/connect")
async def connect_twilio(req: TwilioConnectRequest):
    """Saves Twilio credentials to the user's integrations."""
    await save_integration_token(
        user_id=req.user_id,
        platform="twilio",
        token_data={
            "account_sid": req.account_sid,
            "auth_token": req.auth_token,
            "from_number": req.from_number
        }
    )
    return {"status": "success", "message": "Twilio connected successfully"}



async def _process_incoming_emails(emails: list, user_id: str):
    from database import db
    from services.sentiment import classify_email_sentiment

    if db is None or not emails:
        return emails

    for email in emails:
        sender_email = email.get("sender_email")
        if not sender_email:
            continue

        body_text = email.get("body", "")
        in_reply_to = email.get("in_reply_to", "")   # extracted from email headers

        lead = None
        matched_email_record = None

        # --- Primary Match: via Message-ID threading header ---
        # If the inbound email has an In-Reply-To header, look for the original outbound record
        if in_reply_to:
            matched_email_record = await db.emails.find_one({"user_id": user_id, "message_id": in_reply_to})
            if matched_email_record:
                lead_id = matched_email_record.get("lead_id")
                if lead_id:
                    from bson import ObjectId
                    try:
                        lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
                    except Exception:
                        lead = None

        # --- Fallback Match: by sender email address ---
        if not lead:
            lead = await db.leads.find_one({"email": {"$regex": f"^{sender_email}$", "$options": "i"}})

        if not lead:
            continue

        # --- AI Sentiment Classification (UNCHANGED) ---
        reply_status = lead.get("reply_status")
        if not reply_status:
            logger.info(f"Classifying email from known lead: {sender_email}")
            reply_status = await classify_email_sentiment(body_text)

        # --- Update leads collection: sentiment status + raw reply body ---
        await db.leads.update_one(
            {"_id": lead["_id"]},
            {"$set": {
                "reply_status": reply_status,
                "last_reply_body": body_text,
            }}
        )

        # --- Update emails collection: write reply_body into the matched outbound record ---
        if matched_email_record:
            await db.emails.update_one(
                {"_id": matched_email_record["_id"]},
                {"$set": {
                    "reply_body": body_text,
                    "reply_status": reply_status,
                    "status": "replied",
                }}
            )
            logger.info(f"Reply matched to campaign {matched_email_record.get('campaign_id')} for lead {sender_email}")
        else:
            # No specific campaign email record found — still log against lead's email address
            logger.info(f"Reply from {sender_email} matched by sender address (no Message-ID match). Sentiment: {reply_status}")

        # Attach status to email object for live Inbox frontend display
        email["lead_status"] = reply_status

    return emails

@router.get("/email/messages")
async def get_email_messages(folder: str = "inbox", current_user: dict = Depends(get_current_user)):
    """Fetch real-time emails for the logged-in user if they have an email integration."""
    integrations = current_user.get("integrations", {})
    
    email_creds = None
    email_provider = None
    for provider in ["gmail", "outlook", "smtp", "imap"]:
        if provider in integrations:
            email_creds = integrations[provider]
            email_provider = provider
            break
            
    if not email_creds or not email_creds.get("email"):
        return {
            "success": True,
            "connected": False,
            "emails": [],
            "message": "No email account connected. Please connect your email in Integrations."
        }
        
    # Handle Google Workspace / Gmail OAuth connection
    if email_creds.get("auth_type") == "oauth" and email_provider == "gmail":
        try:
            import time
            from services.email_fetcher import refresh_gmail_token, fetch_emails_via_gmail_api
            from database import db
            
            access_token = email_creds.get("access_token")
            expires_at = email_creds.get("expires_at", 0)
            refresh_token = email_creds.get("refresh_token")
            
            # If expired, refresh token
            if time.time() >= expires_at - 60:
                if not refresh_token:
                    logger.warning("Google Workspace token expired, and refresh_token is missing.")
                else:
                    logger.info("Google Workspace access token expired. Refreshing token...")
                    refreshed = await refresh_gmail_token(refresh_token)
                    access_token = refreshed["access_token"]
                    expires_at = time.time() + refreshed["expires_in"]
                    
                    if db is not None:
                        await db.users.update_one(
                            {"user_id": current_user["user_id"]},
                            {"$set": {
                                "integrations.gmail.access_token": access_token,
                                "integrations.gmail.expires_at": expires_at
                            }}
                        )
                        logger.info("Successfully saved refreshed Google Workspace OAuth credentials to MongoDB.")
            
            emails = await fetch_emails_via_gmail_api(access_token, folder=folder)
            if folder == "inbox":
                emails = await _process_incoming_emails(emails, current_user["user_id"])
                
            return {
                "success": True,
                "connected": True,
                "emails": emails
            }
        except Exception as e:
            logger.error(f"Error fetching Gmail Workspace messages via API: {e}")
            return {
                "success": False,
                "connected": True,
                "emails": [],
                "error": str(e),
                "message": "Failed to sync with Gmail Workspace. The authorization may have been revoked or expired. Please reconnect."
            }
            
    # Fallback to standard IMAP
    try:
        emails = await fetch_real_emails(
            email_address=email_creds.get("email"),
            password=email_creds.get("password"),
            host=email_creds.get("host", ""),
            folder=folder
        )
        if folder == "inbox":
            emails = await _process_incoming_emails(emails, current_user["user_id"])
            
        return {
            "success": True,
            "connected": True,
            "emails": emails
        }
    except Exception as e:
        logger.error(f"Error fetching IMAP integration emails for {email_creds.get('email')}: {e}")
        return {
            "success": False,
            "connected": True,
            "emails": [],
            "error": str(e),
            "message": f"Failed to fetch emails for {email_creds.get('email')}. Verification or credentials error."
        }


class DisconnectRequest(BaseModel):
    provider: str
    user_id: str

@router.post("/disconnect")
async def disconnect_integration(req: DisconnectRequest):
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    try:
        await db.users.update_one(
            {"user_id": req.user_id},
            {"$unset": {f"integrations.{req.provider}": ""}}
        )
        return {"status": "success", "message": f"Successfully disconnected {req.provider}"}
    except Exception as e:
        logger.error(f"Failed to disconnect {req.provider}: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect integration")
