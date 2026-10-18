from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_serves_html_page() -> None:
    response = client.get("/internal/test-interview")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Interview engine" in response.text
    # Sanity-check the page actually wires up the real-route harness, not a
    # placeholder.
    assert "ENDPOINTS" in response.text
    assert "MediaRecorder" in response.text


def test_gated_off_in_production(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")

    response = client.get("/internal/test-interview")

    assert response.status_code == 404
