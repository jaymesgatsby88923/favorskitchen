from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

CurriculumStatus = Literal["draft", "published"]


class CurriculumCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    duration_weeks: Optional[int] = Field(None, ge=1)
    cover_image_url: Optional[str] = None
    status: CurriculumStatus = "draft"


class CurriculumUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    duration_weeks: Optional[int] = Field(None, ge=1)
    cover_image_url: Optional[str] = None
    status: Optional[CurriculumStatus] = None


class CurriculumResponse(BaseModel):
    curriculum_id: UUID
    name: str
    description: Optional[str] = None
    duration_weeks: Optional[int] = None
    cover_image_url: Optional[str] = None
    status: CurriculumStatus
    created_at: datetime
    updated_at: datetime


class CurriculumListItem(CurriculumResponse):
    student_count: int = 0


class CurriculumListResponse(BaseModel):
    items: list[CurriculumListItem]
    total: int
