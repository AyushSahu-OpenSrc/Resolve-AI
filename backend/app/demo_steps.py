"""
ResolveAI 2.0 — Demonstration Step Engine for Interactive Workflow Showcase.
Powers the 4-panel judge demonstration interface at /how-it-works:
  - Demo Mode 1: Autonomous Replacement & Replanning (ORD-1042 Headphones)
  - Demo Mode 2: Complete Customer Lifecycle (ORD-2026-LPT Laptop)
  - 7 Failure and Edge-Case Simulation Scenarios
"""
from __future__ import annotations

from typing import List, Dict, Any


DEMO_MODE_1_STEPS: List[Dict[str, Any]] = [
    {
        "step": 1,
        "stage": "OBSERVE",
        "title": "Customer Grievance Ingested",
        "customer_journey": {
            "order_id": "ORD-1042",
            "customer": "Rahul Sharma (CUST-001, Premium Tier)",
            "product": "Premium Wireless Headphones (PROD-HP01, Rs 4,999.00)",
            "reported_issue": "My headphones arrived damaged with cracked frame. Requesting replacement under warranty.",
            "delivery_date": "Delivered 4 days ago via BlueDart",
        },
        "agentic_execution": {
            "agent_state": "OBSERVING",
            "reasoning": "Observed customer record (CUST-001) and order ORD-1042. Cross-referencing against enterprise policy rules.",
            "tool_selected": "get_customer, get_order, observe_policy",
            "policy_rule": "POL-DMG-01: Replacement permitted within 7 days for confirmed damage on arrival.",
            "adaptation": "None required at intake.",
        },
        "backend_tools": {
            "tool_name": "observe_customer",
            "input": {"customer_id": "CUST-001", "order_id": "ORD-1042"},
            "output": {"customer_tier": "premium", "order_status": "delivered", "eligible": True},
            "db_mutations": "Read-only inspection.",
        },
        "memory_audit": {
            "memory_recalled": "Customer Rahul Sharma: 2 previous orders, 0 disputes, expedited tier.",
            "event_id": "EVT-OBS-01",
            "audit_status": "VERIFIED_INPUT",
            "risk_level": "LOW",
        },
    },
    {
        "step": 2,
        "stage": "PLAN",
        "title": "Warehouse Availability Check & Initial Plan",
        "customer_journey": {
            "order_id": "ORD-1042",
            "current_status": "Processing Resolution Plan",
            "nearest_hub": "Mumbai Hub (1 day estimated transit)",
        },
        "agentic_execution": {
            "agent_state": "PLANNING",
            "reasoning": "Evaluated regional inventory: Mumbai Hub (1 unit), Pune Hub (2 units), Bengaluru (0). Mumbai Hub selected as nearest depot.",
            "tool_selected": "search_inventory",
            "policy_rule": "Fastest fulfillment window prioritized for Premium tier.",
            "adaptation": "Plan generated: Reserve 1 unit from Mumbai Hub.",
        },
        "backend_tools": {
            "tool_name": "search_inventory",
            "input": {"product_id": "PROD-HP01"},
            "output": {"Mumbai": 1, "Pune": 2, "Bengaluru": 0},
            "db_mutations": "Inventory query committed.",
        },
        "memory_audit": {
            "memory_recalled": "Preferred dispatch hub: Western Region (Mumbai/Pune).",
            "event_id": "EVT-PLAN-02",
            "audit_status": "PLAN_REGISTERED",
            "risk_level": "LOW",
        },
    },
    {
        "step": 3,
        "stage": "EXECUTE",
        "title": "Concurrent Reservation & Execution Blocked",
        "customer_journey": {
            "order_id": "ORD-1042",
            "current_status": "Stock Exhaustion Conflict Detected",
            "notice": "Simulating real-world race condition: competing order consumes last unit.",
        },
        "agentic_execution": {
            "agent_state": "BLOCKED",
            "reasoning": "Conflict detected: Mumbai Hub quantity decremented to 0 by concurrent process immediately before allocation lock.",
            "tool_selected": "reserve_inventory",
            "policy_rule": "Deterministic guard: Zero stock allocation strictly prohibited. No hallucinated inventory permitted.",
            "adaptation": "Triggering autonomous replanning loop. Evaluating fallback regional depots.",
        },
        "backend_tools": {
            "tool_name": "reserve_inventory",
            "input": {"product_id": "PROD-HP01", "warehouse": "Mumbai", "quantity": 1},
            "output": {"success": False, "error": "Insufficient stock in Mumbai (0 available)"},
            "db_mutations": "Reservation rolled back atomically.",
        },
        "memory_audit": {
            "memory_recalled": "Prior inventory state: Mumbai was 1. Competing reservation confirmed.",
            "event_id": "EVT-BLK-03",
            "audit_status": "EXECUTION_BLOCKED",
            "risk_level": "MEDIUM",
        },
    },
    {
        "step": 4,
        "stage": "REPLAN",
        "title": "Autonomous Replanning & Multi-Hub Reroute",
        "customer_journey": {
            "order_id": "ORD-1042",
            "current_status": "Autonomous Reroute to Pune Hub",
            "transit_delta": "+1 business day (acceptable under SLA)",
        },
        "agentic_execution": {
            "agent_state": "REPLANNING",
            "reasoning": "Rerouted to Pune Hub (2 units available). Pune Hub optimal replacement Depot. Executing reservation lock.",
            "tool_selected": "reserve_inventory, create_replacement",
            "policy_rule": "Reroute permitted if delivery SLA delay ≤ 48 hours.",
            "adaptation": "Replanned action: Allocate 1 unit from Pune Hub.",
        },
        "backend_tools": {
            "tool_name": "reserve_inventory",
            "input": {"product_id": "PROD-HP01", "warehouse": "Pune", "quantity": 1},
            "output": {"success": True, "warehouse": "Pune", "reserved_quantity": 1, "remaining_available": 1},
            "db_mutations": "Inventory row INV-002 locked and reserved_quantity updated in SQLite.",
        },
        "memory_audit": {
            "memory_recalled": "Recorded replan decision event. Idempotency key verified.",
            "event_id": "EVT-REP-04",
            "audit_status": "REPLAN_COMMITTED",
            "risk_level": "MEDIUM",
        },
    },
    {
        "step": 5,
        "stage": "VERIFY",
        "title": "Independent Outcome Verification & Dispatch",
        "customer_journey": {
            "order_id": "ORD-1042",
            "replacement_order": "REP-1042-PUNE",
            "tracking_number": "BD-90412-PUNE",
            "final_status": "Replacement Dispatched & Verified",
        },
        "agentic_execution": {
            "agent_state": "VERIFIED",
            "reasoning": "Verification auditor confirmed database consistency: Pune stock decremented, replacement record inserted, customer notified.",
            "tool_selected": "verify_resolution",
            "policy_rule": "Cryptographic audit trail closed with status VERIFIED.",
            "adaptation": "Terminal completion.",
        },
        "backend_tools": {
            "tool_name": "verify_resolution",
            "input": {"case_id": "CASE-1042", "order_id": "ORD-1042"},
            "output": {"verified": True, "replacement_id": "REP-1042-PUNE", "stock_consistent": True},
            "db_mutations": "SupportCase status updated to 'resolved'. AgentEvent ledger finalized.",
        },
        "memory_audit": {
            "memory_recalled": "Customer memory updated: Rahul Sharma dispute resolved with replacement REP-1042-PUNE.",
            "event_id": "EVT-VRF-05",
            "audit_status": "RESOLUTION_VERIFIED",
            "risk_level": "LOW",
        },
    },
]


