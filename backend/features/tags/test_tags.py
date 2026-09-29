"""
Tests for all tag endpoints.
Uses a temporary SQLite database so we never touch the real app.db.
Run with: pytest features/tags/test_tags.py -v
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


class TestTags:
    """Tests for all tag endpoints."""

    def test_get_tags_empty(self, client):
        response = client.get(f"/api/tags?user_id={USER_A}")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tags_with_data(self, client):
        client.post("/api/tags", json={"user_id": USER_A, "name": "Urgent"})
        client.post("/api/tags", json={"user_id": USER_A, "name": "Home"})

        response = client.get(f"/api/tags?user_id={USER_A}")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_tags_isolated_between_users(self, client):
        client.post("/api/tags", json={"user_id": USER_A, "name": "A's tag"})
        client.post("/api/tags", json={"user_id": USER_B, "name": "B's tag"})

        assert len(client.get(f"/api/tags?user_id={USER_A}").json()) == 1
        assert len(client.get(f"/api/tags?user_id={USER_B}").json()) == 1

    def test_create_tag_success(self, client):
        response = client.post("/api/tags", json={"user_id": USER_A, "name": "Work"})
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Work"
        assert data["user_id"] == USER_A

    def test_create_tag_empty_name_rejected(self, client):
        response = client.post("/api/tags", json={"user_id": USER_A, "name": ""})
        assert response.status_code == 422

    def test_delete_tag_success(self, client):
        r = client.post("/api/tags", json={"user_id": USER_A, "name": "To delete"})
        tag_id = r.json()["id"]

        response = client.delete(f"/api/tags/{tag_id}")
        assert response.status_code == 204
        assert client.get(f"/api/tags?user_id={USER_A}").json() == []

    def test_delete_tag_not_found(self, client):
        response = client.delete("/api/tags/9999")
        assert response.status_code == 404

    def test_attach_tag_to_task(self, client):
        # Create a task and a tag
        task = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task"}).json()
        tag = client.post("/api/tags", json={"user_id": USER_A, "name": "Tag"}).json()

        # Attach tag to task
        response = client.post(f"/api/tags/tasks/{task['id']}/tags/{tag['id']}")
        assert response.status_code == 204

        # Verify task appears when filtering by tag
        tasks = client.get(f"/api/tasks?user_id={USER_A}&tag_id={tag['id']}").json()
        assert len(tasks) == 1
        assert tasks[0]["id"] == task["id"]

    def test_attach_tag_task_not_found(self, client):
        tag = client.post("/api/tags", json={"user_id": USER_A, "name": "Tag"}).json()
        response = client.post(f"/api/tags/tasks/9999/tags/{tag['id']}")
        assert response.status_code == 404

    def test_attach_tag_tag_not_found(self, client):
        task = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task"}).json()
        response = client.post(f"/api/tags/tasks/{task['id']}/tags/9999")
        assert response.status_code == 404

    def test_detach_tag_from_task(self, client):
        # Create task, tag, attach
        task = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task"}).json()
        tag = client.post("/api/tags", json={"user_id": USER_A, "name": "Tag"}).json()
        client.post(f"/api/tags/tasks/{task['id']}/tags/{tag['id']}")

        # Detach
        response = client.delete(f"/api/tags/tasks/{task['id']}/tags/{tag['id']}")
        assert response.status_code == 204

        # Verify task no longer appears when filtering by tag
        tasks = client.get(f"/api/tasks?user_id={USER_A}&tag_id={tag['id']}").json()
        assert len(tasks) == 0

    def test_filter_tasks_by_tag(self, client):
        # Create tasks and tags
        t1 = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task 1"}).json()
        t2 = client.post("/api/tasks", json={"user_id": USER_A, "title": "Task 2"}).json()
        tag = client.post("/api/tags", json={"user_id": USER_A, "name": "Important"}).json()

        # Attach tag to first task only
        client.post(f"/api/tags/tasks/{t1['id']}/tags/{tag['id']}")

        # Filter by tag
        tasks = client.get(f"/api/tasks?user_id={USER_A}&tag_id={tag['id']}").json()
        assert len(tasks) == 1
        assert tasks[0]["title"] == "Task 1"


class TestTaskTagMap:
    """GET /api/tags/task-map lets the task list show tags without one call per task."""

    def test_task_map_groups_tag_ids_by_task(self, client):
        t1 = client.post("/api/tasks", json={"user_id": USER_A, "title": "One"}).json()
        t2 = client.post("/api/tasks", json={"user_id": USER_A, "title": "Two"}).json()
        client.post("/api/tasks", json={"user_id": USER_A, "title": "No tags"})
        a = client.post("/api/tags", json={"user_id": USER_A, "name": "A"}).json()
        b = client.post("/api/tags", json={"user_id": USER_A, "name": "B"}).json()
        client.post(f"/api/tags/tasks/{t1['id']}/tags/{a['id']}")
        client.post(f"/api/tags/tasks/{t1['id']}/tags/{b['id']}")
        client.post(f"/api/tags/tasks/{t2['id']}/tags/{b['id']}")

        response = client.get(f"/api/tags/task-map?user_id={USER_A}")
        assert response.status_code == 200
        data = response.json()
        assert sorted(data[str(t1["id"])]) == sorted([a["id"], b["id"]])
        assert data[str(t2["id"])] == [b["id"]]
        assert len(data) == 2

    def test_task_map_only_includes_own_tasks(self, client):
        mine = client.post("/api/tasks", json={"user_id": USER_A, "title": "Mine"}).json()
        theirs = client.post("/api/tasks", json={"user_id": USER_B, "title": "Theirs"}).json()
        tag_a = client.post("/api/tags", json={"user_id": USER_A, "name": "A"}).json()
        tag_b = client.post("/api/tags", json={"user_id": USER_B, "name": "B"}).json()
        client.post(f"/api/tags/tasks/{mine['id']}/tags/{tag_a['id']}")
        client.post(f"/api/tags/tasks/{theirs['id']}/tags/{tag_b['id']}")

        data = client.get(f"/api/tags/task-map?user_id={USER_A}").json()
        assert list(data.keys()) == [str(mine["id"])]

    def test_task_map_empty(self, client):
        assert client.get(f"/api/tags/task-map?user_id={USER_A}").json() == {}

    def test_task_map_requires_user_id(self, client):
        assert client.get("/api/tags/task-map").status_code == 422
