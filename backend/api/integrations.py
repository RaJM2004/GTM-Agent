import logging
import urllib.parse
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
import httpx
from pydantic import BaseModel

import socket
import smtplib
import imaplib
from config import settings
from database import save_integration_token
from services.auth import get_current_user, get_token_from_cookie_or_header
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
    base_url = ""
    if getattr(settings, "BACKEND_URL", None):
        base_url = settings.BACKEND_URL
    elif request:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host", request.url.netloc)
        if host:
            base_url = f"{proto}://{host}"
        else:
            base_url = str(request.base_url)
    else:
        IS_PROD = not settings.DEBUG
        base_url = "https://gtm-backend1-hmgygeahadebdyc7.canadacentral-01.azurewebsites.net" if IS_PROD else "http://localhost:8000"

    # Clean up base_url to ensure it doesn't have triple slashes or trailing slashes
    base_url = base_url.rstrip("/")
    if "://" in base_url:
        parts = base_url.split("://", 1)
        scheme = parts[0]
        rest = parts[1].lstrip("/")
        base_url = f"{scheme}://{rest}"
    return base_url

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


async def get_optional_current_user(request: Request) -> dict:
    try:
        token = get_token_from_cookie_or_header(request)
        return await get_current_user(token)
    except Exception:
        return {}


def verify_email_credentials(email: str, password: str, host: str = "", port: str = "", provider: str = "smtp") -> tuple:
    """Tests if SMTP or IMAP connection and credentials are valid before saving or during health checks."""
    if not email or not password:
        return False, "Email address and password/app password are required."

    smtp_host = host.strip() if host else ""
    smtp_port = int(port) if port and str(port).strip().isdigit() else 587

    if not smtp_host:
        if provider == "gmail" or "gmail.com" in email.lower():
            smtp_host = "smtp.gmail.com"
            smtp_port = 587
        elif provider == "outlook" or any(d in email.lower() for d in ["outlook.com", "hotmail.com", "office365.com"]):
            smtp_host = "smtp.office365.com"
            smtp_port = 587
        else:
            smtp_host = f"smtp.{email.split('@')[-1]}"
            smtp_port = 587

    # 1. Try SMTP authentication
    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=8)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=8)
            server.ehlo()
            server.starttls()
            server.ehlo()
        server.login(email, password)
        server.quit()
        return True, f"Successfully verified SMTP connection ({smtp_host}:{smtp_port})."
    except smtplib.SMTPAuthenticationError as auth_err:
        logger.warning(f"SMTP authentication failed for {email}: {auth_err}")
        err_detail = "Authentication failed. Incorrect email or password."
        if "gmail.com" in email.lower():
            err_detail += " Note: Gmail requires a 16-character Google App Password (not your normal Google account password), or use the 'Google Workspace / Gmail' OAuth button."
        elif any(d in email.lower() for d in ["outlook.com", "hotmail.com", "office365.com"]):
            err_detail += " Note: For Outlook / Office 365, ensure SMTP AUTH or an App Password is used."
        return False, err_detail
    except Exception as e:
        logger.warning(f"SMTP connection error for {email} on {smtp_host}:{smtp_port}: {e}")
        # 2. Fallback to IMAP verification in case outbound SMTP is restricted by host/firewall
        try:
            imap_host = "imap.gmail.com" if "gmail.com" in email.lower() else ("outlook.office365.com" if "outlook.com" in email.lower() else f"imap.{email.split('@')[-1]}")
            mail = imaplib.IMAP4_SSL(imap_host, 993)
            mail.socket().settimeout(8)
            mail.login(email, password)
            mail.logout()
            return True, f"Successfully verified credentials via IMAP ({imap_host}:993)."
        except Exception:
            return False, f"Could not connect to {smtp_host}:{smtp_port} ({str(e)}). Please verify host, port, and credentials."


class EmailConnectRequest(BaseModel):
    provider: str
    user_id: str = None
    email: str
    password: str
    host: str = ""
    port: str = ""
    skip_verify: bool = False

