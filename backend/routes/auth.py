from fastapi import APIRouter
from fastapi import Depends
from fastapi.security import HTTPBearer
from services import auth_service, user_service
from models.auth import LoginRequest, SignUpRequest
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

