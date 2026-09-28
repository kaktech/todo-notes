"""
Tests for ALL API endpoints.
Uses a temporary SQLite database so we never touch the real todos.db.
Run with: pytest test_api.py -v
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app, get_db
from models import Base, Task, Note


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


# Helper: two different user IDs to test isolation
USER_A = "user-aaa"
USER_B = "user-bbb"


# ========================
#  HEALTH CHECK
# ========================

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ========================
#  TASK TESTS
# ========================

class TestTasks:

    def test_get_tasks_empty(self, client):
        response = client.get(f"/api/tasks?user_id={USER_A}")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tasks_with_data(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Task 1"})
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Task 2"})

        response = client.get(f"/api/tasks?user_id={USER_A}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_tasks_isolated_between_users(self, client):
        """User A should NOT see User B's tasks."""
        client.post("/api/tasks", json={"user_id": USER_A, "title": "A's task"})
        client.post("/api/tasks", json={"user_id": USER_B, "title": "B's task"})

        response_a = client.get(f"/api/tasks?user_id={USER_A}")
        response_b = client.get(f"/api/tasks?user_id={USER_B}")

        assert len(response_a.json()) == 1
        assert response_a.json()[0]["title"] == "A's task"
        assert len(response_b.json()) == 1
        assert response_b.json()[0]["title"] == "B's task"

    def test_get_tasks_filter_active(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Active task"})
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Done task"})
        client.put(f"/api/tasks/{r.json()['id']}", json={"completed": True})

        response = client.get(f"/api/tasks?user_id={USER_A}&filter=active")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Active task"

    def test_get_tasks_filter_completed(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Active task"})
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Done task"})
        client.put(f"/api/tasks/{r.json()['id']}", json={"completed": True})

        response = client.get(f"/api/tasks?user_id={USER_A}&filter=completed")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Done task"

    def test_get_tasks_filter_overdue(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Overdue task", "due_date": "2020-01-01"})
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Future task", "due_date": "2099-12-31"})
        client.post("/api/tasks", json={"user_id": USER_A, "title": "No date task"})

        response = client.get(f"/api/tasks?user_id={USER_A}&filter=overdue")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Overdue task"

    def test_get_tasks_search(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Buy milk"})
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Walk dog"})
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Buy bread"})

        response = client.get(f"/api/tasks?user_id={USER_A}&search=buy")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_create_task_success(self, client):
        response = client.post("/api/tasks", json={"user_id": USER_A, "title": "New task"})
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New task"
        assert data["completed"] is False
        assert data["user_id"] == USER_A

    def test_create_task_with_due_date(self, client):
        response = client.post("/api/tasks", json={"user_id": USER_A, "title": "Dated task", "due_date": "2026-12-25"})
        assert response.status_code == 201
        assert response.json()["due_date"] == "2026-12-25"

    def test_create_task_empty_title_rejected(self, client):
        response = client.post("/api/tasks", json={"user_id": USER_A, "title": ""})
        assert response.status_code == 422

    def test_create_task_missing_user_id_rejected(self, client):
        response = client.post("/api/tasks", json={"title": "No user"})
        assert response.status_code == 422

    def test_bulk_create_success(self, client):
        response = client.post("/api/tasks/bulk", json={"user_id": USER_A, "titles": ["Task A", "Task B", "Task C"]})
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 3

    def test_bulk_create_empty_list_rejected(self, client):
        response = client.post("/api/tasks/bulk", json={"user_id": USER_A, "titles": []})
        assert response.status_code == 422

    def test_bulk_create_skips_empty_lines(self, client):
        response = client.post("/api/tasks/bulk", json={"user_id": USER_A, "titles": ["Task A", "", "  ", "Task B"]})
        assert response.status_code == 201
        assert len(response.json()) == 2

    def test_update_task_success(self, client):
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Old title"})
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"title": "New title"})
        assert response.status_code == 200
        assert response.json()["title"] == "New title"

    def test_update_task_complete(self, client):
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task"})
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"completed": True})
        assert response.status_code == 200
        assert response.json()["completed"] is True

    def test_update_task_not_found(self, client):
        response = client.put("/api/tasks/9999", json={"title": "Ghost"})
        assert response.status_code == 404

    def test_update_task_empty_title_rejected(self, client):
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task"})
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"title": ""})
        assert response.status_code == 422

    def test_delete_task_success(self, client):
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "To delete"})
        task_id = r.json()["id"]

        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 204
        assert client.get(f"/api/tasks?user_id={USER_A}").json() == []

    def test_delete_task_not_found(self, client):
        response = client.delete("/api/tasks/9999")
        assert response.status_code == 404

    def test_move_task_up(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "First"})
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Second"})
        task_id = r.json()["id"]

        response = client.post(f"/api/tasks/{task_id}/move?direction=up")
        assert response.status_code == 200

        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert tasks[0]["title"] == "Second"
        assert tasks[1]["title"] == "First"

    def test_move_task_down(self, client):
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "First"})
        task_id = r.json()["id"]
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Second"})

        response = client.post(f"/api/tasks/{task_id}/move?direction=down")
        assert response.status_code == 200

        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert tasks[0]["title"] == "Second"
        assert tasks[1]["title"] == "First"

    def test_move_task_invalid_direction(self, client):
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task"})
        task_id = r.json()["id"]

        response = client.post(f"/api/tasks/{task_id}/move?direction=sideways")
        assert response.status_code == 422

    def test_move_task_not_found(self, client):
        response = client.post("/api/tasks/9999/move?direction=up")
        assert response.status_code == 404

    def test_clear_completed(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Active"})
        r = client.post("/api/tasks", json={"user_id": USER_A, "title": "Done"})
        client.put(f"/api/tasks/{r.json()['id']}", json={"completed": True})

        response = client.delete(f"/api/tasks/completed?user_id={USER_A}")
        assert response.status_code == 204

        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Active"

    def test_clear_completed_none_exist(self, client):
        client.post("/api/tasks", json={"user_id": USER_A, "title": "Active"})

        response = client.delete(f"/api/tasks/completed?user_id={USER_A}")
        assert response.status_code == 204
        assert len(client.get(f"/api/tasks?user_id={USER_A}").json()) == 1


# ========================
#  NOTE TESTS
# ========================

class TestNotes:

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
        """User A should NOT see User B's notes."""
        client.post("/api/notes", json={"user_id": USER_A, "title": "A's note"})
        client.post("/api/notes", json={"user_id": USER_B, "title": "B's note"})

        response_a = client.get(f"/api/notes?user_id={USER_A}")
        response_b = client.get(f"/api/notes?user_id={USER_B}")

        assert len(response_a.json()) == 1
        assert response_a.json()[0]["title"] == "A's note"
        assert len(response_b.json()) == 1
        assert response_b.json()[0]["title"] == "B's note"

    def test_get_notes_search(self, client):
        client.post("/api/notes", json={"user_id": USER_A, "title": "Shopping", "content": "milk and eggs"})
        client.post("/api/notes", json={"user_id": USER_A, "title": "Ideas", "content": "build a rocket"})

        response = client.get(f"/api/notes?user_id={USER_A}&search=shop")
        assert len(response.json()) == 1

        response = client.get(f"/api/notes?user_id={USER_A}&search=rocket")
        assert len(response.json()) == 1

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
