from collections import Counter
from uuid import UUID

from fastapi import HTTPException

from database.supabase import admin_supabase
from models.curriculum import (
    CurriculumCreate,
    CurriculumListItem,
    CurriculumListResponse,
    CurriculumResponse,
    CurriculumUpdate,
)

CURRICULUM_FIELDS = (
    "curriculum_id, name, description, duration_weeks, "
    "cover_image_url, status, created_at, updated_at"
)


def _active_enrollment_counts() -> Counter:
    response = (
        admin_supabase
        .table("enrollments")
        .select("curriculum_id")
        .eq("status", "active")
        .execute()
    )
    return Counter(row["curriculum_id"] for row in response.data)


def list_curricula(
    search: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CurriculumListResponse:
    query = admin_supabase.table("curricula").select(CURRICULUM_FIELDS, count="exact")

    if search:
        query = query.ilike("name", f"%{search.strip()}%")
    if status:
        query = query.eq("status", status)

    response = (
        query
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    counts = _active_enrollment_counts()
    items = [
        CurriculumListItem(**{**row, "student_count": counts.get(row["curriculum_id"], 0)})
        for row in response.data
    ]
    total = response.count if response.count is not None else len(items)

    return CurriculumListResponse(items=items, total=total)


def get_curriculum(curriculum_id: UUID) -> CurriculumResponse:
    response = (
        admin_supabase
        .table("curricula")
        .select(CURRICULUM_FIELDS)
        .eq("curriculum_id", str(curriculum_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Curriculum not found")

    return CurriculumResponse(**response.data[0])


def create_curriculum(payload: CurriculumCreate) -> CurriculumResponse:
    response = (
        admin_supabase
        .table("curricula")
        .insert(payload.model_dump())
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create curriculum")

    return CurriculumResponse(**response.data[0])


def update_curriculum(
    curriculum_id: UUID,
    payload: CurriculumUpdate,
) -> CurriculumResponse:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return get_curriculum(curriculum_id)

    response = (
        admin_supabase
        .table("curricula")
        .update(updates)
        .eq("curriculum_id", str(curriculum_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Curriculum not found")

    return CurriculumResponse(**response.data[0])
