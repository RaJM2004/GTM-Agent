"""
Authentication Router - FastAPI endpoints for registration, login, logout, password reset, and Google Sign-in.
"""

import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from typing import List

from schemas.auth import (
    UserRegister,
    UserLogin,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    TokenResponse
)
from services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_current_admin,
    verify_google_token
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

# Helpers to format user response
def format_user_doc(user: dict) -> dict:
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "company": user.get("company"),
        "role": user.get("role", "user"),
        "auth_provider": user.get("auth_provider", "local"),
        "integrations": user.get("integrations", {})
    }

# Helpers to set cookie
def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    # Set access token cookie (15 mins)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=15 * 60,
        expires=15 * 60,
        samesite="lax",
        secure=False # Set to True in production with HTTPS
    )
    # Set refresh token cookie (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        expires=7 * 24 * 60 * 60,
        samesite="lax",
        secure=False
    )

# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, response: Response):
    """
    Register a new user.
    Validates email uniqueness and hashes password.
    Returns 201 on success, 409 if email is already taken.
    """
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    email_lower = user_data.email.lower().strip()
    
    # Check email uniqueness
    existing_user = await db.users.find_one({"email": email_lower})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered"
        )
        
    # Create new user record
    user_id = str(uuid.uuid4())
    pw_hash = hash_password(user_data.password)
    
    new_user = {
        "user_id": user_id,
        "email": email_lower,
        "password_hash": pw_hash,
        "name": user_data.name,
        "company": user_data.company,
        "role": "user", # default role
        "auth_provider": "local",
        "created_at": datetime.now(timezone.utc)
    }
    
    try:
        await db.users.insert_one(new_user)
        logger.info(f"Registered new user {email_lower} with ID {user_id}")
    except Exception as e:
        logger.error(f"Failed to insert user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user in database"
        )
        
    # Automatically log in the user on registration
    payload = {"user_id": user_id, "role": "user"}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    
    set_auth_cookies(response, access_token, refresh_token)
    
    return TokenResponse(
        success=True,
        message="Registration successful",
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_doc(new_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    """
    Log in an existing user.
    Verifies credentials and sets HTTP-only cookies.
    """
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    email_lower = credentials.email.lower().strip()
    
    user = await db.users.find_one({"email": email_lower})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if user.get("auth_provider") != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This account is registered via {user.get('auth_provider')}. Please use social sign-in."
        )
        
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    user_id = user["user_id"]
    role = user.get("role", "user")
    
    # Generate tokens
    payload = {"user_id": user_id, "role": role}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    
    set_auth_cookies(response, access_token, refresh_token)
    
    return TokenResponse(
        success=True,
        message="Login successful",
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_doc(user)
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(google_req: GoogleLoginRequest, response: Response):
    """
    Log in or register a user using a Google Identity Services credential (ID Token).
    """
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    # Verify Google token
    google_profile = await verify_google_token(google_req.credential)
    email = google_profile["email"].lower().strip()
    name = google_profile["name"]
    google_sub = google_profile["sub"]
    
    # Check if user already exists
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Register new Google user
        user_id = str(uuid.uuid4())
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": None, # Google users don't have password hashes
            "name": name,
            "company": "Google User Company",
            "role": "user", # default role
            "auth_provider": "google",
            "google_sub": google_sub,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
        logger.info(f"Registered new Google user {email} with ID {user_id}")
    else:
        # If user existed via local provider but email matches, we can optionally link it or log in.
        # Let's verify and update provider info if not set.
        if user.get("auth_provider") != "google":
            # Update to link Google sign-in
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"auth_provider": "google", "google_sub": google_sub}}
            )
            user["auth_provider"] = "google"
            user["google_sub"] = google_sub
            logger.info(f"Linked existing user {email} to Google Sign-In")
            
    user_id = user["user_id"]
    role = user.get("role", "user")
    
    # Generate tokens
    payload = {"user_id": user_id, "role": role}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    
    set_auth_cookies(response, access_token, refresh_token)
    
    return TokenResponse(
        success=True,
        message="Google login successful",
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_doc(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response):
    """
    Refresh the access token using the HTTP-only refresh token cookie.
    """
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing"
        )
        
    try:
        # Decode and validate refresh token
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
            
        user_id = payload.get("user_id")
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
            
        # Generate new access token
        new_payload = {"user_id": user_id, "role": user.get("role", "user")}
        new_access_token = create_access_token(new_payload)
        
        # Set access token cookie
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            max_age=15 * 60,
            expires=15 * 60,
            samesite="lax",
            secure=False
        )
        
        return TokenResponse(
            success=True,
            message="Token refreshed successfully",
            access_token=new_access_token,
            refresh_token=refresh_token, # keep the existing one or return it
            user=format_user_doc(user)
        )
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )


@router.post("/logout")
async def logout(response: Response):
    """
    Log out the user by deleting the access and refresh token cookies.
    """
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"success": True, "message": "Successfully logged out"}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Request a password reset link.
    Generates a token and logs the reset link for local development.
    """
    from database import db
    from config import settings
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    email_lower = req.email.lower().strip()
    user = await db.users.find_one({"email": email_lower})
    
    # Check user existence. Return success anyway to avoid user enumeration.
    if not user:
        logger.warning(f"Forgot password requested for non-existent email: {email_lower}")
        return {
            "success": True,
            "message": "If the email matches an account, a password reset link has been generated."
        }
        
    if user.get("auth_provider") != "local":
        return {
            "success": False,
            "message": f"This account is authenticated via Google. Password reset is not supported."
        }
        
    # Generate token
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1) # naive datetime for mongo
    
    # Save token to db
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": expiry
        }}
    )
    
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Log the email reset link (Required for dev/testing)
    logger.info(f"\n======================================================\n"
                f"PASSWORD RESET REQUESTED FOR {email_lower}\n"
                f"Reset Link: {reset_link}\n"
                f"Token: {reset_token}\n"
                f"======================================================\n")
                
    response_data = {
        "success": True,
        "message": "Password reset link has been logged/sent."
    }
    
    # If in debug mode, return the token in the API response to ease testing
    if settings.DEBUG:
        response_data["reset_token"] = reset_token
        response_data["reset_link"] = reset_link
        
    return response_data


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Reset password using a valid reset token.
    Updates the password hash and invalidates the token.
    """
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    # Find user with matching token
    user = await db.users.find_one({"reset_token": req.token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    # Check expiry
    expiry = user.get("reset_token_expiry")
    if not expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    # Make expiry datetime naive to compare with naive utcnow
    if expiry.replace(tzinfo=None) < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired"
        )
        
    # Update password and clear token
    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {"password_hash": new_hash},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )
    
    logger.info(f"Successfully reset password for user {user.get('email')}")
    
    return {"success": True, "message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Fetch the currently logged-in user profile details.
    """
    return format_user_doc(current_user)


@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    """
    List users.
    Admin users can view all users in the system.
    Regular users will receive a 403 Forbidden.
    """
    from database import db
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not available"
        )
        
    role = current_user.get("role", "user")
    
    if role == "admin":
        cursor = db.users.find({})
        users_list = await cursor.to_list(length=100)
        return [format_user_doc(u) for u in users_list]
    else:
        # Non-admin trying to view all users: throw 403 Forbidden as per role-check constraint
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin credentials required to list all users"
        )
