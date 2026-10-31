"""
Tests for ResolveAI 2.0 Persistent Customer Memory Subsystem.
"""
import pytest
from datetime import datetime, timezone
from sqlmodel import Session
from app.database import engine, create_db_and_tables
from app.models import Customer, Order, Product, CustomerPreference
from app.memory import (
    get_or_create_conversation, record_conversation_message,
    retrieve_customer_memory_snapshot, record_deferred_feedback, MemoryAccessError
)


@pytest.fixture(autouse=True)
def setup_memory_test_customer():
    create_db_and_tables()
    with Session(engine) as s:
        if not s.get(Customer, "CUST-MEM-01"):
            s.add(Customer(id="CUST-MEM-01", name="Kavita Rao", email="kavita@test.com", tier="premium"))
        if not s.get(Product, "PROD-MEM-01"):
            s.add(Product(id="PROD-MEM-01", name="Test Item", sku="ITEM-01", category="electronics", price=2499.0))
        
        ord = s.get(Order, "ORD-MEM-01")
        if not ord:
            s.add(Order(
                id="ORD-MEM-01",
                customer_id="CUST-MEM-01",
                product_id="PROD-MEM-01",
                status="delivered",
                purchase_date=datetime.now(timezone.utc).replace(tzinfo=None),
                delivery_date=datetime.now(timezone.utc).replace(tzinfo=None),
                total_amount=2499.0,
            ))
        s.commit()


def test_conversation_continuity():
    with Session(engine) as session:
        conv1 = get_or_create_conversation(session, "CUST-MEM-01", channel="chat")
        assert conv1.id is not None
        assert conv1.customer_id == "CUST-MEM-01"

        # Record messages
        msg1 = record_conversation_message(session, conv1.id, "customer", "My order arrived with damaged packaging.")
        msg2 = record_conversation_message(session, conv1.id, "agent", "I see your order ORD-MEM-01. Replacement is permitted.")
        assert msg1.id is not None
        assert msg2.sender == "agent"

        # Calling again returns same active conversation
        conv2 = get_or_create_conversation(session, "CUST-MEM-01", channel="chat")
        assert conv2.id == conv1.id


def test_customer_memory_snapshot():
    with Session(engine) as session:
        snapshot = retrieve_customer_memory_snapshot(session, "CUST-MEM-01")
        assert "error" not in snapshot
        assert snapshot["customer"]["name"] == "Kavita Rao"
        assert snapshot["customer"]["tier"] == "premium"
        assert snapshot["orders_count"] >= 1
        assert len(snapshot["recent_orders"]) >= 1
        assert "Kavita Rao" in snapshot["verified_facts_summary"]


def test_deferred_feedback_recorded():
    with Session(engine) as session:
        res = record_deferred_feedback(session, "CUST-MEM-01", "ORD-MEM-01", days_deferral=5)
        assert res["status"] == "deferred_recorded"
        assert "Understood" in res["message"]

        # Snapshot reflects deferred state
        snapshot = retrieve_customer_memory_snapshot(session, "CUST-MEM-01")
        assert snapshot["preferences"]["deferred_feedback"] is True

