"""
SQLModel database models for ResolveAI 2.0.
Autonomous Customer Lifecycle Intelligence & Resolution Platform.
All models use SQLite via SQLModel. Production can swap to managed Postgres.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, create_engine, Session, select
from enum import Enum


# ─── Enums ──────────────────────────────────────────────────────────────────

class CustomerTier(str, Enum):
    standard = "standard"
    premium = "premium"
    enterprise = "enterprise"


class OrderStatus(str, Enum):
    # Standard Lifecycle
    order_placed = "order_placed"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    post_delivery_support = "post_delivery_support"
    
    # Legacy / Compatible aliases
    pending = "pending"
    
    # Exception & Resolution States
    delayed = "delayed"
    delivery_failed = "delivery_failed"
    missing_item = "missing_item"
    wrong_item = "wrong_item"
    damaged_on_arrival = "damaged_on_arrival"
    defective = "defective"
    cancelled = "cancelled"
    refund_pending = "refund_pending"
    refunded = "refunded"
    return_requested = "return_requested"
    replacement_processing = "replacement_processing"
    replaced = "replaced"
    warranty_claim = "warranty_claim"
    escalated = "escalated"


class CaseStatus(str, Enum):
    open = "open"
    running = "running"
    resolved = "resolved"
    escalated = "escalated"
    failed = "failed"


class EventType(str, Enum):
    tool_call = "tool_call"
    tool_result = "tool_result"
    observation = "observation"
    decision = "decision"
    replan = "replan"
    escalation = "escalation"
    verification = "verification"
    error = "error"
    lifecycle_transition = "lifecycle_transition"
    proactive_detection = "proactive_detection"
    security_check = "security_check"
    memory_recall = "memory_recall"
    action_approval = "action_approval"


class EventStatus(str, Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    REPLANNING = "REPLANNING"
    VERIFIED = "VERIFIED"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"
    PENDING_APPROVAL = "PENDING_APPROVAL"


class ReplacementStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class ShipmentStatus(str, Enum):
    label_created = "label_created"
    in_transit = "in_transit"
    delayed = "delayed"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    delivery_failed = "delivery_failed"


class ActionRiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ActionStatus(str, Enum):
    pending_approval = "pending_approval"
    approved = "approved"
    executed = "executed"
    rejected = "rejected"


# ─── Database Models ─────────────────────────────────────────────────────────

class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    id: str = Field(primary_key=True)
    name: str
    email: str
    tier: str = Field(default="standard")
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: str = Field(primary_key=True)
    name: str
    sku: str
    category: str
    price: float
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: str = Field(primary_key=True)
    customer_id: str = Field(foreign_key="customers.id")
    product_id: str = Field(foreign_key="products.id")
    status: str = Field(default="pending")
    lifecycle_state: Optional[str] = Field(default="processing")
    purchase_date: datetime
    estimated_delivery: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    issue_type: Optional[str] = None
    total_amount: float
    quantity: int = Field(default=1)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Shipment(SQLModel, table=True):
    __tablename__ = "shipments"

    id: str = Field(primary_key=True)
    order_id: str = Field(foreign_key="orders.id")
    carrier: str = Field(default="BlueDart Logistics")
    tracking_number: str
    origin_hub: str = Field(default="Mumbai Hub")
    destination_city: str = Field(default="Bengaluru")
    status: str = Field(default="in_transit")  # ShipmentStatus
    estimated_delivery: datetime
    actual_delivery: Optional[datetime] = None
    is_delayed: bool = Field(default=False)
    delay_reason: Optional[str] = None
    current_location: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Inventory(SQLModel, table=True):
    __tablename__ = "inventory"

    id: str = Field(primary_key=True)
    product_id: str = Field(foreign_key="products.id")
    warehouse: str
    quantity: int = Field(default=0)
    reserved_quantity: int = Field(default=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Policy(SQLModel, table=True):
    __tablename__ = "policies"

    id: str = Field(primary_key=True)
    category: str  # damaged_on_arrival, defective, wrong_item, delay, etc.
    policy_text: str
    eligibility_rules_json: str  # JSON string of structured rules
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def eligibility_rules(self) -> dict:
        return json.loads(self.eligibility_rules_json)


class SupportCase(SQLModel, table=True):
    __tablename__ = "support_cases"

    id: str = Field(primary_key=True)
    customer_id: str = Field(foreign_key="customers.id")
    order_id: str = Field(foreign_key="orders.id")
    customer_message: str
    status: str = Field(default="open")
    resolution_summary: Optional[str] = None
    demo_conflict_pending: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None


class Replacement(SQLModel, table=True):
    __tablename__ = "replacements"

    id: str = Field(primary_key=True)
    case_id: str = Field(foreign_key="support_cases.id")
    order_id: str = Field(foreign_key="orders.id")
    product_id: str = Field(foreign_key="products.id")
    warehouse: str
    status: str = Field(default="pending")
    tracking_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentExecution(SQLModel, table=True):
    __tablename__ = "agent_executions"

    id: str = Field(primary_key=True)
    case_id: str = Field(foreign_key="support_cases.id")
    status: str = Field(default="running")
    total_turns: int = Field(default=0)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class AgentEvent(SQLModel, table=True):
    __tablename__ = "agent_events"

    id: str = Field(primary_key=True)
    case_id: Optional[str] = Field(default=None, foreign_key="support_cases.id")
    execution_id: Optional[str] = Field(default=None, foreign_key="agent_executions.id")
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id")
    customer_id: Optional[str] = Field(default=None, foreign_key="customers.id")
    conversation_id: Optional[str] = None
    correlation_id: Optional[str] = None
    actor: Optional[str] = Field(default="agent")
    risk_level: Optional[str] = Field(default="low")
    idempotency_key: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tool_name: Optional[str] = None
    event_type: str
    status: str = Field(default="COMPLETED")
    reasoning_summary: str  # User-safe one-liner, never raw chain-of-thought
    input_data: Optional[str] = None   # JSON string
    output_data: Optional[str] = None  # JSON string
    sequence_number: int = Field(default=0)


# ─── ResolveAI 2.0 Memory & Lifecycle Entities ───────────────────────────────

class CustomerConversation(SQLModel, table=True):
    __tablename__ = "customer_conversations"

    id: str = Field(primary_key=True)
    customer_id: str = Field(foreign_key="customers.id")
    channel: str = Field(default="chat")  # chat, voice_mic, email, web
    status: str = Field(default="active")  # active, closed, follow_up_scheduled
    summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime = Field(default_factory=datetime.utcnow)


class ConversationMessage(SQLModel, table=True):
    __tablename__ = "conversation_messages"

    id: str = Field(primary_key=True)
    conversation_id: str = Field(foreign_key="customer_conversations.id")
    sender: str = Field(default="customer")  # customer, agent, system
    message_text: str
    intent: Optional[str] = None
    tool_calls_json: Optional[str] = None
    verified_facts_json: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CustomerPreference(SQLModel, table=True):
    __tablename__ = "customer_preferences"

    id: str = Field(primary_key=True)
    customer_id: str = Field(foreign_key="customers.id", unique=True)
    preferred_contact_channel: str = Field(default="chat")
    deferred_feedback: bool = Field(default=False)
    deferred_feedback_date: Optional[datetime] = None
    preferred_language: str = Field(default="en-IN")
    satisfaction_score: Optional[int] = None
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResolutionAction(SQLModel, table=True):
    __tablename__ = "resolution_actions"

    id: str = Field(primary_key=True)
    case_id: Optional[str] = Field(default=None, foreign_key="support_cases.id")
    order_id: str = Field(foreign_key="orders.id")
    customer_id: str = Field(foreign_key="customers.id")
    action_type: str  # replacement, refund, reroute, goodwill_coupon, warranty_claim, escalate
    risk_level: str = Field(default="low")  # low, medium, high
    status: str = Field(default="approved")  # pending_approval, approved, executed, rejected
    idempotency_key: str = Field(unique=True)
    payload_json: Optional[str] = None
    cost_estimate: float = Field(default=0.0)
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None


class FollowUpTask(SQLModel, table=True):
    __tablename__ = "follow_up_tasks"

    id: str = Field(primary_key=True)
    customer_id: str = Field(foreign_key="customers.id")
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id")
    task_type: str = Field(default="satisfaction_check")  # review_request, satisfaction_check, replacement_verification, delay_remedy
    status: str = Field(default="scheduled")  # scheduled, completed, deferred, cancelled
    due_date: datetime
    customer_response: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class Feedback(SQLModel, table=True):
    __tablename__ = "feedbacks"

    id: str = Field(primary_key=True)
    customer_id: str = Field(foreign_key="customers.id")
    order_id: str = Field(foreign_key="orders.id")
    product_id: Optional[str] = Field(default=None, foreign_key="products.id")
    rating: Optional[int] = None  # 1-5
    comment: Optional[str] = None
    sentiment: Optional[str] = None  # positive, neutral, negative
    is_deferred: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
