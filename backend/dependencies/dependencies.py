from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from database.supabase import admin_supabase

security = HTTPBearer()

USER_PROFILE_FIELDS = "user_id, first_name, last_name, email, phone, role"


def get_current_user(credentials=Depends(security)) -> dict:
    token = credentials.credentials

    try:
        auth_response = admin_supabase.auth.get_user(token)

        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

    except HTTPException:
        raise
    except Exception as e:
        print("Auth error:", e)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = auth_response.user.id

    response = (
        admin_supabase
        .table("users")
        .select(USER_PROFILE_FIELDS)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    return response.data[0]


def require_admin(current_user=Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
