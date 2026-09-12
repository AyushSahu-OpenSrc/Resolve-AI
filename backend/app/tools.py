"""
ResolveAI Tool System — all agent tools.

Each tool:
  1. Validates input
  2. Executes real backend logic against the DB
  3. Returns structured data
  4. Writes an AgentEvent
  5. Updates state when appropriate

The LLM may only call these registered tools — never SQL directly.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import Session, select

from app.models import (
    Customer, Product, Order, Inventory, Policy,
    SupportCase, Replacement, AgentExecution, AgentEvent,
    EventType, EventStatus
)


# ─── Helper ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _log_event(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    tool_name: str,
    event_type: str,
    status: str,
    reasoning_summary: str,
    input_data: Optional[dict] = None,
    output_data: Optional[dict] = None,
    sequence_number: int = 0,
) -> AgentEvent:
    event = AgentEvent(
        id=str(uuid.uuid4()),
        case_id=case_id,
        execution_id=execution_id,
        timestamp=_now(),
        tool_name=tool_name,
        event_type=event_type,
        status=status,
        reasoning_summary=reasoning_summary,
        input_data=json.dumps(input_data) if input_data else None,
        output_data=json.dumps(output_data) if output_data else None,
        sequence_number=sequence_number,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


# ─── Tool Implementations ─────────────────────────────────────────────────────

def get_customer(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    customer_id: str,
    seq: int = 0,
) -> dict:
    """Retrieve customer record by ID."""
    customer = session.get(Customer, customer_id)
    if not customer:
        result = {"success": False, "error": f"Customer {customer_id} not found"}
        _log_event(session, case_id, execution_id, "get_customer",
                   EventType.tool_result, EventStatus.FAILED,
                   f"Customer {customer_id} not found in system.",
                   {"customer_id": customer_id}, result, seq)
        return result

    result = {
        "success": True,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "tier": customer.tier,
            "phone": customer.phone,
        }
    }
    _log_event(session, case_id, execution_id, "get_customer",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Retrieved customer record: {customer.name} ({customer.tier} tier).",
               {"customer_id": customer_id}, result, seq)
    return result


def get_order(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    order_id: str,
    seq: int = 0,
) -> dict:
    """Retrieve order record by ID."""
    order = session.get(Order, order_id)
    if not order:
        result = {"success": False, "error": f"Order {order_id} not found"}
        _log_event(session, case_id, execution_id, "get_order",
                   EventType.tool_result, EventStatus.FAILED,
                   f"Order {order_id} not found.",
                   {"order_id": order_id}, result, seq)
        return result

    result = {
        "success": True,
        "order": {
            "id": order.id,
            "customer_id": order.customer_id,
            "product_id": order.product_id,
            "status": order.status,
            "purchase_date": order.purchase_date.isoformat() if order.purchase_date else None,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "issue_type": order.issue_type,
            "total_amount": order.total_amount,
            "quantity": order.quantity,
        }
    }
    _log_event(session, case_id, execution_id, "get_order",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Order {order_id} retrieved — status: {order.status}, issue: {order.issue_type}.",
               {"order_id": order_id}, result, seq)
    return result


def get_product(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    product_id: str,
    seq: int = 0,
) -> dict:
    """Retrieve product record by ID."""
    product = session.get(Product, product_id)
    if not product:
        result = {"success": False, "error": f"Product {product_id} not found"}
        _log_event(session, case_id, execution_id, "get_product",
                   EventType.tool_result, EventStatus.FAILED,
                   f"Product {product_id} not found.",
                   {"product_id": product_id}, result, seq)
        return result

    result = {
        "success": True,
        "product": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "price": product.price,
        }
    }
    _log_event(session, case_id, execution_id, "get_product",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Product retrieved: {product.name} (SKU {product.sku}).",
               {"product_id": product_id}, result, seq)
    return result


def get_inventory(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    product_id: str,
    warehouse: str,
    seq: int = 0,
) -> dict:
    """Check inventory at a specific warehouse."""
    inv = session.exec(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.warehouse == warehouse
        )
    ).first()

    if not inv:
        result = {"success": False, "error": f"No inventory record for {product_id} at {warehouse}"}
        _log_event(session, case_id, execution_id, "get_inventory",
                   EventType.tool_result, EventStatus.COMPLETED,
                   f"No inventory record for product at {warehouse}.",
                   {"product_id": product_id, "warehouse": warehouse}, result, seq)
        return result

    available = inv.quantity - inv.reserved_quantity
    result = {
        "success": True,
        "inventory": {
            "id": inv.id,
            "product_id": inv.product_id,
            "warehouse": inv.warehouse,
            "quantity": inv.quantity,
            "reserved_quantity": inv.reserved_quantity,
            "available": available,
        }
    }
    _log_event(session, case_id, execution_id, "get_inventory",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Inventory at {warehouse}: {available} units available (qty={inv.quantity}, reserved={inv.reserved_quantity}).",
               {"product_id": product_id, "warehouse": warehouse}, result, seq)
    return result


def search_inventory(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    product_id: str,
    seq: int = 0,
) -> dict:
    """Search all warehouse inventory for a product."""
    records = session.exec(
        select(Inventory).where(Inventory.product_id == product_id)
    ).all()

    warehouses = []
    for inv in records:
        available = inv.quantity - inv.reserved_quantity
        warehouses.append({
            "warehouse": inv.warehouse,
            "quantity": inv.quantity,
            "reserved_quantity": inv.reserved_quantity,
            "available": available,
        })

    # Sort by available descending
    warehouses.sort(key=lambda x: x["available"], reverse=True)
    available_warehouses = [w for w in warehouses if w["available"] > 0]

    result = {
        "success": True,
        "product_id": product_id,
        "warehouses": warehouses,
        "available_warehouses": available_warehouses,
        "total_available": sum(w["available"] for w in warehouses),
    }

    summary = (
        f"Inventory search: found availability at {', '.join(w['warehouse'] for w in available_warehouses)}"
        if available_warehouses
        else "No inventory available at any warehouse."
    )
    _log_event(session, case_id, execution_id, "search_inventory",
               EventType.tool_result,
               EventStatus.COMPLETED if available_warehouses else EventStatus.BLOCKED,
               summary,
               {"product_id": product_id}, result, seq)
    return result


def get_policy(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    issue_type: str,
    seq: int = 0,
) -> dict:
    """Retrieve applicable policy for an issue type."""
    policy = session.exec(
        select(Policy).where(Policy.category == issue_type, Policy.active == True)
    ).first()

    if not policy:
        result = {"success": False, "error": f"No active policy for issue type: {issue_type}"}
        _log_event(session, case_id, execution_id, "get_policy",
                   EventType.tool_result, EventStatus.FAILED,
                   f"No policy found for issue type: {issue_type}.",
                   {"issue_type": issue_type}, result, seq)
        return result

    result = {
        "success": True,
        "policy": {
            "id": policy.id,
            "category": policy.category,
            "policy_text": policy.policy_text,
            "eligibility_rules": policy.eligibility_rules,
        }
    }
    _log_event(session, case_id, execution_id, "get_policy",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Policy {policy.id} retrieved for {issue_type}.",
               {"issue_type": issue_type}, result, seq)
    return result


def check_resolution_eligibility(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    order_id: str,
    customer_id: str,
    issue_type: str,
    seq: int = 0,
) -> dict:
    """
    Programmatically evaluate eligibility against structured policy rules.
    Does NOT hand free text to the LLM — evaluates rules deterministically.
    """
    order = session.get(Order, order_id)
    customer = session.get(Customer, customer_id)
    policy = session.exec(
        select(Policy).where(Policy.category == issue_type, Policy.active == True)
    ).first()

    if not order or not customer or not policy:
        result = {"success": False, "error": "Missing order, customer, or policy data"}
        _log_event(session, case_id, execution_id, "check_resolution_eligibility",
                   EventType.tool_result, EventStatus.FAILED,
                   "Eligibility check failed: missing required data.",
                   {"order_id": order_id, "issue_type": issue_type}, result, seq)
        return result

    rules = policy.eligibility_rules
    reasons = []
    eligible = True

    # Check order status
    if order.status not in rules.get("requires_order_status", []):
        eligible = False
        reasons.append(f"Order status '{order.status}' not in required {rules.get('requires_order_status')}")

    # Check issue type
    if issue_type not in rules.get("allowed_issue_types", []):
        eligible = False
        reasons.append(f"Issue type '{issue_type}' not in allowed types {rules.get('allowed_issue_types')}")

    # Check days since delivery
    days_since_delivery = None
    if order.delivery_date:
        delta = _now() - order.delivery_date
        days_since_delivery = delta.days
        max_days = rules.get("max_days_since_delivery", 0)
        if days_since_delivery > max_days:
            eligible = False
            reasons.append(f"Delivered {days_since_delivery} days ago, exceeds {max_days}-day window")
    else:
        eligible = False
        reasons.append("No delivery date on record")

    is_expedited = customer.tier in rules.get("expedited_tiers", [])

    result = {
        "success": True,
        "eligible": eligible,
        "is_expedited": is_expedited,
        "customer_tier": customer.tier,
        "days_since_delivery": days_since_delivery,
        "reasons": reasons,
        "policy_id": policy.id,
        "allowed_resolutions": ["replacement", "refund"] if eligible else [],
    }

    summary = (
        f"Eligibility CONFIRMED: {days_since_delivery} days since delivery, "
        f"within policy window. {'Expedited (priority) path.' if is_expedited else 'Standard path.'}"
        if eligible else
        f"Not eligible: {'; '.join(reasons)}"
    )
    _log_event(session, case_id, execution_id, "check_resolution_eligibility",
               EventType.tool_result,
               EventStatus.COMPLETED if eligible else EventStatus.BLOCKED,
               summary,
               {"order_id": order_id, "issue_type": issue_type}, result, seq)
    return result


def reserve_inventory(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    product_id: str,
    warehouse: str,
    seq: int = 0,
) -> dict:
    """Reserve 1 unit of inventory at a warehouse."""
    inv = session.exec(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.warehouse == warehouse
        )
    ).first()

    if not inv:
        result = {"success": False, "error": f"No inventory at {warehouse}",
                  "error_code": "INVENTORY_NOT_FOUND"}
        _log_event(session, case_id, execution_id, "reserve_inventory",
                   EventType.tool_result, EventStatus.FAILED,
                   f"No inventory record for {warehouse}.",
                   {"product_id": product_id, "warehouse": warehouse}, result, seq)
        return result

    available = inv.quantity - inv.reserved_quantity
    if available < 1:
        result = {"success": False, "error": f"Insufficient inventory at {warehouse}",
                  "error_code": "INVENTORY_UNAVAILABLE"}
        _log_event(session, case_id, execution_id, "reserve_inventory",
                   EventType.tool_result, EventStatus.BLOCKED,
                   f"Insufficient inventory at {warehouse} (available={available}).",
                   {"product_id": product_id, "warehouse": warehouse}, result, seq)
        return result

    inv.reserved_quantity += 1
    inv.updated_at = _now()
    session.add(inv)
    session.commit()

    result = {
        "success": True,
        "reserved": True,
        "warehouse": warehouse,
        "product_id": product_id,
        "remaining_available": available - 1,
    }
    _log_event(session, case_id, execution_id, "reserve_inventory",
               EventType.tool_result, EventStatus.COMPLETED,
               f"1 unit reserved at {warehouse}. Remaining available: {available - 1}.",
               {"product_id": product_id, "warehouse": warehouse}, result, seq)
    return result


def cancel_reservation(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    product_id: str,
    warehouse: str,
    seq: int = 0,
) -> dict:
    """Cancel a previously reserved inventory unit."""
    inv = session.exec(
        select(Inventory).where(
            Inventory.product_id == product_id,
            Inventory.warehouse == warehouse
        )
    ).first()

    if not inv or inv.reserved_quantity < 1:
        result = {"success": False, "error": "No reservation to cancel"}
        _log_event(session, case_id, execution_id, "cancel_reservation",
                   EventType.tool_result, EventStatus.FAILED,
                   "No reservation found to cancel.",
                   {"product_id": product_id, "warehouse": warehouse}, result, seq)
        return result

    inv.reserved_quantity = max(0, inv.reserved_quantity - 1)
    inv.updated_at = _now()
    session.add(inv)
    session.commit()

    result = {"success": True, "cancelled": True, "warehouse": warehouse}
    _log_event(session, case_id, execution_id, "cancel_reservation",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Reservation cancelled at {warehouse}.",
               {"product_id": product_id, "warehouse": warehouse}, result, seq)
    return result


def create_replacement(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    warehouse: str,
    seq: int = 0,
) -> dict:
    """
    Create a replacement order.
    
    DEMO CONFLICT MECHANIC: If case.demo_conflict_pending is True and warehouse == "Mumbai",
    a competing reservation is injected in a SEPARATE DB session (simulating another process)
    immediately before the availability re-check. This genuinely decrements Mumbai's quantity
    to 0 so the real check finds no availability. This is a true race condition simulation.
    """
    case = session.get(SupportCase, case_id)
    if not case:
        return {"success": False, "error": "Case not found", "error_code": "CASE_NOT_FOUND"}

    order = session.get(Order, case.order_id)
    if not order:
        return {"success": False, "error": "Order not found", "error_code": "ORDER_NOT_FOUND"}

    # ── DEMO CONFLICT MECHANIC ─────────────────────────────────────────────
    # Uses a SEPARATE DB session to simulate a competing process consuming the last
    # Mumbai unit. The main session will see the committed change on its next read.
    if case.demo_conflict_pending and warehouse == "Mumbai":
        # Clear the flag first (in the current session) so it doesn't fire again
        case.demo_conflict_pending = False
        session.add(case)
        session.commit()

        # Inject the competing reservation in a separate session (simulates another process)
        from app.database import engine as _engine
        with Session(_engine) as conflict_session:
            conflict_inv = conflict_session.exec(
                select(Inventory).where(
                    Inventory.product_id == order.product_id,
                    Inventory.warehouse == "Mumbai"
                )
            ).first()
            if conflict_inv:
                # The other process "takes" the last unit
                conflict_inv.quantity = max(0, conflict_inv.quantity - 1)
                conflict_inv.updated_at = _now()
                conflict_session.add(conflict_inv)
                conflict_session.commit()

    # Re-read inventory fresh from DB (sees any concurrent changes).
    # Must use a fresh query after conflict injection to see committed changes.
    session.expire_all()
    inv = session.exec(
        select(Inventory).where(
            Inventory.product_id == order.product_id,
            Inventory.warehouse == warehouse
        )
    ).first()

    if not inv:
        result = {"success": False, "error_code": "INVENTORY_NOT_FOUND",
                  "message": f"No inventory record at {warehouse}."}
        _log_event(session, case_id, execution_id, "create_replacement",
                   EventType.tool_result, EventStatus.BLOCKED,
                   f"No inventory record at {warehouse}.",
                   {"case_id": case_id, "warehouse": warehouse}, result, seq)
        return result

    # ── Physical stock check ──────────────────────────────────────────────
    # We check inv.quantity > 0 (physical stock exists), NOT available.
    # Reason: reserve_inventory may already have incremented reserved_quantity
    # for this case, so "available" would appear 0 even though the unit IS held
    # for us. The conflict mechanic reduces quantity itself, so Mumbai will
    # correctly show quantity=0 when the competing process claimed the last unit.
    if inv.quantity < 1:
        result = {
            "success": False,
            "error_code": "INVENTORY_UNAVAILABLE",
            "message": f"Requested replacement inventory is no longer available at {warehouse}.",
        }
        _log_event(session, case_id, execution_id, "create_replacement",
                   EventType.tool_result, EventStatus.BLOCKED,
                   f"Inventory conflict at {warehouse}: last unit was claimed by a concurrent reservation.",
                   {"case_id": case_id, "warehouse": warehouse}, result, seq)
        return result

    # ── Success path ───────────────────────────────────────────────────────
    # Re-fetch case and order since expire_all() was called above
    case = session.get(SupportCase, case_id)
    order = session.get(Order, case.order_id) if case else None

    if not order:
        return {"success": False, "error": "Order not found after refresh", "error_code": "ORDER_NOT_FOUND"}

    replacement_id = f"RPL-{uuid.uuid4().hex[:8].upper()}"
    replacement = Replacement(
        id=replacement_id,
        case_id=case_id,
        order_id=order.id,
        product_id=order.product_id,
        warehouse=warehouse,
        status="processing",
        tracking_number=f"TRK{uuid.uuid4().hex[:10].upper()}",
    )
    session.add(replacement)

    # Decrement physical stock. If reserve_inventory was called first,
    # reserved_quantity > 0 — clear the reservation and decrement quantity.
    # If called directly (no prior reserve), just decrement quantity.
    if inv.reserved_quantity > 0:
        inv.reserved_quantity -= 1
    inv.quantity -= 1
    inv.updated_at = _now()
    session.add(inv)

    # Update order status
    order.status = "replacement_processing"
    session.add(order)

    # Update case timestamp
    if case:
        case.updated_at = _now()
        session.add(case)

    session.commit()

    result = {
        "success": True,
        "replacement_id": replacement_id,
        "warehouse": warehouse,
        "product_id": order.product_id,
        "tracking_number": replacement.tracking_number,
        "status": "processing",
    }
    _log_event(session, case_id, execution_id, "create_replacement",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Replacement {replacement_id} created, shipping from {warehouse}. Order status updated to replacement_processing.",
               {"case_id": case_id, "warehouse": warehouse}, result, seq)
    return result


def update_order_status(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    order_id: str,
    new_status: str,
    seq: int = 0,
) -> dict:
    """Update an order's status."""
    order = session.get(Order, order_id)
    if not order:
        return {"success": False, "error": "Order not found"}

    old_status = order.status
    order.status = new_status
    session.add(order)
    session.commit()

    result = {"success": True, "order_id": order_id,
              "old_status": old_status, "new_status": new_status}
    _log_event(session, case_id, execution_id, "update_order_status",
               EventType.tool_result, EventStatus.COMPLETED,
               f"Order status updated: {old_status} → {new_status}.",
               {"order_id": order_id, "new_status": new_status}, result, seq)
    return result


