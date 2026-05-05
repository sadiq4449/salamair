from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException, status

from app.api.routes import sales as sales_routes
from app.schemas.counter_offer_schema import CounterOfferCreate


class _FakeQuery:
    def __init__(self, result):
        self._result = result

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self._result


class _FakeSession:
    def __init__(self, req):
        self.req = req
        self.committed = 0
        self.added = []

    def query(self, model):
        name = getattr(model, "__name__", "")
        if name == "Request":
            return _FakeQuery(self.req)
        if name == "CounterOffer":
            return _FakeQuery(None)
        return _FakeQuery(None)

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed += 1

    def refresh(self, _obj):
        return None


def _mk_req():
    return SimpleNamespace(id=uuid4(), status="under_review", price=500.0)


def _mk_user():
    return SimpleNamespace(id=uuid4(), name="Sales User")


def test_create_counter_offer_rejects_price_below_min():
    db = _FakeSession(_mk_req())
    user = _mk_user()
    payload = CounterOfferCreate(counter_price=0.5, message="too low")

    with pytest.raises(HTTPException) as exc:
        sales_routes.create_counter_offer(db.req.id, payload, db=db, current_user=user)

    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc.value.detail["error"]["code"] == "COUNTER_PRICE_TOO_LOW"
    assert db.committed == 0


def test_create_counter_offer_rejects_price_above_max():
    db = _FakeSession(_mk_req())
    user = _mk_user()
    payload = CounterOfferCreate(counter_price=1_500_000, message="too high")

    with pytest.raises(HTTPException) as exc:
        sales_routes.create_counter_offer(db.req.id, payload, db=db, current_user=user)

    assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc.value.detail["error"]["code"] == "COUNTER_PRICE_TOO_HIGH"
    assert db.committed == 0
