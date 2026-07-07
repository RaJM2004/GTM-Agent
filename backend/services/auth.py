"""
Authentication services for GTM OS backend.
Provides password hashing, JWT generation/validation, Google OAuth token verification, and FastAPI dependencies.
"""

import jwt
import bcrypt
import logging
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import Request, Depends, HTTPException, status
from config import settings

logger = logging.getLogger(__name__)

# Security exception configurations
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a hashed password against a plain password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False

# ── JWT Operations ────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """Create a short-lived access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises PyJWT exceptions if expired or invalid."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

# ── FastAPI Dependencies ──────────────────────────────────────────────────────

def get_token_from_cookie_or_header(request: Request) -> str:
    """Extract JWT token from cookies or Authorization header."""
    # Check Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
        
    # Fallback to cookies
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Missing token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_user(token: str = Depends(get_token_from_cookie_or_header)) -> dict:
    """FastAPI dependency to retrieve the current logged-in user from MongoDB."""
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
        
    user_id = payload.get("user_id")
    if not user_id:
        raise credentials_exception
        
    # Fetch user from database
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
        
    return user

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency to verify that the logged-in user is an admin."""
    role = current_user.get("role", "user")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privilege required"
        )
    return current_user

# ── Google ID Token Verification ──────────────────────────────────────────────

async def verify_google_token(credential: str) -> dict:
    """
    Validate a Google GSI ID Token.
    Returns standard profile dict: {email, name, picture, sub}.
    """
    try:
        # We can use Google's tokeninfo endpoint for token verification.
        # This prevents having to install the heavy `google-auth` library.
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential}
            )
            
        if response.status_code != 200:
            logger.error(f"Google Token Verification failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google credential"
            )
            
        payload = response.json()
        
        # Verify client ID if it's set in backend settings
        client_id = settings.GOOGLE_CLIENT_ID
        if client_id and payload.get("aud") != client_id:
            logger.error(f"Audience mismatch: expected {client_id}, got {payload.get('aud')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google credential client ID mismatch"
            )
            
        return {
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture"),
            "sub": payload.get("sub") # Google unique user ID
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google Token validation exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google Authentication failed: {str(e)}"
        )
