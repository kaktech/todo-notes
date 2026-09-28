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
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todos.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

# --- FastAPI app ---
app = FastAPI(title="Todo & Notes API", version="1.0.0")

# Allow CORS so the Vite dev server can call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
    user_id: str = Query(..., description="Unique browser ID of the user"),
    filter: str = Query("all", description="Filter: all, active, completed, overdue"),
    search: Optional[str] = Query(None, description="Search tasks by text"),
    db: Session = Depends(get_db),
):
    """Get all tasks for a specific user, optionally filtered and/or searched."""
    query = db.query(Task).filter(Task.user_id == user_id)

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

    return query.order_by(Task.position).all()


@app.post("/api/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task for a specific user."""
    max_pos = db.query(func.max(Task.position)).filter(Task.user_id == task.user_id).scalar() or 0

    db_task = Task(
        user_id=task.user_id,
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
    """Create many tasks at once for a specific user."""
    max_pos = db.query(func.max(Task.position)).filter(Task.user_id == bulk.user_id).scalar() or 0
    new_tasks = []

    for i, title in enumerate(bulk.titles):
        stripped = title.strip()
        if not stripped:
            continue
        db_task = Task(user_id=bulk.user_id, title=stripped, position=max_pos + i + 1)
        db.add(db_task)
        new_tasks.append(db_task)

    db.commit()
    for t in new_tasks:
        db.refresh(t)
    return new_tasks


@app.delete("/api/tasks/completed", status_code=204)
def clear_completed(user_id: str = Query(..., description="Unique browser ID of the user"), db: Session = Depends(get_db)):
    """Delete all completed tasks for a specific user."""
    db.query(Task).filter(Task.user_id == user_id, Task.completed == True).delete()
    db.commit()


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task's title, completed status, or due date."""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_update.title is not None:
        db_task.title = task_update.title
    if task_update.completed is not None:
        db_task.completed = task_update.completed
    if task_update.due_date is not None:
        db_task.due_date = task_update.due_date

    db.commit()
    db.refresh(db_task)
    return db_task


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

    # Find the neighbour task in the direction we want to move (same user only)
    if direction == "up":
        neighbour = (
            db.query(Task)
            .filter(Task.user_id == db_task.user_id, Task.position < db_task.position)
            .order_by(Task.position.desc())
            .first()
        )
    else:
        neighbour = (
            db.query(Task)
            .filter(Task.user_id == db_task.user_id, Task.position > db_task.position)
            .order_by(Task.position.asc())
            .first()
        )

    if neighbour:
        db_task.position, neighbour.position = neighbour.position, db_task.position
        db.commit()
        db.refresh(db_task)

    return db_task


# ========================
#  NOTE ENDPOINTS
# ========================

@app.get("/api/notes", response_model=list[NoteResponse])
def get_notes(
    user_id: str = Query(..., description="Unique browser ID of the user"),
    search: Optional[str] = Query(None, description="Search notes by title or content"),
    db: Session = Depends(get_db),
):
    """Get all notes for a specific user, optionally searched."""
    query = db.query(Note).filter(Note.user_id == user_id)

    if search:
        query = query.filter(
            Note.title.ilike(f"%{search}%") | Note.content.ilike(f"%{search}%")
        )

    return query.order_by(Note.updated_at.desc()).all()


@app.post("/api/notes", response_model=NoteResponse, status_code=201)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """Create a new note for a specific user."""
    db_note = Note(user_id=note.user_id, title=note.title, content=note.content)
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
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        """Serve the React app for any non-API route."""
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
