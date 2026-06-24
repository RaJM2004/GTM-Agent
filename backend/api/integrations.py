import logging
import urllib.parse
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
from pydantic import BaseModel

from config import settings
from database import save_integration_token

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
# Note: In production, redirect_uri must match exactly what's configured in LinkedIn Dev Portal
REDIRECT_URI = "http://localhost:8000/api/integrations/linkedin/callback"

@router.get("/linkedin/login")
async def linkedin_login(user_id: str = "default_user"):
    """Returns the LinkedIn authorization URL to redirect the user to."""
    # Scope for sharing on LinkedIn: w_member_social, r_liteprofile or r_basicprofile
    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "state": user_id,  # Pass the user_id through the OAuth flow!
        "scope": "openid profile email w_member_social"
    }
    url = f"{AUTHORIZATION_URL}?{urllib.parse.urlencode(params)}"
    return {"auth_url": url}

@router.get("/linkedin/callback")
async def linkedin_callback(
    state: str,
    code: str = None, 
    error: str = None, 
    error_description: str = None
):
    """Handles the OAuth callback from LinkedIn and exchanges the code for an access token."""
    if error:
        logger.error(f"LinkedIn OAuth Error: {error} - {error_description}")
        return RedirectResponse(f"{FRONTEND_URL}/app/integrations?error={error}")
        
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            ACCESS_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if response.status_code != 200:
            logger.error(f"Failed to get LinkedIn access token: {response.text}")
            # Redirect back to frontend with error
            return RedirectResponse(f"{FRONTEND_URL}/app/integrations?error=linkedin_auth_failed")
            
        data = response.json()
        
        # The state variable contains our user_id!
        user_id = state
        
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
        return RedirectResponse(f"{FRONTEND_URL}/app/integrations?success=linkedin_connected")
