"""
Database setup: engine, session factory, and base class.
All feature models import Base from here.

Locally the app uses a SQLite file. On Vercel (serverless, no permanent disk) set
DATABASE_URL to a Postgres connection string instead — see AGENTS.md > Deployment.
"""
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool


def normalize_url(url: str) -> str:
    """Hosts hand out postgres:// or postgresql://; SQLAlchemy needs the driver named."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def make_engine(url: str):
    """SQLite for local use; Postgres (no held-open connections) for serverless."""
    url = normalize_url(url)
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # A serverless function can be frozen between requests, so do not keep a pool
    return create_engine(url, poolclass=NullPool, pool_pre_ping=True)


# Vercel's Postgres/Neon integration sets DATABASE_URL and POSTGRES_URL
_configured_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
if os.getenv("VERCEL") and not _configured_url:
    raise RuntimeError(
        "No database configured. On Vercel, add a Postgres database to the project "
        "(Storage tab) so DATABASE_URL is set."
    )
DATABASE_URL = normalize_url(_configured_url or "sqlite:///./app.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")
engine = make_engine(DATABASE_URL)
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
