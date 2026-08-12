from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from database.supabase import admin_supabase, user_supabase

security = HTTPBearer()

def get_current_user(credentials=Depends(security)) -> dict:
    token = credentials.credentials

    try:
        auth_response = admin_supabase.auth.get_user(token)

        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

    except Exception as e:
        print("Auth error:", e)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    auth_user_id = auth_response.user.id

    # --- Try with user_supabase first ---
    try:
        response = (
            user_supabase
            .table("Users")
            .select("user_id")
            .eq("auth_user_id", auth_user_id)
            .execute()
        )

        if response.data:
            return response.data[0]

    except Exception as e:
        print("User client failed (possibly RLS):", e)

    # --- Fallback to admin_supabase ---
    print("Falling back to admin_supabase")

    response = (
        admin_supabase
        .table("Users")
        .select("user_id")
        .eq("auth_user_id", auth_user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    return response.data[0]