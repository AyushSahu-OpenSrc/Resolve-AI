"""
ResolveAI Agent Orchestrator — Low-Call Architecture (≤2 Gemini requests per case).

ARCHITECTURE:
  Phase 1 — OBSERVATION (no Gemini, direct DB reads, generates AgentEvents)
  Phase 2 — GEMINI CALL #1: Plan (receives full context, returns structured decision)
  Phase 3 — EXECUTE: Backend tools execute the plan (real DB mutations, real failure possible)
  Phase 4 — GEMINI CALL #2: Replan (only if Phase 3 fails; receives failure + updated state)
  Phase 5 — VERIFY: Deterministic backend check, no Gemini

Total Gemini requests:
  Happy path: 1
  Conflict/replan path: 2

The UI still shows rich AgentEvent records (OBSERVING, DECISION, ACTION, BLOCKED,
REPLANNING, VERIFIED) — these are execution events, not Gemini API calls.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import google.generativeai as genai
from sqlmodel import Session, select

from app.models import (
    SupportCase, AgentExecution, AgentEvent,
    Customer, Order, Product, Inventory, Policy,
    EventType, EventStatus
)
from app.tools import (
    create_replacement, reserve_inventory, cancel_reservation,
    update_order_status, verify_resolution, _log_event, _now
)
from app.database import engine

# ─── Gemini setup ─────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ─── Observation Phase (no Gemini) ────────────────────────────────────────────

def _observe(session: Session, case_id: str, execution_id: str, seq_counter: list) -> dict:
    """
    Gather the complete enterprise state from the database without calling Gemini.
    Each read generates an AgentEvent for the UI (OBSERVING status).
    Returns a structured context dict to be sent to Gemini in one call.
    """

    def seq():
        s = seq_counter[0]; seq_counter[0] += 1; return s

    case = session.get(SupportCase, case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")

    # ── Customer ──────────────────────────────────────────────────────────────
    customer = session.get(Customer, case.customer_id)
    _log_event(
        session, case_id, execution_id, "observe_customer",
        EventType.observation, EventStatus.COMPLETED,
        f"Customer record verified: {customer.name} ({customer.tier} tier)." if customer
        else "Customer not found.",
        {"customer_id": case.customer_id},
        {"id": customer.id, "name": customer.name, "tier": customer.tier} if customer else None,
        seq()
    )

    # ── Order ─────────────────────────────────────────────────────────────────
    order = session.get(Order, case.order_id)
    days_since_delivery = None
    if order and order.delivery_date:
        days_since_delivery = (_now() - order.delivery_date).days

    _log_event(
        session, case_id, execution_id, "observe_order",
        EventType.observation, EventStatus.COMPLETED,
        f"Order {order.id} verified — status: {order.status}, issue: {order.issue_type}, "
        f"delivered {days_since_delivery} days ago." if order else "Order not found.",
        {"order_id": case.order_id},
        {"id": order.id, "status": order.status, "issue_type": order.issue_type,
         "days_since_delivery": days_since_delivery} if order else None,
        seq()
    )

    # ── Product ───────────────────────────────────────────────────────────────
    product = session.get(Product, order.product_id) if order else None
    _log_event(
        session, case_id, execution_id, "observe_product",
        EventType.observation, EventStatus.COMPLETED,
        f"Product retrieved: {product.name} (SKU {product.sku})." if product
        else "Product not found.",
        {"product_id": order.product_id if order else None},
        {"id": product.id, "name": product.name, "sku": product.sku,
         "price": product.price} if product else None,
        seq()
    )

    # ── Policy ────────────────────────────────────────────────────────────────
    policy = None
    policy_data = None
    eligibility = False
    eligibility_reason = "No policy found"

    if order and order.issue_type:
        policy = session.exec(
            select(Policy).where(Policy.category == order.issue_type, Policy.active == True)
        ).first()

    if policy:
        rules = policy.eligibility_rules
        # Deterministic eligibility check
        status_ok  = order.status in rules.get("requires_order_status", [])
        issue_ok   = order.issue_type in rules.get("allowed_issue_types", [])
        days_ok    = (days_since_delivery is not None and
                      days_since_delivery <= rules.get("max_days_since_delivery", 0))
        is_expedited = customer.tier in rules.get("expedited_tiers", []) if customer else False
        eligibility  = status_ok and issue_ok and days_ok
        eligibility_reason = (
            f"Customer meets damaged-on-arrival policy: "
            f"{days_since_delivery}d since delivery (max {rules.get('max_days_since_delivery')}d), "
            f"status={order.status}. {'EXPEDITED (priority).' if is_expedited else 'Standard path.'}"
            if eligibility
            else f"Not eligible: status_ok={status_ok}, issue_ok={issue_ok}, days_ok={days_ok}"
        )
        policy_data = {
            "id": policy.id,
            "policy_text": policy.policy_text,
            "eligibility_rules": rules,
            "eligible": eligibility,
            "is_expedited": is_expedited,
            "eligibility_reason": eligibility_reason,
        }

    _log_event(
        session, case_id, execution_id, "observe_policy",
        EventType.observation,
        EventStatus.COMPLETED if eligibility else EventStatus.BLOCKED,
        f"Policy eligibility evaluated: {'ELIGIBLE' if eligibility else 'NOT ELIGIBLE'}. {eligibility_reason}",
        {"issue_type": order.issue_type if order else None},
        policy_data,
        seq()
    )

    # ── Inventory ─────────────────────────────────────────────────────────────
    inventory_state = []
    if order and product:
        inv_records = session.exec(
            select(Inventory).where(Inventory.product_id == product.id)
        ).all()
        for inv in inv_records:
            avail = inv.quantity - inv.reserved_quantity
            inventory_state.append({
                "warehouse": inv.warehouse,
                "quantity": inv.quantity,
                "reserved_quantity": inv.reserved_quantity,
                "available": avail,
            })

    _log_event(
        session, case_id, execution_id, "observe_inventory",
        EventType.observation, EventStatus.COMPLETED,
        "Inventory availability checked: " +
        ", ".join(f"{w['warehouse']}: {w['available']} avail" for w in inventory_state),
        {"product_id": product.id if product else None},
        {"warehouses": inventory_state},
        seq()
    )

    return {
        "case_id": case_id,
        "customer_message": case.customer_message,
        "customer": {
            "id": customer.id, "name": customer.name,
            "email": customer.email, "tier": customer.tier,
        } if customer else None,
        "order": {
            "id": order.id, "status": order.status,
            "issue_type": order.issue_type,
            "days_since_delivery": days_since_delivery,
            "total_amount": order.total_amount,
        } if order else None,
        "product": {
            "id": product.id, "name": product.name,
            "sku": product.sku, "price": product.price,
        } if product else None,
        "policy": policy_data,
        "inventory": inventory_state,
        "eligible": eligibility,
    }


# ─── Gemini Helper ────────────────────────────────────────────────────────────

def _call_gemini(prompt: str) -> dict:
    """
    Make a single Gemini call and return a parsed structured JSON response.
    Gemini is asked to return ONLY a JSON object — no function calling.
    """
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config={"response_mime_type": "application/json"},
    )
    response = model.generate_content(prompt)
    raw = response.text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ─── Plan Prompt Builders ─────────────────────────────────────────────────────

def _build_plan_prompt(ctx: dict) -> str:
    inv_summary = "\n".join(
        f"  - {w['warehouse']}: {w['available']} units available"
        for w in ctx.get("inventory", [])
    ) or "  - No inventory data"

    return f"""You are ResolveAI, an autonomous enterprise customer resolution agent.

