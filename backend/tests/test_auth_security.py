"""
Tests for ResolveAI 2.0 Zero Trust Security, RBAC, and High-Risk Approval Gateway.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import Customer, Order, ResolutionAction
from app.database import engine
from sqlmodel import Session
from app.tools import _now

client = TestClient(app)


def test_customer_ownership_access_guard():
    # Customer caller (CUST-002) attempting to access CUST-001's persistent memory
    headers = {
        "X-User-Role": "customer",
        "X-Customer-Id": "CUST-002",
        "X-User-Id": "user_cust_02",
    }
    response = client.get("/api/customers/CUST-001/memory", headers=headers)
    assert response.status_code == 403
    assert "Privacy violation" in response.json()["detail"]


def test_supervisor_role_enforcement_on_approval():
    # Non-supervisor (customer or normal agent) attempting to approve high-risk action
    headers = {
        "X-User-Role": "customer",
        "X-Customer-Id": "CUST-001",
    }
    response = client.post("/api/actions/ACT-TEST/approve", json={"approved_by": "hacker"}, headers=headers)
    assert response.status_code == 403
    assert "Operation requires one of" in response.json()["detail"]


def test_supervisor_approval_execution_flow():
    # Create a pending high-risk action in DB
    with Session(engine) as session:
        existing = session.get(ResolutionAction, "ACT-HIGH-SEC-01")
        if existing:
            session.delete(existing)
            session.commit()

        act = ResolutionAction(
            id="ACT-HIGH-SEC-01",
            order_id="ORD-1042",
            customer_id="CUST-001",
            action_type="refund",
            risk_level="high",
            status="pending_approval",
            idempotency_key="IDEMP-SEC-AUTH-01",
            cost_estimate=5000.0,
            created_at=_now(),
        )
        session.add(act)
        session.commit()

    # Supervisor approves
    headers = {
        "X-User-Role": "supervisor",
        "X-User-Id": "sup_agent_99",
    }
    response = client.post("/api/actions/ACT-HIGH-SEC-01/approve", json={"approved_by": "sup_agent_99"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["approved_by"] == "sup_agent_99"
