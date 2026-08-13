from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies.dependencies import require_admin
from models.curriculum import (
    CurriculumCreate,
    CurriculumListResponse,
    CurriculumResponse,
    CurriculumUpdate,
)
from services import curriculum_service

router = APIRouter(
    prefix="/curricula",
    tags=["Curriculum"],
)


@router.get("/", response_model=CurriculumListResponse)
def list_curricula(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _admin=Depends(require_admin),
):
    return curriculum_service.list_curricula(
        search=search,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.post("/", response_model=CurriculumResponse, status_code=201)
def create_curriculum(
    payload: CurriculumCreate,
    _admin=Depends(require_admin),
):
    return curriculum_service.create_curriculum(payload)


@router.get("/{curriculum_id}", response_model=CurriculumResponse)
def get_curriculum(
    curriculum_id: UUID,
    _admin=Depends(require_admin),
):
    return curriculum_service.get_curriculum(curriculum_id)


@router.patch("/{curriculum_id}", response_model=CurriculumResponse)
def update_curriculum(
    curriculum_id: UUID,
    payload: CurriculumUpdate,
    _admin=Depends(require_admin),
):
    return curriculum_service.update_curriculum(curriculum_id, payload)
