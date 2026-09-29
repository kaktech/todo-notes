"""
Tests for all category endpoints.
Uses a temporary SQLite database so we never touch the real app.db.
Run with: pytest features/categories/test_categories.py -v
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


class TestCategories:
    """Tests for all category endpoints."""

    def test_get_categories_empty(self, client):
        """GET /api/categories returns empty list when no categories exist."""
        response = client.get(f"/api/categories?user_id={USER_A}")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_categories_with_data(self, client):
        """GET /api/categories returns all categories for a user."""
        client.post("/api/categories", json={"user_id": USER_A, "name": "Work", "color": "#3B82F6"})
        client.post("/api/categories", json={"user_id": USER_A, "name": "Personal", "color": "#22C55E"})

        response = client.get(f"/api/categories?user_id={USER_A}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Work"
        assert data[1]["name"] == "Personal"

    def test_categories_isolated_between_users(self, client):
        """User A should NOT see User B's categories."""
        client.post("/api/categories", json={"user_id": USER_A, "name": "A's category"})
        client.post("/api/categories", json={"user_id": USER_B, "name": "B's category"})

        response_a = client.get(f"/api/categories?user_id={USER_A}")
        response_b = client.get(f"/api/categories?user_id={USER_B}")

        assert len(response_a.json()) == 1
        assert response_a.json()[0]["name"] == "A's category"
        assert len(response_b.json()) == 1
        assert response_b.json()[0]["name"] == "B's category"

    def test_create_category_success(self, client):
        """POST /api/categories creates a new category."""
        response = client.post("/api/categories", json={"user_id": USER_A, "name": "Shopping", "color": "#F97316"})
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Shopping"
        assert data["color"] == "#F97316"
        assert data["user_id"] == USER_A
        assert data["id"] is not None

    def test_create_category_default_color(self, client):
        """POST /api/categories uses default color when not provided."""
        response = client.post("/api/categories", json={"user_id": USER_A, "name": "Default"})
        assert response.status_code == 201
        assert response.json()["color"] == "#3B82F6"

    def test_create_category_empty_name_rejected(self, client):
        """POST /api/categories with empty name returns 422."""
        response = client.post("/api/categories", json={"user_id": USER_A, "name": ""})
        assert response.status_code == 422

    def test_create_category_missing_user_id_rejected(self, client):
        """POST /api/categories without user_id returns 422."""
        response = client.post("/api/categories", json={"name": "No user"})
        assert response.status_code == 422

    def test_update_category_success(self, client):
        """PUT /api/categories/{id} updates a category."""
        r = client.post("/api/categories", json={"user_id": USER_A, "name": "Old name"})
        cat_id = r.json()["id"]

        response = client.put(f"/api/categories/{cat_id}", json={"name": "New name"})
        assert response.status_code == 200
        assert response.json()["name"] == "New name"

    def test_update_category_color(self, client):
        """PUT /api/categories/{id} can update color."""
        r = client.post("/api/categories", json={"user_id": USER_A, "name": "Test", "color": "#FF0000"})
        cat_id = r.json()["id"]

        response = client.put(f"/api/categories/{cat_id}", json={"color": "#00FF00"})
        assert response.status_code == 200
        assert response.json()["color"] == "#00FF00"

    def test_update_category_not_found(self, client):
        """PUT /api/categories/{id} with non-existent ID returns 404."""
        response = client.put("/api/categories/9999", json={"name": "Ghost"})
        assert response.status_code == 404

    def test_update_category_empty_name_rejected(self, client):
        """PUT /api/categories/{id} with empty name returns 422."""
        r = client.post("/api/categories", json={"user_id": USER_A, "name": "Test"})
        cat_id = r.json()["id"]

        response = client.put(f"/api/categories/{cat_id}", json={"name": ""})
        assert response.status_code == 422

    def test_delete_category_success(self, client):
        """DELETE /api/categories/{id} removes a category."""
        r = client.post("/api/categories", json={"user_id": USER_A, "name": "To delete"})
        cat_id = r.json()["id"]

        response = client.delete(f"/api/categories/{cat_id}")
        assert response.status_code == 204

        # Verify it's gone
        assert client.get(f"/api/categories?user_id={USER_A}").json() == []

    def test_delete_category_not_found(self, client):
        """DELETE /api/categories/{id} with non-existent ID returns 404."""
        response = client.delete("/api/categories/9999")
        assert response.status_code == 404

    def test_delete_category_moves_tasks_to_no_list(self, client):
        """Deleting a category moves its tasks to 'No List' (category_id=null)."""
        # Create a category and a task in it
        cat = client.post("/api/categories", json={"user_id": USER_A, "name": "Work"}).json()
        task = client.post("/api/tasks", json={"user_id": USER_A, "title": "Work task", "category_id": cat["id"]}).json()

        # Delete the category
        response = client.delete(f"/api/categories/{cat['id']}")
        assert response.status_code == 204

        # Verify the task's category_id is now null
        tasks = client.get(f"/api/tasks?user_id={USER_A}").json()
        work_task = [t for t in tasks if t["id"] == task["id"]][0]
        assert work_task["category_id"] is None
