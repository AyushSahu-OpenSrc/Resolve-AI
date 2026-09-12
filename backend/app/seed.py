"""
Seed script — creates all required tables and populates exact seed data.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import (
    Customer, Product, Order, Inventory, Policy,
    SupportCase, Replacement, AgentExecution, AgentEvent
)


def seed():
    create_db_and_tables()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    with Session(engine) as session:
        # ── Clear existing data (idempotent seed) ──────────────────────────
        for model in [AgentEvent, AgentExecution, Replacement, SupportCase,
                      Inventory, Order, Policy, Product, Customer]:
            rows = session.exec(select(model)).all()
            for row in rows:
                session.delete(row)
        session.commit()

        # ── Hero-path Customer ─────────────────────────────────────────────
        customers = [
            Customer(id="CUST-001", name="Rahul Sharma",
                     email="rahul.sharma@example.com", tier="premium",
                     phone="+91-9876543210"),
            # Padding customers
            Customer(id="CUST-002", name="Priya Patel",
                     email="priya.patel@example.com", tier="standard"),
            Customer(id="CUST-003", name="Amit Verma",
                     email="amit.verma@example.com", tier="premium"),
            Customer(id="CUST-004", name="Sneha Reddy",
                     email="sneha.reddy@example.com", tier="standard"),
            Customer(id="CUST-005", name="Kiran Kumar",
                     email="kiran.kumar@example.com", tier="enterprise"),
            Customer(id="CUST-006", name="Meera Singh",
                     email="meera.singh@example.com", tier="standard"),
            Customer(id="CUST-007", name="Rohan Gupta",
                     email="rohan.gupta@example.com", tier="premium"),
        ]
        for c in customers:
            session.add(c)
        session.commit()

        # ── Products ───────────────────────────────────────────────────────
        products = [
            Product(id="PROD-HP01", name="Premium Wireless Headphones",
                    sku="WH-PRM-BLK-01", category="electronics",
                    price=4999.00,
                    description="Active noise cancellation, 40hr battery, premium build."),
            Product(id="PROD-SP02", name="Smart Speaker Pro",
                    sku="SS-PRO-WHT-02", category="electronics",
                    price=2999.00, description="360-degree sound, voice assistant."),
            Product(id="PROD-KB03", name="Mechanical Keyboard TKL",
                    sku="KB-TKL-BLK-03", category="peripherals",
                    price=3499.00, description="Cherry MX Brown switches."),
            Product(id="PROD-MS04", name="Ergonomic Mouse Pro",
                    sku="MS-ERG-SLV-04", category="peripherals",
                    price=1999.00, description="Vertical ergonomic design, wireless."),
        ]
        for p in products:
            session.add(p)
        session.commit()

        # ── Hero-path Order ────────────────────────────────────────────────
        orders = [
            Order(id="ORD-1042", customer_id="CUST-001", product_id="PROD-HP01",
                  status="delivered",
                  purchase_date=now - timedelta(days=10),
                  delivery_date=now - timedelta(days=4),
                  issue_type="damaged_on_arrival",
                  total_amount=4999.00, quantity=1),
            # Padding orders
            Order(id="ORD-1043", customer_id="CUST-001", product_id="PROD-HP01",
                  status="delivered",
                  purchase_date=now - timedelta(days=7),
                  delivery_date=now - timedelta(days=3),
                  issue_type="damaged_on_arrival",
                  total_amount=4999.00, quantity=1),
            Order(id="ORD-1050", customer_id="CUST-002", product_id="PROD-SP02",
                  status="delivered",
                  purchase_date=now - timedelta(days=15),
                  delivery_date=now - timedelta(days=10),
                  issue_type=None, total_amount=2999.00, quantity=1),
            Order(id="ORD-1051", customer_id="CUST-003", product_id="PROD-KB03",
                  status="shipped",
                  purchase_date=now - timedelta(days=3),
                  delivery_date=None, issue_type=None,
                  total_amount=3499.00, quantity=1),
            Order(id="ORD-1052", customer_id="CUST-004", product_id="PROD-MS04",
                  status="delivered",
                  purchase_date=now - timedelta(days=20),
                  delivery_date=now - timedelta(days=14),
                  issue_type="defective", total_amount=1999.00, quantity=1),
            Order(id="ORD-1053", customer_id="CUST-005", product_id="PROD-SP02",
                  status="processing",
                  purchase_date=now - timedelta(days=1),
                  delivery_date=None, issue_type=None,
                  total_amount=5998.00, quantity=2),
            Order(id="ORD-1054", customer_id="CUST-006", product_id="PROD-HP01",
                  status="delivered",
                  purchase_date=now - timedelta(days=30),
                  delivery_date=now - timedelta(days=25),
                  issue_type=None, total_amount=4999.00, quantity=1),
            Order(id="ORD-1055", customer_id="CUST-007", product_id="PROD-KB03",
                  status="delivered",
                  purchase_date=now - timedelta(days=8),
                  delivery_date=now - timedelta(days=5),
                  issue_type="wrong_item", total_amount=3499.00, quantity=1),
        ]
        for o in orders:
            session.add(o)
        session.commit()

        # ── Inventory ──────────────────────────────────────────────────────
        inventory = [
            # Hero-path inventory
            Inventory(id="INV-001", product_id="PROD-HP01",
                      warehouse="Mumbai", quantity=1, reserved_quantity=0),
            Inventory(id="INV-002", product_id="PROD-HP01",
                      warehouse="Pune", quantity=2, reserved_quantity=0),
            Inventory(id="INV-003", product_id="PROD-HP01",
                      warehouse="Bengaluru", quantity=0, reserved_quantity=0),
            # Other products
            Inventory(id="INV-004", product_id="PROD-SP02",
                      warehouse="Mumbai", quantity=5, reserved_quantity=0),
            Inventory(id="INV-005", product_id="PROD-SP02",
                      warehouse="Pune", quantity=3, reserved_quantity=0),
            Inventory(id="INV-006", product_id="PROD-KB03",
                      warehouse="Mumbai", quantity=8, reserved_quantity=0),
            Inventory(id="INV-007", product_id="PROD-KB03",
                      warehouse="Bengaluru", quantity=4, reserved_quantity=0),
            Inventory(id="INV-008", product_id="PROD-MS04",
                      warehouse="Mumbai", quantity=6, reserved_quantity=0),
            Inventory(id="INV-009", product_id="PROD-MS04",
                      warehouse="Pune", quantity=2, reserved_quantity=0),
        ]
        for inv in inventory:
            session.add(inv)
        session.commit()

        # ── Policies ───────────────────────────────────────────────────────
        import json
        policies = [
            Policy(
                id="POL-DMG-01",
                category="damaged_on_arrival",
                policy_text=(
                    "Replacement is permitted within 7 days of delivery for items confirmed "
                    "damaged on arrival. Refund is offered as an alternative on customer "
                    "request. Replacement is subject to inventory availability at the time "
                    "of fulfillment. Premium-tier customers receive expedited processing and "
                    "priority warehouse allocation."
                ),
                eligibility_rules_json=json.dumps({
                    "max_days_since_delivery": 7,
                    "requires_order_status": ["delivered"],
                    "allowed_issue_types": ["damaged_on_arrival", "defective"],
                    "expedited_tiers": ["premium"]
                }),
                active=True,
            ),
            Policy(
                id="POL-DEF-02",
                category="defective",
                policy_text=(
                    "Defective items are eligible for replacement or full refund within 30 "
                    "days of delivery. Customer must provide description of defect. "
                    "Replacement subject to availability."
                ),
                eligibility_rules_json=json.dumps({
                    "max_days_since_delivery": 30,
                    "requires_order_status": ["delivered"],
                    "allowed_issue_types": ["defective"],
                    "expedited_tiers": ["premium", "enterprise"]
                }),
                active=True,
            ),
            Policy(
                id="POL-WRG-03",
                category="wrong_item",
                policy_text=(
                    "Wrong item delivered: immediate replacement dispatched at no charge, "
                    "or full refund. No time limit on eligibility for wrong-item cases. "
                    "Original item pickup arranged by logistics."
                ),
                eligibility_rules_json=json.dumps({
                    "max_days_since_delivery": 90,
                    "requires_order_status": ["delivered"],
                    "allowed_issue_types": ["wrong_item"],
                    "expedited_tiers": ["standard", "premium", "enterprise"]
                }),
                active=True,
            ),
            Policy(
                id="POL-LAT-04",
                category="late_delivery",
                policy_text=(
                    "Late delivery compensation: discount coupon for standard tier, "
                    "partial refund for premium/enterprise tiers if delay exceeds 7 days."
                ),
                eligibility_rules_json=json.dumps({
                    "max_days_since_delivery": 14,
                    "requires_order_status": ["delivered"],
                    "allowed_issue_types": ["late_delivery"],
                    "expedited_tiers": ["premium", "enterprise"]
                }),
                active=True,
            ),
        ]
        for pol in policies:
            session.add(pol)
        session.commit()

        # ── Hero-path Support Case ─────────────────────────────────────────
        hero_case = SupportCase(
            id="CASE-DEMO-001",
            customer_id="CUST-001",
            order_id="ORD-1042",
            customer_message="My order arrived damaged. I want a replacement.",
            status="open",
            demo_conflict_pending=True,
        )
        session.add(hero_case)
        session.commit()

        print("[OK] Database seeded successfully.")
        print("  Hero case: CASE-DEMO-001 | Customer: CUST-001 | Order: ORD-1042")
        print("  Mumbai: qty=1, Pune: qty=2, Bengaluru: qty=0")


if __name__ == "__main__":
    seed()
