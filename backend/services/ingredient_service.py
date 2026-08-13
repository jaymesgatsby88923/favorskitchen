from uuid import UUID

from fastapi import HTTPException

from database.supabase import admin_supabase
from models.ingredient import (
    IngredientCreate,
    IngredientListItem,
    IngredientListResponse,
    IngredientResponse,
)

INGREDIENT_LIST_FIELDS = "ingredient_id, name, category"
INGREDIENT_DETAIL_FIELDS = "ingredient_id, name, normalized_name, category"


def normalize_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


def list_ingredients(
    search: str | None = None,
    category: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> IngredientListResponse:
    query = admin_supabase.table("ingredients").select(
        INGREDIENT_LIST_FIELDS,
        count="exact",
    )

    if search:
        term = search.strip()
        query = query.or_(f"name.ilike.%{term}%,normalized_name.ilike.%{term}%")
    if category:
        query = query.eq("category", category)

    response = (
        query
        .order("name")
        .range(offset, offset + limit - 1)
        .execute()
    )

    items = [IngredientListItem(**row) for row in response.data]
    total = response.count if response.count is not None else len(items)

    return IngredientListResponse(items=items, total=total)


def create_ingredient(payload: IngredientCreate) -> IngredientResponse:
    normalized_name = normalize_name(payload.name)

    response = (
        admin_supabase
        .table("ingredients")
        .insert({
            "name": payload.name.strip(),
            "normalized_name": normalized_name,
            "category": payload.category,
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create ingredient")

    return IngredientResponse(**response.data[0])


def get_ingredient(ingredient_id: UUID) -> IngredientResponse:
    response = (
        admin_supabase
        .table("ingredients")
        .select(INGREDIENT_DETAIL_FIELDS)
        .eq("ingredient_id", str(ingredient_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    return IngredientResponse(**response.data[0])


def resolve_ingredient_id(
    ingredient_id: UUID | None,
    name: str | None,
    category: str | None = None,
) -> UUID:
    if ingredient_id:
        get_ingredient(ingredient_id)
        return ingredient_id

    normalized_name = normalize_name(name)
    existing = (
        admin_supabase
        .table("ingredients")
        .select("ingredient_id")
        .eq("normalized_name", normalized_name)
        .execute()
    )

    if existing.data:
        return existing.data[0]["ingredient_id"]

    created = create_ingredient(IngredientCreate(name=name.strip(), category=category))
    return created.ingredient_id
