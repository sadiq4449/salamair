import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException, status

from app.api.routes.requests import _load_counter_offer_for_response


def _mk_agent_user(agent_id: uuid.UUID) -> SimpleNamespace:
    return SimpleNamespace(id=agent_id, role="agent")


def _mk_request(request_id: uuid.UUID, agent_id: uuid.UUID, req_status: str = "counter_offered") -> SimpleNamespace:
    return SimpleNamespace(id=request_id, agent_id=agent_id, status=req_status)


def _mk_db_with_offer_lookup(req_obj, offer_result):
    """Build a mock Session that returns req first, then offer lookup."""
    db = MagicMock()

    req_query = MagicMock()
    req_filter = MagicMock()
    req_filter.first.return_value = req_obj
    req_query.filter.return_value = req_filter

    offer_query = MagicMock()
    offer_filter = MagicMock()
    offer_filter.first.return_value = offer_result
    offer_query.filter.return_value = offer_filter

    db.query.side_effect = [req_query, offer_query]
    return db, offer_query


def test_counter_offer_lookup_scopes_by_request_id_and_offer_id():
    request_id = uuid.uuid4()
    offer_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    req = _mk_request(request_id, agent_id)
    db, offer_query = _mk_db_with_offer_lookup(req_obj=req, offer_result=None)

    with pytest.raises(HTTPException) as exc:
        _load_counter_offer_for_response(db, request_id, offer_id, _mk_agent_user(agent_id))

    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Counter offer not found for this request" in str(exc.value.detail)

    # Regression check for BUG 4: query must constrain BOTH offer_id and request_id.
    offer_filter_call = offer_query.filter.call_args
    assert offer_filter_call is not None
    assert len(offer_filter_call.args) == 2
    sql_predicates = " ".join(str(a) for a in offer_filter_call.args)
    assert "counter_offers.id" in sql_predicates
    assert "counter_offers.request_id" in sql_predicates


def test_counter_offer_lookup_rejects_offer_for_wrong_request_even_when_offer_exists():
    request_id = uuid.uuid4()
    offer_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    req = _mk_request(request_id, agent_id)
    # Simulate real DB behavior: combined filter finds nothing when request_id mismatches.
    db, _ = _mk_db_with_offer_lookup(req_obj=req, offer_result=None)

    with pytest.raises(HTTPException) as exc:
        _load_counter_offer_for_response(db, request_id, offer_id, _mk_agent_user(agent_id))

    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert exc.value.detail["error"]["code"] == "NOT_FOUND"

