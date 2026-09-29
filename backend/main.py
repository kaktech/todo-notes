"""
TaskFlow backend — wires all feature routers together.

This file imports and includes the feature routers (tasks, categories, notes, tags, subtasks)
so the FastAPI app exposes all endpoints under /api.
"""
from fastapi import FastAPI

# Import all models FIRST so they register with Base.metadata
from features.tasks.models import Task
from features.categories.models import Category
from features.notes.models import Note
from features.tags.models import Tag, task_tags
from features.subtasks.models import Subtask
from features.auth.models import User

# Import routers
from features.tasks.routes import router as tasks_router
from features.categories.routes import router as categories_router
from features.notes.routes import router as notes_router
from features.tags.routes import router as tags_router
from features.subtasks.routes import router as subtasks_router
from features.auth.routes import router as auth_router

# Create all tables
from database import Base, engine
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TaskFlow API", version="1.0.0")

# API routes — all under /api (routes already have their own /api/ prefix)
app.include_router(tasks_router)
app.include_router(categories_router)
app.include_router(notes_router)
app.include_router(tags_router)
app.include_router(subtasks_router)
app.include_router(auth_router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}