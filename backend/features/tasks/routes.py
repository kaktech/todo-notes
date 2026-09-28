"""
Task API endpoints: create, read, update, delete, reorder, recurring tasks.
All endpoints filter by user_id so each user sees only their own tasks.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from features.tasks.models import Task
from features.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse, ReorderRequest

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def get_tasks(
    user_id: str = Query(..., description="Unique browser ID of the user"),
    filter: str = Query("all", description="Filter: all, active, completed, overdue"),
    search: Optional[str] = Query(None, description="Search tasks by title"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """Get all tasks for a specific user, optionally filtered and/or searched."""
    from datetime import date
    query = db.query(Task).filter(Task.user_id == user_id)

    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))
    if category_id is not None:
        query = query.filter(Task.category_id == category_id)
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


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task."""
    from sqlalchemy import func
    max_pos = db.query(func.max(Task.position)).filter(Task.user_id == task.user_id).scalar() or 0

    db_task = Task(
        user_id=task.user_id,
        title=task.title,
        description=task.description,
        start_time=task.start_time,
        end_time=task.end_time,
        due_date=task.due_date,
        priority=task.priority,
        category_id=task.category_id,
        alert_enabled=task.alert_enabled,
        recurrence=task.recurrence,
        position=max_pos + 1,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


# --- Specific routes MUST come BEFORE /{task_id} ---

@router.put("/reorder", status_code=204)
def reorder_tasks(request: ReorderRequest, db: Session = Depends(get_db)):
    """Save drag-and-drop order. Accepts a list of {id, position} pairs."""
    for item in request.items:
        task = db.query(Task).filter(Task.id == item.id).first()
        if task:
            task.position = item.position
    db.commit()


@router.delete("/completed", status_code=204)
def clear_completed(user_id: str = Query(..., description="Unique browser ID of the user"), db: Session = Depends(get_db)):
    """Delete all completed tasks for a specific user."""
    db.query(Task).filter(Task.user_id == user_id, Task.completed == True).delete()
    db.commit()


# --- Parameterized routes come AFTER specific ones ---

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task. If completing a recurring task, create the next occurrence."""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Track if we're completing a recurring task
    completing_recurring = (
        task_update.completed is True
        and db_task.completed is False
        and db_task.recurrence != "none"
    )

    # Update fields
    for field, value in task_update.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)

    # If completing a recurring task, create next occurrence
    if completing_recurring:
        create_next_occurrence(db_task, db)

    return db_task


def create_next_occurrence(task: Task, db: Session):
    """Create the next occurrence of a recurring task with updated due date."""
    from datetime import datetime, timedelta

    new_task = Task(
        user_id=task.user_id,
        title=task.title,
        description=task.description,
        start_time=task.start_time,
        end_time=task.end_time,
        priority=task.priority,
        category_id=task.category_id,
        alert_enabled=task.alert_enabled,
        recurrence=task.recurrence,
        position=task.position,
    )

    # Calculate next due date based on recurrence type
    if task.due_date:
        due = datetime.strptime(task.due_date, "%Y-%m-%d").date()
        if task.recurrence == "daily":
            due += timedelta(days=1)
        elif task.recurrence == "weekly":
            due += timedelta(weeks=1)
        elif task.recurrence == "monthly":
            # Add one month (approximate)
            if due.month == 12:
                due = due.replace(year=due.year + 1, month=1)
            else:
                due = due.replace(month=due.month + 1)
        new_task.due_date = due.isoformat()

    db.add(new_task)
    db.commit()


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task by ID."""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(db_task)
    db.commit()