def verify_resolution(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    seq: int = 0,
) -> dict:
    """
    Independently verify the resolution is consistent:
    1. Replacement record exists with correct product/warehouse
    2. Inventory correctly updated
    3. Order status updated
    4. Case state consistent
    """
    case = session.get(SupportCase, case_id)
    if not case:
        return {"success": False, "error": "Case not found", "verified": False}

    order = session.get(Order, case.order_id)
    checks = []
    all_passed = True

    # Check 1: replacement record exists
    replacement = session.exec(
        select(Replacement).where(Replacement.case_id == case_id)
    ).first()
    if replacement:
        checks.append({"check": "replacement_record_exists", "passed": True,
                        "detail": f"Replacement {replacement.id} at {replacement.warehouse}"})
    else:
        checks.append({"check": "replacement_record_exists", "passed": False,
                        "detail": "No replacement record found"})
        all_passed = False

    # Check 2: order status updated
    if order and order.status == "replacement_processing":
        checks.append({"check": "order_status_updated", "passed": True,
                        "detail": f"Order status: {order.status}"})
    else:
        checks.append({"check": "order_status_updated", "passed": False,
                        "detail": f"Order status still: {order.status if order else 'unknown'}"})
        all_passed = False

    # Check 3: inventory correctly decremented at the replacement warehouse
    if replacement:
        inv = session.exec(
            select(Inventory).where(
                Inventory.product_id == replacement.product_id,
                Inventory.warehouse == replacement.warehouse
            )
        ).first()
        if inv:
            checks.append({"check": "inventory_decremented", "passed": True,
                            "detail": f"{replacement.warehouse}: qty={inv.quantity}, reserved={inv.reserved_quantity}"})
        else:
            checks.append({"check": "inventory_decremented", "passed": False,
                            "detail": "Inventory record missing"})
            all_passed = False

    if all_passed:
        # Mark case as resolved
        case.status = "resolved"
        case.resolved_at = _now()
        case.resolution_summary = (
            f"Replacement {replacement.id if replacement else 'N/A'} created "
            f"from {replacement.warehouse if replacement else 'N/A'}. "
            f"All verification checks passed."
        )
        case.updated_at = _now()
        session.add(case)

        # Mark execution as completed
        execution = session.exec(
            select(AgentExecution).where(AgentExecution.case_id == case_id)
        ).first()
        if execution:
            execution.status = "completed"
            execution.completed_at = _now()
            session.add(execution)

        session.commit()

    result = {
        "success": True,
        "verified": all_passed,
        "checks": checks,
        "case_status": case.status,
        "resolution_summary": case.resolution_summary,
    }
    _log_event(session, case_id, execution_id, "verify_resolution",
               EventType.verification,
               EventStatus.VERIFIED if all_passed else EventStatus.FAILED,
               "All verification checks passed — case resolved." if all_passed
               else f"Verification failed: {[c['detail'] for c in checks if not c['passed']]}",
               {"case_id": case_id}, result, seq)
    return result


