"""
Tests for ResolveAI 2.0 Order Lifecycle State Machine and Logistics Checkpoints.
"""
import pytest
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import Order, Customer, Product, Shipment, AgentEvent
from app.lifecycle import transition_order_state, update_shipment_checkpoint, validate_transition


@pytest.fixture(autouse=True)
def setup_lifecycle_db():
    create_db_and_tables()
    with Session(engine) as s:
        # Ensure test customer and product
        if not s.get(Customer, "CUST-LC-01"):
            s.add(Customer(id="CUST-LC-01", name="Test Customer", email="test@lifecycle.com"))
        if not s.get(Product, "PROD-LC-01"):
            s.add(Product(id="PROD-LC-01", name="Lifecycle Item", sku="LC-01", category="electronics", price=1999.0))
        
        # Test order
        ord = s.get(Order, "ORD-LC-TEST")
        if ord:
            s.delete(ord)
        s.add(Order(
            id="ORD-LC-TEST",
            customer_id="CUST-LC-01",
            product_id="PROD-LC-01",
            status="order_placed",
            lifecycle_state="order_placed",
            purchase_date=datetime.now(timezone.utc).replace(tzinfo=None),
            total_amount=1999.0,
        ))
        s.commit()


def test_valid_lifecycle_transitions():
    with Session(engine) as session:
        # order_placed -> confirmed
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "confirmed", actor="ecommerce")
        assert ok is True
        assert ord.status == "confirmed"

        # confirmed -> processing
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "processing", actor="fulfillment")
        assert ok is True
        assert ord.status == "processing"

        # processing -> shipped
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "shipped", actor="warehouse")
        assert ok is True
        assert ord.status == "shipped"

        # shipped -> out_for_delivery
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "out_for_delivery", actor="carrier")
        assert ok is True
        assert ord.status == "out_for_delivery"

        # out_for_delivery -> delivered
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "delivered", actor="carrier")
        assert ok is True
        assert ord.status == "delivered"
        assert ord.delivery_date is not None


def test_invalid_lifecycle_transition_is_blocked():
    with Session(engine) as session:
        # Invalid: order_placed directly to delivered
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "delivered", actor="malicious_actor")
        assert ok is False
        assert "Invalid transition" in msg
        # State must remain order_placed
        assert ord.status == "order_placed"


def test_idempotent_transition():
    with Session(engine) as session:
        ok, msg, ord = transition_order_state(session, "ORD-LC-TEST", "order_placed", actor="system")
        assert ok is True
        assert "idempotent" in msg.lower()

