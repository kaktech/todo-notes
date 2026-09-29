"""
Notes database — separate from the tasks database.
This keeps notes data isolated and allows independent scaling.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Separate SQLite file for notes
NOTES_DATABASE_URL = os.getenv("NOTES_DATABASE_URL", "sqlite:///./notes.db")
notes_engine = create_engine(NOTES_DATABASE_URL, connect_args={"check_same_thread": False})
NotesSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=notes_engine)

# Separate Base for notes models
NotesBase = declarative_base()


def get_notes_db():
    """Dependency: gives each request its own notes database session."""
    db = NotesSessionLocal()
    try:
        yield db
    finally:
        db.close()
