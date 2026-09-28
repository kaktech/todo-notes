"""
Pydantic schemas for subtask requests and responses.
"""
from typing import Optional
from pydantic import BaseModel, Field


class SubtaskCreate(BaseModel):
    """Data needed to create a new subtask."""
    title: str = Field(..., min_length=1)


class SubtaskUpdate(BaseModel):
    """Data for updating a subtask."""
    title: Optional[str] = Field(None, min_length=1)
    completed: Optional[bool] = None


class SubtaskResponse(BaseModel):
    """Subtask data returned by the API."""
    id: int
    task_id: int
    title: str
    completed: bool
    position: int

    class Config:
        from_attributes = True