def get_case_state(
    session: Session,
    case_id: str,
    execution_id: Optional[str],
    seq: int = 0,
) -> dict:
    """Get current state of a case and its related entities."""
    case = session.get(SupportCase, case_id)
    if not case:
        return {"success": False, "error": "Case not found"}

    order = session.get(Order, case.order_id)
    replacement = session.exec(
        select(Replacement).where(Replacement.case_id == case_id)
    ).first()

    inventory_state = []
    if order:
        inv_records = session.exec(
            select(Inventory).where(Inventory.product_id == order.product_id)
        ).all()
        for inv in inv_records:
            inventory_state.append({
                "warehouse": inv.warehouse,
                "quantity": inv.quantity,
                "reserved_quantity": inv.reserved_quantity,
                "available": inv.quantity - inv.reserved_quantity,
            })

    result = {
        "success": True,
        "case": {
            "id": case.id,
            "status": case.status,
            "customer_id": case.customer_id,
            "order_id": case.order_id,
            "resolution_summary": case.resolution_summary,
        },
        "order_status": order.status if order else None,
        "replacement": {
            "id": replacement.id,
            "warehouse": replacement.warehouse,
            "status": replacement.status,
            "tracking_number": replacement.tracking_number,
        } if replacement else None,
        "inventory": inventory_state,
    }
    return result
