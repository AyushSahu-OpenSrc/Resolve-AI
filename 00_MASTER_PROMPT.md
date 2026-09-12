You are the lead engineer, product architect, and UI designer for this project. We are
building ResolveAI for the Tech Zephyr 4.0 Agentic AI Hackathon and have ONE DAY to build,
test, deploy, and prepare a demo. Read this entire prompt before writing any code. Then inspect
the repository (if one exists) and start building immediately — do not stop after producing a
plan.

==================================================
WHAT RESOLVEAI IS
==================================================

ResolveAI is an autonomous customer-resolution agent, not a support chatbot. It takes a
customer's problem as a goal and resolves it by actually operating simulated enterprise
systems: looking up customer/order/product/inventory/policy data, deciding a resolution,
executing a real state-changing action, verifying the result, and — critically — adapting
when an action fails or a condition changes, replanning, and executing an alternative until
the case is genuinely resolved or safely escalated.

The full lifecycle the app must demonstrate:
GOAL → OBSERVATION → TOOL SELECTION → EVIDENCE → DECISION → ACTION → RESULT →
FAILURE/CHANGED CONDITION → REPLANNING → ALTERNATIVE ACTION → VERIFICATION → RESOLUTION

The environment is sandboxed, but everything must be genuinely functional — real database
state transitions, real tool-calling, real verification. Nothing may be an animation
pretending to be a backend.

One-line mental model: ResolveAI doesn't tell the customer what to do — it investigates,
gathers evidence through tools, decides, acts, observes the real result, adapts when reality
doesn't match the plan, and verifies before declaring the case resolved.

==================================================
HARD CONSTRAINT: ONE DAY. SCOPE IS ALREADY CUT FOR YOU.
==================================================

Do not build the "full" version of every section below. Build in this order and STOP adding
scope once the hero flow (next section) works reliably — polish and secondary features only
after that:

1. Repo scaffold + env vars + confirm the LLM API is reachable with a trivial call.
2. Database models + seed script (see seed data below). Verify the data is real before
   writing any agent code.
3. Tool functions, tested directly (not through the LLM) before wiring the agent.
4. Agent orchestrator loop, tested via a raw script/API call before building any UI.
5. CHECKPOINT: the hero flow below must fail-and-recover reliably, twice in a row, before
   you touch the frontend.
6. Frontend: landing → create case → agent execution screen only, to start.
7. Demo Mode + Reset wired to buttons. Re-run the full acceptance test 3 times.
8. Deploy. Smoke-test the deployed URL.
9. README + short "why this is agentic" section.
10. Only if time remains: Operations Dashboard, Data Explorer, Analytics, secondary
    scenarios (refund, cancellation, escalation).

Stack (use exactly this — it is chosen for zero-setup reliability, not because it's the
"best" architecture):
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Python + FastAPI
- Database: **SQLite via SQLModel** (not Postgres — no external DB setup burns hours; note in
  the README that production would swap to managed Postgres via the same ORM)
- Real-time updates: polling (`GET /api/cases/{id}/events?since=<ts>` every ~700ms while a run
  is active) via a small `useAgentRun` hook — not SSE/WebSocket. It must still *feel* live.
- AI: LLM API with structured tool/function calling. Use one strong orchestrating agent, not
  a multi-agent architecture.
- Deployment: single deploy target — FastAPI serving the built Next.js output, or both
  services on Render. Do not split across Vercel + a separate backend host unless you finish
  everything else with time to spare.

If a repository already exists with a different stack in place, inspect it first and adapt
rather than discarding working infrastructure — but keep the SQLite/no-Docker/polling
simplifications regardless, they are deliberate.

==================================================
SEED DATA — USE EXACTLY THIS, DO NOT INVENT DIFFERENT IDS/QUANTITIES
==================================================

Customer `CUST-001` — Rahul Sharma, premium tier.
Product `PROD-HP01` — "Premium Wireless Headphones", SKU WH-PRM-BLK-01, ₹4999.
Order `ORD-1042` — customer CUST-001, product PROD-HP01, status `delivered`, delivered 4 days
ago, issue_type `damaged_on_arrival`.
Inventory: Mumbai qty=1, Pune qty=2, Bengaluru qty=0 (all product PROD-HP01, reserved_quantity
starts at 0 everywhere).
Policy `POL-DMG-01` for `damaged_on_arrival`: replacement or refund allowed within 7 days of
delivery for delivered orders with issue type damaged_on_arrival or defective; replacement is
subject to inventory availability; premium-tier customers get expedited/priority allocation.
Store eligibility rules as structured JSON on the policy row (max_days_since_delivery: 7,
requires_order_status: ["delivered"], allowed_issue_types: ["damaged_on_arrival","defective"],
expedited_tiers: ["premium"]) — the tool layer must evaluate this programmatically, not just
hand policy text to the LLM to reason about loosely.

