"""
Pydantic schemas define the shape of data the API accepts and returns.
They also handle validation (e.g. rejecting empty titles).
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# --- Task schemas ---

class TaskCreate(BaseModel):
    """Data needed to create a new task."""
    user_id: str = Field(..., min_length=1, description="Unique browser ID for the user")
    title: str = Field(..., min_length=1, description="Task text (required, cannot be empty)")
    due_date: Optional[str] = Field(None, description="Optional due date in YYYY-MM-DD format")


class TaskUpdate(BaseModel):
    """Data for updating a task (all fields optional)."""
    title: Optional[str] = Field(None, min_length=1)
    completed: Optional[bool] = None
    due_date: Optional[str] = None


class TaskResponse(BaseModel):
    """Task data returned by the API."""
    id: int
    user_id: str
    title: str
    completed: bool
    due_date: Optional[str] = None
    position: int
    created_at: datetime

    class Config:
        from_attributes = True  # tells Pydantic to read from SQLAlchemy objects


class BulkCreate(BaseModel):
    """For bulk-adding many tasks at once."""
    user_id: str = Field(..., min_length=1)
    titles: list[str] = Field(..., min_length=1, description="List of task titles")


# --- Note schemas ---

class NoteCreate(BaseModel):
    """Data needed to create a new note."""
    user_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    content: str = ""


class NoteUpdate(BaseModel):
    """Data for updating a note."""
    title: Optional[str] = Field(None, min_length=1)
    content: Optional[str] = None


class NoteResponse(BaseModel):
    """Note data returned by the API."""
    id: int
    user_id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
