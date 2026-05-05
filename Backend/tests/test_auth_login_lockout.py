from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, status

from app.api.routes import auth as auth_routes


class _FakeSession:
    def __init__(self, user):
        self._user = user
        self.committed = 0

    def query(self, _model):
        return self

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self._user

    def add(self, _obj):
        return None

    def commit(self):
        self.committed += 1


def _mk_user(password: str = "hashed", attempts: int = 0, lockout_until=None, active: bool = True):
    return SimpleNamespace(
        password=password,
        failed_login_attempts=attempts,
        lockout_until=lockout_until,
        is_active=active,
    )


def test_authenticate_increments_failed_attempts_and_locks_after_threshold(monkeypatch):
    user = _mk_user(attempts=4, lockout_until=None)
    db = _FakeSession(user)
    monkeypatch.setattr(auth_routes, "verify_password", lambda _plain, _hashed: False)

    with pytest.raises(HTTPException) as exc:
        auth_routes._authenticate(db, "a@b.com", "bad")

    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert exc.value.detail["error"]["code"] == "ACCOUNT_LOCKED"
    assert user.failed_login_attempts == 5
    assert user.lockout_until is not None
    assert db.committed == 1


def test_authenticate_rejects_while_lock_window_active(monkeypatch):
    lockout_until = datetime.now(timezone.utc) + timedelta(minutes=5)
    user = _mk_user(attempts=5, lockout_until=lockout_until)
    db = _FakeSession(user)
    monkeypatch.setattr(auth_routes, "verify_password", lambda _plain, _hashed: True)

    with pytest.raises(HTTPException) as exc:
        auth_routes._authenticate(db, "a@b.com", "ok")

    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert exc.value.detail["error"]["code"] == "ACCOUNT_LOCKED"


def test_authenticate_resets_counters_on_success(monkeypatch):
    user = _mk_user(attempts=3, lockout_until=datetime.now(timezone.utc) - timedelta(minutes=1))
    db = _FakeSession(user)
    monkeypatch.setattr(auth_routes, "verify_password", lambda _plain, _hashed: True)

    out = auth_routes._authenticate(db, "a@b.com", "ok")

    assert out is user
    assert user.failed_login_attempts == 0
    assert user.lockout_until is None
