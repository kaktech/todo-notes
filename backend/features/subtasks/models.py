"""
Subtask model: a checklist item belonging to a parent task.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from database import Base


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False, index=True)
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    position = Column(Integer, default=0)
