"""
SQLModel database models for ResolveAI.
All models use SQLite via SQLModel. Production would swap to managed Postgres.
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
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    replacement_processing = "replacement_processing"
    refunded = "refunded"
    cancelled = "cancelled"


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


class EventStatus(str, Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    REPLANNING = "REPLANNING"
    VERIFIED = "VERIFIED"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"


class ReplacementStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


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
    purchase_date: datetime
    delivery_date: Optional[datetime] = None
    issue_type: Optional[str] = None
    total_amount: float
    quantity: int = Field(default=1)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


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
    category: str  # damaged_on_arrival, defective, wrong_item, etc.
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
    case_id: str = Field(foreign_key="support_cases.id")
    execution_id: Optional[str] = Field(default=None, foreign_key="agent_executions.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tool_name: Optional[str] = None
    event_type: str
    status: str = Field(default="COMPLETED")
    reasoning_summary: str  # User-safe one-liner, never raw chain-of-thought
    input_data: Optional[str] = None   # JSON string
    output_data: Optional[str] = None  # JSON string
    sequence_number: int = Field(default=0)
