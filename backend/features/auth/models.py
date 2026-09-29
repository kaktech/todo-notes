"""
User model for authentication.
Passwords are hashed with bcrypt — never stored in plain text.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
