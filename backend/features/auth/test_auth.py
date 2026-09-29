"""
Tests for auth endpoints: signup, login, logout, and data isolation.
Uses a temporary SQLite database so we never touch the real app.db.
Run with: pytest features/auth/test_auth.py -v
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


class TestAuth:
    """Tests for signup, login, logout, and data isolation."""

    def test_signup_success(self, client):
        """POST /api/auth/signup creates a new account."""
        response = client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        })
        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["username"] == "testuser"
        assert data["user_id"] is not None

    def test_signup_duplicate_username(self, client):
        """Signup with existing username returns 400."""
        client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test1@example.com",
            "password": "password123",
        })
        response = client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test2@example.com",
            "password": "password123",
        })
        assert response.status_code == 400

    def test_signup_short_password(self, client):
        """Signup with password < 6 chars returns 422."""
        response = client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "123",
        })
        assert response.status_code == 422

    def test_login_success(self, client):
        """POST /api/auth/login returns a token."""
        client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        })
        response = client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "password123",
        })
        assert response.status_code == 200
        assert "token" in response.json()

    def test_login_wrong_password(self, client):
        """Login with wrong password returns 401."""
        client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        })
        response = client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Login with non-existent user returns 401."""
        response = client.post("/api/auth/login", json={
            "username": "ghost",
            "password": "password123",
        })
        assert response.status_code == 401

    def test_logout(self, client):
        """POST /api/auth/logout invalidates the token."""
        signup = client.post("/api/auth/signup", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        })
        token = signup.json()["token"]

        response = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 204

        # Verify token no longer works
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 401

    def test_unauthenticated_request_rejected(self, client):
        """Requests without a token return 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_user_data_isolation(self, client):
        """User A cannot see User B's data."""
        # Create User A
        signup_a = client.post("/api/auth/signup", json={
            "username": "userA",
            "email": "a@example.com",
            "password": "password123",
        })
        token_a = signup_a.json()["token"]

        # Create User B
        signup_b = client.post("/api/auth/signup", json={
            "username": "userB",
            "email": "b@example.com",
            "password": "password123",
        })
        token_b = signup_b.json()["token"]

        # User A creates a task (using user_id from token)
        task_a = client.post("/api/tasks", json={"user_id": "userA", "title": "A's task"},
                             headers={"Authorization": f"Bearer {token_a}"})
        assert task_a.status_code == 201

        # User B creates a task
        task_b = client.post("/api/tasks", json={"user_id": "userB", "title": "B's task"},
                             headers={"Authorization": f"Bearer {token_b}"})
        assert task_b.status_code == 201

        # User A should only see their own tasks
        tasks_a = client.get("/api/tasks?user_id=userA",
                            headers={"Authorization": f"Bearer {token_a}"})
        assert tasks_a.status_code == 200
        for t in tasks_a.json():
            assert t["user_id"] == "userA"

        # User B should only see their own tasks
        tasks_b = client.get("/api/tasks?user_id=userB",
                            headers={"Authorization": f"Bearer {token_b}"})
        assert tasks_b.status_code == 200
        for t in tasks_b.json():
            assert t["user_id"] == "userB"
