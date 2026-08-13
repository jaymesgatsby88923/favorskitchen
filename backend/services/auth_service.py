from fastapi import HTTPException
from database.supabase import admin_supabase
from models.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignUpRequest,
)


def signup(signup_request: SignUpRequest):
    result = admin_supabase.auth.sign_up({
        "email": signup_request.email,
        "password": signup_request.password,
    })

    if not result.user:
        raise HTTPException(status_code=400, detail="Signup failed")

    user_id = result.user.id

    response = (
        admin_supabase.table("users")
        .insert({
            "user_id": user_id,
            "first_name": signup_request.first_name,
            "last_name": signup_request.last_name,
            "email": signup_request.email,
            "phone": signup_request.phone,
            "role": "student",
        })
        .execute()
    )

    return {"user": response.data[0]}


def login(login_request: LoginRequest):
    result = admin_supabase.auth.sign_in_with_password({
        "email": login_request.email,
        "password": login_request.password,
    })

    if result.session is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    return {
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
    }


def forgot_password(request: ForgotPasswordRequest):
    try:
        admin_supabase.auth.reset_password_for_email(
            request.email,
            {"redirect_to": request.redirect_to},
        )
    except Exception as e:
        print("Forgot password error:", e)
        raise HTTPException(
            status_code=400,
            detail="Unable to send reset email"
        )

    return {"message": "If an account exists, a reset link has been sent."}


def reset_password(request: ResetPasswordRequest):
    try:
        admin_supabase.auth.set_session(
            request.access_token,
            request.refresh_token,
        )
        admin_supabase.auth.update_user({"password": request.password})
    except Exception as e:
        print("Reset password error:", e)
        raise HTTPException(
            status_code=400,
            detail="Unable to reset password"
        )

    return {"message": "Password updated successfully"}
