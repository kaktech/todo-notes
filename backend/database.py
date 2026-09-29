"""
Database setup: engine, session factory, and base class.
All feature models import Base from here.
"""
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Use a file-based SQLite database. Can be overridden for tests.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all feature models inherit from
Base = declarative_base()


# Dependency: gives each request its own database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added after the first release. create_all() never alters an existing
# table, so older app.db files need these added by hand at startup.
NEW_COLUMNS = {
    "tasks": {"color": "VARCHAR", "icon": "VARCHAR"},
}


def add_missing_columns(bind=engine):
    """Add any NEW_COLUMNS that an existing database file is missing."""
    inspector = inspect(bind)
    for table, columns in NEW_COLUMNS.items():
        if not inspector.has_table(table):
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        with bind.begin() as conn:
            for name, sql_type in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
