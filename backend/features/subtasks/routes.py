"""
Subtask API endpoints: CRUD for subtasks belonging to a task.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from features.subtasks.models import Subtask
from features.subtasks.schemas import SubtaskCreate, SubtaskUpdate, SubtaskResponse

router = APIRouter(tags=["subtasks"])


@router.get("/api/tasks/{task_id}/subtasks", response_model=list[SubtaskResponse])
def get_subtasks(task_id: int, db: Session = Depends(get_db)):
    """Get all subtasks for a specific task."""
    return db.query(Subtask).filter(Subtask.task_id == task_id).order_by(Subtask.position).all()


@router.post("/api/tasks/{task_id}/subtasks", response_model=SubtaskResponse, status_code=201)
def create_subtask(task_id: int, subtask: SubtaskCreate, db: Session = Depends(get_db)):
    """Create a new subtask for a task."""
    # Verify task exists
    from features.tasks.models import Task
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get max position
    from sqlalchemy import func
    max_pos = db.query(func.max(Subtask.position)).filter(Subtask.task_id == task_id).scalar() or 0

    db_subtask = Subtask(
        task_id=task_id,
        title=subtask.title,
        position=max_pos + 1,
    )
    db.add(db_subtask)
    db.commit()
    db.refresh(db_subtask)
    return db_subtask


@router.put("/api/subtasks/{subtask_id}", response_model=SubtaskResponse)
def update_subtask(subtask_id: int, subtask_update: SubtaskUpdate, db: Session = Depends(get_db)):
    """Update a subtask's title or completed status."""
    db_subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not db_subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    if subtask_update.title is not None:
        db_subtask.title = subtask_update.title
    if subtask_update.completed is not None:
        db_subtask.completed = subtask_update.completed

    db.commit()
    db.refresh(db_subtask)
    return db_subtask


@router.delete("/api/subtasks/{subtask_id}", status_code=204)
def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    """Delete a subtask by ID."""
    db_subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not db_subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    db.delete(db_subtask)
    db.commit()
