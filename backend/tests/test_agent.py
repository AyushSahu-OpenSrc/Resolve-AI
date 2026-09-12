"""
ResolveAI — Critical test suite.
Tests: hero path, conflict/replan, verify_resolution, demo reset.
"""
import json
import os
import sys
import pytest
from datetime import datetime, timezone, timedelta

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_resolveai.db"
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY", "test-key")

from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import (
    Customer, Product, Order, Inventory, Policy,
    SupportCase, Replacement, AgentEvent, AgentExecution
)
from app.tools import (
    get_customer, get_order, get_product, get_inventory, search_inventory,
    get_policy, check_resolution_eligibility, reserve_inventory,
    create_replacement, cancel_reservation, verify_resolution, get_case_state
)


def setup_test_db():
    """Set up a clean test database with seed data."""
    create_db_and_tables()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    with Session(engine) as session:
        # Clear
        for model in [AgentEvent, AgentExecution, Replacement, SupportCase,
                      Inventory, Order, Policy, Product, Customer]:
            rows = session.exec(select(model)).all()
            for row in rows:
                session.delete(row)
        session.commit()

        # Seed
        session.add(Customer(id="CUST-001", name="Rahul Sharma",
                             email="rahul@test.com", tier="premium"))
        session.add(Product(id="PROD-HP01", name="Premium Wireless Headphones",
                            sku="WH-PRM-BLK-01", category="electronics", price=4999.0))
        session.add(Order(id="ORD-1042", customer_id="CUST-001",
                          product_id="PROD-HP01", status="delivered",
                          purchase_date=now - timedelta(days=10),
                          delivery_date=now - timedelta(days=4),
                          issue_type="damaged_on_arrival", total_amount=4999.0))
        session.add(Inventory(id="INV-001", product_id="PROD-HP01",
                              warehouse="Mumbai", quantity=1, reserved_quantity=0))
        session.add(Inventory(id="INV-002", product_id="PROD-HP01",
                              warehouse="Pune", quantity=2, reserved_quantity=0))
        session.add(Inventory(id="INV-003", product_id="PROD-HP01",
                              warehouse="Bengaluru", quantity=0, reserved_quantity=0))
        session.add(Policy(
            id="POL-DMG-01", category="damaged_on_arrival",
            policy_text="Replacement permitted within 7 days.",
            eligibility_rules_json=json.dumps({
                "max_days_since_delivery": 7,
                "requires_order_status": ["delivered"],
                "allowed_issue_types": ["damaged_on_arrival", "defective"],
                "expedited_tiers": ["premium"]
            }),
            active=True,
        ))
        session.add(SupportCase(
            id="CASE-TEST-001", customer_id="CUST-001", order_id="ORD-1042",
            customer_message="My order arrived damaged. I want a replacement.",
            status="open", demo_conflict_pending=False,
        ))
        session.commit()


@pytest.fixture(autouse=True)
def fresh_db():
    """Reset DB before each test."""
    setup_test_db()
    yield


# ─── Test 1: Happy-path resolution ───────────────────────────────────────────

def test_happy_path_resolution():
    """Full happy path: get customer → check eligibility → reserve → replace → verify."""
    with Session(engine) as session:
        case_id = "CASE-TEST-001"
        exec_id = "exec-001"

        # 1. Get customer
        result = get_customer(session, case_id, exec_id, "CUST-001", seq=1)
        assert result["success"] is True
        assert result["customer"]["tier"] == "premium"

        # 2. Get order
        result = get_order(session, case_id, exec_id, "ORD-1042", seq=2)
        assert result["success"] is True
        assert result["order"]["status"] == "delivered"
        assert result["order"]["issue_type"] == "damaged_on_arrival"

        # 3. Get product
        result = get_product(session, case_id, exec_id, "PROD-HP01", seq=3)
        assert result["success"] is True
        assert result["product"]["sku"] == "WH-PRM-BLK-01"

        # 4. Check eligibility
        result = check_resolution_eligibility(
            session, case_id, exec_id, "ORD-1042", "CUST-001", "damaged_on_arrival", seq=4
        )
        assert result["success"] is True
        assert result["eligible"] is True
        assert result["is_expedited"] is True  # premium tier

        # 5. Check inventory
        result = get_inventory(session, case_id, exec_id, "PROD-HP01", "Mumbai", seq=5)
        assert result["success"] is True
        assert result["inventory"]["available"] == 1

        # 6. Reserve inventory
        result = reserve_inventory(session, case_id, exec_id, "PROD-HP01", "Mumbai", seq=6)
        assert result["success"] is True

        # 7. Create replacement
        result = create_replacement(session, case_id, exec_id, "Mumbai", seq=7)
        assert result["success"] is True
        assert result["warehouse"] == "Mumbai"

        # 8. Verify resolution
        result = verify_resolution(session, case_id, exec_id, seq=8)
        assert result["success"] is True
        assert result["verified"] is True
        assert result["case_status"] == "resolved"

        # 9. Check final inventory state
        inv = session.get(Inventory, "INV-001")
        assert inv.quantity == 0  # Decremented


