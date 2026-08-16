from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer, model_validator

RecipeStatus = Literal["draft", "published"]


class RecipeStepInput(BaseModel):
    description: str = Field(..., min_length=1)
    sort_order: int = 0


class RecipeIngredientInput(BaseModel):
    ingredient_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    preparation: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0

    @model_validator(mode="after")
    def require_ingredient_reference(self):
        if not self.ingredient_id and not self.name:
            raise ValueError("Each ingredient line requires ingredient_id or name")
        return self


class RecipeCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    prep_time_minutes: Optional[int] = Field(None, ge=1)
    cook_time_minutes: Optional[int] = Field(None, ge=1)
    servings: Optional[int] = Field(None, ge=1)
    image_url: Optional[str] = None
    pdf_url: Optional[str] = None
    status: RecipeStatus = "draft"
    active: bool = True
    ingredients: list[RecipeIngredientInput] = Field(default_factory=list)
    steps: list[RecipeStepInput] = Field(default_factory=list)


class RecipeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    prep_time_minutes: Optional[int] = Field(None, ge=1)
    cook_time_minutes: Optional[int] = Field(None, ge=1)
    servings: Optional[int] = Field(None, ge=1)
    image_url: Optional[str] = None
    pdf_url: Optional[str] = None
    status: Optional[RecipeStatus] = None
    active: Optional[bool] = None
    ingredients: Optional[list[RecipeIngredientInput]] = None
    steps: Optional[list[RecipeStepInput]] = None


class RecipeStepLine(BaseModel):
    step_id: UUID
    recipe_id: UUID
    description: str
    sort_order: int
    created_at: datetime
    updated_at: datetime


class RecipeIngredientLine(BaseModel):
    recipe_ingredient_id: UUID
    ingredient_id: UUID
    name: str
    category: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    preparation: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0

    @field_serializer("quantity")
    def serialize_quantity(self, value: Optional[Decimal]) -> Optional[float]:
        return float(value) if value is not None else None


class RecipeResponse(BaseModel):
    recipe_id: UUID
    name: str
    description: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    image_url: Optional[str] = None
    pdf_url: Optional[str] = None
    status: RecipeStatus
    active: bool
    created_at: datetime
    updated_at: datetime
    ingredients: list[RecipeIngredientLine] = Field(default_factory=list)
    steps: list[RecipeStepLine] = Field(default_factory=list)


class RecipeListItem(BaseModel):
    recipe_id: UUID
    name: str
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    status: RecipeStatus
    active: bool
    updated_at: datetime


class RecipeListResponse(BaseModel):
    items: list[RecipeListItem]
    total: int
