"""
ResolveAI 2.0 — Persistent Customer Memory Engine.
Structured long-term customer memory subsystem over relational SQLite/SQLModel.
Enforces customer-level authorization, distinguishes verified facts from assertions,
and retains conversational continuity across visits.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from sqlmodel import Session, select, desc

from app.models import (
    Customer, Order, Product, Shipment, SupportCase,
    CustomerConversation, ConversationMessage, CustomerPreference,
    FollowUpTask, Feedback, AgentEvent, EventType, EventStatus
)
from app.tools import _now


class MemoryAccessError(Exception):
    """Raised when an unauthorized customer access is attempted."""
    pass


def get_or_create_conversation(
    session: Session,
    customer_id: str,
    channel: str = "chat",
    conversation_id: Optional[str] = None,
) -> CustomerConversation:
    """Retrieve existing active conversation for customer or initialize a new persistent session."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise MemoryAccessError(f"Customer {customer_id} not registered")

    if conversation_id:
        conv = session.get(CustomerConversation, conversation_id)
        if conv:
            if conv.customer_id != customer_id:
                raise MemoryAccessError(f"Cross-customer privacy violation: Conversation {conversation_id} does not belong to {customer_id}")
            conv.last_active_at = _now()
            session.add(conv)
            session.commit()
            return conv

    # Find recent active conversation
    recent = session.exec(
        select(CustomerConversation)
        .where(CustomerConversation.customer_id == customer_id, CustomerConversation.status == "active")
        .order_by(desc(CustomerConversation.last_active_at))
    ).first()

    if recent:
        recent.last_active_at = _now()
        session.add(recent)
        session.commit()
        return recent

    # Create new conversation
    new_conv = CustomerConversation(
        id=f"CONV-{uuid.uuid4().hex[:8]}",
        customer_id=customer_id,
        channel=channel,
        status="active",
        summary="Customer support session",
        created_at=_now(),
        last_active_at=_now(),
    )
    session.add(new_conv)
    session.commit()
    session.refresh(new_conv)
    return new_conv


def record_conversation_message(
    session: Session,
    conversation_id: str,
    sender: str,
    message_text: str,
    intent: Optional[str] = None,
    tool_calls: Optional[List[Dict[str, Any]]] = None,
    verified_facts: Optional[Dict[str, Any]] = None,
) -> ConversationMessage:
    """Record an immutable turn in customer conversation with verified operational facts."""
    msg = ConversationMessage(
        id=f"MSG-{uuid.uuid4().hex[:8]}",
        conversation_id=conversation_id,
        sender=sender,
        message_text=message_text,
        intent=intent,
        tool_calls_json=json.dumps(tool_calls) if tool_calls else None,
        verified_facts_json=json.dumps(verified_facts) if verified_facts else None,
        created_at=_now(),
    )
    session.add(msg)
    
    # Update conversation last active timestamp
    conv = session.get(CustomerConversation, conversation_id)
    if conv:
        conv.last_active_at = _now()
        session.add(conv)

    session.commit()
    session.refresh(msg)
    return msg


