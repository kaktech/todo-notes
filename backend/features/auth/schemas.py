"""
Pydantic schemas for auth requests and responses.
"""
from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    """Data needed to create a new account."""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    """Data needed to log in."""
    username: str
    password: str


class AuthResponse(BaseModel):
    """Response after successful signup/login."""
    token: str
    user_id: int
    username: str
