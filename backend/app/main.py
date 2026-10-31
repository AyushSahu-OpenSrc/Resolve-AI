"""
ResolveAI FastAPI application.
"""
from __future__ import annotations

import asyncio
import csv
import io
import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Optional, List

logger = logging.getLogger("resolveai.main")

import google.generativeai as genai
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import create_db_and_tables, get_session, engine
from app.models import (
    Customer, Order, Product, Inventory, Policy,
    SupportCase, Replacement, AgentEvent, AgentExecution
)
from app.tools import _now
import app.seed as seed_module

# ─── LLM config (shared by chat endpoint) ─────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ResolveAI API",
    description="Autonomous customer resolution agent — agentic AI backend",
    version="1.0.0",
)

# CORS configuration with comprehensive production & local origin support
default_origins = [
    "https://resolveai-frontend-ffab.onrender.com",
    "https://resolveai-frontend.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
env_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = list(dict.fromkeys(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Content-Length", "X-Accel-Buffering"],
    max_age=600,
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    try:
        with Session(engine) as session:
            existing_case = session.exec(select(SupportCase)).first()
            if not existing_case:
                logger.info("Database has no support cases. Auto-seeding initial operational data...")
                seed_module.seed()
    except Exception as e:
        logger.exception("Failed during auto-seed check: %s", e)


@app.post("/api/seed", tags=["admin"])
def seed_database():
    """Manual re-seed endpoint to populate initial operational dataset."""
    try:
        seed_module.seed()
        return {"status": "success", "message": "Database successfully seeded with standard operational data."}
    except Exception as e:
        logger.exception("Failed to seed database: %s", e)
        raise HTTPException(500, f"Failed to seed database: {e}")


@app.get("/", tags=["health"])
def root():
    """Root status endpoint returning service info and documentation links."""
    return {
        "status": "online",
        "service": "ResolveAI API Backend",
        "version": "1.0.0",
        "health_url": "/api/health",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
        "description": "Autonomous customer resolution agentic AI backend",
    }


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


class ChatRequest(BaseModel):
    message: str
    case_id: Optional[str] = None


class ActionRequest(BaseModel):
    action_type: str  # replacement | refund | email | escalate
    options: dict = {}


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


@app.post("/api/import/customers")
async def import_customers(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")
    try:
        decoded = (await file.read()).decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")
    reader = csv.DictReader(io.StringIO(decoded))
    headers = {h.strip().lower() for h in (reader.fieldnames or []) if h}
    if not {"id", "name", "email"}.issubset(headers):
        raise HTTPException(400, "Customers CSV requires columns: id, name, email")
    count = 0
    try:
        for raw in reader:
            row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
            customer_id, name, email = row.get("id"), row.get("name"), row.get("email")
            if not customer_id or not name or not email:
                raise HTTPException(400, f"Customer row {count + 2} needs id, name and email")
            c = session.get(Customer, customer_id)
            if c is None:
                c = Customer(id=customer_id, name=name, email=email,
                             tier=row.get("tier") or "standard", phone=row.get("phone") or None)
            else:
                c.name, c.email = name, email
                c.tier = row.get("tier") or c.tier
                c.phone = row.get("phone") or c.phone
            session.add(c)
            count += 1
        session.commit()
    except HTTPException:
        session.rollback()
        raise
    except Exception as exc:
        session.rollback()
        raise HTTPException(400, f"Customer import failed; no rows were committed: {exc}")
    return {"status": "success", "imported": count}


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


@app.post("/api/import/orders")
async def import_orders(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")
    try:
        decoded = (await file.read()).decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")
    reader = csv.DictReader(io.StringIO(decoded))
    headers = {h.strip().lower() for h in (reader.fieldnames or []) if h}
    if not {"id", "customer_id", "product_id", "status", "total_amount"}.issubset(headers):
        raise HTTPException(400, "Orders CSV requires columns: id, customer_id, product_id, status, total_amount")
    from datetime import datetime
    def parse_dt(value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            raise HTTPException(400, f"Invalid date: {value}. Use ISO format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS")
    count = 0
    try:
        for raw in reader:
            row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
            order_id, customer_id, product_id = row.get("id"), row.get("customer_id"), row.get("product_id")
            if not order_id or not customer_id or not product_id:
                raise HTTPException(400, f"Order row {count + 2} needs id, customer_id and product_id")
            if session.get(Customer, customer_id) is None:
                raise HTTPException(400, f"Order row {count + 2} references unknown customer_id {customer_id}")
            if session.get(Product, product_id) is None:
                raise HTTPException(400, f"Order row {count + 2} references unknown product_id {product_id}")
            try:
                total = float(row.get("total_amount") or "0")
                quantity = int(row.get("quantity") or "1")
            except ValueError:
                raise HTTPException(400, f"Invalid amount or quantity in order row {count + 2}")
            if total < 0 or quantity < 1:
                raise HTTPException(400, f"Amount must be non-negative and quantity at least 1 (row {count + 2})")
            purchase_date = parse_dt(row.get("purchase_date")) or _now()
            delivery_date = parse_dt(row.get("delivery_date"))
            o = session.get(Order, order_id)
            if o is None:
                o = Order(id=order_id, customer_id=customer_id, product_id=product_id,
                          status=row.get("status") or "pending", purchase_date=purchase_date,
                          delivery_date=delivery_date, issue_type=row.get("issue_type") or None,
                          total_amount=total, quantity=quantity)
            else:
                o.customer_id, o.product_id = customer_id, product_id
                o.status = row.get("status") or o.status
                o.purchase_date, o.delivery_date = purchase_date, delivery_date
                o.issue_type = row.get("issue_type") or o.issue_type
                o.total_amount, o.quantity = total, quantity
            session.add(o)
            count += 1
        session.commit()
    except HTTPException:
        session.rollback()
        raise
    except Exception as exc:
        session.rollback()
        raise HTTPException(400, f"Order import failed; no rows were committed: {exc}")
    return {"status": "success", "imported": count}


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


@app.post("/api/import/inventory")
async def import_inventory(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """Import inventory rows and upsert the associated product catalog records."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(decoded))
    required = {"id", "product_id", "warehouse", "quantity"}
    headers = {h.strip().lower() for h in (reader.fieldnames or []) if h}
    if not required.issubset(headers):
        raise HTTPException(400, "Inventory CSV requires columns: id, product_id, warehouse, quantity")

    count = 0
    try:
        for raw in reader:
            row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
            inv_id = row.get("id")
            product_id = row.get("product_id")
            warehouse = row.get("warehouse")
            if not inv_id or not product_id or not warehouse:
                raise HTTPException(400, "Every inventory row needs id, product_id and warehouse")
            try:
                quantity = int(row.get("quantity") or "0")
                reserved = int(row.get("reserved_quantity") or "0")
                price = float(row.get("price") or "0")
            except ValueError:
                raise HTTPException(400, f"Invalid numeric value in inventory row {count + 2}")
            if quantity < 0 or reserved < 0 or reserved > quantity or price < 0:
                raise HTTPException(400, f"Invalid quantity, reservation or price in inventory row {count + 2}")

            product = session.get(Product, product_id)
            product_name = row.get("product_name") or row.get("name") or product_id
            sku = row.get("sku") or product_id
            category = row.get("category") or "general"
            if product is None:
                product = Product(id=product_id, name=product_name, sku=sku, category=category, price=price)
            else:
                product.name = product_name or product.name
                product.sku = sku or product.sku
                product.category = category or product.category
                if row.get("price"):
                    product.price = price
            session.add(product)

            inv = session.get(Inventory, inv_id)
            if inv is None:
                inv = Inventory(id=inv_id, product_id=product_id, warehouse=warehouse,
                                quantity=quantity, reserved_quantity=reserved)
            else:
                inv.product_id = product_id
                inv.warehouse = warehouse
                inv.quantity = quantity
                inv.reserved_quantity = reserved
            inv.updated_at = _now()
            session.add(inv)
            count += 1
        session.commit()
    except HTTPException:
        session.rollback()
        raise
    except Exception as exc:
        session.rollback()
        raise HTTPException(400, f"Inventory import failed; no rows were committed: {exc}")
    return {"status": "success", "imported": count}


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


class PolicyCreate(BaseModel):
    id: str
    category: str
    policy_text: str
    eligibility_rules: dict


@app.post("/api/policies")
def create_policy(req: PolicyCreate, session: Session = Depends(get_session)):
    if session.get(Policy, req.id):
        raise HTTPException(409, f"Policy {req.id} already exists")

    policy = Policy(
        id=req.id, category=req.category, policy_text=req.policy_text,
        eligibility_rules_json=json.dumps(req.eligibility_rules)
    )
    session.add(policy)
    session.commit()
    return {"status": "success", "id": policy.id}


@app.put("/api/policies/{policy_id}")
def update_policy(policy_id: str, req: PolicyCreate, session: Session = Depends(get_session)):
    policy = session.get(Policy, policy_id)
    if not policy:
        raise HTTPException(404, "Policy not found")

    policy.category = req.category
    policy.policy_text = req.policy_text
    policy.eligibility_rules_json = json.dumps(req.eligibility_rules)

    session.add(policy)
    session.commit()
    return {"status": "success", "id": policy.id}


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str, session: Session = Depends(get_session)):
    policy = session.get(Policy, policy_id)
    if not policy:
        raise HTTPException(404, "Policy not found")

    session.delete(policy)
    session.commit()
    return {"status": "success", "id": policy_id}


@app.post("/api/import/policies")
async def import_policies(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")
    try:
        decoded = (await file.read()).decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")
    reader = csv.DictReader(io.StringIO(decoded))
    headers = {h.strip().lower() for h in (reader.fieldnames or []) if h}
    if not {"id", "category", "policy_text"}.issubset(headers):
        raise HTTPException(400, "Policies CSV requires columns: id, category, policy_text")
    count = 0
    try:
        for raw in reader:
            row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
            policy_id = row.get("id")
            category = row.get("category")
            policy_text = row.get("policy_text")
            if not policy_id or not category or not policy_text:
                continue
            rules_raw = row.get("eligibility_rules") or row.get("eligibility_rules_json") or "{}"
            try:
                rules_obj = json.loads(rules_raw) if rules_raw.strip().startswith("{") else {"description": rules_raw}
                rules_json = json.dumps(rules_obj)
            except Exception:
                rules_json = json.dumps({"description": rules_raw})

            p = session.get(Policy, policy_id)
            if p is None:
                p = Policy(id=policy_id, category=category, policy_text=policy_text,
                           eligibility_rules_json=rules_json, active=True)
            else:
                p.category = category
                p.policy_text = policy_text
                p.eligibility_rules_json = rules_json
            session.add(p)
            count += 1
        session.commit()
    except Exception as exc:
        session.rollback()
        raise HTTPException(400, f"Policy import failed: {exc}")
    return {"status": "success", "imported": count}


# ─── Cases ────────────────────────────────────────────────────────────────────

ISSUE_KEYWORDS = [
    # Checked in order: the first matching group wins.
    ("wrong_item", ["wrong item", "wrong product", "instead of", "received a different", "not what i ordered", "incorrect item"]),
    ("damaged_on_arrival", ["damaged", "cracked", "broken", "shattered", "crushed", "dented", "scratched", "torn", "smashed"]),
    ("defective", ["defective", "not working", "doesn't work", "does not work", "stopped working", "no sound",
                   "no audio", "faulty", "dead", "won't turn on", "not turning on", "malfunction"]),
    ("late_delivery", ["late", "delayed", "not arrived", "hasn't arrived", "still waiting"]),
]


def classify_issue(message: str) -> Optional[str]:
    """Map a customer's complaint to a policy category using plain keyword rules."""
    text = (message or "").lower()
    for issue_type, words in ISSUE_KEYWORDS:
        if any(w in text for w in words):
            return issue_type
    return None


@app.post("/api/cases", response_model=CaseResponse)
def create_case(req: CreateCaseRequest, session: Session = Depends(get_session)):
    # Validate customer and order exist
    customer = session.get(Customer, req.customer_id)
    if not customer:
        raise HTTPException(404, f"Customer {req.customer_id} not found")
    order = session.get(Order, req.order_id)
    if not order:
        raise HTTPException(404, f"Order {req.order_id} not found")

    # Orders don't carry an issue up front; work it out from the customer's complaint
    # so the agent can find the matching policy.
    if not order.issue_type:
        order.issue_type = classify_issue(req.customer_message)
        session.add(order)

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
        except (ValueError, TypeError) as exc:
            logger.warning("Invalid since timestamp %s for case %s: %s", since, case_id, exc)

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
        raise HTTPException(404, f"Case {case_id} not found in database")

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
            logger.exception("Agent error for %s: %s", case_id, e)
        finally:
            with _agent_lock:
                _running_agents.discard(case_id)

    background_tasks.add_task(run_and_cleanup)
    return {"status": "started", "case_id": case_id}


# ─── Chat SSE Streaming Endpoint ──────────────────────────────────────────────

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    SSE streaming chat endpoint backed by Gemini (Groq fallback on quota errors).
    Returns text/event-stream with token-by-token chunks and a final done event.
    """
    async def generate():
        try:
            system_ctx = (
                "You are ResolveAI's customer resolution assistant. "
                "You help support agents understand cases, policies, and resolution options. "
                "Be concise, professional, and helpful. "
                "If asked about a specific case, provide context-aware guidance."
            )

            # Try Gemini streaming
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                model = genai.GenerativeModel(GEMINI_MODEL)
                response = model.generate_content(
                    [system_ctx + "\n\nUser: " + req.message],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        yield f"data: {json.dumps({'token': chunk.text})}\n\n"
                        await asyncio.sleep(0)
            except Exception as e:
                # Fall back to Groq streaming
                from groq import Groq
                GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
                if not GROQ_API_KEY:
                    raise RuntimeError("GROQ_API_KEY environment variable is not configured")
                client = Groq(api_key=GROQ_API_KEY)
                stream = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[
                        {"role": "system", "content": system_ctx},
                        {"role": "user", "content": req.message}
                    ],
                    stream=True,
                    max_tokens=1024
                )
                for chunk in stream:
                    token = chunk.choices[0].delta.content or ""
                    if token:
                        yield f"data: {json.dumps({'token': token})}\n\n"
                        await asyncio.sleep(0)

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ─── Case Actions Endpoint ─────────────────────────────────────────────────────

@app.post("/api/cases/{case_id}/actions")
async def execute_case_action(
    case_id: str,
    action_req: ActionRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """
    Execute a chosen resolution action for a case.

    action_type values:
      - replacement : trigger create_replacement flow
      - refund      : update order status to "refunded"
      - email       : generate an email draft via LLM
      - escalate    : update case status to "escalated"
    """
    case = session.get(SupportCase, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    action_type = action_req.action_type.lower()

    if action_type == "replacement":
        # Reuse the agent's replacement flow via background task
        with _agent_lock:
            if case_id in _running_agents:
                raise HTTPException(409, "Agent already running for this case")
            _running_agents.add(case_id)

        def run_and_cleanup():
            try:
                from app.agent import run_agent
                run_agent(case_id)
            except Exception as e:
                logger.exception("Agent error for %s: %s", case_id, e)
            finally:
                with _agent_lock:
                    _running_agents.discard(case_id)

        background_tasks.add_task(run_and_cleanup)
        return {"status": "started", "action_type": "replacement", "case_id": case_id}

    elif action_type == "refund":
        order = session.get(Order, case.order_id)
        if not order:
            raise HTTPException(404, "Order not found for this case")
        order.status = "refunded"
        case.status = "resolved"
        case.resolution_summary = json.dumps({
            "summary": "Order refunded via manual action.",
            "actionable_options": [],
        })
        case.updated_at = _now()
        case.resolved_at = _now()
        session.add(order)
        session.add(case)
        session.commit()
        return {"status": "success", "action_type": "refund", "case_id": case_id, "order_status": "refunded"}

    elif action_type == "email":
        # Generate an email draft using LLM
        customer = session.get(Customer, case.customer_id)
        order = session.get(Order, case.order_id)
        product = session.get(Product, order.product_id) if order else None

        prompt = f"""You are a customer support email writer for ResolveAI.

Write a professional, empathetic customer-facing email for the following case:

Customer Name: {customer.name if customer else 'Valued Customer'}
Customer Email: {customer.email if customer else 'N/A'}
Order ID: {order.id if order else 'N/A'}
Product: {product.name if product else 'N/A'}
Issue: {case.customer_message}
Resolution: {action_req.options.get('resolution_note', 'We are working on resolving your issue.')}

Return ONLY a valid JSON object with these fields:
{{
  "email_subject": "...",
  "email_body": "..."
}}"""

        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                generation_config={"response_mime_type": "application/json"},
            )
            response = model.generate_content(prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            email_data = json.loads(raw.strip())
        except Exception as e:
            try:
                from groq import Groq
                GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
                if not GROQ_API_KEY:
                    raise RuntimeError("GROQ_API_KEY environment variable is not configured")
                client = Groq(api_key=GROQ_API_KEY)
                completion = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[
                        {"role": "system", "content": "You are a JSON-only response AI. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1024,
                    response_format={"type": "json_object"}
                )
                email_data = json.loads(completion.choices[0].message.content.strip())
            except Exception as e_groq:
                raise HTTPException(500, f"Failed to generate email: {str(e_groq)}")

        return {
            "status": "success",
            "action_type": "email",
            "case_id": case_id,
            "email_subject": email_data.get("email_subject", ""),
            "email_body": email_data.get("email_body", ""),
        }

    elif action_type == "escalate":
        case.status = "escalated"
        reason = action_req.options.get("reason", "Manually escalated by support agent.")
        case.resolution_summary = json.dumps({
            "summary": reason,
            "actionable_options": [],
        })
        case.updated_at = _now()
        session.add(case)
        session.commit()
        return {"status": "success", "action_type": "escalate", "case_id": case_id}

    else:
        raise HTTPException(400, f"Unknown action_type: {action_type}. Must be one of: replacement, refund, email, escalate")


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
    elif not case and case_id == "CASE-1042":
        case = SupportCase(
            id="CASE-1042",
            customer_id="CUST-001",
            order_id="ORD-1042",
            customer_message="My headphones arrived damaged with cracked frame. Requesting priority replacement under warranty.",
            status="open",
            demo_conflict_pending=False,
        )
        session.add(case)
    elif not case and case_id == "CASE-1046":
        case = SupportCase(
            id="CASE-1046",
            customer_id="CUST-004",
            order_id="ORD-1046",
            customer_message="UltraView Wireless Headphones arrived with shattered outer casing and damaged audio driver.",
            status="open",
            demo_conflict_pending=True,
        )
        session.add(case)
    elif case:
        case.status = "open"
        if case_id in ("CASE-DEMO-001", "CASE-1046"):
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

    # Inventory restore for test cases
    if case_id in ("CASE-DEMO-001", "CASE-1042", "CASE-1046"):
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


@app.post("/api/cases/{case_id}/reset")
def reset_case_endpoint(case_id: str, session: Session = Depends(get_session)):
    """Reset any case to open state and clear events/replacements for re-running."""
    case = session.get(SupportCase, case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found in database")
    reset_case(session, case_id)
    session.commit()
    return {"status": "reset_complete", "case_id": case_id}


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


# ─── Chutku Neural Text-to-Speech ──────────────────────────────────────────

class ChutkuTTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "neerja"
    language: Optional[str] = "en-IN"
    speed: Optional[float] = 1.0
    emotion: Optional[str] = "friendly"


@app.post("/api/chutku/tts")
async def chutku_tts(req: ChutkuTTSRequest):
    from app.tts import get_audio_stream
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Text is required for speech synthesis")
    # Limit max text length for safety
    text = req.text[:1400]
    return StreamingResponse(
        get_audio_stream(
            text,
            voice=req.voice or "neerja",
            language=req.language or "en-IN",
            speed=req.speed or 1.0,
        ),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=chutku_speech.mp3",
            "Cache-Control": "public, max-age=3600",
        },
    )


@app.get("/api/chutku/voices")
def get_chutku_voices():
    return [
        {
            "id": "neerja",
            "name": "Neerja (Soft, Cheerful & Warm)",
            "gender": "Female",
            "accent": "Indian English (Expressive)",
            "default": True,
        },
        {
            "id": "prabhat",
            "name": "Prabhat (Friendly & Youthful)",
            "gender": "Male",
            "accent": "Indian English",
            "default": False,
        },
        {
            "id": "swara",
            "name": "Swara (Natural Hindi & Hinglish)",
            "gender": "Female",
            "accent": "Hindi / Hinglish",
            "default": False,
        },
    ]


# ─── Static files (Next.js build) ────────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "out")
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