CUSTOMER GOAL: {ctx['customer_message']}

CUSTOMER RECORD:
  Name: {ctx['customer']['name'] if ctx.get('customer') else 'Unknown'}
  Tier: {ctx['customer']['tier'] if ctx.get('customer') else 'Unknown'}
  ID:   {ctx['customer']['id'] if ctx.get('customer') else 'Unknown'}

ORDER RECORD:
  Order ID:              {ctx['order']['id'] if ctx.get('order') else 'Unknown'}
  Status:                {ctx['order']['status'] if ctx.get('order') else 'Unknown'}
  Issue type:            {ctx['order']['issue_type'] if ctx.get('order') else 'Unknown'}
  Days since delivery:   {ctx['order']['days_since_delivery'] if ctx.get('order') else 'Unknown'}
  Order value:           ₹{ctx['order']['total_amount'] if ctx.get('order') else 'Unknown'}

PRODUCT: {ctx['product']['name'] if ctx.get('product') else 'Unknown'} (SKU: {ctx['product']['sku'] if ctx.get('product') else 'Unknown'})

POLICY ELIGIBILITY:
  Eligible: {ctx.get('eligible', False)}
  Reason:   {ctx['policy']['eligibility_reason'] if ctx.get('policy') else 'No policy found'}

CURRENT INVENTORY:
{inv_summary}

