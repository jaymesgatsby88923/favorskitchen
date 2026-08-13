from typing import Optional

from fastapi import APIRouter, Depends, Response

from dependencies.dependencies import require_admin
from models.ingredient import (
    IngredientCreate,
    IngredientListResponse,
    IngredientResponse,
)
from services import ingredient_service

router = APIRouter(
    prefix="/ingredients",
    tags=["Ingredients"],
)


@router.get("/", response_model=IngredientListResponse)
def list_ingredients(
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    _admin=Depends(require_admin),
):
    return ingredient_service.list_ingredients(
        search=search,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.post("/", response_model=IngredientResponse, status_code=201)
def create_ingredient(
    payload: IngredientCreate,
    _admin=Depends(require_admin),
):
    return ingredient_service.create_ingredient(payload)
