"""
Main FastAPI application.
Serves the API under /api and (in production) the built React app.
"""
import os
from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, Session

from models import Base, Task, Note
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse, BulkCreate,
    NoteCreate, NoteUpdate, NoteResponse,
)

# --- Database setup ---
# A file-based SQLite database. The path can be overridden for tests.
#
# IMPORTANT: we build the path from THIS FILE's folder, not from the folder
# you happen to run the command in. Without this, starting the app from the
# project root and starting it from inside backend/ would use two different
# database files, and your tasks would look like they vanished.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BACKEND_DIR, "todos.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

# --- FastAPI app ---
app = FastAPI(title="Todo & Notes API", version="1.0.0")

# Allow the Vite dev server to call the API during development.
# We use a regex so it still works if you change the Vite port.
# (In production the frontend is served from this same server,
#  so CORS is not involved at all.)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency: gives each request its own database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ========================
#  Health check
# ========================

@app.get("/api/health")
def health_check():
    """Simple health check — returns OK if the server is running."""
    return {"status": "ok"}


# ========================
#  TASK ENDPOINTS
# ========================

@app.get("/api/tasks", response_model=list[TaskResponse])
def get_tasks(
    filter: str = Query("all", description="Filter: all, active, completed, overdue"),
    search: Optional[str] = Query(None, description="Search tasks by text"),
    db: Session = Depends(get_db),
):
    """Get all tasks, optionally filtered and/or searched."""
    query = db.query(Task)

    # Apply text search (case-insensitive)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))

    # Apply status filter
    if filter == "active":
        query = query.filter(Task.completed == False)
    elif filter == "completed":
        query = query.filter(Task.completed == True)
    elif filter == "overdue":
        today = date.today().isoformat()
        query = query.filter(
            Task.completed == False,
            Task.due_date.isnot(None),
            Task.due_date < today,
        )
    # "all" needs no extra filter

    # Order by position so the list stays in the user's chosen order
    return query.order_by(Task.position).all()


@app.post("/api/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task. Position is set to the end of the list."""
    # Find the highest current position so the new task goes to the bottom
    max_pos = db.query(func.max(Task.position)).scalar() or 0

    db_task = Task(
        title=task.title,
        due_date=task.due_date,
        position=max_pos + 1,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.post("/api/tasks/bulk", response_model=list[TaskResponse], status_code=201)
def create_tasks_bulk(bulk: BulkCreate, db: Session = Depends(get_db)):
    """Create many tasks at once (one per line pasted by the user)."""
    max_pos = db.query(func.max(Task.position)).scalar() or 0
    new_tasks = []

    for i, title in enumerate(bulk.titles):
        # Skip empty lines
        stripped = title.strip()
        if not stripped:
            continue
        db_task = Task(title=stripped, position=max_pos + i + 1)
        db.add(db_task)
        new_tasks.append(db_task)

    db.commit()
    for t in new_tasks:
        db.refresh(t)
    return new_tasks


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task's title, completed status, or due date."""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only update fields that were provided
    if task_update.title is not None:
        db_task.title = task_update.title
    if task_update.completed is not None:
        db_task.completed = task_update.completed
    if task_update.due_date is not None:
        db_task.due_date = task_update.due_date

    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/api/tasks/completed", status_code=204)
def clear_completed(db: Session = Depends(get_db)):
    """Delete all completed tasks at once."""
    db.query(Task).filter(Task.completed == True).delete()
    db.commit()


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task by ID."""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(db_task)
    db.commit()


@app.post("/api/tasks/{task_id}/move", response_model=TaskResponse)
def move_task(task_id: int, direction: str = Query(..., description="up or down"), db: Session = Depends(get_db)):
    """Move a task up or down in the list by swapping positions."""
    if direction not in ("up", "down"):
        raise HTTPException(status_code=422, detail="Direction must be 'up' or 'down'")

    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Find the neighbour task in the direction we want to move
    if direction == "up":
        neighbour = (
            db.query(Task)
            .filter(Task.position < db_task.position)
            .order_by(Task.position.desc())
            .first()
        )
    else:
        neighbour = (
            db.query(Task)
            .filter(Task.position > db_task.position)
            .order_by(Task.position.asc())
            .first()
        )

    if neighbour:
        # Swap positions
        db_task.position, neighbour.position = neighbour.position, db_task.position
        db.commit()
        db.refresh(db_task)

    return db_task


# ========================
#  NOTE ENDPOINTS
# ========================

@app.get("/api/notes", response_model=list[NoteResponse])
def get_notes(
    search: Optional[str] = Query(None, description="Search notes by title or content"),
    db: Session = Depends(get_db),
):
    """Get all notes, optionally searched by title or content."""
    query = db.query(Note)

    if search:
        query = query.filter(
            Note.title.ilike(f"%{search}%") | Note.content.ilike(f"%{search}%")
        )

    return query.order_by(Note.updated_at.desc()).all()


@app.post("/api/notes", response_model=NoteResponse, status_code=201)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """Create a new note."""
    db_note = Note(title=note.title, content=note.content)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.get("/api/notes/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a single note by ID."""
    db_note = db.query(Note).filter(Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note


@app.put("/api/notes/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, note_update: NoteUpdate, db: Session = Depends(get_db)):
    """Update a note's title and/or content."""
    db_note = db.query(Note).filter(Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note_update.title is not None:
        db_note.title = note_update.title
    if note_update.content is not None:
        db_note.content = note_update.content

    db_note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_note)
    return db_note


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    """Delete a note by ID."""
    db_note = db.query(Note).filter(Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()


# ========================
#  Serve React build (production)
# ========================
# When the frontend has been built (frontend/dist exists), serve it here.
# This makes the app work as ONE service on platforms like Render.
FRONTEND_DIST = os.path.join(BACKEND_DIR, "..", "frontend", "dist")

# Return 404 for any unknown /api/ route (before the React catch-all)
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def api_not_found(full_path: str):
    """Catch-all for unknown API routes — returns proper 404 JSON."""
    raise HTTPException(status_code=404, detail="API endpoint not found")


if os.path.isdir(FRONTEND_DIST):
    # Serve static files (JS, CSS, images) from the build folder
    ASSETS_DIR = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(ASSETS_DIR):
        app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

    # The real folder path, used to check that files stay inside it
    DIST_ROOT = os.path.realpath(FRONTEND_DIST)

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    def serve_react(full_path: str):
        """
        Serve the React app for any non-API route.
        This makes client-side routing work on refresh/deep links.
        """
        # If the requested path is a real file (like favicon), serve it
        file_path = os.path.realpath(os.path.join(DIST_ROOT, full_path))

        # SAFETY: make sure the file is really inside the dist folder.
        # Without this check, a URL like /../../backend/todos.db would
        # let anyone download your source code and your database!
        if file_path.startswith(DIST_ROOT + os.sep) and os.path.isfile(file_path):
            return FileResponse(file_path)

        # Otherwise serve index.html and let React handle the route.
        # We tell browsers not to cache it, so that after a redeploy
        # people get the NEW app instead of a stale cached copy.
        response = FileResponse(os.path.join(DIST_ROOT, "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response


# ========================
#  Start the server
# ========================
# Render (and most hosts) tell the app which port to use through the
# PORT environment variable. Locally there is no PORT, so we use 8000.
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))  # PORT comes from Render
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
