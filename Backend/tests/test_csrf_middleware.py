"""CSRF double-submit (cookie + X-CSRF-Token) for mutating /api/* requests."""

from fastapi.testclient import TestClient

from app.main import app


def test_csrf_cookie_endpoint():
    client = TestClient(app)
    r = client.get("/api/v1/auth/csrf")
    assert r.status_code == 200
    body = r.json()
    assert "csrf_token" in body
    assert body["csrf_token"] == client.cookies.get("csrf_token")


def test_mutating_without_csrf_rejected():
    client = TestClient(app)
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "wrong-password"},
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "CSRF_FAILED"