Analyze this case and determine the optimal resolution. You must return ONLY a valid JSON object.

If eligible:
  - Select resolution_type: "replacement" or "refund"
  - Select preferred_warehouse: the warehouse with the most available stock
  - Provide clear reasoning

If not eligible:
  - resolution_type: "escalate"
  - warehouse: null

Return this exact JSON structure:
{{
  "decision": "REPLACEMENT" | "REFUND" | "ESCALATE",
  "eligible": true | false,
  "resolution_type": "replacement" | "refund" | "escalate",
  "preferred_warehouse": "Mumbai" | "Pune" | "Bengaluru" | null,
  "reasoning": "...",
  "confidence": "high" | "medium" | "low",
  "action": "create_replacement" | "process_refund" | "escalate_to_human"
}}"""


def _build_replan_prompt(ctx: dict, original_plan: dict, failure: dict) -> str:
    inv_summary = "\n".join(
        f"  - {w['warehouse']}: {w['available']} units available"
        for w in ctx.get("inventory", [])
    ) or "  - No inventory data"

    return f"""You are ResolveAI. Your original resolution plan encountered a failure.

ORIGINAL GOAL: {ctx['customer_message']}
CUSTOMER TIER: {ctx['customer']['tier'] if ctx.get('customer') else 'Unknown'}

ORIGINAL PLAN:
  Decision:  {original_plan.get('decision')}
  Warehouse: {original_plan.get('preferred_warehouse')}
  Action:    {original_plan.get('action')}

EXECUTION RESULT: FAILED
ERROR CODE: {failure.get('error_code', 'UNKNOWN')}
ERROR:      {failure.get('message', failure.get('error', 'Unknown error'))}

UPDATED INVENTORY STATE (re-read from database after failure):
{inv_summary}

You must replan and select an alternative resolution. Return ONLY a valid JSON object:
{{
  "decision": "REPLAN" | "ESCALATE",
  "resolution_type": "replacement" | "refund" | "escalate",
  "preferred_warehouse": "Mumbai" | "Pune" | "Bengaluru" | null,
  "reasoning": "...",
  "confidence": "high" | "medium" | "low",
  "action": "create_replacement" | "process_refund" | "escalate_to_human"
}}

