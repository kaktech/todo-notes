"""
Tests for the hosting setup: Postgres URL handling, engine choice, and the Vercel entry point.
(No real Postgres is needed; the engine builder is mocked.)
"""
import importlib.util
import os
from unittest import mock

from fastapi.testclient import TestClient
from sqlalchemy.pool import NullPool

import database


def test_normalize_url_names_the_postgres_driver():
    assert database.normalize_url("postgres://u:p@h/db") == "postgresql+psycopg2://u:p@h/db"
    assert database.normalize_url("postgresql://u:p@h/db?sslmode=require") == "postgresql+psycopg2://u:p@h/db?sslmode=require"


def test_normalize_url_leaves_other_urls_alone():
    assert database.normalize_url("sqlite:///./app.db") == "sqlite:///./app.db"
    assert database.normalize_url("postgresql+psycopg2://u:p@h/db") == "postgresql+psycopg2://u:p@h/db"


def test_sqlite_engine_allows_threads():
    engine = database.make_engine("sqlite://")
    assert engine.url.get_backend_name() == "sqlite"


def test_postgres_engine_does_not_hold_connections():
    with mock.patch("database.create_engine") as fake:
        database.make_engine("postgres://u:p@h/db")
    args, kwargs = fake.call_args
    assert args[0] == "postgresql+psycopg2://u:p@h/db"
    assert kwargs["poolclass"] is NullPool
    assert kwargs["pool_pre_ping"] is True
    assert "connect_args" not in kwargs


def test_vercel_entry_point_serves_the_api():
    path = os.path.join(os.path.dirname(__file__), "..", "api", "index.py")
    spec = importlib.util.spec_from_file_location("vercel_entry", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    response = TestClient(module.app).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
