from fastapi.testclient import TestClient

from app.main import app


def test_security_headers_present_on_api_response():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    assert "default-src 'self'" in r.headers.get("content-security-policy", "")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "SAMEORIGIN"
    assert r.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in r.headers.get("permissions-policy", "")
    assert r.headers.get("cross-origin-opener-policy") == "same-origin"


def test_hsts_added_for_https_requests():
    client = TestClient(app)
    r = client.get(
        "/api/health",
        headers={
            "host": "salamair.onrender.com",
            "x-forwarded-proto": "https",
        },
    )
    assert r.status_code == 200
    hsts = r.headers.get("strict-transport-security", "")
    assert "max-age=31536000" in hsts
    assert "includeSubDomains" in hsts