def retrieve_customer_memory_snapshot(
    session: Session,
    customer_id: str,
    authorized_actor: str = "customer",
) -> Dict[str, Any]:
    """
    Retrieve full, authorized relational memory snapshot for a customer.
    Separates verified operational facts from conversational claims.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        return {"error": f"Customer {customer_id} not found"}

    # 1. Customer Preferences & Deferred State
    pref = session.exec(
        select(CustomerPreference).where(CustomerPreference.customer_id == customer_id)
    ).first()
    if not pref:
        pref = CustomerPreference(
            id=f"PREF-{customer_id}",
            customer_id=customer_id,
            preferred_contact_channel="chat",
            preferred_language="en-IN",
            deferred_feedback=False,
            updated_at=_now(),
        )
        session.add(pref)
        session.commit()
        session.refresh(pref)

    # 2. Historical Orders
    orders = session.exec(
        select(Order).where(Order.customer_id == customer_id).order_by(desc(Order.purchase_date))
    ).all()

    orders_memory = []
    for ord in orders:
        product = session.get(Product, ord.product_id)
        shipment = session.exec(
            select(Shipment).where(Shipment.order_id == ord.id)
        ).first()

        days_since_deliv = None
        if ord.delivery_date:
            days_since_deliv = (_now() - ord.delivery_date).days

        orders_memory.append({
            "order_id": ord.id,
            "status": ord.status,
            "lifecycle_state": ord.lifecycle_state or ord.status,
            "product_id": ord.product_id,
            "product_name": product.name if product else "Unknown Product",
            "product_sku": product.sku if product else None,
            "purchase_date": ord.purchase_date.strftime("%Y-%m-%d"),
            "delivery_date": ord.delivery_date.strftime("%Y-%m-%d") if ord.delivery_date else None,
            "days_since_delivery": days_since_deliv,
            "total_amount": ord.total_amount,
            "issue_type": ord.issue_type,
            "shipment": {
                "carrier": shipment.carrier,
                "tracking_number": shipment.tracking_number,
                "status": shipment.status,
                "is_delayed": shipment.is_delayed,
                "delay_reason": shipment.delay_reason,
            } if shipment else None,
        })

    # 3. Support Cases & Resolutions
    cases = session.exec(
        select(SupportCase).where(SupportCase.customer_id == customer_id).order_by(desc(SupportCase.created_at))
    ).all()

    cases_memory = []
    for c in cases:
        cases_memory.append({
            "case_id": c.id,
            "order_id": c.order_id,
            "customer_message": c.customer_message,
            "status": c.status,
            "resolution_summary": c.resolution_summary,
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        })

    # 4. Recent Conversation History
    recent_conv = session.exec(
        select(CustomerConversation)
        .where(CustomerConversation.customer_id == customer_id)
        .order_by(desc(CustomerConversation.last_active_at))
    ).first()

    conversation_history = []
    if recent_conv:
        messages = session.exec(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == recent_conv.id)
            .order_by(ConversationMessage.created_at)
        ).all()
        for m in messages[-8:]:  # Last 8 messages to conserve tokens
            conversation_history.append({
                "sender": m.sender,
                "text": m.message_text,
                "intent": m.intent,
                "timestamp": m.created_at.strftime("%H:%M:%S"),
            })

    # 5. Follow-Up Tasks & Deferred Feedback
    pending_tasks = session.exec(
        select(FollowUpTask)
        .where(FollowUpTask.customer_id == customer_id, FollowUpTask.status.in_(["scheduled", "deferred"]))
    ).all()

    tasks_memory = [{
        "task_id": t.id,
        "task_type": t.task_type,
        "status": t.status,
        "due_date": t.due_date.strftime("%Y-%m-%d"),
    } for t in pending_tasks]

    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "tier": customer.tier,
            "phone": customer.phone,
        },
        "preferences": {
            "deferred_feedback": pref.deferred_feedback,
            "preferred_contact_channel": pref.preferred_contact_channel,
            "preferred_language": pref.preferred_language,
        },
        "orders_count": len(orders),
        "recent_orders": orders_memory[:5],
        "open_cases": [c for c in cases_memory if c["status"] in ("open", "running")],
        "past_resolutions": [c for c in cases_memory if c["status"] == "resolved"],
        "follow_up_tasks": tasks_memory,
        "recent_conversation": conversation_history,
        "verified_facts_summary": (
            f"Customer {customer.name} ({customer.tier} tier) has {len(orders)} orders on record. "
            f"{len([c for c in cases_memory if c['status'] == 'resolved'])} past cases resolved. "
            + (f"Feedback deferred by customer request. " if pref.deferred_feedback else "")
        ),
    }


def record_deferred_feedback(
    session: Session,
    customer_id: str,
    order_id: str,
    days_deferral: int = 3,
) -> Dict[str, Any]:
    """Respect deferred customer feedback without repeatedly prompting."""
    pref = session.exec(
        select(CustomerPreference).where(CustomerPreference.customer_id == customer_id)
    ).first()
    now_dt = _now()
    due_dt = now_dt + timedelta(days=days_deferral)

    if not pref:
        pref = CustomerPreference(
            id=f"PREF-{customer_id}",
            customer_id=customer_id,
            deferred_feedback=True,
            deferred_feedback_date=due_dt,
            updated_at=now_dt,
        )
    else:
        pref.deferred_feedback = True
        pref.deferred_feedback_date = due_dt
        pref.updated_at = now_dt
    session.add(pref)

    # Schedule polite follow-up task
    task = FollowUpTask(
        id=f"TASK-FEEDBACK-{uuid.uuid4().hex[:6]}",
        customer_id=customer_id,
        order_id=order_id,
        task_type="review_request",
        status="deferred",
        due_date=due_dt,
        created_at=now_dt,
    )
    session.add(task)
    session.commit()

    return {
        "status": "deferred_recorded",
        "customer_id": customer_id,
        "order_id": order_id,
        "deferred_until": due_dt.strftime("%Y-%m-%d"),
        "message": f"Understood. Feedback collection postponed until {due_dt.strftime('%b %d, %Y')}. We will not prompt you again before then.",
    }
