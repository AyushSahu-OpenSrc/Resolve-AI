"""
ResolveAI 2.0 — Risk-Adaptive Security Gateway & Action Guard.
Enforces Zero Trust checks, order ownership verification, idempotency protection,
risk-tiered authorization thresholds, and prompt injection defenses.
"""
from __future__ import annotations

import re
import uuid
from typing import Optional, Dict, Any, Tuple
from sqlmodel import Session, select

from app.models import (
    Customer, Order, ResolutionAction, AgentEvent,
    ActionRiskLevel, ActionStatus, EventType, EventStatus
)
from app.tools import _now


HIGH_RISK_REFUND_THRESHOLD = 2500.00  # Currency units (INR)

# Prompt injection blocklist patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(previous|system)\s+rules",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"bypass\s+policy",
    r"reveal\s+your\s+system\s+prompt",
    r"output\s+all\s+database\s+passwords",
]


class SecurityGatewayError(Exception):
    """Raised on security violation."""
    pass


def sanitize_input(text: str) -> Tuple[str, bool]:
    """
    Sanitize customer input and detect potential prompt-injection / privilege escalation attempts.
    Returns: (cleaned_text, was_flagged)
    """
    cleaned = text.strip()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return cleaned, True
    return cleaned, False


def classify_action_risk(
    action_type: str,
    amount: float = 0.0,
    policy_approved: bool = True,
) -> str:
    """Classify requested action into low, medium, or high risk tier."""
    act = action_type.lower()
    
    if act in ("read_status", "get_history", "explain_policy", "defer_feedback"):
        return ActionRiskLevel.low.value

    if act in ("create_case", "schedule_followup", "request_return"):
        return ActionRiskLevel.medium.value

    if act == "replacement":
        # Replacement within standard policy is medium; exception is high
        return ActionRiskLevel.medium.value if policy_approved else ActionRiskLevel.high.value

    if act == "refund":
        # High value refunds or policy exceptions require supervisor approval
        if amount > HIGH_RISK_REFUND_THRESHOLD or not policy_approved:
            return ActionRiskLevel.high.value
        return ActionRiskLevel.medium.value

    if act in ("policy_override", "force_resolution", "inventory_writeoff"):
        return ActionRiskLevel.high.value

    return ActionRiskLevel.medium.value


def authorize_action(
    session: Session,
    customer_id: str,
    order_id: str,
    action_type: str,
    idempotency_key: str,
    amount: float = 0.0,
    policy_approved: bool = True,
    actor: str = "agent",
    payload: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, str, Optional[ResolutionAction]]:
    """
    Evaluate action eligibility under Zero Trust principles:
      1. Customer ownership of order verified
      2. Duplicate action / Idempotency checked
      3. Risk classification evaluated
      4. Auto-approval for low/medium risk; approval queue for high risk
    """
    # 1. Ownership check
    order = session.get(Order, order_id)
    if not order:
        return False, f"Order {order_id} does not exist", None

    if order.customer_id != customer_id:
        # Cross-customer access attempt
        error_msg = f"Zero Trust violation: Customer {customer_id} is not the owner of Order {order_id}."
        _log_security_event(session, customer_id, order_id, action_type, "BLOCKED", error_msg)
        return False, error_msg, None

    # 2. Idempotency Check
    existing_action = session.exec(
        select(ResolutionAction).where(ResolutionAction.idempotency_key == idempotency_key)
    ).first()

    if existing_action:
        return True, f"Idempotent action re-affirmed (status: {existing_action.status})", existing_action

    # 3. Duplicate Refund / Duplicate Replacement Protection
    if action_type in ("refund", "replacement"):
        duplicate = session.exec(
            select(ResolutionAction).where(
                ResolutionAction.order_id == order_id,
                ResolutionAction.action_type == action_type,
                ResolutionAction.status.in_(["approved", "executed", "pending_approval"])
            )
        ).first()

        if duplicate:
            msg = f"Duplicate action prevented: Order {order_id} already has a {action_type} action ({duplicate.id}, status: {duplicate.status})."
            _log_security_event(session, customer_id, order_id, action_type, "BLOCKED", msg)
            return False, msg, None

    # 4. Risk Classification
    risk = classify_action_risk(action_type, amount, policy_approved)
    status = ActionStatus.pending_approval.value if risk == ActionRiskLevel.high.value else ActionStatus.approved.value

    action_record = ResolutionAction(
        id=f"ACT-{uuid.uuid4().hex[:8]}",
        order_id=order_id,
        customer_id=customer_id,
        action_type=action_type,
        risk_level=risk,
        status=status,
        idempotency_key=idempotency_key,
        payload_json=str(payload or {}),
        cost_estimate=amount,
        approved_by="autonomous_agent" if status == "approved" else None,
        created_at=_now(),
    )
    session.add(action_record)
    session.commit()
    session.refresh(action_record)

    # 5. Log Security & Action Event
    _log_security_event(
        session, customer_id, order_id, action_type,
        "COMPLETED" if status == "approved" else "PENDING_APPROVAL",
        f"Action {action_type} authorized at risk level '{risk}'. Status: {status}."
    )

    if status == "pending_approval":
        return True, f"Action requires high-risk supervisor authorization (Amount: Rs {amount:,.2f} > Rs {HIGH_RISK_REFUND_THRESHOLD:,.2f}). Enqueued for approval.", action_record

    return True, f"Action {action_type} authorized autonomously (Risk: {risk}).", action_record


def _log_security_event(
    session: Session,
    customer_id: str,
    order_id: str,
    action_type: str,
    status: str,
    reasoning: str,
):
    """Write immutable security verification record to AgentEvent table."""
    event = AgentEvent(
        id=f"EVT-SEC-{uuid.uuid4().hex[:8]}",
        order_id=order_id,
        customer_id=customer_id,
        actor="security_gateway",
        risk_level="high" if "violation" in reasoning.lower() else "low",
        event_type=EventType.security_check.value,
        status=status,
        reasoning_summary=reasoning,
        input_data=str({"customer_id": customer_id, "order_id": order_id, "action": action_type}),
        output_data=str({"authorized": status != "BLOCKED"}),
    )
    session.add(event)
    session.commit()

