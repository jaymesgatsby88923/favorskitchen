from uuid import UUID

from fastapi import HTTPException

from database.supabase import admin_supabase
from models.recipe import (
    RecipeCreate,
    RecipeIngredientInput,
    RecipeIngredientLine,
    RecipeListItem,
    RecipeListResponse,
    RecipeResponse,
    RecipeStepInput,
    RecipeStepLine,
    RecipeUpdate,
)
from services import ingredient_service

RECIPE_FIELDS = (
    "recipe_id, name, description, prep_time_minutes, cook_time_minutes, "
    "servings, image_url, pdf_url, status, active, "
    "created_at, updated_at"
)

RECIPE_LIST_FIELDS = (
    "recipe_id, name, prep_time_minutes, cook_time_minutes, servings, "
    "status, active, updated_at"
)

INGREDIENT_LINE_FIELDS = (
    "recipe_ingredient_id, ingredient_id, quantity, unit, preparation, "
    "notes, sort_order, ingredients(name, category)"
)

STEP_LINE_FIELDS = (
    "step_id, recipe_id, description, sort_order, created_at, updated_at"
)


def _fetch_recipe_ingredients(recipe_id: UUID) -> list[RecipeIngredientLine]:
    response = (
        admin_supabase
        .table("recipe_ingredients")
        .select(INGREDIENT_LINE_FIELDS)
        .eq("recipe_id", str(recipe_id))
        .order("sort_order")
        .execute()
    )

    lines = []
    for row in response.data:
        ingredient = row.pop("ingredients") or {}
        lines.append(
            RecipeIngredientLine(
                **row,
                name=ingredient.get("name", ""),
                category=ingredient.get("category"),
            )
        )
    return lines


def _fetch_recipe_steps(recipe_id: UUID) -> list[RecipeStepLine]:
    response = (
        admin_supabase
        .table("recipe_steps")
        .select(STEP_LINE_FIELDS)
        .eq("recipe_id", str(recipe_id))
        .order("sort_order")
        .execute()
    )

    return [RecipeStepLine(**row) for row in response.data]


def _build_recipe_response(row: dict) -> RecipeResponse:
    recipe_id = row["recipe_id"]
    return RecipeResponse(
        **row,
        ingredients=_fetch_recipe_ingredients(recipe_id),
        steps=_fetch_recipe_steps(recipe_id),
    )


def _insert_ingredient_lines(recipe_id: UUID, ingredients: list[RecipeIngredientInput]) -> None:
    if not ingredients:
        return

    rows = []
    for line in ingredients:
        resolved_id = ingredient_service.resolve_ingredient_id(
            line.ingredient_id,
            line.name,
            line.category,
        )
        rows.append({
            "recipe_id": str(recipe_id),
            "ingredient_id": str(resolved_id),
            "quantity": line.quantity,
            "unit": line.unit,
            "preparation": line.preparation,
            "notes": line.notes,
            "sort_order": line.sort_order,
        })

    response = admin_supabase.table("recipe_ingredients").insert(rows).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save recipe ingredients")


def _replace_ingredient_lines(recipe_id: UUID, ingredients: list[RecipeIngredientInput]) -> None:
    admin_supabase.table("recipe_ingredients").delete().eq(
        "recipe_id",
        str(recipe_id),
    ).execute()
    _insert_ingredient_lines(recipe_id, ingredients)


def _insert_step_lines(recipe_id: UUID, steps: list[RecipeStepInput]) -> None:
    if not steps:
        return

    rows = [
        {
            "recipe_id": str(recipe_id),
            "description": step.description,
            "sort_order": step.sort_order,
        }
        for step in steps
    ]

    response = admin_supabase.table("recipe_steps").insert(rows).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save recipe steps")


def _replace_step_lines(recipe_id: UUID, steps: list[RecipeStepInput]) -> None:
    admin_supabase.table("recipe_steps").delete().eq(
        "recipe_id",
        str(recipe_id),
    ).execute()
    _insert_step_lines(recipe_id, steps)


def list_recipes(
    search: str | None = None,
    status: str | None = None,
    active: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> RecipeListResponse:
    query = admin_supabase.table("recipes").select(RECIPE_LIST_FIELDS, count="exact")

    if search:
        query = query.ilike("name", f"%{search.strip()}%")
    if status:
        query = query.eq("status", status)
    if active is not None:
        query = query.eq("active", active)

    response = (
        query
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    items = [RecipeListItem(**row) for row in response.data]
    total = response.count if response.count is not None else len(items)

    return RecipeListResponse(items=items, total=total)


def get_recipe(recipe_id: UUID) -> RecipeResponse:
    response = (
        admin_supabase
        .table("recipes")
        .select(RECIPE_FIELDS)
        .eq("recipe_id", str(recipe_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return _build_recipe_response(response.data[0])


def create_recipe(payload: RecipeCreate) -> RecipeResponse:
    recipe_data = payload.model_dump(exclude={"ingredients", "steps"})
    response = admin_supabase.table("recipes").insert(recipe_data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create recipe")

    recipe_id = response.data[0]["recipe_id"]
    _insert_ingredient_lines(recipe_id, payload.ingredients)
    _insert_step_lines(recipe_id, payload.steps)

    return get_recipe(recipe_id)


def update_recipe(recipe_id: UUID, payload: RecipeUpdate) -> RecipeResponse:
    updates = payload.model_dump(exclude_unset=True, exclude={"ingredients", "steps"})

    if updates:
        response = (
            admin_supabase
            .table("recipes")
            .update(updates)
            .eq("recipe_id", str(recipe_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Recipe not found")
    elif payload.ingredients is None and payload.steps is None:
        return get_recipe(recipe_id)

    if payload.ingredients is not None or payload.steps is not None:
        existing = (
            admin_supabase
            .table("recipes")
            .select("recipe_id")
            .eq("recipe_id", str(recipe_id))
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recipe not found")

    if payload.ingredients is not None:
        _replace_ingredient_lines(recipe_id, payload.ingredients)

    if payload.steps is not None:
        _replace_step_lines(recipe_id, payload.steps)

    return get_recipe(recipe_id)


def delete_recipe(recipe_id: UUID) -> None:
    existing = (
        admin_supabase
        .table("recipes")
        .select("recipe_id")
        .eq("recipe_id", str(recipe_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Recipe not found")

    usage = (
        admin_supabase
        .table("curriculum_week_recipes")
        .select("week_id")
        .eq("recipe_id", str(recipe_id))
        .limit(1)
        .execute()
    )
    if usage.data:
        raise HTTPException(
            status_code=409,
            detail=(
                "Recipe is attached to one or more curriculum weeks. "
                "Set active to false instead."
            ),
        )

    admin_supabase.table("recipe_ingredients").delete().eq(
        "recipe_id",
        str(recipe_id),
    ).execute()
    admin_supabase.table("recipe_steps").delete().eq(
        "recipe_id",
        str(recipe_id),
    ).execute()
    admin_supabase.table("recipes").delete().eq("recipe_id", str(recipe_id)).execute()
