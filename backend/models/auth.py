from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SignUpRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    redirect_to: str


class ResetPasswordRequest(BaseModel):
    access_token: str
    refresh_token: str
    password: str = Field(..., min_length=6)
