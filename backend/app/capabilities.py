"""
ResolveAI 2.0 — Verified Capability Registry.
Ground truth registry of all backend capabilities, registered tools, and integration statuses.
Prevents Chutku AI from hallucinating executable capabilities or fabricated external integrations.
"""
from typing import Dict, Any, List

CAPABILITY_REGISTRY: Dict[str, Dict[str, Any]] = {
    # ── 1. Implemented & Callable from Chutku / Agent ────────────────────────
    "get_case_state": {
        "status": "Implemented and callable from Chutku",
        "description": "Retrieve current state, customer message, and event logs for a support case.",
        "risk_level": "low",
        "requires_auth": True,
    },
    "query_customer_history": {
        "status": "Implemented and callable from Chutku",
        "description": "Retrieve customer tier, lifetime orders, and past resolutions from persistent SQLite memory.",
        "risk_level": "low",
        "requires_auth": True,
    },
    "get_order_details": {
        "status": "Implemented and callable from Chutku",
        "description": "Inspect purchase dates, delivery status, line item SKUs, and amounts.",
        "risk_level": "low",
        "requires_auth": True,
    },
    "check_policy_eligibility": {
        "status": "Implemented and callable from Chutku",
        "description": "Deterministic policy verification against active return and warranty policies (e.g. POL-DMG-01, POL-DEF-02).",
        "risk_level": "low",
        "requires_auth": True,
    },
    "check_inventory": {
        "status": "Implemented and callable from Chutku",
        "description": "Check live inventory counts across Mumbai, Pune, and Bengaluru warehouses.",
        "risk_level": "low",
        "requires_auth": True,
    },
    "reserve_inventory": {
        "status": "Implemented and callable from Chutku",
        "description": "Atomic reservation of 1 product unit with engine-level concurrency locks preventing negative stock.",
        "risk_level": "medium",
        "requires_auth": True,
    },
    "cancel_reservation": {
        "status": "Implemented and callable from Chutku",
        "description": "Release previously reserved inventory unit back to warehouse available pool.",
        "risk_level": "medium",
        "requires_auth": True,
    },
    "create_replacement": {
        "status": "Implemented and callable from Chutku",
        "description": "Dispatch replacement order and generate BlueDart/Delhivery tracking numbers.",
        "risk_level": "medium",
        "requires_auth": True,
    },
    "verify_resolution": {
        "status": "Implemented and callable from Chutku",
        "description": "Independent verification checking order status, replacement creation, and inventory state.",
        "risk_level": "low",
        "requires_auth": True,
    },
    "reconcile_order_shipment_state": {
        "status": "Implemented and callable from Chutku",
        "description": "Reconcile order state with physical courier checkpoints as authoritative ground truth.",
        "risk_level": "low",
        "requires_auth": True,
    },
    "defer_customer_feedback": {
        "status": "Implemented and callable from Chutku",
        "description": "Record polite customer preference to defer survey reminders for 3-7 days.",
        "risk_level": "low",
        "requires_auth": True,
    },

    # ── 2. Available Through Protected Operational Workflow ───────────────────
    "request_supervisor_approval": {
        "status": "Available through a protected operational workflow",
        "description": "Enqueue high-risk actions (> Rs 2,500) into pending_approval state under Zero Trust gateway.",
        "risk_level": "high",
        "requires_auth": True,
    },
    "approve_high_risk_action": {
        "status": "Available through a protected operational workflow",
        "description": "Supervisor authentication endpoint requiring authenticated role and logging supervisor user_id.",
        "risk_level": "high",
        "requires_auth": True,
    },
    "proactive_delay_scan": {
        "status": "Available through a protected operational workflow",
        "description": "Logistics checkpoint scanner identifying courier stalls and transit weather bottlenecks.",
        "risk_level": "low",
        "requires_auth": True,
    },

    # ── 3. Simulated / Demo-Only ──────────────────────────────────────────────
    "send_email_notification": {
        "status": "Simulated or demo-only",
        "description": "Structured email template generation; outbound dispatch simulated in UI audit logs.",
        "risk_level": "low",
        "requires_auth": True,
    },

    # ── 4. Unavailable / Not Connected to Live Gateway ────────────────────────
    "send_sms_notification": {
        "status": "Unavailable",
        "description": "Direct SMS telecom gateway not configured; in-app notification center active.",
        "risk_level": "low",
        "requires_auth": False,
    },
    "process_direct_bank_refund": {
        "status": "Unavailable",
        "description": "Direct banking ACH/NEFT wire API not connected; internal refund credit recorded in ledger.",
        "risk_level": "high",
        "requires_auth": True,
    },
}


def get_capabilities_summary() -> str:
    """Return concise string summary for LLM system prompt injection."""
    lines = ["VERIFIED CAPABILITY REGISTRY:"]
    for name, meta in CAPABILITY_REGISTRY.items():
        lines.append(f"- {name} [{meta['status']}]: {meta['description']}")
    return "\n".join(lines)
