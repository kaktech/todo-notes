"""
Notes database.
Locally notes live in their own SQLite file (notes.db). With Postgres there is just one
database, so the notes tables share it with everything else (the table names never clash).
"""
import os
from sqlalchemy.orm import sessionmaker, declarative_base
from database import DATABASE_URL, IS_SQLITE, make_engine

_notes_url = os.getenv("NOTES_DATABASE_URL")
NOTES_DATABASE_URL = _notes_url or ("sqlite:///./notes.db" if IS_SQLITE else DATABASE_URL)
notes_engine = make_engine(NOTES_DATABASE_URL)
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
