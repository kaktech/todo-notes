"""
Note model: uses the separate notes database.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from database_notes import NotesBase


class Note(NotesBase):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
