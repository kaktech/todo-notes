"""
Database models using SQLAlchemy.
Each class = one table in SQLite.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base

# Base class that all models inherit from
Base = declarative_base()


class Task(Base):
    """A single todo item."""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)          # task text
    completed = Column(Boolean, default=False)       # is it done?
    due_date = Column(String, nullable=True)         # optional due date "YYYY-MM-DD"
    position = Column(Integer, default=0)             # order in the list
    created_at = Column(DateTime, default=datetime.utcnow)


class Note(Base):
    """A note with a title and body text."""
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
