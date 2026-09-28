"""
TaskFlow backend — wires all feature routers together.

This file imports and includes the feature routers (tasks, categories, notes)
so the FastAPI app exposes all endpoints under /api.
"""
from fastapi import FastAPI

from features.tasks.routes import router as tasks_router
from features.categories.routes import router as categories_router
from features.notes.routes import router as notes_router

app = FastAPI(title="TaskFlow API", version="1.0.0")

# API routes — all under /api (routes already have their own /api/ prefix)
app.include_router(tasks_router)
app.include_router(categories_router)
app.include_router(notes_router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}