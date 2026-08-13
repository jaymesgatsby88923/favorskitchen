from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from dependencies.dependencies import require_admin
from models.recipe import (
    RecipeCreate,
    RecipeListResponse,
    RecipeResponse,
    RecipeUpdate,
)
from services import recipe_service

router = APIRouter(
    prefix="/recipes",
    tags=["Recipes"],
)


@router.get("/", response_model=RecipeListResponse)
def list_recipes(
    search: Optional[str] = None,
    status: Optional[str] = None,
    active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    _admin=Depends(require_admin),
):
    return recipe_service.list_recipes(
        search=search,
        status=status,
        active=active,
        limit=limit,
        offset=offset,
    )


@router.post("/", response_model=RecipeResponse, status_code=201)
def create_recipe(
    payload: RecipeCreate,
    _admin=Depends(require_admin),
):
    return recipe_service.create_recipe(payload)


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: UUID,
    _admin=Depends(require_admin),
):
    return recipe_service.get_recipe(recipe_id)


@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: UUID,
    payload: RecipeUpdate,
    _admin=Depends(require_admin),
):
    return recipe_service.update_recipe(recipe_id, payload)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(
    recipe_id: UUID,
    _admin=Depends(require_admin),
):
    recipe_service.delete_recipe(recipe_id)
    return Response(status_code=204)
