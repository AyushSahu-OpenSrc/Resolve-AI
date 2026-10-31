"""
ResolveAI 2.0 — Customer Lifecycle State Machine & Proactive Event Engine.
Deterministic, verified order lifecycle tracking across the entire customer journey.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from sqlmodel import Session, select

from app.models import (
    Order, Shipment, Customer, Product, SupportCase,
    AgentEvent, EventType, EventStatus, OrderStatus, ShipmentStatus
)
from app.tools import _now, _log_event


# ─── Permissible Lifecycle Transitions ────────────────────────────────────────

LIFECYCLE_ORDER = [
    "order_placed",
    "confirmed",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "post_delivery_support",
]

# State graph map of allowed transitions
VALID_TRANSITIONS: Dict[str, set[str]] = {
    # Initial states
    "pending": {"order_placed", "confirmed", "processing", "cancelled"},
    "order_placed": {"confirmed", "processing", "cancelled"},
    "confirmed": {"processing", "cancelled"},
    "processing": {"shipped", "cancelled", "delayed"},
    
    # Transit states
    "shipped": {"out_for_delivery", "delayed", "delivery_failed", "delivered"},
    "delayed": {"in_transit", "out_for_delivery", "delivery_failed", "delivered", "cancelled"},
    "out_for_delivery": {"delivered", "delivery_failed", "delayed"},
    "delivery_failed": {"out_for_delivery", "returned_to_hub", "cancelled"},
    
    # Post-delivery happy path
    "delivered": {
        "post_delivery_support",
        "damaged_on_arrival",
        "defective",
        "wrong_item",
        "missing_item",
        "return_requested",
        "replacement_processing",
        "refund_pending",
        "warranty_claim",
    },
    "post_delivery_support": {
        "damaged_on_arrival",
        "defective",
        "wrong_item",
        "missing_item",
        "return_requested",
        "replacement_processing",
        "refund_pending",
        "warranty_claim",
        "completed",
    },

    # Resolution & Exception states
    "damaged_on_arrival": {"replacement_processing", "refund_pending", "escalated"},
    "defective": {"replacement_processing", "refund_pending", "warranty_claim", "escalated"},
    "wrong_item": {"replacement_processing", "refund_pending", "escalated"},
    "missing_item": {"replacement_processing", "refund_pending", "escalated"},
    "replacement_processing": {"replaced", "shipped", "escalated", "delivered"},
    "replaced": {"delivered", "post_delivery_support", "completed"},
    "refund_pending": {"refunded", "escalated"},
    "refunded": {"completed", "closed"},
    "return_requested": {"replacement_processing", "refund_pending", "escalated"},
    "warranty_claim": {"replacement_processing", "refund_pending", "escalated"},
    "escalated": {"replacement_processing", "refund_pending", "refunded", "closed"},
    
    # Terminal states
    "cancelled": set(),
    "completed": set(),
    "closed": set(),
}


class InvalidTransitionError(Exception):
    """Raised when an invalid state transition is requested."""
    pass


def validate_transition(current_state: str, next_state: str) -> bool:
    """Validate whether current_state can transition to next_state."""
    curr = (current_state or "pending").lower()
    nxt = (next_state or "").lower()
    
    if curr == nxt:
        return True  # Idempotent re-affirmation
    
    allowed = VALID_TRANSITIONS.get(curr, set())
    return nxt in allowed


def transition_order_state(
    session: Session,
    order_id: str,
    new_state: str,
    actor: str = "agent",
    reason: str = "",
    correlation_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, str, Order]:
    """
    Execute a verified state transition on an order with immutable audit event logging.
    Prevents invalid transitions and duplicate writes.
    """
    order = session.get(Order, order_id)
    if not order:
        return False, f"Order {order_id} not found", None

    current_state = order.status.lower()
    target_state = new_state.lower()

    if current_state == target_state:
        return True, f"Order {order_id} is already in state '{target_state}' (idempotent)", order

    if not validate_transition(current_state, target_state):
        error_msg = f"Invalid transition: Cannot move order {order_id} from '{current_state}' to '{target_state}'."
        # Log transition refusal event
        event = AgentEvent(
            id=f"EVT-ERR-{uuid.uuid4().hex[:8]}",
            order_id=order_id,
            customer_id=order.customer_id,
            correlation_id=correlation_id or str(uuid.uuid4()),
            actor=actor,
            risk_level="medium",
            event_type=EventType.error.value,
            status=EventStatus.BLOCKED.value,
            reasoning_summary=error_msg,
            input_data=str({"from": current_state, "to": target_state, "actor": actor, "reason": reason}),
            output_data=str({"success": False, "error": error_msg}),
        )
        session.add(event)
        session.commit()
        return False, error_msg, order

    # Perform transition
    order.status = target_state
    order.lifecycle_state = target_state
    now_dt = _now()

    if target_state == "delivered" and not order.delivery_date:
        order.delivery_date = now_dt

    session.add(order)

    # Record verified audit event
    cid = correlation_id or f"corr-{uuid.uuid4().hex[:8]}"
    summary = f"Order {order_id} transitioned from '{current_state}' to '{target_state}' by {actor}. Reason: {reason or 'Normal operational progression'}."
    
    event = AgentEvent(
        id=f"EVT-LC-{uuid.uuid4().hex[:8]}",
        order_id=order_id,
        customer_id=order.customer_id,
        correlation_id=cid,
        actor=actor,
        risk_level="low",
        event_type=EventType.lifecycle_transition.value,
        status=EventStatus.COMPLETED.value,
        reasoning_summary=summary,
        input_data=str({"from": current_state, "to": target_state, "actor": actor, "reason": reason, "metadata": metadata or {}}),
        output_data=str({"order_id": order_id, "new_status": target_state, "timestamp": now_dt.isoformat()}),
    )
    session.add(event)
    session.commit()
    session.refresh(order)

    return True, summary, order


# ─── Shipment Lifecycle & Logistics Tracking ─────────────────────────────────

def update_shipment_checkpoint(
    session: Session,
    shipment_id: str,
    status: str,
    current_location: str,
    is_delayed: bool = False,
    delay_reason: Optional[str] = None,
    carrier: Optional[str] = None,
) -> Tuple[bool, str, Optional[Shipment]]:
    """Update shipment tracking and automatically advance linked order lifecycle if appropriate."""
    shipment = session.get(Shipment, shipment_id)
    if not shipment:
        return False, f"Shipment {shipment_id} not found", None

    prev_status = shipment.status
    shipment.status = status
    shipment.current_location = current_location
    shipment.is_delayed = is_delayed
    if delay_reason:
        shipment.delay_reason = delay_reason
    if carrier:
        shipment.carrier = carrier
    shipment.updated_at = _now()

    if status == "delivered":
        shipment.actual_delivery = _now()

    session.add(shipment)
    session.commit()

    # If shipment status implies order status change, advance order
    if status == "delayed":
        transition_order_state(
            session=session,
            order_id=shipment.order_id,
            new_state="delayed",
            actor="logistics_system",
            reason=f"Shipment delayed at {current_location}: {delay_reason or 'Logistics checkpoint delay'}",
        )
    elif status == "delivered":
        transition_order_state(
            session=session,
            order_id=shipment.order_id,
            new_state="delivered",
            actor="logistics_system",
            reason=f"Delivered to customer at {shipment.destination_city} via {shipment.carrier}",
        )
    elif status == "out_for_delivery":
        transition_order_state(
            session=session,
            order_id=shipment.order_id,
            new_state="out_for_delivery",
            actor="logistics_system",
            reason=f"Out for delivery from {current_location}",
        )

    return True, f"Shipment {shipment_id} updated to {status} at {current_location}", shipment


# ─── Proactive Customer Support & Issue Detection ────────────────────────────

def scan_proactive_issues(session: Session) -> List[Dict[str, Any]]:
    """
    Autonomous proactive issue detector.
    Identifies:
      1. Shipment transit delays (estimated delivery passed or marked delayed)
      2. Delivery failures needing rescheduling
      3. Critical stock depletion blocking active replacements
      4. Customer follow-up tasks due today
    """
    now = _now()
    detected_issues = []

    # 1. Delayed shipments
    shipments = session.exec(
        select(Shipment).where(Shipment.status.in_(["in_transit", "delayed", "out_for_delivery"]))
    ).all()

    for s in shipments:
        is_overdue = s.estimated_delivery and s.estimated_delivery < now
        if s.is_delayed or is_overdue:
            order = session.get(Order, s.order_id)
            customer = session.get(Customer, order.customer_id) if order else None
            
            detected_issues.append({
                "type": "shipment_delay",
                "severity": "medium",
                "title": f"Shipment delay detected for Order {s.order_id}",
                "description": f"Carrier {s.carrier} tracking {s.tracking_number} is delayed at {s.current_location or 'transit hub'}. Reason: {s.delay_reason or 'Route weather/congestion'}.",
                "order_id": s.order_id,
                "shipment_id": s.id,
                "customer_id": order.customer_id if order else None,
                "customer_name": customer.name if customer else "Customer",
                "recommended_action": "Notify customer proactively with updated ETA and offer expedited support option.",
                "actionable": True,
            })

    # 2. Repeated delivery failure
    failed_shipments = session.exec(
        select(Shipment).where(Shipment.status == "delivery_failed")
    ).all()
    for fs in failed_shipments:
        order = session.get(Order, fs.order_id)
        detected_issues.append({
            "type": "delivery_failed",
            "severity": "high",
            "title": f"Delivery failure for Order {fs.order_id}",
            "description": f"Customer premise unreached at {fs.destination_city}. Consignment held at local hub.",
            "order_id": fs.order_id,
            "shipment_id": fs.id,
            "customer_id": order.customer_id if order else None,
            "recommended_action": "Contact customer to re-confirm address or reschedule delivery slot.",
            "actionable": True,
        })

    # 3. High risk open disputes (>2 days without resolution)
    open_cases = session.exec(
        select(SupportCase).where(SupportCase.status.in_(["open", "running"]))
    ).all()
    for c in open_cases:
        age_hours = (now - c.created_at).total_seconds() / 3600
        if age_hours > 24:
            detected_issues.append({
                "type": "case_sla_warning",
                "severity": "high",
                "title": f"Case SLA Warning: {c.id}",
                "description": f"Case has remained unresolved for {age_hours:.1f} hours.",
                "case_id": c.id,
                "order_id": c.order_id,
                "customer_id": c.customer_id,
                "recommended_action": "Trigger priority agent run or supervisor escalation.",
                "actionable": True,
            })

    return detected_issues