Add 6–10 more customers/orders/products only for background realism in list views — do not
build a second full demo flow around them unless the hero path is already bulletproof.

==================================================
THE HERO DEMO FLOW (this is the whole ballgame — get this right above all else)
==================================================

Customer message: "My order arrived damaged. I want a replacement."

Expected agent reasoning, driven by actual tool calls, not a scripted sequence:
1. Identify customer (CUST-001) and retrieve the customer record.
2. Retrieve order ORD-1042, verify status is `delivered`.
3. Retrieve product PROD-HP01.
4. Retrieve applicable policy for `damaged_on_arrival` and evaluate eligibility
   programmatically against the structured rules (delivered 4 days ago, within 7-day window,
   premium tier → expedited path).
5. Check inventory: `get_inventory(PROD-HP01, "Mumbai")` truthfully returns quantity 1.
6. Agent decides replacement is eligible and feasible from Mumbai, calls
   `create_replacement(case_id, warehouse="Mumbai")`.
7. **This is the deterministic conflict, and it must be a real race condition, not a fake
   error message.** Demo Mode marks the case so that the first `create_replacement` call for
   that case, inside its own DB transaction, causes a genuinely competing reservation to
   consume the last Mumbai unit immediately before the availability re-check — so the
   function's real re-read of `quantity - reserved_quantity` genuinely finds 0. It returns:
   `{"success": false, "error_code": "INVENTORY_UNAVAILABLE",
   "message": "Requested replacement inventory is no longer available at Mumbai."}`
8. Agent observes the failure, updates its internal state, and calls
   `search_inventory(PROD-HP01)`.
9. Agent finds Pune with quantity 2, decides to fulfill from Pune, calls
   `reserve_inventory(PROD-HP01, "Pune")` then `create_replacement(case_id, warehouse="Pune")`.
10. This succeeds: replacement record created, order status → `replacement_processing`,
    inventory decremented.
11. Agent calls `verify_resolution(case_id)`, which independently re-checks: replacement
    record exists and is correct product/warehouse, inventory correctly reserved, order status
    updated, case state consistent. Only after this passes does case status become `resolved`.
12. `POST /api/demo/reset` restores Mumbai to 1, Pune to 2, deletes the replacement record and
    agent events for this case, and returns the case to `open` — so the whole flow can be
    re-run identically on demand.

This failure → adaptation → replan → verified resolution loop is the single most important
thing judges will see. Do not let it be flaky. Do not fake it with a hardcoded UI branch —
the backend state genuinely changes and the agent genuinely reasons over the new observation.

==================================================
DATABASE MODELS (minimum required)
==================================================

Customer, Order, Product, Inventory, Policy, SupportCase, Replacement, AgentExecution,
AgentEvent. Use the field lists from the original spec as a baseline; adapt as needed for
SQLModel. AgentEvent must store: timestamp, tool_name, event_type, a concise user-safe
reasoning_summary (never raw chain-of-thought — one sentence like "Inventory unavailable at
Mumbai; searching alternate warehouses"), input_data, output_data, status.

==================================================
TOOL SYSTEM (minimum required)
==================================================

get_customer, get_order, get_product, get_inventory, search_inventory, get_policy,
check_resolution_eligibility, reserve_inventory, create_replacement, cancel_reservation,
update_order_status, verify_resolution, get_case_state. Each tool: validates input, executes
real backend logic against the database, returns structured data, writes an AgentEvent, and
updates state when appropriate. The LLM may only call these registered tools — it never
executes SQL or touches the database directly. Backend code remains authoritative; the LLM is
the planner, not the executor.

Agent decision contract — the LLM returns structured JSON each turn, e.g.:
`{"status": "continue"|"replan"|"complete"|"escalate", "observation_summary": "...",
"missing_information": [...], "selected_tool": "...", "tool_arguments": {...},
"decision_summary": "...", "confidence": 0.0-1.0}`
Never expose internal chain-of-thought in the UI — only these concise summaries.

==================================================
UI/UX — READ THIS AS SERIOUSLY AS THE BACKEND SPEC
==================================================

The UI must NOT look like a generic AI-generated dashboard, and it must not look like a
chatbot. Ground it in what this product actually is: an operations/incident console — the
visual world of air-traffic-control boards and trading-desk order blotters — not a generic
SaaS template. Full concrete design tokens (exact hex colors, typefaces, layout rules, motion
rules, copy voice, and a specific list of "AI-generated" tells to avoid — tracked-out ALL-CAPS
eyebrows, middle-dot metadata strings, arrow-suffixed buttons, identical rounded cards with
soft grey shadows on everything, gradient-washed backgrounds) are provided in the accompanying
`03_DESIGN_SYSTEM.md` — follow it exactly rather than defaulting to generic "clean SaaS"
choices. No emojis anywhere in the shipped UI (buttons, statuses, agent events, empty states,
errors) — use a single consistent icon set (Lucide) and plain status words (RUNNING,
COMPLETED, BLOCKED, REPLANNING, VERIFIED, ESCALATED) instead of ✓ ❌ 🔄 emoji.

Screens, in build order:
1. **Landing/overview** — what ResolveAI is, one clear "Start Resolution" / "Launch Guided
   Demo" CTA, a compact visual of the agentic workflow (goal → evidence → decision → action →
   verify), not marketing fluff.