# ─── Test 2: Conflict → replan → alternate warehouse → resolved ────────────

def test_inventory_conflict_replan_alternate_warehouse():
    """
    THE MOST IMPORTANT TEST.
    Mumbai first attempt fails due to conflict → agent finds Pune → succeeds.
    """
    with Session(engine) as session:
        case_id = "CASE-TEST-001"
        exec_id = "exec-002"

        # Set demo_conflict_pending = True
        case = session.get(SupportCase, case_id)
        case.demo_conflict_pending = True
        session.add(case)
        session.commit()

        # Check initial Mumbai inventory = 1
        result = get_inventory(session, case_id, exec_id, "PROD-HP01", "Mumbai", seq=1)
        assert result["inventory"]["available"] == 1

        # Attempt Mumbai replacement — should FAIL due to demo conflict
        result = create_replacement(session, case_id, exec_id, "Mumbai", seq=2)
        assert result["success"] is False
        assert result["error_code"] == "INVENTORY_UNAVAILABLE"

        # Verify Mumbai is now truly 0 (conflict was real, not fake)
        with Session(engine) as s2:
            inv_mumbai = s2.get(Inventory, "INV-001")
            assert inv_mumbai.quantity == 0, "Mumbai quantity should be 0 after conflict"

        # Agent replans: search inventory
        result = search_inventory(session, case_id, exec_id, "PROD-HP01", seq=3)
        assert result["success"] is True
        available = result["available_warehouses"]
        assert len(available) > 0
        pune_entry = next((w for w in available if w["warehouse"] == "Pune"), None)
        assert pune_entry is not None
        assert pune_entry["available"] == 2

        # Reserve Pune
        result = reserve_inventory(session, case_id, exec_id, "PROD-HP01", "Pune", seq=4)
        assert result["success"] is True

        # Create replacement from Pune
        result = create_replacement(session, case_id, exec_id, "Pune", seq=5)
        assert result["success"] is True
        assert result["warehouse"] == "Pune"

        # Verify resolution
        result = verify_resolution(session, case_id, exec_id, seq=6)
        assert result["success"] is True
        assert result["verified"] is True
        assert result["case_status"] == "resolved"

        # Final state checks
        with Session(engine) as s3:
            inv_pune = s3.get(Inventory, "INV-002")
            assert inv_pune.quantity == 1  # Was 2, decremented by 1
            order = s3.get(Order, "ORD-1042")
            assert order.status == "replacement_processing"
            case_final = s3.get(SupportCase, case_id)
            assert case_final.status == "resolved"


# ─── Test 3: verify_resolution rejects inconsistent state ─────────────────

def test_verify_resolution_rejects_inconsistent_state():
    """verify_resolution must fail when no replacement record exists."""
    with Session(engine) as session:
        case_id = "CASE-TEST-001"
        exec_id = "exec-003"

        # Don't create a replacement — just call verify directly
        result = verify_resolution(session, case_id, exec_id, seq=1)
        assert result["success"] is True
        assert result["verified"] is False  # Should fail: no replacement
        # Case should NOT be resolved
        case = session.get(SupportCase, case_id)
        assert case.status == "open"  # Unchanged


# ─── Test 4: Demo reset restores seed state ───────────────────────────────

def test_demo_reset_restores_seed_state():
    """POST /api/demo/reset must restore exact seed state."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # Dirty the state: mess with inventory
    with Session(engine) as session:
        inv = session.get(Inventory, "INV-001")
        inv.quantity = 0
        inv.reserved_quantity = 0
        session.add(inv)
        inv2 = session.get(Inventory, "INV-002")
        inv2.quantity = 0
        session.add(inv2)
        # Add a fake case
        session.add(SupportCase(
            id="CASE-DEMO-001", customer_id="CUST-001", order_id="ORD-1042",
            customer_message="My order arrived damaged. I want a replacement.",
            status="resolved", demo_conflict_pending=False,
        ))
        session.commit()

    # Reset
    response = client.post("/api/demo/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reset_complete"

    # Verify seed state restored
    with Session(engine) as session:
        inv_mumbai = session.get(Inventory, "INV-001")
        assert inv_mumbai.quantity == 1
        assert inv_mumbai.reserved_quantity == 0

        inv_pune = session.get(Inventory, "INV-002")
        assert inv_pune.quantity == 2
        assert inv_pune.reserved_quantity == 0

        inv_bengaluru = session.get(Inventory, "INV-003")
        assert inv_bengaluru.quantity == 0

        demo_case = session.get(SupportCase, "CASE-DEMO-001")
        assert demo_case is not None
        assert demo_case.status == "open"
        assert demo_case.demo_conflict_pending is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
