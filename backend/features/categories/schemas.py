"""
Pydantic schemas for category requests and responses.
"""
from typing import Optional
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    """Data needed to create a new category."""
    user_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, description="Category name (required)")
    color: str = Field("#3B82F6", description="Hex color code")


class CategoryUpdate(BaseModel):
    """Data for updating a category (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1)
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    """Category data returned by the API."""
    id: int
    user_id: str
    name: str
    color: str

    class Config:
        from_attributes = True
