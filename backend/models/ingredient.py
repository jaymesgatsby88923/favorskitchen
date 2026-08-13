from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IngredientCreate(BaseModel):
    name: str = Field(..., min_length=1)
    category: Optional[str] = None


class IngredientListItem(BaseModel):
    ingredient_id: UUID
    name: str
    category: Optional[str] = None


class IngredientListResponse(BaseModel):
    items: list[IngredientListItem]
    total: int


class IngredientResponse(BaseModel):
    ingredient_id: UUID
    name: str
    normalized_name: str
    category: Optional[str] = None
