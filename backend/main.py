"""
TaskFlow backend — wires all feature routers together and serves the React build.
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

# Create notes tables (separate database)
from database_notes import NotesBase, notes_engine
NotesBase.metadata.create_all(bind=notes_engine)

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


# Serve the React build (production)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        """Serve the React app for any non-API route (client-side routing)."""
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))