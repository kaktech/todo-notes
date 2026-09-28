"""
Pydantic schemas for task requests and responses.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """Data needed to create a new task."""
    user_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, description="Task title (required)")
    description: str = ""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = Field("medium", pattern="^(high|medium|low)$")
    category_id: Optional[int] = None
    alert_enabled: bool = False
    recurrence: str = Field("none", pattern="^(none|daily|weekly|monthly)$")


class TaskUpdate(BaseModel):
    """Data for updating a task (all fields optional)."""
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(high|medium|low)$")
    category_id: Optional[int] = None
    completed: Optional[bool] = None
    alert_enabled: Optional[bool] = None
    recurrence: Optional[str] = Field(None, pattern="^(none|daily|weekly|monthly)$")


class TaskResponse(BaseModel):
    """Task data returned by the API."""
    id: int
    user_id: str
    title: str
    description: str
    start_time: Optional[str]
    end_time: Optional[str]
    due_date: Optional[str]
    priority: str
    category_id: Optional[int]
    completed: bool
    alert_enabled: bool
    recurrence: str
    position: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReorderItem(BaseModel):
    """Single item in a reorder request."""
    id: int
    position: int


class ReorderRequest(BaseModel):
    """Request body for drag-and-drop reordering."""
    items: list[ReorderItem]
