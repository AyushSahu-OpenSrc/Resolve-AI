"""
ResolveAI Agent Orchestrator.

Uses Google Gemini with function/tool calling.
The LLM acts as planner; backend tools execute all state changes.
Never exposes raw chain-of-thought — only structured summaries.
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
    Customer, Order, Product, EventType, EventStatus
)
from app.tools import (
    get_customer, get_order, get_product, get_inventory,
    search_inventory, get_policy, check_resolution_eligibility,
    reserve_inventory, create_replacement, cancel_reservation,
    update_order_status, verify_resolution, get_case_state, _log_event, _now
)
from app.database import engine

# ─── Gemini setup ─────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ─── Tool Schemas for Gemini ──────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "get_customer",
        "description": "Retrieve customer record by customer ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string", "description": "Customer ID (e.g. CUST-001)"}
            },
            "required": ["customer_id"]
        }
    },
    {
        "name": "get_order",
        "description": "Retrieve order record by order ID. Returns status, delivery date, issue type.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "Order ID (e.g. ORD-1042)"}
            },
            "required": ["order_id"]
        }
    },
    {
        "name": "get_product",
        "description": "Retrieve product details by product ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string", "description": "Product ID (e.g. PROD-HP01)"}
            },
            "required": ["product_id"]
        }
    },
    {
        "name": "get_inventory",
        "description": "Check inventory at a specific warehouse.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "warehouse": {"type": "string", "description": "Warehouse name (Mumbai/Pune/Bengaluru)"}
            },
            "required": ["product_id", "warehouse"]
        }
    },
    {
        "name": "search_inventory",
        "description": "Search all warehouses for a product. Returns list sorted by availability.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"}
            },
            "required": ["product_id"]
        }
    },
    {
        "name": "get_policy",
        "description": "Retrieve applicable resolution policy for an issue type.",
        "parameters": {
            "type": "object",
            "properties": {
                "issue_type": {"type": "string", "description": "Issue type (e.g. damaged_on_arrival)"}
            },
            "required": ["issue_type"]
        }
    },
    {
        "name": "check_resolution_eligibility",
        "description": "Programmatically evaluate whether an order is eligible for resolution (replacement/refund) based on policy rules.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "customer_id": {"type": "string"},
                "issue_type": {"type": "string"}
            },
            "required": ["order_id", "customer_id", "issue_type"]
        }
    },
    {
        "name": "reserve_inventory",
        "description": "Reserve 1 unit at a warehouse to prevent race conditions before creating replacement.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "warehouse": {"type": "string"}
            },
            "required": ["product_id", "warehouse"]
        }
    },
    {
        "name": "create_replacement",
        "description": "Create a replacement order for the case. Will fail with INVENTORY_UNAVAILABLE if stock was claimed by a concurrent process.",
        "parameters": {
            "type": "object",
            "properties": {
                "warehouse": {"type": "string", "description": "Warehouse to ship from"}
            },
            "required": ["warehouse"]
        }
    },
    {
        "name": "cancel_reservation",
        "description": "Cancel a previously reserved inventory unit.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "warehouse": {"type": "string"}
            },
            "required": ["product_id", "warehouse"]
        }
    },
    {
        "name": "update_order_status",
        "description": "Update the status of an order.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "new_status": {"type": "string"}
            },
            "required": ["order_id", "new_status"]
        }
    },
    {
        "name": "verify_resolution",
        "description": "Independently verify that the resolution is complete and consistent. Marks case as RESOLVED if all checks pass.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_case_state",
        "description": "Get the current state of the case, order, replacement, and inventory.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
]

SYSTEM_PROMPT = """You are ResolveAI, an autonomous customer resolution agent.

Your goal is to resolve customer support cases by:
1. Gathering evidence through tool calls (you must call tools, not assume data)
2. Making reasoned decisions based on real data
3. Executing actions via tools
4. Adapting when actions fail (replanning)
5. Verifying the resolution before completing

RULES:
- You MUST call tools to gather information — do not assume or hallucinate data.
- If a tool returns an error or failure, adapt your plan and try an alternative.
- If create_replacement fails with INVENTORY_UNAVAILABLE, immediately search for alternative warehouses using search_inventory.
- After every state-changing action, verify the result.
- Always call verify_resolution as your final action before completing.
- If you cannot resolve the case after trying all alternatives, escalate.
- Never fabricate success — only report resolved when verify_resolution passes.

