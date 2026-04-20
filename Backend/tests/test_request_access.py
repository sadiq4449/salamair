import uuid

from app.models.request import Request
from app.models.user import User
from app.services.request_access import user_can_access_request


def _user(role: str) -> User:
    return User(
        id=uuid.uuid4(),
        email=f"u-{uuid.uuid4().hex[:8]}@t.com",
        name="T",
        password="x",
        role=role,
    )


def _req(agent_id: uuid.UUID) -> Request:
    return Request(
        id=uuid.uuid4(),
        request_code="REQ-TEST-001",
        route="MCT-DXB",
        agent_id=agent_id,
        status="submitted",
        pax=1,
        price=100,
    )


def test_agent_own_request():
    uid = uuid.uuid4()
    agent = _user("agent")
    agent.id = uid
    req = _req(uid)
    assert user_can_access_request(agent, req) is True


def test_agent_other_request():
    agent = _user("agent")
    req = _req(uuid.uuid4())
    assert user_can_access_request(agent, req) is False


def test_sales_any_request():
    sales = _user("sales")
    req = _req(uuid.uuid4())
    assert user_can_access_request(sales, req) is True


def test_admin_any_request():
    admin = _user("admin")
    req = _req(uuid.uuid4())
    assert user_can_access_request(admin, req) is True
