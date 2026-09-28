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


# --- Attach/Detach tags to tasks ---

@router.post("/tasks/{task_id}/tags/{tag_id}", status_code=204)
def attach_tag(task_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Attach a tag to a task."""
    # Verify task exists
    from features.tasks.models import Task
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Verify tag exists
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    # Insert into join table
    db.execute(task_tags.insert().values(task_id=task_id, tag_id=tag_id))
    db.commit()


@router.delete("/tasks/{task_id}/tags/{tag_id}", status_code=204)
def detach_tag(task_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Remove a tag from a task."""
    db.execute(task_tags.delete().where(task_tags.c.task_id == task_id, task_tags.c.tag_id == tag_id))
    db.commit()
