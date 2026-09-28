"""
Tests for all note endpoints.
Uses a temporary SQLite database so we never touch the real app.db.
Run with: pytest features/notes/test_notes.py -v
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app


@pytest.fixture(scope="function")
def client():
    """Creates a TestClient backed by a temporary SQLite database."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    test_db_url = f"sqlite:///{db_path}"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    os.unlink(db_path)


USER_A = "user-aaa"
USER_B = "user-bbb"


class TestNotes:
    """Tests for all note endpoints."""

    def test_get_notes_empty(self, client):
        response = client.get(f"/api/notes?user_id={USER_A}")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_notes_with_data(self, client):
        client.post("/api/notes", json={"user_id": USER_A, "title": "Note 1", "content": "Body 1"})
        client.post("/api/notes", json={"user_id": USER_A, "title": "Note 2", "content": "Body 2"})

        response = client.get(f"/api/notes?user_id={USER_A}")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_notes_isolated_between_users(self, client):
        client.post("/api/notes", json={"user_id": USER_A, "title": "A's note"})
        client.post("/api/notes", json={"user_id": USER_B, "title": "B's note"})

        assert len(client.get(f"/api/notes?user_id={USER_A}").json()) == 1
        assert len(client.get(f"/api/notes?user_id={USER_B}").json()) == 1

    def test_get_notes_search(self, client):
        client.post("/api/notes", json={"user_id": USER_A, "title": "Shopping", "content": "milk and eggs"})
        client.post("/api/notes", json={"user_id": USER_A, "title": "Ideas", "content": "build a rocket"})

        assert len(client.get(f"/api/notes?user_id={USER_A}&search=shop").json()) == 1
        assert len(client.get(f"/api/notes?user_id={USER_A}&search=rocket").json()) == 1

    def test_create_note_success(self, client):
        response = client.post("/api/notes", json={"user_id": USER_A, "title": "My note", "content": "Some text"})
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My note"
        assert data["user_id"] == USER_A

    def test_create_note_empty_title_rejected(self, client):
        response = client.post("/api/notes", json={"user_id": USER_A, "title": ""})
        assert response.status_code == 422

    def test_get_note_by_id_success(self, client):
        r = client.post("/api/notes", json={"user_id": USER_A, "title": "Find me", "content": "Here"})
        note_id = r.json()["id"]

        response = client.get(f"/api/notes/{note_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Find me"

    def test_get_note_by_id_not_found(self, client):
        response = client.get("/api/notes/9999")
        assert response.status_code == 404

    def test_update_note_success(self, client):
        r = client.post("/api/notes", json={"user_id": USER_A, "title": "Old", "content": "Old body"})
        note_id = r.json()["id"]

        response = client.put(f"/api/notes/{note_id}", json={"title": "New", "content": "New body"})
        assert response.status_code == 200
        assert response.json()["title"] == "New"

    def test_update_note_not_found(self, client):
        response = client.put("/api/notes/9999", json={"title": "Ghost"})
        assert response.status_code == 404

    def test_update_note_empty_title_rejected(self, client):
        r = client.post("/api/notes", json={"user_id": USER_A, "title": "Note"})
        note_id = r.json()["id"]

        response = client.put(f"/api/notes/{note_id}", json={"title": ""})
        assert response.status_code == 422

    def test_delete_note_success(self, client):
        r = client.post("/api/notes", json={"user_id": USER_A, "title": "To delete"})
        note_id = r.json()["id"]

        response = client.delete(f"/api/notes/{note_id}")
        assert response.status_code == 204
        assert client.get(f"/api/notes?user_id={USER_A}").json() == []

    def test_delete_note_not_found(self, client):
        response = client.delete("/api/notes/9999")
        assert response.status_code == 404