WORKFLOW:
1. Get customer record
2. Get order record (verify status = delivered)  
3. Get product record
4. Get applicable policy and evaluate eligibility
5. Check inventory at primary warehouse (Mumbai first)
6. Attempt create_replacement at best available warehouse
7. If INVENTORY_UNAVAILABLE: search_inventory → pick next best → reserve_inventory → create_replacement
8. Call verify_resolution to confirm
9. Complete

Be concise and decisive. Each tool call should be purposeful."""


def _dispatch_tool(
    session: Session,
    case_id: str,
    execution_id: str,
    tool_name: str,
    args: dict,
    seq: int,
    context: dict,
) -> dict:
    """Dispatch a tool call to the appropriate function."""
    common = dict(session=session, case_id=case_id, execution_id=execution_id, seq=seq)

    if tool_name == "get_customer":
        return get_customer(**common, customer_id=args["customer_id"])
    elif tool_name == "get_order":
        return get_order(**common, order_id=args["order_id"])
    elif tool_name == "get_product":
        return get_product(**common, product_id=args["product_id"])
    elif tool_name == "get_inventory":
        return get_inventory(**common, product_id=args["product_id"],
                             warehouse=args["warehouse"])
    elif tool_name == "search_inventory":
        return search_inventory(**common, product_id=args["product_id"])
    elif tool_name == "get_policy":
        return get_policy(**common, issue_type=args["issue_type"])
    elif tool_name == "check_resolution_eligibility":
        return check_resolution_eligibility(
            **common, order_id=args["order_id"],
            customer_id=args["customer_id"], issue_type=args["issue_type"])
    elif tool_name == "reserve_inventory":
        return reserve_inventory(**common, product_id=args["product_id"],
                                 warehouse=args["warehouse"])
    elif tool_name == "create_replacement":
        return create_replacement(**common, warehouse=args["warehouse"])
    elif tool_name == "cancel_reservation":
        return cancel_reservation(**common, product_id=args["product_id"],
                                  warehouse=args["warehouse"])
    elif tool_name == "update_order_status":
        return update_order_status(**common, order_id=args["order_id"],
                                   new_status=args["new_status"])
    elif tool_name == "verify_resolution":
        return verify_resolution(**common)
    elif tool_name == "get_case_state":
        return get_case_state(**common)
    else:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}


def run_agent(case_id: str) -> dict:
    """
    Main agent orchestration loop.
    Returns summary dict on completion.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=GEMINI_API_KEY)

    with Session(engine) as session:
        case = session.get(SupportCase, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        # Get context
        order = session.get(Order, case.order_id)
        customer = session.get(Customer, case.customer_id)

        # Create execution record
        execution_id = str(uuid.uuid4())
        execution = AgentExecution(
            id=execution_id,
            case_id=case_id,
            status="running",
            started_at=_now(),
        )
        session.add(execution)

        # Update case status
        case.status = "running"
        case.updated_at = _now()
        session.add(case)
        session.commit()

        # Log goal event
        _log_event(
            session, case_id, execution_id, "agent_start",
            EventType.observation, EventStatus.RUNNING,
            f"Goal received: resolve case for {customer.name if customer else case.customer_id} — '{case.customer_message}'",
            {"case_id": case_id, "message": case.customer_message},
            None, 0
        )

        seq_counter = [1]

        def next_seq():
            s = seq_counter[0]
            seq_counter[0] += 1
            return s

        # Build initial message
        initial_message = f"""Case ID: {case_id}
Customer ID: {case.customer_id}
Order ID: {case.order_id}
Customer Message: {case.customer_message}

Resolve this case by calling the appropriate tools in sequence. Start by retrieving the customer record."""

        # Setup Gemini model with tools
        tools_for_gemini = [genai.protos.Tool(
            function_declarations=[
                genai.protos.FunctionDeclaration(
                    name=t["name"],
                    description=t["description"],
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            k: genai.protos.Schema(
                                type=genai.protos.Type.STRING,
                                description=v.get("description", "")
                            )
                            for k, v in t["parameters"]["properties"].items()
                        },
                        required=t["parameters"].get("required", [])
                    )
                )
                for t in TOOL_DEFINITIONS
            ]
        )]

        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            tools=tools_for_gemini,
        )

        chat = model.start_chat(enable_automatic_function_calling=False)

        max_turns = 25
        turn = 0
        final_status = "failed"

        try:
            response = chat.send_message(initial_message)

            while turn < max_turns:
                turn += 1
                execution.total_turns = turn

                # Check if model wants to call a tool
                has_tool_calls = False
                tool_results = []

                for part in response.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        has_tool_calls = True
                        fc = part.function_call
                        tool_name = fc.name
                        args = dict(fc.args) if fc.args else {}

                        # Log the tool call intent
                        _log_event(
                            session, case_id, execution_id, tool_name,
                            EventType.tool_call, EventStatus.RUNNING,
                            f"Calling {tool_name} with args: {json.dumps(args, default=str)}",
                            args, None, next_seq()
                        )

                        # Execute the tool
                        result = _dispatch_tool(
                            session, case_id, execution_id,
                            tool_name, args, next_seq(),
                            context={"case_id": case_id}
                        )

                        # Check for case completion via verify_resolution
                        if tool_name == "verify_resolution" and result.get("verified"):
                            final_status = "completed"
                            execution.status = "completed"
                            execution.completed_at = _now()
                            session.add(execution)
                            session.commit()
                            return {
                                "status": "resolved",
                                "case_id": case_id,
                                "turns": turn,
                                "result": result,
                            }

                        # Handle escalation case: no inventory anywhere
                        if tool_name == "search_inventory":
                            total_available = result.get("total_available", 0)
                            if total_available == 0:
                                _log_event(
                                    session, case_id, execution_id, "agent_escalate",
                                    EventType.escalation, EventStatus.ESCALATED,
                                    "No inventory available at any warehouse — escalating to human agent.",
                                    None, None, next_seq()
                                )
                                case2 = session.get(SupportCase, case_id)
                                if case2:
                                    case2.status = "escalated"
                                    case2.resolution_summary = "Escalated: no inventory available at any warehouse."
                                    case2.updated_at = _now()
                                    session.add(case2)
                                execution.status = "escalated"
                                execution.completed_at = _now()
                                session.add(execution)
                                session.commit()
                                return {"status": "escalated", "case_id": case_id, "turns": turn}

                        tool_results.append({
                            "tool_name": tool_name,
                            "result": result,
                        })

                if not has_tool_calls:
                    # Model responded with text — check if it's done
                    text = response.text if hasattr(response, 'text') else ""
                    _log_event(
                        session, case_id, execution_id, "agent_decision",
                        EventType.decision, EventStatus.COMPLETED,
                        text[:200] if text else "Agent completed reasoning.",
                        None, None, next_seq()
                    )
                    break

                # Send tool results back to the model
                function_responses = []
                for tr in tool_results:
                    function_responses.append(
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=tr["tool_name"],
                                response={"result": json.dumps(tr["result"], default=str)}
                            )
                        )
                    )

                response = chat.send_message(function_responses)

            # Loop ended without resolution
            _log_event(
                session, case_id, execution_id, "agent_timeout",
                EventType.error, EventStatus.FAILED,
                f"Agent reached maximum turns ({max_turns}) without resolving the case.",
                None, None, next_seq()
            )
            case3 = session.get(SupportCase, case_id)
            if case3 and case3.status not in ("resolved", "escalated"):
                case3.status = "failed"
                case3.updated_at = _now()
                session.add(case3)
            execution.status = "failed"
            execution.completed_at = _now()
            session.add(execution)
            session.commit()
            return {"status": "failed", "case_id": case_id, "turns": turn}

        except Exception as e:
            error_msg = str(e)
            _log_event(
                session, case_id, execution_id, "agent_error",
                EventType.error, EventStatus.FAILED,
                f"Agent encountered an error: {error_msg[:150]}",
                None, {"error": error_msg}, next_seq()
            )
            case4 = session.get(SupportCase, case_id)
            if case4 and case4.status not in ("resolved", "escalated"):
                case4.status = "failed"
                case4.updated_at = _now()
                session.add(case4)
            execution.status = "failed"
            execution.error_message = error_msg
            execution.completed_at = _now()
            session.add(execution)
            session.commit()
            raise
