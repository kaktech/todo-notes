"""
Tag model: a simple label that can be attached to many tasks.
Many-to-many relationship with tasks via the task_tags join table.
"""
from sqlalchemy import Column, Integer, String, Table, ForeignKey
from database import Base

# Join table for many-to-many relationship between tasks and tags
task_tags = Table(
    'task_tags',
    Base.metadata,
    Column('task_id', Integer, ForeignKey('tasks.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
