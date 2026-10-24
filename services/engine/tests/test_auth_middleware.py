from unittest.mock import AsyncMock, MagicMock, patch
import os
from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture(autouse=True)
def clean_engine_secret():
    old = os.environ.get("ENGINE_API_SECRET")
    yield
    if old is None:
        os.environ.pop("ENGINE_API_SECRET", None)
    else:
        os.environ["ENGINE_API_SECRET"] = old


def test_health_check_always_accessible():
    os.environ["ENGINE_API_SECRET"] = "super-secret-key-1234"
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_route_rejects_missing_auth_when_secret_set():
    os.environ["ENGINE_API_SECRET"] = "super-secret-key-1234"
    client = TestClient(app)
    response = client.post(
        "/interviews",
        json={"user_id": "test-user", "interview_type": "technical", "difficulty": "medium"},
    )
    assert response.status_code == 401
    assert "Unauthorized" in response.json().get("error", "")


def test_protected_route_rejects_invalid_token():
    os.environ["ENGINE_API_SECRET"] = "super-secret-key-1234"
    client = TestClient(app)
    response = client.post(
        "/interviews",
        headers={"Authorization": "Bearer wrong-secret"},
        json={"user_id": "test-user", "interview_type": "technical", "difficulty": "medium"},
    )
    assert response.status_code == 401


@patch("app.main.engine.create_interview", new_callable=AsyncMock)
def test_protected_route_accepts_bearer_auth(mock_create):
    mock_create.return_value = MagicMock(interview_id="mock-id", status="pending")
    os.environ["ENGINE_API_SECRET"] = "super-secret-key-1234"
    client = TestClient(app)
    response = client.post(
        "/interviews",
        headers={"Authorization": "Bearer super-secret-key-1234"},
        json={"user_id": "00000000-0000-0000-0000-000000000000", "interview_type": "technical", "difficulty": "medium"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == "mock-id"


@patch("app.main.engine.create_interview", new_callable=AsyncMock)
def test_protected_route_accepts_x_engine_secret_header(mock_create):
    mock_create.return_value = MagicMock(interview_id="mock-id-2", status="pending")
    os.environ["ENGINE_API_SECRET"] = "super-secret-key-1234"
    client = TestClient(app)
    response = client.post(
        "/interviews",
        headers={"X-Engine-Secret": "super-secret-key-1234"},
        json={"user_id": "00000000-0000-0000-0000-000000000000", "interview_type": "technical", "difficulty": "medium"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == "mock-id-2"


def test_routes_open_when_no_secret_configured():
    os.environ.pop("ENGINE_API_SECRET", None)
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