DEMO_MODE_2_STEPS: List[Dict[str, Any]] = [
    {
        "step": 1,
        "stage": "ORDER_PLACED",
        "title": "Order Placed & Confirmed",
        "customer_journey": {
            "order_id": "ORD-2026-LPT",
            "customer": "Rahul Sharma (CUST-001)",
            "product": "UltraBook Pro 16 Laptop (M3 Max, Rs 1,24,999.00)",
            "status": "confirmed",
        },
        "agentic_execution": {
            "agent_state": "OBSERVING",
            "reasoning": "Order placed and payment authorized via UPI. Lifecycle state set to confirmed.",
            "tool_selected": "transition_order_state",
            "policy_rule": "Standard eCommerce order initiation.",
        },
        "backend_tools": {
            "tool_name": "transition_order_state",
            "input": {"order_id": "ORD-2026-LPT", "to_state": "confirmed"},
            "output": {"status": "confirmed", "timestamp": "10:00:00"},
            "db_mutations": "Order ORD-2026-LPT created in SQLite.",
        },
        "memory_audit": {
            "memory_recalled": "Customer profile CUST-001: Premium tier, 2 prior purchases.",
            "event_id": "EVT-LC-01",
            "audit_status": "COMPLETED",
        },
    },
    {
        "step": 2,
        "stage": "SHIPPED",
        "title": "BlueDart Shipment Dispatched",
        "customer_journey": {
            "order_id": "ORD-2026-LPT",
            "carrier": "BlueDart Logistics",
            "tracking_number": "BD-99482103",
            "origin": "Mumbai Hub",
            "destination": "Bengaluru",
            "estimated_delivery": "2 days",
        },
        "agentic_execution": {
            "agent_state": "TRANSIT_TRACKING",
            "reasoning": "Consignment packaged and handed to logistics partner.",
            "tool_selected": "update_shipment_checkpoint",
            "policy_rule": "SLA: Express 48hr delivery.",
        },
        "backend_tools": {
            "tool_name": "update_shipment_checkpoint",
            "input": {"shipment_id": "SHIP-2026-LPT", "status": "in_transit"},
            "output": {"status": "in_transit", "location": "Mumbai Hub Dispatch"},
            "db_mutations": "Shipment SHIP-2026-LPT created.",
        },
        "memory_audit": {
            "memory_recalled": "Transit tracking initiated.",
            "event_id": "EVT-LC-02",
            "audit_status": "COMPLETED",
        },
    },
    {
        "step": 3,
        "stage": "DELAY_DETECTED",
        "title": "Proactive Transit Delay Detection",
        "customer_journey": {
            "order_id": "ORD-2026-LPT",
            "incident": "Severe route weather congestion at Pune Highway Bypass",
            "proactive_notice": "ResolveAI detected delay before customer complaint.",
        },
        "agentic_execution": {
            "agent_state": "PROACTIVE_SCAN",
            "reasoning": "Logistics sensor scan identified 24hr checkpoint stall. Proactive outreach triggered.",
            "tool_selected": "scan_proactive_issues",
            "policy_rule": "Proactive outreach mandatory for delayed Premium tier orders.",
        },
        "backend_tools": {
            "tool_name": "scan_proactive_issues",
            "input": {"threshold_hours": 12},
            "output": {"delayed_shipments": 1, "order_id": "ORD-2026-LPT"},
            "db_mutations": "Proactive alert logged in system queue.",
        },
        "memory_audit": {
            "memory_recalled": "Flagged order ORD-2026-LPT with transit delay note.",
            "event_id": "EVT-PR-03",
            "audit_status": "PROACTIVE_DETECTED",
        },
    },
    {
        "step": 4,
        "stage": "PROACTIVE_OUTREACH",
        "title": "Agent Proactive Outreach & Remedy",
        "customer_journey": {
            "notification": "Chutku AI sent proactive update with revised ETA and priority queueing.",
            "customer_response": "Understood. Thanks for updating me proactively.",
        },
        "agentic_execution": {
            "agent_state": "COMMUNICATING",
            "reasoning": "Sent context-aware delay notification without customer having to inquire.",
            "tool_selected": "record_conversation_message",
            "policy_rule": "Transparency guarantee: Early ETA updates reduce ticket friction by 84%.",
        },
        "backend_tools": {
            "tool_name": "record_conversation_message",
            "input": {"conversation_id": "CONV-01", "sender": "agent"},
            "output": {"message_delivered": True},
            "db_mutations": "ConversationMessage persisted in SQLite.",
        },
        "memory_audit": {
            "memory_recalled": "Logged proactive delay notice in customer timeline.",
            "event_id": "EVT-MSG-04",
            "audit_status": "NOTIFIED",
        },
    },
    {
        "step": 5,
        "stage": "DELIVERED",
        "title": "Delivery Completed & Feedback Deferred",
        "customer_journey": {
            "status": "delivered",
            "customer_action": "I'll test the laptop and provide a review later.",
            "agent_reaction": "Politely deferred feedback. Suppressed repetitive review popups.",
        },
        "agentic_execution": {
            "agent_state": "POST_DELIVERY_SUPPORT",
            "reasoning": "Customer requested deferred feedback. Stored preference and scheduled polite follow-up task.",
            "tool_selected": "record_deferred_feedback",
            "policy_rule": "Respect customer intent: Do not spam review surveys.",
        },
        "backend_tools": {
            "tool_name": "record_deferred_feedback",
            "input": {"customer_id": "CUST-001", "days": 3},
            "output": {"deferred_until": "3 days later", "status": "deferred"},
            "db_mutations": "CustomerPreference updated: deferred_feedback=True.",
        },
        "memory_audit": {
            "memory_recalled": "Customer preference stored: Follow-up postponed.",
            "event_id": "EVT-DEF-05",
            "audit_status": "DEFERRED",
        },
    },
    {
        "step": 6,
        "stage": "DEFECT_REPORTED",
        "title": "Customer Returns Later Reporting Defect",
        "customer_journey": {
            "message": "Hey, earlier my delivery was delayed, now the laptop screen is flickering with vertical lines. I need a replacement.",
            "context": "Customer returns days later; expects agent to remember previous delay.",
        },
        "agentic_execution": {
            "agent_state": "MEMORY_RECALL",
            "reasoning": "Recalled customer memory: Identified ORD-2026-LPT, recalled earlier transit delay, verified defective report under POL-DEF-02.",
            "tool_selected": "retrieve_customer_memory_snapshot",
            "policy_rule": "POL-DEF-02: Defective items eligible for replacement within 30 days.",
        },
        "backend_tools": {
            "tool_name": "retrieve_customer_memory_snapshot",
            "input": {"customer_id": "CUST-001"},
            "output": {"remembered_orders": 3, "recalled_delay": True, "warranty_valid": True},
            "db_mutations": "Read-only relational recall.",
        },
        "memory_audit": {
            "memory_recalled": "Full relational memory restored: 100% verified facts.",
            "event_id": "EVT-MEM-06",
            "audit_status": "MEMORY_RECALLED",
        },
    },
    {
        "step": 7,
        "stage": "AUTHORIZED_REPLACEMENT",
        "title": "Multi-Hub Stock Replanning & Replacement",
        "customer_journey": {
            "outcome": "Replacement Dispatched from Pune Hub (Tracking BD-REP-PUNE)",
            "estimated_arrival": "Tomorrow by 2:00 PM",
            "audit": "Cryptographic ledger sealed.",
        },
        "agentic_execution": {
            "agent_state": "VERIFIED_RESOLUTION",
            "reasoning": "Zero Trust verified: Mumbai stock depleted (0). Reserved 1 unit from Pune Hub. Order REP-2026-PUNE dispatched.",
            "tool_selected": "authorize_action, reserve_inventory, create_replacement",
            "policy_rule": "Zero-hallucination multi-hub allocation with supervisor risk audit.",
        },
        "backend_tools": {
            "tool_name": "create_replacement",
            "input": {"order_id": "ORD-2026-LPT", "hub": "Pune"},
            "output": {"replacement_id": "REP-2026-PUNE", "tracking": "BD-REP-99214"},
            "db_mutations": "Replacement row created, Pune inventory decremented in SQLite.",
        },
        "memory_audit": {
            "memory_recalled": "Case resolved. Final decision explained with complete audit trace.",
            "event_id": "EVT-FIN-07",
            "audit_status": "VERIFIED_RESOLUTION",
        },
    },
]


