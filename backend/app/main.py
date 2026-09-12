"""
ResolveAI FastAPI application.
"""
from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import create_db_and_tables, get_session, engine
from app.models import (
    Customer, Order, Product, Inventory, Policy,
    SupportCase, Replacement, AgentEvent, AgentExecution
)
from app.tools import _now
import app.seed as seed_module

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ResolveAI API",
    description="Autonomous customer resolution agent — agentic AI backend",
    version="1.0.0",
)

# CORS
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# ─── Request/Response Models ──────────────────────────────────────────────────

class CreateCaseRequest(BaseModel):
    customer_id: str
    order_id: str
    customer_message: str
    demo_mode: bool = False


class CaseResponse(BaseModel):
    id: str
    customer_id: str
    order_id: str
    customer_message: str
    status: str
    resolution_summary: Optional[str]
    demo_conflict_pending: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]


class AgentEventResponse(BaseModel):
    id: str
    case_id: str
    execution_id: Optional[str]
    timestamp: datetime
    tool_name: Optional[str]
    event_type: str
    status: str
    reasoning_summary: str
    input_data: Optional[str]
    output_data: Optional[str]
    sequence_number: int


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "resolveai-api", "version": "1.0.0"}


# ─── Customers ────────────────────────────────────────────────────────────────

@app.get("/api/customers")
def list_customers(session: Session = Depends(get_session)):
    customers = session.exec(select(Customer)).all()
    return [{"id": c.id, "name": c.name, "email": c.email,
             "tier": c.tier, "phone": c.phone} for c in customers]


@app.get("/api/customers/{customer_id}")
def get_customer_api(customer_id: str, session: Session = Depends(get_session)):
    c = session.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "Customer not found")
    return {"id": c.id, "name": c.name, "email": c.email, "tier": c.tier, "phone": c.phone}


# ─── Orders ───────────────────────────────────────────────────────────────────

@app.get("/api/orders")
def list_orders(session: Session = Depends(get_session)):
    orders = session.exec(select(Order)).all()
    return [
        {
            "id": o.id, "customer_id": o.customer_id, "product_id": o.product_id,
            "status": o.status,
            "purchase_date": o.purchase_date.isoformat() if o.purchase_date else None,
            "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
            "issue_type": o.issue_type, "total_amount": o.total_amount, "quantity": o.quantity,
        }
        for o in orders
    ]


@app.get("/api/orders/{order_id}")
def get_order_api(order_id: str, session: Session = Depends(get_session)):
    o = session.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    return {
        "id": o.id, "customer_id": o.customer_id, "product_id": o.product_id,
        "status": o.status,
        "purchase_date": o.purchase_date.isoformat() if o.purchase_date else None,
        "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
        "issue_type": o.issue_type, "total_amount": o.total_amount, "quantity": o.quantity,
    }


# ─── Inventory ────────────────────────────────────────────────────────────────

