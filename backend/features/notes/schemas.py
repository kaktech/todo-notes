"""
Pydantic schemas for note requests and responses.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


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