Select an alternative warehouse that has available stock. If no inventory is available anywhere, set decision to "ESCALATE"."""


# ─── Main Agent Entry Point ───────────────────────────────────────────────────

def run_agent(case_id: str) -> dict:
    """
    Main agent orchestration — ≤2 Gemini requests.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    with Session(engine) as session:
        case = session.get(SupportCase, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        customer = session.get(Customer, case.customer_id)

        # Create execution record
        execution_id = str(uuid.uuid4())
        execution = AgentExecution(
            id=execution_id, case_id=case_id,
            status="running", started_at=_now(),
        )
        session.add(execution)

        # Mark case running
        case.status = "running"
        case.updated_at = _now()
        session.add(case)
        session.commit()

        seq_counter = [0]

        def seq():
            s = seq_counter[0]; seq_counter[0] += 1; return s

        # Log goal event
        _log_event(
            session, case_id, execution_id, "agent_start",
            EventType.observation, EventStatus.RUNNING,
            f"Goal received: resolve case for "
            f"{customer.name if customer else case.customer_id} — '{case.customer_message}'",
            {"case_id": case_id, "message": case.customer_message},
            None, seq()
        )

        try:
            # ── PHASE 1: OBSERVATION (no Gemini) ──────────────────────────────
            ctx = _observe(session, case_id, execution_id, seq_counter)

            if not ctx.get("eligible"):
                # Not eligible — escalate without Gemini
                _log_event(
                    session, case_id, execution_id, "agent_decision",
                    EventType.decision, EventStatus.ESCALATED,
                    "Case not eligible for resolution based on policy rules. Escalating.",
                    None, None, seq()
                )
                case = session.get(SupportCase, case_id)
                if case:
                    case.status = "escalated"
                    case.resolution_summary = "Not eligible per policy — escalated."
                    case.updated_at = _now()
                    session.add(case)
                execution.status = "escalated"
                execution.completed_at = _now()
                execution.total_turns = 1
                session.add(execution)
                session.commit()
                return {"status": "escalated", "case_id": case_id}

            # ── PHASE 2: GEMINI CALL #1 — PLAN ───────────────────────────────
            _log_event(
                session, case_id, execution_id, "agent_plan",
                EventType.decision, EventStatus.RUNNING,
                "Sending full case context to agent for resolution planning...",
                None, None, seq()
            )

            plan = _call_gemini(_build_plan_prompt(ctx))

            _log_event(
                session, case_id, execution_id, "agent_decision",
                EventType.decision, EventStatus.COMPLETED,
                f"Resolution decision: {plan.get('decision')} from {plan.get('preferred_warehouse')}. "
                f"Reason: {plan.get('reasoning', '')[:200]}",
                None, plan, seq()
            )

            if plan.get("decision") == "ESCALATE":
                case = session.get(SupportCase, case_id)
                if case:
                    case.status = "escalated"
                    case.resolution_summary = f"Agent escalated: {plan.get('reasoning', '')[:200]}"
                    case.updated_at = _now()
                    session.add(case)
                execution.status = "escalated"
                execution.completed_at = _now()
                execution.total_turns = 1
                session.add(execution)
                session.commit()
                return {"status": "escalated", "case_id": case_id}

            # ── PHASE 3: EXECUTE PLAN ─────────────────────────────────────────
            order = session.get(Order, case.order_id) if (case := session.get(SupportCase, case_id)) else None
            product_id = order.product_id if order else None
            warehouse  = plan.get("preferred_warehouse")

            _log_event(
                session, case_id, execution_id, "create_replacement",
                EventType.tool_call, EventStatus.RUNNING,
                f"Executing replacement action: warehouse={warehouse}",
                {"warehouse": warehouse, "product_id": product_id}, None, seq()
            )

            result = create_replacement(
                session=session, case_id=case_id,
                execution_id=execution_id, warehouse=warehouse,
                seq=seq()
            )

            # ── PHASE 4: CONDITIONAL REPLAN (GEMINI CALL #2) ─────────────────
            if not result.get("success"):
                # Action failed — refresh inventory from DB and call Gemini once more
                session.expire_all()
                inv_records = session.exec(
                    select(Inventory).where(Inventory.product_id == product_id)
                ).all() if product_id else []
                updated_inventory = [
                    {
                        "warehouse": inv.warehouse,
                        "quantity": inv.quantity,
                        "reserved_quantity": inv.reserved_quantity,
                        "available": inv.quantity - inv.reserved_quantity,
                    }
                    for inv in inv_records
                ]
                ctx["inventory"] = updated_inventory

                _log_event(
                    session, case_id, execution_id, "agent_replan",
                    EventType.replan, EventStatus.REPLANNING,
                    f"Action failed ({result.get('error_code')}). "
                    f"Updated inventory: "
                    f"{', '.join([str(w.get('warehouse')) + ': ' + str(w.get('available')) for w in updated_inventory])}. "
                    f"Requesting alternative resolution from agent...",
                    {"failure": result, "updated_inventory": updated_inventory}, None, seq()
                )

                total_available = sum(w["available"] for w in updated_inventory)
                if total_available == 0:
                    # No inventory anywhere — escalate without 2nd Gemini call
                    _log_event(
                        session, case_id, execution_id, "agent_escalate",
                        EventType.escalation, EventStatus.ESCALATED,
                        "No inventory available at any warehouse — escalating to human agent.",
                        None, None, seq()
                    )
                    case = session.get(SupportCase, case_id)
                    if case:
                        case.status = "escalated"
                        case.resolution_summary = "Escalated: no inventory available at any warehouse."
                        case.updated_at = _now()
                        session.add(case)
                    execution.status = "escalated"
                    execution.completed_at = _now()
                    execution.total_turns = 2
                    session.add(execution)
                    session.commit()
                    return {"status": "escalated", "case_id": case_id}

                # Gemini Call #2 — Replan
                replan = _call_gemini(_build_replan_prompt(ctx, plan, result))

                new_warehouse = replan.get("preferred_warehouse")

                _log_event(
                    session, case_id, execution_id, "agent_replan_decision",
                    EventType.decision, EventStatus.COMPLETED,
                    f"Replanning decision: {replan.get('decision')} — "
                    f"alternative warehouse: {new_warehouse}. "
                    f"Reason: {replan.get('reasoning', '')[:200]}",
                    None, replan, seq()
                )

                if replan.get("decision") == "ESCALATE" or not new_warehouse:
                    case = session.get(SupportCase, case_id)
                    if case:
                        case.status = "escalated"
                        case.resolution_summary = f"Escalated after replan: {replan.get('reasoning', '')[:200]}"
                        case.updated_at = _now()
                        session.add(case)
                    execution.status = "escalated"
                    execution.completed_at = _now()
                    execution.total_turns = 2
                    session.add(execution)
                    session.commit()
                    return {"status": "escalated", "case_id": case_id}

                # Execute the replanned action
                _log_event(
                    session, case_id, execution_id, "create_replacement",
                    EventType.tool_call, EventStatus.RUNNING,
                    f"Executing replanned replacement from {new_warehouse}",
                    {"warehouse": new_warehouse}, None, seq()
                )

                result = create_replacement(
                    session=session, case_id=case_id,
                    execution_id=execution_id, warehouse=new_warehouse,
                    seq=seq()
                )

                if not result.get("success"):
                    case = session.get(SupportCase, case_id)
                    if case:
                        case.status = "escalated"
                        case.resolution_summary = "Replanned action also failed — escalated."
                        case.updated_at = _now()
                        session.add(case)
                    execution.status = "escalated"
                    execution.completed_at = _now()
                    execution.total_turns = 2
                    session.add(execution)
                    session.commit()
                    return {"status": "escalated", "case_id": case_id}

            # ── PHASE 5: VERIFICATION (no Gemini, deterministic) ─────────────
            _log_event(
                session, case_id, execution_id, "verify_resolution",
                EventType.verification, EventStatus.RUNNING,
                "Running independent database consistency check...",
                None, None, seq()
            )

            verify_result = verify_resolution(
                session=session, case_id=case_id,
                execution_id=execution_id, seq=seq()
            )

            execution.status = "completed" if verify_result.get("verified") else "failed"
            execution.completed_at = _now()
            execution.total_turns = 2
            session.add(execution)
            session.commit()

            return {
                "status": "resolved" if verify_result.get("verified") else "failed",
                "case_id": case_id,
                "result": verify_result,
            }

        except Exception as e:
            error_msg = str(e)
            _log_event(
                session, case_id, execution_id, "agent_error",
                EventType.error, EventStatus.FAILED,
                f"Agent encountered an error: {error_msg[:150]}",
                None, {"error": error_msg}, seq()
            )
            case = session.get(SupportCase, case_id)
            if case and case.status not in ("resolved", "escalated"):
                case.status = "failed"
                case.updated_at = _now()
                session.add(case)
            execution.status = "failed"
            execution.error_message = error_msg
            execution.completed_at = _now()
            session.add(execution)
            session.commit()
            raise
