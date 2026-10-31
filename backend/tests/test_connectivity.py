"""
Tests for API root, health check, and CORS configuration for production frontend origins.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "ResolveAI API Backend"
    assert "/docs" in data["docs_url"]
    assert "/api/health" in data["health_url"]

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "resolveai-api"

@pytest.mark.parametrize("origin", [
    "https://resolveai-frontend-ffab.onrender.com",
    "https://resolveai-frontend.onrender.com",
    "http://localhost:3000",
])
def test_cors_preflight(origin):
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization, content-type",
    }
    response = client.options("/api/cases", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert "GET" in response.headers.get("access-control-allow-methods", "")

@pytest.mark.parametrize("origin", [
    "https://resolveai-frontend-ffab.onrender.com",
    "https://resolveai-frontend.onrender.com",
    "http://localhost:3000",
])
def test_cors_get_origin(origin):
    headers = {"Origin": origin}
    response = client.get("/api/cases", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin

