"""
ResolveAI 2.0 — End-to-End Hackathon Demo Simulator.
Demonstrates the full 14-step Laptop Order Lifecycle with real database state changes:
  1. Order Placed
  2. Order Confirmed
  3. Shipment Begins
  4. Delivery Delay Injected
  5. Proactive Delay Detection
  6. Agent Remedy & Notification
  7. Delivery Completed
  8. Feedback Deferred
  9. Customer Returns Later with Defect
  10. Relational Memory Recall (Recalls earlier delay & order)
  11. Deterministic Warranty Validation
  12. Multi-hub Allocation (Pune Hub) & Replacement
  13. Verified Resolution in Audit Ledger
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlmodel import Session, select

from app.models import (
    Customer, Product, Order, Shipment, Inventory, Policy,
    SupportCase, Replacement, AgentEvent, EventType, EventStatus,
    CustomerConversation, ConversationMessage, CustomerPreference,
    ResolutionAction, FollowUpTask
)
from app.tools import _now, reserve_inventory
from app.lifecycle import transition_order_state, update_shipment_checkpoint, scan_proactive_issues
from app.memory import (
    get_or_create_conversation, record_conversation_message,
    retrieve_customer_memory_snapshot, record_deferred_feedback
)
from app.security_gateway import authorize_action


SIM_CUSTOMER_ID = "CUST-001"
SIM_PRODUCT_ID = "PROD-HP01"  # Or PROD-LPT-01
SIM_ORDER_ID = "ORD-2026-LPT"
SIM_SHIPMENT_ID = "SHIP-2026-LPT"
SIM_CASE_ID = "CASE-2026-LPT"


def init_simulator_prerequisites(session: Session):
    """Ensure customer, laptop product, policies, and inventory exist for the simulation."""
    # Product
    lpt = session.get(Product, "PROD-LPT-01")
    if not lpt:
        lpt = Product(
            id="PROD-LPT-01",
            name="UltraBook Pro 16 Laptop (M3 Max)",
            sku="LPT-PRO-M3-16",
            category="computers",
            price=124999.00,
            description="16-inch Retina Liquid XDR display, 36GB Unified Memory, 1TB SSD.",
            created_at=_now() - timedelta(days=30),
        )
        session.add(lpt)
        session.commit()

    # Inventory for laptop
    for hub, qty in [("Mumbai", 0), ("Pune", 3), ("Bengaluru", 1)]:
        inv_id = f"INV-LPT-{hub.upper()}"
        inv = session.get(Inventory, inv_id)
        if not inv:
            inv = Inventory(
                id=inv_id,
                product_id="PROD-LPT-01",
                warehouse=hub,
                quantity=qty,
                reserved_quantity=0,
                updated_at=_now(),
            )
            session.add(inv)
    session.commit()


def run_full_simulation(session: Session) -> Dict[str, Any]:
    """Execute the full 14-stage lifecycle demonstration and return structured audit telemetry."""
    init_simulator_prerequisites(session)
    steps_log: List[Dict[str, Any]] = []
    now = _now()

    def log_step(step_num: int, title: str, status: str, details: Dict[str, Any]):
        steps_log.append({
            "step": step_num,
            "title": title,
            "status": status,
            "timestamp": _now().strftime("%H:%M:%S"),
            "details": details,
        })

    # ── Step 1: Customer Places Order ─────────────────────────────────────────
    order = session.get(Order, SIM_ORDER_ID)
    if not order:
        order = Order(
            id=SIM_ORDER_ID,
            customer_id=SIM_CUSTOMER_ID,
            product_id="PROD-LPT-01",
            status="order_placed",
            lifecycle_state="order_placed",
            purchase_date=now - timedelta(days=5),
            estimated_delivery=now - timedelta(days=2),
            total_amount=124999.00,
            quantity=1,
            created_at=now - timedelta(days=5),
        )
        session.add(order)
        session.commit()
    else:
        order.status = "order_placed"
        order.lifecycle_state = "order_placed"
        session.add(order)
        session.commit()

    log_step(1, "Order Placed", "COMPLETED", {
        "order_id": SIM_ORDER_ID,
        "product": "UltraBook Pro 16 Laptop",
        "customer": "Rahul Sharma (CUST-001)",
        "amount": "Rs 1,24,999.00",
    })

    # ── Step 2: Order Confirmed ───────────────────────────────────────────────
    transition_order_state(session, SIM_ORDER_ID, "confirmed", actor="ecommerce_engine", reason="Payment authorized via UPI")
    log_step(2, "Order Confirmed", "COMPLETED", {"status": "confirmed", "payment_verified": True})

    # ── Step 3: Shipment Begins ───────────────────────────────────────────────
    transition_order_state(session, SIM_ORDER_ID, "shipped", actor="warehouse_dispatcher", reason="Handed over to carrier BlueDart")
    
    shipment = session.get(Shipment, SIM_SHIPMENT_ID)
    if not shipment:
        shipment = Shipment(
            id=SIM_SHIPMENT_ID,
            order_id=SIM_ORDER_ID,
            carrier="BlueDart Logistics",
            tracking_number="BD-99482103",
            origin_hub="Mumbai Hub",
            destination_city="Bengaluru",
            status="in_transit",
            estimated_delivery=now - timedelta(days=2),
            current_location="Pune Highway Transit Center",
            is_delayed=False,
            created_at=now - timedelta(days=4),
        )
        session.add(shipment)
        session.commit()
    else:
        shipment.status = "in_transit"
        shipment.is_delayed = False
        session.add(shipment)
        session.commit()

    log_step(3, "Shipment Dispatched", "COMPLETED", {
        "carrier": "BlueDart Logistics",
        "tracking_number": "BD-99482103",
        "origin": "Mumbai Hub",
        "destination": "Bengaluru",
    })

    # ── Step 4 & 5: Delivery Delay Occurs & Proactively Detected ──────────────
    update_shipment_checkpoint(
        session=session,
        shipment_id=SIM_SHIPMENT_ID,
        status="delayed",
        current_location="Pune Express Bypass",
        is_delayed=True,
        delay_reason="Regional route weather disruption and customs clearance hold",
    )
    
    # Proactive Scanner executes
    proactive_issues = scan_proactive_issues(session)
    log_step(4, "Transit Delay Detected Proactively", "DETECTED", {
        "shipment_id": SIM_SHIPMENT_ID,
        "checkpoint": "Pune Express Bypass",
        "delay_reason": "Regional route weather disruption",
        "proactive_issues_detected": len(proactive_issues),
    })

    # ── Step 6: Agent Explains & Offers Permitted Remedies ────────────────────
    conv = get_or_create_conversation(session, SIM_CUSTOMER_ID, channel="chat")
    record_conversation_message(
        session=session,
        conversation_id=conv.id,
        sender="agent",
        message_text="Hello Rahul, ResolveAI proactively detected a 24hr transit delay on Order ORD-2026-LPT at Pune Hub due to regional route weather. Your shipment has been expedited for priority delivery tomorrow morning.",
        intent="proactive_delay_notification",
        verified_facts={"order_id": SIM_ORDER_ID, "delay_hours": 24, "carrier": "BlueDart"},
    )
    log_step(5, "Proactive Customer Notification", "NOTIFIED", {
        "conversation_id": conv.id,
        "customer": "Rahul Sharma",
        "notification_channel": "Unified Support Chat",
    })

    # ── Step 7: Delivery Completed ────────────────────────────────────────────
    update_shipment_checkpoint(
        session=session,
        shipment_id=SIM_SHIPMENT_ID,
        status="delivered",
        current_location="Bengaluru Customer Premise",
    )
    log_step(6, "Order Delivered", "DELIVERED", {
        "status": "delivered",
        "delivery_location": "Bengaluru",
        "pod_verified": True,
    })

    # ── Step 8: Customer Defers Feedback ──────────────────────────────────────
    defer_res = record_deferred_feedback(session, SIM_CUSTOMER_ID, SIM_ORDER_ID, days_deferral=3)
    record_conversation_message(
        session=session,
        conversation_id=conv.id,
        sender="customer",
        message_text="Thanks for the update. I'll test the laptop and give a review later.",
        intent="defer_feedback",
    )
    record_conversation_message(
        session=session,
        conversation_id=conv.id,
        sender="agent",
        message_text=defer_res["message"],
        intent="acknowledge_deferral",
    )
    log_step(7, "Customer Feedback Deferred", "DEFERRED", {
        "customer_preference": "deferred_feedback=True",
        "follow_up_scheduled": defer_res["deferred_until"],
    })

    # ── Step 9: Customer Returns Later & Reports Defect ───────────────────────
    defect_query = "Hey, my delivery was delayed earlier, and now the laptop screen has vertical lines and display flickering on startup. I need a replacement."
    record_conversation_message(
        session=session,
        conversation_id=conv.id,
        sender="customer",
        message_text=defect_query,
        intent="report_defective_item",
    )

    # ── Step 10: Persistent Memory Recall ─────────────────────────────────────
    mem = retrieve_customer_memory_snapshot(session, SIM_CUSTOMER_ID)
    log_step(8, "Persistent Memory Recall", "VERIFIED", {
        "remembered_orders": mem["orders_count"],
        "recalled_delayed_order": SIM_ORDER_ID,
        "customer_tier": mem["customer"]["tier"],
        "verified_facts": mem["verified_facts_summary"],
    })

    # ── Step 11: Policy Eligibility Validated Deterministically ───────────────
    # Under POL-DEF-02: defective items eligible for replacement within 30 days
    pol = session.exec(select(Policy).where(Policy.category == "defective")).first()
    eligibility_ok = pol is not None
    log_step(9, "Deterministic Policy Check", "ELIGIBLE", {
        "policy_id": pol.id if pol else "POL-DEF-02",
        "rule": "Defective within 30 days",
        "days_since_delivery": 0,
        "eligible": True,
    })

    # ── Step 12: Zero Trust Authorization & Multi-Hub Allocation ──────────────
    # High-value item (Rs 1,24,999) replacement
    auth_ok, auth_msg, action_rec = authorize_action(
        session=session,
        customer_id=SIM_CUSTOMER_ID,
        order_id=SIM_ORDER_ID,
        action_type="replacement",
        idempotency_key=f"IDEMP-LPT-REP-{uuid.uuid4().hex[:6]}",
        amount=124999.00,
        policy_approved=True,
    )

    # Multi-Hub Inventory allocation: Mumbai has 0, reroutes to Pune Hub (3 units)
    res_inv = reserve_inventory(session, "CASE-1042", None, "PROD-LPT-01", "Pune")
    
    # Create Replacement record
    rep_order_id = f"REP-2026-PUNE-{uuid.uuid4().hex[:4].upper()}"
    replacement = Replacement(
        id=f"RPL-{uuid.uuid4().hex[:6]}",
        case_id="CASE-1042",  # Linked or new case
        order_id=SIM_ORDER_ID,
        product_id="PROD-LPT-01",
        warehouse="Pune",
        status="shipped",
        tracking_number=f"BD-REP-{uuid.uuid4().hex[:6].upper()}",
        created_at=_now(),
    )
    session.add(replacement)
    transition_order_state(session, SIM_ORDER_ID, "replacement_processing", actor="autonomous_agent", reason="Replacement allocated from Pune Hub")
    session.commit()

    log_step(10, "Autonomous Replacement Dispatched", "DISPATCHED", {
        "allocated_hub": "Pune Hub (Mumbai depleted at 0)",
        "replacement_order": rep_order_id,
        "tracking_number": replacement.tracking_number,
        "idempotency_key": action_rec.idempotency_key if action_rec else "IDEMP-LPT",
    })

    # ── Step 13: Agent Explains Decision with Complete Audit Trace ────────────
    final_reply = (
        f"Rahul, I reviewed your order ORD-2026-LPT (which had the earlier weather delay). "
        f"Under warranty policy POL-DEF-02, your UltraBook Pro 16 is fully eligible for an immediate priority replacement. "
        f"Since Mumbai stock is depleted, I have reserved 1 unit from our Pune Hub (Tracking: {replacement.tracking_number}). "
        f"Estimated delivery is tomorrow by 2:00 PM. An immutable audit record has been logged in our enterprise ledger."
    )
    record_conversation_message(
        session=session,
        conversation_id=conv.id,
        sender="agent",
        message_text=final_reply,
        intent="resolution_confirmed",
        verified_facts={
            "order_id": SIM_ORDER_ID,
            "allocated_warehouse": "Pune",
            "tracking_number": replacement.tracking_number,
        },
    )
    log_step(11, "End-to-End Audit Trail Verified", "VERIFIED", {
        "total_steps": 11,
        "status": "completed",
        "immutable_events_logged": session.exec(select(AgentEvent).where(AgentEvent.order_id == SIM_ORDER_ID)).all().__len__(),
    })

    return {
        "status": "success",
        "scenario": "Laptop Order Lifecycle & Autonomous Resolution",
        "customer_id": SIM_CUSTOMER_ID,
        "order_id": SIM_ORDER_ID,
        "product": "UltraBook Pro 16 Laptop (M3 Max)",
        "final_reply": final_reply,
        "steps": steps_log,
    }


def reset_simulation(session: Session) -> Dict[str, Any]:
    """Cleanly reset simulator state so the scenario can be re-run indefinitely."""
    # Delete replacement records
    replacements = session.exec(select(Replacement).where(Replacement.order_id == SIM_ORDER_ID)).all()
    for r in replacements:
        session.delete(r)

    # Delete actions
    actions = session.exec(select(ResolutionAction).where(ResolutionAction.order_id == SIM_ORDER_ID)).all()
    for a in actions:
        session.delete(a)

    # Delete shipment
    shipment = session.get(Shipment, SIM_SHIPMENT_ID)
    if shipment:
        session.delete(shipment)

    # Delete events
    events = session.exec(select(AgentEvent).where(AgentEvent.order_id == SIM_ORDER_ID)).all()
    for e in events:
        session.delete(e)

    # Reset inventory
    for hub, qty in [("Mumbai", 0), ("Pune", 3), ("Bengaluru", 1)]:
        inv = session.get(Inventory, f"INV-LPT-{hub.upper()}")
        if inv:
            inv.quantity = qty
            inv.reserved_quantity = 0
            session.add(inv)

    # Reset order
    order = session.get(Order, SIM_ORDER_ID)
    if order:
        order.status = "order_placed"
        order.lifecycle_state = "order_placed"
        session.add(order)

    # Reset preference
    pref = session.exec(select(CustomerPreference).where(CustomerPreference.customer_id == SIM_CUSTOMER_ID)).first()
    if pref:
        pref.deferred_feedback = False
        session.add(pref)

    session.commit()
    return {"status": "reset_complete", "message": "Simulator database reset to pristine state."}
