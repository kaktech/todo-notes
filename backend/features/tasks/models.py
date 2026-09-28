"""
Task model: a single todo item with all TaskFlow features.
Linked to a category via category_id and to a user via user_id.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    start_time = Column(String, nullable=True)   # "HH:MM" format
    end_time = Column(String, nullable=True)     # "HH:MM" format
    due_date = Column(String, nullable=True)     # "YYYY-MM-DD" format
    priority = Column(String, default="medium")  # high / medium / low
    category_id = Column(Integer, nullable=True)
    completed = Column(Boolean, default=False)
    alert_enabled = Column(Boolean, default=False)
    recurrence = Column(String, default="none")  # none / daily / weekly / monthly
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
