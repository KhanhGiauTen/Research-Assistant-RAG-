from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_empty_query_returns_422() -> None:
    client = TestClient(app)
    response = client.post("/api/chat/query", json={"query": "   "})

    assert response.status_code == 422
