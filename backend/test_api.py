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

# Import the app and models
from main import app, get_db
from models import Base, Task, Note

# Where the built React app lives (only exists after `npm run build`)
FRONTEND_DIST = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
)
HAS_BUILD = os.path.isfile(os.path.join(FRONTEND_DIST, "index.html"))


# --- Test fixture: create a fresh temporary database for each test session ---

@pytest.fixture(scope="function")
def client():
    """
    Creates a TestClient backed by a temporary SQLite database.
    Each test gets its own clean database.
    """
    # Create a temp file for the test database
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    # Point the app at the temp database
    test_db_url = f"sqlite:///{db_path}"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Override the get_db dependency so the app uses our test DB
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Create the test client
    with TestClient(app) as c:
        yield c

    # Clean up: remove the temp database file
    app.dependency_overrides.clear()
    os.unlink(db_path)


# ========================
#  HEALTH CHECK
# ========================

def test_health_check(client):
    """GET /api/health should return 200 with status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ========================
#  TASK TESTS
# ========================

class TestTasks:
    """Tests for all task-related endpoints."""

    # --- GET /api/tasks ---

    def test_get_tasks_empty(self, client):
        """GET /api/tasks returns empty list when no tasks exist."""
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tasks_with_data(self, client):
        """GET /api/tasks returns all tasks."""
        # Create two tasks
        client.post("/api/tasks", json={"title": "Task 1"})
        client.post("/api/tasks", json={"title": "Task 2"})

        response = client.get("/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Task 1"
        assert data[1]["title"] == "Task 2"

    def test_get_tasks_filter_active(self, client):
        """GET /api/tasks?filter=active returns only incomplete tasks."""
        # Create tasks and complete one
        client.post("/api/tasks", json={"title": "Active task"})
        r = client.post("/api/tasks", json={"title": "Done task"})
        task_id = r.json()["id"]
        client.put(f"/api/tasks/{task_id}", json={"completed": True})

        response = client.get("/api/tasks?filter=active")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Active task"

    def test_get_tasks_filter_completed(self, client):
        """GET /api/tasks?filter=completed returns only completed tasks."""
        client.post("/api/tasks", json={"title": "Active task"})
        r = client.post("/api/tasks", json={"title": "Done task"})
        task_id = r.json()["id"]
        client.put(f"/api/tasks/{task_id}", json={"completed": True})

        response = client.get("/api/tasks?filter=completed")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Done task"

    def test_get_tasks_filter_overdue(self, client):
        """GET /api/tasks?filter=overdue returns only overdue tasks."""
        # Create an overdue task (due date in the past)
        client.post("/api/tasks", json={"title": "Overdue task", "due_date": "2020-01-01"})
        # Create a future task
        client.post("/api/tasks", json={"title": "Future task", "due_date": "2099-12-31"})
        # Create a task with no due date
        client.post("/api/tasks", json={"title": "No date task"})

        response = client.get("/api/tasks?filter=overdue")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Overdue task"

    def test_get_tasks_search(self, client):
        """GET /api/tasks?search= filters tasks by text."""
        client.post("/api/tasks", json={"title": "Buy milk"})
        client.post("/api/tasks", json={"title": "Walk dog"})
        client.post("/api/tasks", json={"title": "Buy bread"})

        response = client.get("/api/tasks?search=buy")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        titles = [t["title"] for t in data]
        assert "Buy milk" in titles
        assert "Buy bread" in titles

    # --- POST /api/tasks ---

    def test_create_task_success(self, client):
        """POST /api/tasks creates a new task."""
        response = client.post("/api/tasks", json={"title": "New task"})
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New task"
        assert data["completed"] is False
        assert data["id"] is not None

    def test_create_task_with_due_date(self, client):
        """POST /api/tasks with due_date creates a task with that date."""
        response = client.post("/api/tasks", json={"title": "Dated task", "due_date": "2026-12-25"})
        assert response.status_code == 201
        data = response.json()
        assert data["due_date"] == "2026-12-25"

    def test_create_task_empty_title_rejected(self, client):
        """POST /api/tasks with empty title returns 422."""
        response = client.post("/api/tasks", json={"title": ""})
        assert response.status_code == 422

    def test_create_task_missing_title_rejected(self, client):
        """POST /api/tasks without title field returns 422."""
        response = client.post("/api/tasks", json={})
        assert response.status_code == 422

    # --- POST /api/tasks/bulk ---

    def test_bulk_create_success(self, client):
        """POST /api/tasks/bulk creates multiple tasks at once."""
        response = client.post("/api/tasks/bulk", json={"titles": ["Task A", "Task B", "Task C"]})
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 3
        assert data[0]["title"] == "Task A"
        assert data[1]["title"] == "Task B"
        assert data[2]["title"] == "Task C"

    def test_bulk_create_empty_list_rejected(self, client):
        """POST /api/tasks/bulk with empty list returns 422."""
        response = client.post("/api/tasks/bulk", json={"titles": []})
        assert response.status_code == 422

    def test_bulk_create_skips_empty_lines(self, client):
        """POST /api/tasks/bulk skips blank lines."""
        response = client.post("/api/tasks/bulk", json={"titles": ["Task A", "", "  ", "Task B"]})
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2

    # --- PUT /api/tasks/{id} ---

    def test_update_task_success(self, client):
        """PUT /api/tasks/{id} updates a task's title."""
        r = client.post("/api/tasks", json={"title": "Old title"})
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"title": "New title"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New title"

    def test_update_task_complete(self, client):
        """PUT /api/tasks/{id} can mark a task complete."""
        r = client.post("/api/tasks", json={"title": "Task"})
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"completed": True})
        assert response.status_code == 200
        assert response.json()["completed"] is True

    def test_update_task_not_found(self, client):
        """PUT /api/tasks/{id} with non-existent ID returns 404."""
        response = client.put("/api/tasks/9999", json={"title": "Ghost"})
        assert response.status_code == 404

    def test_update_task_empty_title_rejected(self, client):
        """PUT /api/tasks/{id} with empty title returns 422."""
        r = client.post("/api/tasks", json={"title": "Task"})
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"title": ""})
        assert response.status_code == 422

    # --- DELETE /api/tasks/{id} ---

    def test_delete_task_success(self, client):
        """DELETE /api/tasks/{id} removes a task."""
        r = client.post("/api/tasks", json={"title": "To delete"})
        task_id = r.json()["id"]

        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 204

        # Verify it's gone
        get_response = client.get("/api/tasks")
        assert len(get_response.json()) == 0

    def test_delete_task_not_found(self, client):
        """DELETE /api/tasks/{id} with non-existent ID returns 404."""
        response = client.delete("/api/tasks/9999")
        assert response.status_code == 404

    # --- POST /api/tasks/{id}/move ---

    def test_move_task_up(self, client):
        """POST /api/tasks/{id}/move?direction=up moves a task up."""
        client.post("/api/tasks", json={"title": "First"})
        r = client.post("/api/tasks", json={"title": "Second"})
        task_id = r.json()["id"]

        response = client.post(f"/api/tasks/{task_id}/move?direction=up")
        assert response.status_code == 200

        # Check order changed
        tasks = client.get("/api/tasks").json()
        assert tasks[0]["title"] == "Second"
        assert tasks[1]["title"] == "First"

    def test_move_task_down(self, client):
        """POST /api/tasks/{id}/move?direction=down moves a task down."""
        r = client.post("/api/tasks", json={"title": "First"})
        task_id = r.json()["id"]
        client.post("/api/tasks", json={"title": "Second"})

        response = client.post(f"/api/tasks/{task_id}/move?direction=down")
        assert response.status_code == 200

        tasks = client.get("/api/tasks").json()
        assert tasks[0]["title"] == "Second"
        assert tasks[1]["title"] == "First"

    def test_move_task_invalid_direction(self, client):
        """POST /api/tasks/{id}/move with bad direction returns 422."""
        r = client.post("/api/tasks", json={"title": "Task"})
        task_id = r.json()["id"]

        response = client.post(f"/api/tasks/{task_id}/move?direction=sideways")
        assert response.status_code == 422

    def test_move_task_not_found(self, client):
        """POST /api/tasks/{id}/move with non-existent ID returns 404."""
        response = client.post("/api/tasks/9999/move?direction=up")
        assert response.status_code == 404

    # --- DELETE /api/tasks/completed ---

    def test_clear_completed(self, client):
        """DELETE /api/tasks/completed removes all completed tasks."""
        # Create tasks, complete one
        client.post("/api/tasks", json={"title": "Active"})
        r = client.post("/api/tasks", json={"title": "Done"})
        task_id = r.json()["id"]
        client.put(f"/api/tasks/{task_id}", json={"completed": True})

        response = client.delete("/api/tasks/completed")
        assert response.status_code == 204

        # Only the active task should remain
        tasks = client.get("/api/tasks").json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Active"

    def test_clear_completed_none_exist(self, client):
        """DELETE /api/tasks/completed works even when nothing is completed."""
        client.post("/api/tasks", json={"title": "Active"})

        response = client.delete("/api/tasks/completed")
        assert response.status_code == 204
        assert len(client.get("/api/tasks").json()) == 1


