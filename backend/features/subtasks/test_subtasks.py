"""
Tests for all subtask endpoints.
Uses a temporary SQLite database so we never touch the real app.db.
Run with: pytest features/subtasks/test_subtasks.py -v
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


def make_task(client, title="Parent task"):
    """Helper to create a task and return the response."""
    return client.post("/api/tasks", json={"user_id": USER_A, "title": title})


class TestSubtasks:
    """Tests for all subtask endpoints."""

    def test_get_subtasks_empty(self, client):
        """GET /api/tasks/{id}/subtasks returns empty list when none exist."""
        task = make_task(client).json()
        response = client.get(f"/api/tasks/{task['id']}/subtasks")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_subtasks_with_data(self, client):
        """GET /api/tasks/{id}/subtasks returns all subtasks."""
        task = make_task(client).json()
        client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "Sub 1"})
        client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "Sub 2"})

        response = client.get(f"/api/tasks/{task['id']}/subtasks")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_create_subtask_success(self, client):
        """POST /api/tasks/{id}/subtasks creates a new subtask."""
        task = make_task(client).json()
        response = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "New subtask"})
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New subtask"
        assert data["completed"] is False
        assert data["task_id"] == task["id"]

    def test_create_subtask_empty_title_rejected(self, client):
        """POST /api/tasks/{id}/subtasks with empty title returns 422."""
        task = make_task(client).json()
        response = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": ""})
        assert response.status_code == 422

    def test_create_subtask_task_not_found(self, client):
        """POST /api/tasks/{id}/subtasks with non-existent task returns 404."""
        response = client.post("/api/tasks/9999/subtasks", json={"title": "Sub"})
        assert response.status_code == 404

    def test_update_subtask_success(self, client):
        """PUT /api/subtasks/{id} updates a subtask."""
        task = make_task(client).json()
        sub = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "Old"}).json()

        response = client.put(f"/api/subtasks/{sub['id']}", json={"title": "New"})
        assert response.status_code == 200
        assert response.json()["title"] == "New"

    def test_update_subtask_complete(self, client):
        """PUT /api/subtasks/{id} can mark a subtask complete."""
        task = make_task(client).json()
        sub = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "Sub"}).json()

        response = client.put(f"/api/subtasks/{sub['id']}", json={"completed": True})
        assert response.status_code == 200
        assert response.json()["completed"] is True

    def test_update_subtask_not_found(self, client):
        """PUT /api/subtasks/{id} with non-existent ID returns 404."""
        response = client.put("/api/subtasks/9999", json={"title": "Ghost"})
        assert response.status_code == 404

    def test_update_subtask_empty_title_rejected(self, client):
        """PUT /api/subtasks/{id} with empty title returns 422."""
        task = make_task(client).json()
        sub = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "Sub"}).json()

        response = client.put(f"/api/subtasks/{sub['id']}", json={"title": ""})
        assert response.status_code == 422

    def test_delete_subtask_success(self, client):
        """DELETE /api/subtasks/{id} removes a subtask."""
        task = make_task(client).json()
        sub = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "To delete"}).json()

        response = client.delete(f"/api/subtasks/{sub['id']}")
        assert response.status_code == 204
        assert client.get(f"/api/tasks/{task['id']}/subtasks").json() == []

    def test_delete_subtask_not_found(self, client):
        """DELETE /api/subtasks/{id} with non-existent ID returns 404."""
        response = client.delete("/api/subtasks/9999")
        assert response.status_code == 404