2. **Create Case** — customer/order fields (prefillable for the demo case) and the customer
   message text area, "Run ResolveAI" button.
3. **Agent Execution screen (the hero screen)** — three-pane layout per the design system:
   case facts (left), live operations log polling for new AgentEvents (center, dark theme),
   live backend state (right) that visibly updates the instant the database changes. This
   must read actual AgentEvent records via the API — never a scripted/animated fake sequence.
4. **Case Detail** — case status, evidence, actions taken, full event timeline, resolution,
   verification result. (Build after 1–3 are solid.)
5. **Data Explorer + Operations Dashboard + Analytics** — only if time remains after the hero
   flow is deployed and re-run successfully three times. Analytics must be computed from real
   DB queries (COUNT/AVG), never invented numbers.

==================================================
DEMO MODE
==================================================

"Launch Guided Demo" button: loads the seeded hero case, resets the environment, starts the
agent, shows live execution. "Reset Demo" button: calls `POST /api/demo/reset` and restores
the exact seed state described above. Both must work repeatedly, back to back, without a
server restart.

==================================================
API SURFACE (minimum)
==================================================

POST /api/cases, POST /api/cases/{id}/resolve, GET /api/cases/{id},
GET /api/cases/{id}/events?since=<ts>, GET /api/customers, GET /api/orders,
GET /api/inventory, GET /api/policies, POST /api/demo/reset, POST /api/demo/run,
GET /api/health, GET /api/analytics (only if time remains). Enable FastAPI's automatic OpenAPI
docs. Configure CORS correctly for the deployed frontend origin.

==================================================
SAFETY / RELIABILITY BASICS (don't skip these, they're cheap)
==================================================

Environment variables for all secrets (never commit .env). DB transactions around every
state-changing action. Structured error responses, never silent failures or fabricated
success. If the LLM API is unreachable, surface that in the UI honestly rather than hanging.
Idempotent demo reset.

==================================================
TESTING (minimum — this derisks your live demo, don't skip it)
==================================================

pytest coverage for: (1) the full happy-path resolution, (2) the inventory-conflict → replan
→ alternate-warehouse → resolved path — this is the single most important test in the
project, (3) verify_resolution correctly rejecting an inconsistent state, (4) demo reset
correctly restoring seed state. Skip UI/e2e tests given the time budget.

==================================================
DOCUMENTATION (trimmed)
==================================================

One README.md covering: what ResolveAI is and why it's agentic rather than a chatbot (map
explicitly to goal-driven execution, dynamic tool selection, adaptation, replanning,
verification — the rubric's own vocabulary), architecture (with one inline Mermaid diagram),
the agent loop, tool list, DB schema summary, how to run locally, env vars, seed instructions,
demo instructions, deployment URL, and a short "limitations / what we'd build next" section.
Do not create three separate docs files for a one-day build.

==================================================
ACCEPTANCE TEST — DO NOT DECLARE THE PROJECT DONE UNTIL THIS PASSES, TWICE IN A ROW
==================================================

1. Reset demo. 2. Open ResolveAI (deployed URL). 3. Launch guided demo. 4. Customer issue
appears. 5. Agent identifies goal. 6. Retrieves customer. 7. Retrieves order. 8. Retrieves
policy and evaluates eligibility. 9. Checks Mumbai inventory (1 unit). 10. Decides
replacement. 11. Attempts replacement from Mumbai. 12. Backend produces a genuine inventory
conflict. 13. Agent receives the structured failure. 14. Updates state. 15. Searches
alternative warehouses. 16. Finds Pune (2 units). 17. Decides the new plan. 18. Reserves Pune
inventory. 19. Creates the replacement. 20. Calls verify_resolution and it passes. 21. UI
shows RESOLVED. 22. Database reflects the final state correctly (Mumbai=0, Pune=1, order
status updated, case resolved). 23. The AgentEvent timeline contains the full sequence above,
readable in the UI. 24. Reset demo. 25. Run again — it succeeds identically.

==================================================
WHAT TO REPORT BACK WHEN DONE
==================================================

What was built, current architecture, files created/modified, how to run locally, required
env vars, DB setup, test results, the demo flow, deployment status and live URL, GitHub
readiness, and any remaining blockers. Do not stop after producing a plan — inspect the
repository, then start Phase 1 and continue through the phases above, prioritizing a working
end-to-end vertical slice (steps 1–5 of the build order) as early as possible.

START NOW. Reference `02_SEED_DATA.md` for exact seed values and `03_DESIGN_SYSTEM.md` for
exact design tokens as you build — do not improvise around either.
