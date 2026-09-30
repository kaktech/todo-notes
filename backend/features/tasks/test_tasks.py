"""
Tests for all task endpoints.
Uses a temporary SQLite database so we never touch the real app.db.
Run with: pytest features/tasks/test_tasks.py -v
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


def make_task(client, user_id=USER_A, title="Test task", **kwargs):
    """Helper to create a task and return the response."""
    payload = {"user_id": user_id, "title": title, **kwargs}
    return client.post("/api/tasks", json=payload)


class TestTasks:
    """Tests for all task endpoints."""

    # --- GET /api/tasks ---

    def test_get_tasks_empty(self, client):
        response = client.get(f"/api/tasks?user_id={USER_A}")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tasks_with_data(self, client):
        make_task(client, title="Task 1")
        make_task(client, title="Task 2")

        response = client.get(f"/api/tasks?user_id={USER_A}")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_tasks_isolated_between_users(self, client):
        make_task(client, user_id=USER_A, title="A's task")
        make_task(client, user_id=USER_B, title="B's task")

        assert len(client.get(f"/api/tasks?user_id={USER_A}").json()) == 1
        assert len(client.get(f"/api/tasks?user_id={USER_B}").json()) == 1

    def test_get_tasks_filter_active(self, client):
        make_task(client, title="Active")
        r = make_task(client, title="Done")
        client.put(f"/api/tasks/{r.json()['id']}", json={"completed": True})

        response = client.get(f"/api/tasks?user_id={USER_A}&filter=active")
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "Active"

    def test_get_tasks_filter_completed(self, client):
        make_task(client, title="Active")
        r = make_task(client, title="Done")
        client.put(f"/api/tasks/{r.json()['id']}", json={"completed": True})

        response = client.get(f"/api/tasks?user_id={USER_A}&filter=completed")
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "Done"

    def test_get_tasks_filter_overdue(self, client):
        make_task(client, title="Overdue", due_date="2020-01-01")
        make_task(client, title="Future", due_date="2099-12-31")
        make_task(client, title="No date")

        response = client.get(f"/api/tasks?user_id={USER_A}&filter=overdue")
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "Overdue"

    def test_get_tasks_search(self, client):
        make_task(client, title="Buy milk")
        make_task(client, title="Walk dog")
        make_task(client, title="Buy bread")

        response = client.get(f"/api/tasks?user_id={USER_A}&search=buy")
        assert len(response.json()) == 2

    def test_get_tasks_filter_by_category(self, client):
        # Create a category
        cat = client.post("/api/categories", json={"user_id": USER_A, "name": "Work"}).json()
        cat_id = cat["id"]

        make_task(client, title="Work task", category_id=cat_id)
        make_task(client, title="Personal task")

        response = client.get(f"/api/tasks?user_id={USER_A}&category_id={cat_id}")
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "Work task"

    # --- POST /api/tasks ---

    def test_create_task_success(self, client):
        response = make_task(client, title="New task")
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New task"
        assert data["completed"] is False
        assert data["priority"] == "medium"
        assert data["recurrence"] == "none"

    def test_create_task_with_all_fields(self, client):
        response = make_task(client, title="Full task", description="Details",
                             start_time="09:00", end_time="10:00", due_date="2026-12-25",
                             priority="high", alert_enabled=True, recurrence="daily")
        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "Details"
        assert data["start_time"] == "09:00"
        assert data["end_time"] == "10:00"
        assert data["due_date"] == "2026-12-25"
        assert data["priority"] == "high"
        assert data["alert_enabled"] is True
        assert data["recurrence"] == "daily"

    def test_create_task_empty_title_rejected(self, client):
        response = make_task(client, title="")
        assert response.status_code == 422

    def test_create_task_invalid_priority_rejected(self, client):
        response = make_task(client, title="Task", priority="urgent")
        assert response.status_code == 422

    def test_create_task_invalid_recurrence_rejected(self, client):
        response = make_task(client, title="Task", recurrence="yearly")
        assert response.status_code == 422

    # --- PUT /api/tasks/{id} ---

    def test_update_task_success(self, client):
        r = make_task(client, title="Old title")
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"title": "New title"})
        assert response.status_code == 200
        assert response.json()["title"] == "New title"

    def test_update_task_complete(self, client):
        r = make_task(client, title="Task")
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"completed": True})
        assert response.status_code == 200
        assert response.json()["completed"] is True

    def test_update_task_not_found(self, client):
        response = client.put("/api/tasks/9999", json={"title": "Ghost"})
        assert response.status_code == 404

    def test_update_task_empty_title_rejected(self, client):
        r = make_task(client, title="Task")
        task_id = r.json()["id"]

        response = client.put(f"/api/tasks/{task_id}", json={"title": ""})
        assert response.status_code == 422

    def test_complete_recurring_task_creates_next(self, client):
        """Completing a daily recurring task should create the next occurrence."""
        r = make_task(client, title="Daily task", recurrence="daily", due_date="2026-09-28")
        task_id = r.json()["id"]

        # Complete it
        client.put(f"/api/tasks/{task_id}", json={"completed": True})

        # Should now have 2 tasks: the completed one + the new occurrence
        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert len(tasks) == 2

        # Find the new incomplete one
        incomplete = [t for t in tasks if not t["completed"]]
        assert len(incomplete) == 1
        assert incomplete[0]["due_date"] == "2026-09-29"  # next day

    def test_complete_non_recurring_task_no_new_task(self, client):
        """Completing a non-recurring task should NOT create a new one."""
        r = make_task(client, title="One-time task", recurrence="none")
        task_id = r.json()["id"]

        client.put(f"/api/tasks/{task_id}", json={"completed": True})

        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert len(tasks) == 1

    # --- DELETE /api/tasks/{id} ---

    def test_delete_task_success(self, client):
        r = make_task(client, title="To delete")
        task_id = r.json()["id"]

        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 204
        assert client.get(f"/api/tasks?user_id={USER_A}").json() == []

    def test_delete_task_not_found(self, client):
        response = client.delete("/api/tasks/9999")
        assert response.status_code == 404

    # --- PUT /api/tasks/reorder ---

    def test_reorder_tasks(self, client):
        """Drag-and-drop reorder should update positions."""
        r1 = make_task(client, title="First")
        r2 = make_task(client, title="Second")
        r3 = make_task(client, title="Third")

        # Reverse the order
        response = client.put("/api/tasks/reorder", json={
            "items": [
                {"id": r3.json()["id"], "position": 1},
                {"id": r2.json()["id"], "position": 2},
                {"id": r1.json()["id"], "position": 3},
            ]
        })
        assert response.status_code == 204

        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert tasks[0]["title"] == "Third"
        assert tasks[1]["title"] == "Second"
        assert tasks[2]["title"] == "First"

    # --- DELETE /api/tasks/completed ---

    def test_clear_completed(self, client):
        make_task(client, title="Active")
        r = make_task(client, title="Done")
        client.put(f"/api/tasks/{r.json()['id']}", json={"completed": True})

        response = client.delete(f"/api/tasks/completed?user_id={USER_A}")
        assert response.status_code == 204

        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Active"

    def test_clear_completed_none_exist(self, client):
        make_task(client, title="Active")

        response = client.delete(f"/api/tasks/completed?user_id={USER_A}")
        assert response.status_code == 204
        assert len(client.get(f"/api/tasks?user_id={USER_A}").json()) == 1


class TestTaskColorIcon:
    """Colour and icon are optional tags chosen in the New Task modal."""

    def test_create_with_color_and_icon(self, client):
        r = make_task(client, color="#FF6B4A", icon="coffee")
        assert r.status_code == 201
        assert r.json()["color"] == "#FF6B4A"
        assert r.json()["icon"] == "coffee"

    def test_color_and_icon_default_to_null(self, client):
        r = make_task(client)
        assert r.json()["color"] is None
        assert r.json()["icon"] is None

    def test_update_color_and_icon(self, client):
        task_id = make_task(client).json()["id"]
        r = client.put(f"/api/tasks/{task_id}", json={"color": "#2EC4B6", "icon": "book"})
        assert r.status_code == 200
        assert r.json()["color"] == "#2EC4B6"
        assert r.json()["icon"] == "book"

    def test_recurring_copy_keeps_color_and_icon(self, client):
        task_id = make_task(
            client, due_date="2026-10-03", recurrence="daily", color="#F2C94C", icon="sun"
        ).json()["id"]
        client.put(f"/api/tasks/{task_id}", json={"completed": True})
        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        nxt = [t for t in tasks if t["id"] != task_id][0]
        assert nxt["due_date"] == "2026-10-04"
        assert nxt["color"] == "#F2C94C"
        assert nxt["icon"] == "sun"


def test_add_missing_columns_upgrades_old_database(tmp_path):
    """An app.db created before color/icon existed gets the columns added."""
    from sqlalchemy import create_engine, inspect, text
    from database import add_missing_columns

    old = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with old.begin() as conn:
        conn.execute(text("CREATE TABLE tasks (id INTEGER PRIMARY KEY, title VARCHAR)"))
    add_missing_columns(old)
    add_missing_columns(old)  # running twice must be harmless
    names = {c["name"] for c in inspect(old).get_columns("tasks")}
    assert {"color", "icon"} <= names


class TestDeleteCleansUp:
    """Deleting must remove tag links and subtasks (Postgres foreign keys, and SQLite id reuse)."""

    def _task_with_tag_and_step(self, client):
        task = make_task(client, title="Has extras").json()
        tag = client.post("/api/tags", json={"user_id": USER_A, "name": "t"}).json()
        client.post(f"/api/tags/tasks/{task['id']}/tags/{tag['id']}")
        client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "step"})
        return task, tag

    def test_delete_task_removes_its_tags_and_subtasks(self, client):
        task, tag = self._task_with_tag_and_step(client)
        assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
        assert client.get(f"/api/tags/tasks/{task['id']}").json() == []
        assert client.get(f"/api/tasks/{task['id']}/subtasks").json() == []
        assert client.get(f"/api/tags/task-map?user_id={USER_A}").json() == {}

    def test_new_task_does_not_inherit_a_deleted_tasks_tag(self, client):
        task, tag = self._task_with_tag_and_step(client)
        client.delete(f"/api/tasks/{task['id']}")
        client.delete(f"/api/tags/{tag['id']}")
        # ids may be reused; a fresh task and tag must start clean and attach without a clash
        new_task = make_task(client, title="Fresh").json()
        new_tag = client.post("/api/tags", json={"user_id": USER_A, "name": "new"}).json()
        assert client.get(f"/api/tags/tasks/{new_task['id']}").json() == []
        assert client.post(f"/api/tags/tasks/{new_task['id']}/tags/{new_tag['id']}").status_code == 204

    def test_delete_tag_removes_it_from_tasks(self, client):
        task, tag = self._task_with_tag_and_step(client)
        assert client.delete(f"/api/tags/{tag['id']}").status_code == 204
        assert client.get(f"/api/tags/tasks/{task['id']}").json() == []

    def test_clear_completed_removes_children_too(self, client):
        task, tag = self._task_with_tag_and_step(client)
        client.put(f"/api/tasks/{task['id']}", json={"completed": True})
        assert client.delete(f"/api/tasks/completed?user_id={USER_A}").status_code == 204
        assert client.get(f"/api/tasks/{task['id']}/subtasks").json() == []
        assert client.get(f"/api/tags/task-map?user_id={USER_A}").json() == {}
