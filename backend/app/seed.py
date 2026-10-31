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
    Customer, Product, Order, Shipment, Inventory, Policy,
    SupportCase, Replacement, AgentExecution, AgentEvent,
    CustomerPreference, CustomerConversation, ConversationMessage,
    ResolutionAction, FollowUpTask, Feedback
)


def seed():
    create_db_and_tables()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    with Session(engine) as session:
        # ── Clear existing data (idempotent seed) ──────────────────────────
        for model in [ConversationMessage, CustomerConversation, CustomerPreference,
                      FollowUpTask, Feedback, ResolutionAction, Shipment,
                      AgentEvent, AgentExecution, Replacement, SupportCase,
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
            Order(id="ORD-1046", customer_id="CUST-004", product_id="PROD-HP01",
                  status="delivered",
                  purchase_date=now - timedelta(days=6),
                  delivery_date=now - timedelta(days=2),
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

        # ── Operational Cases ──────────────────────────────────────────────
        cases = [
            SupportCase(
                id="CASE-1042",
                customer_id="CUST-001",
                order_id="ORD-1042",
                customer_message="My headphones arrived damaged with cracked frame. Requesting priority replacement under warranty.",
                status="open",
                demo_conflict_pending=False,
                created_at=now - timedelta(minutes=45),
                updated_at=now - timedelta(minutes=45),
            ),
            SupportCase(
                id="CASE-1046",
                customer_id="CUST-004",
                order_id="ORD-1046",
                customer_message="UltraView Wireless Headphones arrived with shattered outer casing and damaged audio driver.",
                status="open",
                demo_conflict_pending=True,
                created_at=now - timedelta(minutes=30),
                updated_at=now - timedelta(minutes=30),
            ),
            SupportCase(
                id="CASE-1044",
                customer_id="CUST-002",
                order_id="ORD-1050",
                customer_message="Smart speaker has no sound from the left channel on initial setup.",
                status="open",
                demo_conflict_pending=False,
                created_at=now - timedelta(hours=2),
                updated_at=now - timedelta(hours=2),
            ),
            SupportCase(
                id="CASE-1045",
                customer_id="CUST-003",
                order_id="ORD-1051",
                customer_message="Mechanical keyboard switches broken upon delivery.",
                status="open",
                demo_conflict_pending=False,
                created_at=now - timedelta(hours=4),
                updated_at=now - timedelta(hours=4),
            ),
            SupportCase(
                id="CASE-DEMO-001",
                customer_id="CUST-001",
                order_id="ORD-1042",
                customer_message="My order arrived damaged. I want a replacement.",
                status="open",
                demo_conflict_pending=True,
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(hours=5),
            ),
        ]
        for c in cases:
            session.add(c)
        session.commit()

        # ── Shipments ──────────────────────────────────────────────────────
        shipments = [
            Shipment(
                id="SHIP-1042",
                order_id="ORD-1042",
                carrier="BlueDart",
                tracking_number="BD-1042-MUM",
                status="delivered",
                current_location="Mumbai Central Delivery Hub",
                origin_hub="Pune Hub",
                destination_city="Mumbai",
                is_delayed=False,
                actual_delivery=now - timedelta(days=4),
                estimated_delivery=now - timedelta(days=4),
            ),
            Shipment(
                id="SHIP-1046",
                order_id="ORD-1046",
                carrier="Delhivery",
                tracking_number="DEL-1046-BLR",
                status="delivered",
                current_location="Bengaluru South Hub",
                origin_hub="Mumbai Hub",
                destination_city="Bengaluru",
                is_delayed=False,
                actual_delivery=now - timedelta(days=2),
                estimated_delivery=now - timedelta(days=2),
            ),
            Shipment(
                id="SHIP-1050",
                order_id="ORD-1050",
                carrier="BlueDart",
                tracking_number="BD-1050-DEL",
                status="delivered",
                current_location="Delhi Hub",
                origin_hub="Pune Hub",
                destination_city="Delhi",
                is_delayed=False,
                actual_delivery=now - timedelta(days=10),
                estimated_delivery=now - timedelta(days=10),
            ),
            Shipment(
                id="SHIP-1051",
                order_id="ORD-1051",
                carrier="Shadowfax",
                tracking_number="SF-1051-HYD",
                status="in_transit",
                current_location="Nagpur Transit Hub",
                origin_hub="Mumbai Hub",
                destination_city="Hyderabad",
                is_delayed=True,
                delay_reason="Logistics hub congestion at Nagpur transit hub",
                estimated_delivery=now + timedelta(days=2),
            ),
            Shipment(
                id="SHIP-1052",
                order_id="ORD-1052",
                carrier="Delhivery",
                tracking_number="DEL-1052-PUN",
                status="delivered",
                current_location="Pune East Hub",
                origin_hub="Mumbai Hub",
                destination_city="Pune",
                is_delayed=False,
                actual_delivery=now - timedelta(days=14),
                estimated_delivery=now - timedelta(days=14),
            ),
            Shipment(
                id="SHIP-2026-LPT",
                order_id="ORD-2026-LPT",
                carrier="BlueDart Express",
                tracking_number="BD-2026-9941",
                status="shipped",
                current_location="Pune Highway Logistics Checkpoint",
                origin_hub="Pune Hub",
                destination_city="Mumbai",
                is_delayed=False,
                estimated_delivery=now + timedelta(hours=24),
            ),
        ]
        for s in shipments:
            session.add(s)
        session.commit()

        # ── Customer Preferences & Long-term Memory Facts ─────────────────
        preferences = [
            CustomerPreference(
                id="PREF-CUST-001",
                customer_id="CUST-001",
                preferred_contact_channel="chat",
                preferred_language="en-IN",
                notes="Prefers evening delivery slots between 6:00 PM - 9:00 PM; Verified Enterprise VIP; Never spam with repeated feedback surveys",
                deferred_feedback=True,
                updated_at=now,
            ),
            CustomerPreference(
                id="PREF-CUST-004",
                customer_id="CUST-004",
                preferred_contact_channel="whatsapp",
                preferred_language="en-IN",
                notes="Tech team lead at TechHub; Requires GST invoices for all hardware replacements",
                deferred_feedback=False,
                updated_at=now,
            ),
            CustomerPreference(
                id="PREF-CUST-002",
                customer_id="CUST-002",
                preferred_contact_channel="email",
                preferred_language="en-IN",
                notes="Prefers weekend deliveries; Home address has security gate code 4091",
                deferred_feedback=False,
                updated_at=now,
            ),
        ]
        for pref in preferences:
            session.add(pref)
        session.commit()

        # ── Customer Conversations & Multi-turn History ───────────────────
        conv = CustomerConversation(
            id="CONV-CUST-001-01",
            customer_id="CUST-001",
            channel="chat",
            status="active",
            summary="Defective headphones inquiry & replacement check",
            created_at=now - timedelta(days=3),
            last_active_at=now - timedelta(hours=2),
        )
        session.add(conv)
        session.commit()

        messages = [
            ConversationMessage(
                id="MSG-001",
                conversation_id="CONV-CUST-001-01",
                sender="customer",
                message_text="Hi, I received my headphones yesterday but the right earcup frame is cracked.",
                intent="report_damaged_item",
                created_at=now - timedelta(days=3, hours=4),
            ),
            ConversationMessage(
                id="MSG-002",
                conversation_id="CONV-CUST-001-01",
                sender="agent",
                message_text="I am sorry to hear that, Rahul. As an Enterprise Premium member, under policy POL-DMG-01, you are fully eligible for a priority replacement. I will verify our warehouse stock.",
                intent="reassure_and_verify",
                created_at=now - timedelta(days=3, hours=3, minutes=58),
            ),
            ConversationMessage(
                id="MSG-003",
                conversation_id="CONV-CUST-001-01",
                sender="customer",
                message_text="Can you ensure delivery after 6 PM? I am at work before that.",
                intent="set_delivery_preference",
                created_at=now - timedelta(days=3, hours=3, minutes=50),
            ),
            ConversationMessage(
                id="MSG-004",
                conversation_id="CONV-CUST-001-01",
                sender="agent",
                message_text="Understood. I have logged your evening delivery preference (6:00 PM - 9:00 PM) into your verified customer profile.",
                intent="confirm_preference",
                created_at=now - timedelta(days=3, hours=3, minutes=45),
            ),
        ]
        for m in messages:
            session.add(m)
        session.commit()

        print("[OK] Database seeded successfully.")
        print("  Hero case: CASE-DEMO-001 | Customer: CUST-001 | Order: ORD-1042")
        print("  Mumbai: qty=1, Pune: qty=2, Bengaluru: qty=0")


if __name__ == "__main__":
    seed()
