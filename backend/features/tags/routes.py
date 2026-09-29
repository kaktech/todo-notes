"""
Tag API endpoints: CRUD for tags, plus attach/detach to tasks.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from features.tags.models import Tag, task_tags
from features.tags.schemas import TagCreate, TagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
def get_tags(
    user_id: str = Query(..., description="Unique browser ID of the user"),
    db: Session = Depends(get_db),
):
    """Get all tags for a specific user."""
    return db.query(Tag).filter(Tag.user_id == user_id).all()


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(tag: TagCreate, db: Session = Depends(get_db)):
    """Create a new tag."""
    db_tag = Tag(user_id=tag.user_id, name=tag.name)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    """Delete a tag by ID."""
    db_tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(db_tag)
    db.commit()


# --- Which tags are on which tasks (one call, so the task list can show tags) ---

@router.get("/task-map")
def get_task_tag_map(
    user_id: str = Query(..., description="Unique browser ID of the user"),
    db: Session = Depends(get_db),
):
    """Return {task_id: [tag_id, ...]} for all of this user's tasks that have tags."""
    from features.tasks.models import Task
    rows = (
        db.query(task_tags.c.task_id, task_tags.c.tag_id)
        .join(Task, Task.id == task_tags.c.task_id)
        .filter(Task.user_id == user_id)
        .all()
    )
    result: dict[int, list[int]] = {}
    for task_id, tag_id in rows:
        result.setdefault(task_id, []).append(tag_id)
    return result


# --- Get tags for a specific task ---

@router.get("/tasks/{task_id}", response_model=list[TagResponse])
def get_task_tags(task_id: int, db: Session = Depends(get_db)):
    """Get all tags attached to a specific task."""
    return db.query(Tag).join(task_tags, Tag.id == task_tags.c.tag_id).filter(task_tags.c.task_id == task_id).all()


# --- Attach/Detach tags to tasks ---

@router.post("/tasks/{task_id}/tags/{tag_id}", status_code=204)
def attach_tag(task_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Attach a tag to a task."""
    from features.tasks.models import Task
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.execute(task_tags.insert().values(task_id=task_id, tag_id=tag_id))
    db.commit()


@router.delete("/tasks/{task_id}/tags/{tag_id}", status_code=204)
def detach_tag(task_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Remove a tag from a task."""
    db.execute(task_tags.delete().where(task_tags.c.task_id == task_id, task_tags.c.tag_id == tag_id))
    db.commit()
