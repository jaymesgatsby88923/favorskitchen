import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.curriculum import router as curriculum_router
from routes.ingredients import router as ingredients_router
from routes.recipes import router as recipes_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Favors Kitchen API")

DEFAULT_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://favorskitchen.com",
    "https://www.favorskitchen.com",
]

allowed_origins = os.getenv("ALLOWED_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(curriculum_router)
app.include_router(recipes_router)
app.include_router(ingredients_router)

@app.get("/")
def read_root():
    return {"message": "Hello World"}