@router.post("/email/connect")
async def connect_email(req: EmailConnectRequest, request: Request):
    user_id = req.user_id
    try:
        user = await get_optional_current_user(request)
        if user and user.get("user_id"):
            user_id = user["user_id"]
    except Exception:
        pass
        
    if not user_id:
        user_id = "default_user"

    # Verify credentials before storing so that invalid accounts do not display as connected
    if not req.skip_verify:
        is_valid, msg = verify_email_credentials(
            email=req.email,
            password=req.password,
            host=req.host,
            port=req.port,
            provider=req.provider
        )
        if not is_valid:
            logger.warning(f"Email connection rejected for {req.email}: {msg}")
            raise HTTPException(status_code=400, detail=msg)

    await save_integration_token(
        user_id=user_id,
        platform=req.provider,
        token_data={
            "email": req.email,
            "password": req.password,
            "host": req.host,
            "port": req.port,
            "verified": True,
            "status": "connected"
        }
    )
    return {
        "status": "success", 
        "success": True, 
        "message": f"{req.provider.upper()} verified and connected successfully"
    }


class TwilioConnectRequest(BaseModel):
    user_id: str = None
    account_sid: str
    auth_token: str
    from_number: str

@router.post("/twilio/connect")
async def connect_twilio(req: TwilioConnectRequest, request: Request):
    """Saves Twilio credentials to the user's integrations after optional ID verification."""
    user_id = req.user_id
    try:
        user = await get_optional_current_user(request)
        if user and user.get("user_id"):
            user_id = user["user_id"]
    except Exception:
        pass

    if not user_id:
        user_id = "default_user"

    await save_integration_token(
        user_id=user_id,
        platform="twilio",
        token_data={
            "account_sid": req.account_sid,
            "auth_token": req.auth_token,
            "from_number": req.from_number,
            "status": "connected"
        }
    )
    return {"status": "success", "success": True, "message": "Twilio connected successfully"}



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
                "connected": False,
                "auth_error": True,
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
            "connected": False,
            "auth_error": True,
            "emails": [],
            "error": str(e),
            "message": f"Failed to fetch emails for {email_creds.get('email')}. Verification or credentials error."
        }


class DisconnectRequest(BaseModel):
    provider: str
    user_id: str = None

@router.post("/disconnect")
async def disconnect_integration(req: DisconnectRequest, request: Request):
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    user_id = req.user_id
    try:
        user = await get_optional_current_user(request)
        if user and user.get("user_id"):
            user_id = user["user_id"]
    except Exception:
        pass

    if not user_id:
        user_id = "default_user"

    try:
        if req.provider == "whatsapp":
            session_id = f"user_{user_id}"
            try:
                from services.whatsapp import openwa_service
                await openwa_service._make_request("DELETE", f"/instance/logout/{session_id}")
                await openwa_service._make_request("DELETE", f"/instance/delete/{session_id}")
            except Exception as ex:
                logger.warning(f"Could not logout WhatsApp session on disconnect: {ex}")

        await db.users.update_one(
            {"user_id": user_id},
            {"$unset": {f"integrations.{req.provider}": ""}}
        )
        if req.user_id and req.user_id != user_id:
            await db.users.update_one(
                {"user_id": req.user_id},
                {"$unset": {f"integrations.{req.provider}": ""}}
            )
        return {
            "status": "success", 
            "success": True, 
            "message": f"Successfully disconnected {req.provider}"
        }
    except Exception as e:
        logger.error(f"Failed to disconnect {req.provider}: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect integration")


class VerifyIntegrationRequest(BaseModel):
    provider: str
    user_id: str = None

