"""
Pydantic schemas for User Authentication and Role Management.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List


class UserRegister(BaseModel):
    """Schema for standard user registration."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")
    name: str = Field(..., description="Full name of the user")
    company: str = Field(..., description="Company name")


class UserLogin(BaseModel):
    """Schema for standard email/password login."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class GoogleLoginRequest(BaseModel):
    """Schema for Google Sign-In login/registration."""
    credential: str = Field(..., description="Google Identity Services ID Token credential")


class ForgotPasswordRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr = Field(..., description="Email address to send reset link to")


class ResetPasswordRequest(BaseModel):
    """Schema for password resetting using reset token."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=6, description="New password (min 6 characters)")


class UserResponse(BaseModel):
    """Schema for returning user details."""
    user_id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User email address")
    name: str = Field(..., description="Full name of the user")
    company: str = Field(..., description="Company name")
    role: str = Field(..., description="User role ('user' or 'admin')")
    auth_provider: str = Field(..., description="Authentication provider ('local' or 'google')")
    integrations: Optional[dict] = Field(default={}, description="Connected integrations for this user")


class TokenResponse(BaseModel):
    """Schema for token endpoint responses."""
    success: bool = True
    message: str = ""
    user: UserResponse
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