# ========================
#  NOTE TESTS
# ========================

class TestNotes:
    """Tests for all note-related endpoints."""

    # --- GET /api/notes ---

    def test_get_notes_empty(self, client):
        """GET /api/notes returns empty list when no notes exist."""
        response = client.get("/api/notes")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_notes_with_data(self, client):
        """GET /api/notes returns all notes."""
        client.post("/api/notes", json={"title": "Note 1", "content": "Body 1"})
        client.post("/api/notes", json={"title": "Note 2", "content": "Body 2"})

        response = client.get("/api/notes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_get_notes_search(self, client):
        """GET /api/notes?search= filters notes by title or content."""
        client.post("/api/notes", json={"title": "Shopping", "content": "milk and eggs"})
        client.post("/api/notes", json={"title": "Ideas", "content": "build a rocket"})

        # Search by title
        response = client.get("/api/notes?search=shop")
        assert len(response.json()) == 1

        # Search by content
        response = client.get("/api/notes?search=rocket")
        assert len(response.json()) == 1

    # --- POST /api/notes ---

    def test_create_note_success(self, client):
        """POST /api/notes creates a new note."""
        response = client.post("/api/notes", json={"title": "My note", "content": "Some text"})
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My note"
        assert data["content"] == "Some text"
        assert data["id"] is not None

    def test_create_note_empty_title_rejected(self, client):
        """POST /api/notes with empty title returns 422."""
        response = client.post("/api/notes", json={"title": ""})
        assert response.status_code == 422

    # --- GET /api/notes/{id} ---

    def test_get_note_by_id_success(self, client):
        """GET /api/notes/{id} returns a single note."""
        r = client.post("/api/notes", json={"title": "Find me", "content": "Here"})
        note_id = r.json()["id"]

        response = client.get(f"/api/notes/{note_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Find me"

    def test_get_note_by_id_not_found(self, client):
        """GET /api/notes/{id} with non-existent ID returns 404."""
        response = client.get("/api/notes/9999")
        assert response.status_code == 404

    # --- PUT /api/notes/{id} ---

    def test_update_note_success(self, client):
        """PUT /api/notes/{id} updates a note."""
        r = client.post("/api/notes", json={"title": "Old", "content": "Old body"})
        note_id = r.json()["id"]

        response = client.put(f"/api/notes/{note_id}", json={"title": "New", "content": "New body"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New"
        assert data["content"] == "New body"

    def test_update_note_not_found(self, client):
        """PUT /api/notes/{id} with non-existent ID returns 404."""
        response = client.put("/api/notes/9999", json={"title": "Ghost"})
        assert response.status_code == 404

    def test_update_note_empty_title_rejected(self, client):
        """PUT /api/notes/{id} with empty title returns 422."""
        r = client.post("/api/notes", json={"title": "Note"})
        note_id = r.json()["id"]

        response = client.put(f"/api/notes/{note_id}", json={"title": ""})
        assert response.status_code == 422

    # --- DELETE /api/notes/{id} ---

    def test_delete_note_success(self, client):
        """DELETE /api/notes/{id} removes a note."""
        r = client.post("/api/notes", json={"title": "To delete"})
        note_id = r.json()["id"]

        response = client.delete(f"/api/notes/{note_id}")
        assert response.status_code == 204

        assert client.get("/api/notes").json() == []

    def test_delete_note_not_found(self, client):
        """DELETE /api/notes/{id} with non-existent ID returns 404."""
        response = client.delete("/api/notes/9999")
        assert response.status_code == 404


# ========================
#  SERVING THE REACT APP
# ========================
# These tests only run after the frontend has been built
# (cd frontend && npm run build). Otherwise they are skipped.

needs_build = pytest.mark.skipif(
    not HAS_BUILD, reason="Run 'npm run build' in frontend/ first"
)


@needs_build
class TestReactAppIsServed:
    """Tests that FastAPI serves the built React app on one port."""

    def test_home_page_returns_html(self, client):
        """GET / returns the React index.html."""
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_refresh_on_deep_link_returns_html(self, client):
        """
        Refreshing any page must still work.
        GET /notes returns index.html (not a 404), so the app can load.
        """
        response = client.get("/notes")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_static_file_is_served(self, client):
        """A real built asset (e.g. favicon.svg) is served as a file."""
        response = client.get("/favicon.svg")
        assert response.status_code == 200

    def test_unknown_api_route_returns_json_404(self, client):
        """Unknown /api/ routes return a JSON 404, not the React page."""
        response = client.get("/api/does-not-exist")
        assert response.status_code == 404
        assert response.json()["detail"] == "API endpoint not found"

    def test_api_still_works_alongside_the_frontend(self, client):
        """The API keeps working while the React app is being served."""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_path_traversal_is_blocked(self, client):
        """
        Security check: a URL must never escape the frontend/dist folder.
        Without this, anyone could download your source code and todos.db.
        """
        for sneaky_path in [
            "/../main.py",
            "/../../backend/main.py",
            "/../../backend/todos.db",
            "/assets/../../backend/main.py",
        ]:
            response = client.get(sneaky_path)
            # Either blocked (404) or the safe index.html fallback,
            # but never the real file from outside the dist folder.
            assert b"SQLite format 3" not in response.content, sneaky_path
            assert b"uvicorn.run" not in response.content, sneaky_path
            assert b'declarative_base' not in response.content, sneaky_path
