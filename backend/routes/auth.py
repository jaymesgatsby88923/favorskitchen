from fastapi import APIRouter, Depends
from services import auth_service
from models.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignUpRequest,
)
from dependencies.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
def login(login_request: LoginRequest):
    return auth_service.login(login_request)


@router.post("/signup")
def signup(signup_request: SignUpRequest):
    return auth_service.signup(signup_request)


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    return auth_service.forgot_password(request)


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    return auth_service.reset_password(request)


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return current_user