FAILURE_SCENARIOS = [
    {
        "id": "scenario-inventory-conflict",
        "name": "Inventory Conflict (Race Condition)",
        "category": "Logistics & Stock",
        "description": "Simulates concurrent checkout taking the last unit in Mumbai. Agent detects stock exhaustion, avoids hallucination, and autonomously reroutes to Pune Hub.",
        "simulated_failure": "Mumbai Hub stock decremented to 0 during allocation.",
        "agent_recovery": "Autonomous replanning: Rerouted to Pune Hub (2 units available). Dispatched REP-1042-PUNE.",
    },
    {
        "id": "scenario-transit-delay",
        "name": "Transit Highway Delay",
        "category": "Proactive Support",
        "description": "Carrier tracking encounters weather disruption. Proactive scanner detects delay before customer notices and delivers proactive outreach with revised ETA.",
        "simulated_failure": "Shipment stalled at Pune Express Bypass for >12 hours.",
        "agent_recovery": "Autonomous proactive notification sent with revised delivery window.",
    },
    {
        "id": "scenario-duplicate-refund",
        "name": "Duplicate Refund Request",
        "category": "Financial Security",
        "description": "Customer submits twin refund requests for the same order in quick succession. Idempotency key and duplicate guard block the second attempt.",
        "simulated_failure": "Incoming request with duplicate order ID and identical payload.",
        "agent_recovery": "Zero Trust Gateway blocks duplicate: 'Order already has an active refund record'.",
    },
    {
        "id": "scenario-ineligible-return",
        "name": "Ineligible Policy Window Violation",
        "category": "Policy Enforcement",
        "description": "Customer reports transit box damage 15 days after delivery. Damage policy requires reporting within 7 days. Agent explains rule and escalates to supervisor for goodwill consideration.",
        "simulated_failure": "Delivery date delta exceeds max_days_since_delivery (15 > 7).",
        "agent_recovery": "Deterministic rejection under POL-DMG-01; safe supervisor escalation.",
    },
    {
        "id": "scenario-high-value-approval",
        "name": "High-Value Replacement Approval Gate",
        "category": "Risk Gateway",
        "description": "Flagship order worth Rs 1,24,999 exceeds auto-approval threshold (>Rs 2,500). Action is enqueued in the supervisor approval queue instead of bypassing authorization.",
        "simulated_failure": "Transaction amount exceeds autonomous threshold.",
        "agent_recovery": "Status set to pending_approval. Pauses workflow until supervisor signs off.",
    },
    {
        "id": "scenario-cross-customer-access",
        "name": "Cross-Customer Data Tampering",
        "category": "Zero Trust Privacy",
        "description": "Malicious caller attempts to view or refund an order owned by a different customer. Security Gateway verifies ownership and rejects with 403 Forbidden.",
        "simulated_failure": "Customer ID CUST-002 attempts to modify Order ORD-1042 owned by CUST-001.",
        "agent_recovery": "Security violation logged: Access blocked with audit event EVT-SEC-BLOCKED.",
    },
    {
        "id": "scenario-ai-provider-outage",
        "name": "Primary AI Provider Outage",
        "category": "Resilience & Fallback",
        "description": "Gemini 2.0 Flash triggers a 429 quota exhaustion or network timeout. Orchestrator automatically falls back to Groq openai/gpt-oss-120b with zero user downtime.",
        "simulated_failure": "Gemini API returns HTTP 429 Quota Exceeded.",
        "agent_recovery": "Seamless fallback to secondary Groq LLM tier; response streamed successfully.",
    },
]

