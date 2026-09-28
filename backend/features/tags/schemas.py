"""
Pydantic schemas for tag requests and responses.
"""
from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Data needed to create a new tag."""
    user_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)


class TagResponse(BaseModel):
    """Tag data returned by the API."""
    id: int
    user_id: str
    name: str

    class Config:
        from_attributes = True
