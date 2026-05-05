from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def _csrf_ready_client() -> tuple[TestClient, str]:
    client = TestClient(app)
    r = client.get("/api/v1/auth/csrf")
    assert r.status_code == 200
    token = r.json()["csrf_token"]
    return client, token


def test_oversized_json_body_rejected_with_413():
    client, csrf = _csrf_ready_client()
    max_bytes = max(int(settings.REQUEST_MAX_BODY_MB), 1) * 1024 * 1024
    huge = "x" * (max_bytes + 1024)
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": huge},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "REQUEST_TOO_LARGE"


def test_normal_login_payload_not_blocked_by_size_middleware():
    client, csrf = _csrf_ready_client()
    r = client.post(
        "/api/v1/does-not-exist",
        json={"ok": True},
        headers={"X-CSRF-Token": csrf},
    )
    # 404 means the request reached routing and was not blocked by size middleware.
    assert r.status_code == 404