@app.get("/api/inventory")
def list_inventory(session: Session = Depends(get_session)):
    records = session.exec(select(Inventory)).all()
    return [
        {
            "id": inv.id, "product_id": inv.product_id, "warehouse": inv.warehouse,
            "quantity": inv.quantity, "reserved_quantity": inv.reserved_quantity,
            "available": inv.quantity - inv.reserved_quantity,
            "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        }
        for inv in records
    ]


# ─── Policies ─────────────────────────────────────────────────────────────────

@app.get("/api/policies")
def list_policies(session: Session = Depends(get_session)):
    policies = session.exec(select(Policy)).all()
    return [
        {
            "id": p.id, "category": p.category, "policy_text": p.policy_text,
            "eligibility_rules": p.eligibility_rules, "active": p.active,
        }
        for p in policies
    ]


# ─── Cases ────────────────────────────────────────────────────────────────────

@app.post("/api/cases", response_model=CaseResponse)
def create_case(req: CreateCaseRequest, session: Session = Depends(get_session)):
    # Validate customer and order exist
    customer = session.get(Customer, req.customer_id)
    if not customer:
        raise HTTPException(404, f"Customer {req.customer_id} not found")
    order = session.get(Order, req.order_id)
    if not order:
        raise HTTPException(404, f"Order {req.order_id} not found")

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    case = SupportCase(
        id=case_id,
        customer_id=req.customer_id,
        order_id=req.order_id,
        customer_message=req.customer_message,
        status="open",
        demo_conflict_pending=req.demo_mode or False,
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.get("/api/cases")
def list_cases(session: Session = Depends(get_session)):
    cases = session.exec(select(SupportCase)).all()
    result = []
    for c in cases:
        customer = session.get(Customer, c.customer_id)
        order = session.get(Order, c.order_id)
        result.append({
            "id": c.id,
            "customer_id": c.customer_id,
            "customer_name": customer.name if customer else None,
            "order_id": c.order_id,
            "customer_message": c.customer_message,
            "status": c.status,
            "resolution_summary": c.resolution_summary,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        })
    return result


@app.get("/api/cases/{case_id}")
def get_case(case_id: str, session: Session = Depends(get_session)):
    case = session.get(SupportCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    customer = session.get(Customer, case.customer_id)
    order = session.get(Order, case.order_id)
    product = session.get(Product, order.product_id) if order else None
    replacement = session.exec(
        select(Replacement).where(Replacement.case_id == case_id)
    ).first()

    # Inventory state
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
                "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
            })

    return {
        "id": case.id,
        "customer_id": case.customer_id,
        "customer": {"id": customer.id, "name": customer.name,
                     "email": customer.email, "tier": customer.tier} if customer else None,
        "order_id": case.order_id,
        "order": {
            "id": order.id, "status": order.status,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "issue_type": order.issue_type, "total_amount": order.total_amount,
        } if order else None,
        "product": {
            "id": product.id, "name": product.name, "sku": product.sku,
        } if product else None,
        "customer_message": case.customer_message,
        "status": case.status,
        "resolution_summary": case.resolution_summary,
        "demo_conflict_pending": case.demo_conflict_pending,
        "replacement": {
            "id": replacement.id, "warehouse": replacement.warehouse,
            "status": replacement.status, "tracking_number": replacement.tracking_number,
            "created_at": replacement.created_at.isoformat(),
        } if replacement else None,
        "inventory": inventory_state,
        "created_at": case.created_at.isoformat(),
        "updated_at": case.updated_at.isoformat(),
        "resolved_at": case.resolved_at.isoformat() if case.resolved_at else None,
    }


@app.get("/api/cases/{case_id}/events")
def get_case_events(
    case_id: str,
    since: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    """Poll for agent events. ?since=<ISO timestamp> returns only newer events."""
    query = select(AgentEvent).where(AgentEvent.case_id == case_id)

    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00")).replace(tzinfo=None)
            query = query.where(AgentEvent.timestamp > since_dt)
        except Exception:
            pass

    events = session.exec(query.order_by(AgentEvent.sequence_number)).all()
    return [
        {
            "id": e.id,
            "case_id": e.case_id,
            "execution_id": e.execution_id,
            "timestamp": e.timestamp.isoformat(),
            "tool_name": e.tool_name,
            "event_type": e.event_type,
            "status": e.status,
            "reasoning_summary": e.reasoning_summary,
            "input_data": json.loads(e.input_data) if e.input_data else None,
            "output_data": json.loads(e.output_data) if e.output_data else None,
            "sequence_number": e.sequence_number,
        }
        for e in events
    ]


# ─── Agent Execution ──────────────────────────────────────────────────────────

# Track running agent threads to avoid double-start
_running_agents: set[str] = set()
_agent_lock = threading.Lock()


@app.post("/api/cases/{case_id}/resolve")
def start_resolution(
    case_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Start the agent resolution loop in the background."""
    case = session.get(SupportCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    if case.status in ("resolved", "escalated"):
        raise HTTPException(400, f"Case already in terminal state: {case.status}")

    if case.status in ("processing", "running"):
        raise HTTPException(409, f"Case is already being processed: {case.status}")

    with _agent_lock:
        if case_id in _running_agents:
            raise HTTPException(409, "Agent already running for this case")
        _running_agents.add(case_id)

    def run_and_cleanup():
        try:
            from app.agent import run_agent
            run_agent(case_id)
        except Exception as e:
            print(f"Agent error for {case_id}: {e}")
        finally:
            with _agent_lock:
                _running_agents.discard(case_id)

    background_tasks.add_task(run_and_cleanup)
    return {"status": "started", "case_id": case_id}


# ─── Demo ─────────────────────────────────────────────────────────────────────

def reset_case(session: Session, case_id: str):
    """Consolidated reset logic for any case."""
    # Delete replacement records
    replacements = session.exec(
        select(Replacement).where(Replacement.case_id == case_id)
    ).all()
    for r in replacements:
        session.delete(r)

    # Delete agent events
    events = session.exec(
        select(AgentEvent).where(AgentEvent.case_id == case_id)
    ).all()
    for e in events:
        session.delete(e)

    # Delete agent executions
    executions = session.exec(
        select(AgentExecution).where(AgentExecution.case_id == case_id)
    ).all()
    for ex in executions:
        session.delete(ex)

    # Reset case
    case = session.get(SupportCase, case_id)
    if not case and case_id == "CASE-DEMO-001":
        # Recreate if missing
        case = SupportCase(
            id="CASE-DEMO-001",
            customer_id="CUST-001",
            order_id="ORD-1042",
            customer_message="My order arrived damaged. I want a replacement.",
            status="open",
            demo_conflict_pending=True,
        )
        session.add(case)
    elif case:
        case.status = "open"
        if case_id == "CASE-DEMO-001":
            case.demo_conflict_pending = True
        case.resolution_summary = None
        case.resolved_at = None
        case.updated_at = _now()
        session.add(case)
        
        # Reset order status if it exists
        order = session.get(Order, case.order_id)
        if order:
            order.status = "delivered"
            session.add(order)

    # Demo-specific inventory restore
    if case_id == "CASE-DEMO-001":
        inv_resets = [
            ("INV-001", "Mumbai", 1, 0),
            ("INV-002", "Pune", 2, 0),
            ("INV-003", "Bengaluru", 0, 0),
        ]
        for inv_id, warehouse, qty, reserved in inv_resets:
            inv = session.get(Inventory, inv_id)
            if inv:
                inv.quantity = qty
                inv.reserved_quantity = reserved
                inv.updated_at = _now()
                session.add(inv)

    # Clear running agent tracker
    with _agent_lock:
        _running_agents.discard(case_id)


@app.post("/api/demo/reset")
def reset_demo(session: Session = Depends(get_session)):
    """Idempotent demo reset."""
    reset_case(session, "CASE-DEMO-001")
    session.commit()
    return {
        "status": "reset_complete",
        "case_id": "CASE-DEMO-001",
        "inventory": {"Mumbai": 1, "Pune": 2, "Bengaluru": 0},
    }


@app.post("/api/demo/run")
def run_demo(background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Reset + start the guided demo."""
    reset_case(session, "CASE-DEMO-001")
    session.commit()

    # Reuse standard resolution start
    return start_resolution("CASE-DEMO-001", background_tasks, session)


# ─── Analytics ────────────────────────────────────────────────────────────────

@app.get("/api/analytics")
def get_analytics(session: Session = Depends(get_session)):
    from sqlmodel import func
    cases = session.exec(select(SupportCase)).all()
    total = len(cases)
    resolved = sum(1 for c in cases if c.status == "resolved")
    escalated = sum(1 for c in cases if c.status == "escalated")
    running = sum(1 for c in cases if c.status == "running")

    executions = session.exec(select(AgentExecution)).all()
    avg_turns = (
        sum(e.total_turns for e in executions) / len(executions)
        if executions else 0
    )

    return {
        "total_cases": total,
        "resolved": resolved,
        "escalated": escalated,
        "running": running,
        "open": total - resolved - escalated - running,
        "resolution_rate": round(resolved / total * 100, 1) if total > 0 else 0,
        "avg_agent_turns": round(avg_turns, 1),
        "total_executions": len(executions),
    }


# ─── Static files (Next.js build) ────────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "out")
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