@router.post("/verify")
async def verify_integration(req: VerifyIntegrationRequest, request: Request):
    """Actively tests whether the stored credentials/tokens for a provider are valid and live."""
    from database import db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")
        
    user_id = req.user_id
    try:
        user = await get_optional_current_user(request)
        if user and user.get("user_id"):
            user_id = user["user_id"]
    except Exception:
        pass

    user_doc = None
    if user_id:
        user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc and req.user_id:
        user_doc = await db.users.find_one({"user_id": req.user_id})

    if not user_doc:
        return {"success": False, "status": "error", "message": "User record not found in database."}

    integrations = user_doc.get("integrations", {})
    provider = req.provider.lower()

    if provider not in integrations:
        return {"success": False, "status": "not_connected", "message": f"{provider.upper()} is not connected."}

    creds = integrations[provider]

    if provider == "gmail":
        if creds.get("auth_type") == "oauth":
            import time
            from services.email_fetcher import refresh_gmail_token
            
            access_token = creds.get("access_token")
            expires_at = creds.get("expires_at", 0)
            refresh_token = creds.get("refresh_token")
            
            if time.time() >= expires_at - 60:
                if not refresh_token:
                    return {
                        "success": False,
                        "status": "error",
                        "message": "Gmail access token expired and no refresh token is stored. Please reconnect."
                    }
                try:
                    refreshed = await refresh_gmail_token(refresh_token)
                    access_token = refreshed["access_token"]
                    expires_at = time.time() + refreshed["expires_in"]
                    await db.users.update_one(
                        {"user_id": user_doc["user_id"]},
                        {"$set": {
                            "integrations.gmail.access_token": access_token,
                            "integrations.gmail.expires_at": expires_at
                        }}
                    )
                except Exception as e:
                    return {
                        "success": False,
                        "status": "error",
                        "message": f"Gmail OAuth token refresh failed ({str(e)}). Authorization may be revoked. Please reconnect."
                    }

            try:
                async with httpx.AsyncClient() as client:
                    profile_res = await client.get(
                        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=8.0
                    )
                    if profile_res.status_code == 200:
                        email_addr = profile_res.json().get("emailAddress", creds.get("email", "your account"))
                        return {
                            "success": True,
                            "status": "active",
                            "message": f"Gmail OAuth verified & active for {email_addr}."
                        }
                    else:
                        return {
                            "success": False,
                            "status": "error",
                            "message": f"Gmail API returned HTTP {profile_res.status_code}. Authorization may be revoked. Please reconnect."
                        }
            except Exception as e:
                return {"success": False, "status": "error", "message": f"Gmail connection check failed: {str(e)}"}
        else:
            is_valid, msg = verify_email_credentials(
                email=creds.get("email", ""),
                password=creds.get("password", ""),
                host=creds.get("host", "smtp.gmail.com"),
                port=creds.get("port", "587"),
                provider="gmail"
            )
            return {"success": is_valid, "status": "active" if is_valid else "error", "message": msg}

    elif provider in ["outlook", "smtp"]:
        is_valid, msg = verify_email_credentials(
            email=creds.get("email", ""),
            password=creds.get("password", ""),
            host=creds.get("host", ""),
            port=creds.get("port", ""),
            provider=provider
        )
        return {"success": is_valid, "status": "active" if is_valid else "error", "message": msg}

    elif provider == "twilio":
        account_sid = creds.get("account_sid")
        auth_token = creds.get("auth_token")
        if not account_sid or not auth_token:
            return {"success": False, "status": "error", "message": "Twilio Account SID or Auth Token missing"}
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                    auth=(account_sid, auth_token),
                    timeout=8.0
                )
                if res.status_code == 200:
                    return {"success": True, "status": "active", "message": f"Twilio connection verified and active ({creds.get('from_number', '')})."}
                else:
                    return {"success": False, "status": "error", "message": "Twilio authentication failed. Check SID and Auth Token."}
        except Exception as e:
            return {"success": False, "status": "error", "message": f"Twilio check error: {str(e)}"}

    elif provider == "linkedin":
        access_token = creds.get("access_token")
        if not access_token:
            return {"success": False, "status": "error", "message": "LinkedIn access token missing"}
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://api.linkedin.com/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=8.0
                )
                if res.status_code == 200:
                    return {"success": True, "status": "active", "message": "LinkedIn connection verified and active."}
                else:
                    return {"success": False, "status": "error", "message": "LinkedIn access token expired or revoked. Please reconnect."}
        except Exception as e:
            return {"success": False, "status": "error", "message": f"LinkedIn check failed: {str(e)}"}

    elif provider == "whatsapp":
        session_id = creds.get("session_id") or f"user_{user_id}"
        try:
            from services.whatsapp import openwa_service
            status = await openwa_service.get_connection_status(session_id)
            if status == "CONNECTED":
                return {"success": True, "status": "active", "message": "WhatsApp connection verified and active."}
            else:
                return {"success": False, "status": "disconnected", "message": f"WhatsApp instance is {status.lower()}."}
        except Exception as e:
            return {"success": False, "status": "error", "message": f"WhatsApp check failed: {str(e)}"}

    return {"success": True, "status": "active", "message": f"{provider} is configured."}
