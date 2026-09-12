# ResolveAI — Deterministic Seed Data

Paste this into Antigravity alongside the master prompt, or reference it by filename if your
tool can read local files. The hero demo depends on these exact IDs and quantities — do not let
the agent invent different ones, or your demo stops being reproducible.

## Hero-path entities (must exist exactly as specified)

**Customer**
- id: `CUST-001`
- name: `Rahul Sharma`
- email: `rahul.sharma@example.com`
- tier: `premium`

**Product**
- id: `PROD-HP01`
- name: `Premium Wireless Headphones`
- sku: `WH-PRM-BLK-01`
- category: `electronics`
- price: `4999.00`

**Order**
- id: `ORD-1042`
- customer_id: `CUST-001`
- product_id: `PROD-HP01`
- status: `delivered`
- purchase_date: 10 days before "today"
- delivery_date: 4 days before "today"
- issue_type: `damaged_on_arrival`
- total_amount: `4999.00`

**Inventory (initial state — this is what makes the conflict deterministic)**
- `INV-001`: product_id `PROD-HP01`, warehouse `Mumbai`, quantity `1`, reserved_quantity `0`
- `INV-002`: product_id `PROD-HP01`, warehouse `Pune`, quantity `2`, reserved_quantity `0`
- `INV-003`: product_id `PROD-HP01`, warehouse `Bengaluru`, quantity `0`, reserved_quantity `0`
  (exists so "no inventory anywhere" escalation path is testable later, not used in hero demo)

**Policy**
- id: `POL-DMG-01`
- category: `damaged_on_arrival`
- policy_text: "Replacement is permitted within 7 days of delivery for items confirmed damaged
  on arrival. Refund is offered as an alternative on customer request. Replacement is subject
  to inventory availability at the time of fulfillment. Premium-tier customers receive
  expedited processing and priority warehouse allocation."
- eligibility_rules (structured, not free text, so the tool can evaluate it programmatically):
  ```json
  {
    "max_days_since_delivery": 7,
    "requires_order_status": ["delivered"],
    "allowed_issue_types": ["damaged_on_arrival", "defective"],
    "expedited_tiers": ["premium"]
  }
  ```

## The deterministic conflict mechanic (how demo mode triggers it, not a fake error)

Do not hardcode "the second attempt fails." Instead:

1. `get_inventory(product_id="PROD-HP01", warehouse="Mumbai")` at the start of a demo run
   truthfully returns quantity `1`.
2. When `create_replacement` is called for Mumbai, the tool function itself, inside a DB
   transaction, re-checks current quantity. **Demo Mode sets a flag on the case** (e.g.
   `case.demo_conflict_pending = true`) that causes the *first* `create_replacement` call in
   that run to decrement Mumbai's quantity to `0` via a separate "conflicting reservation"
   record immediately before checking availability — simulating another process claiming the
   last unit. This is a real race condition simulation, not a scripted lie: the function
   genuinely re-reads `quantity - reserved_quantity` and genuinely finds `0`.
3. The tool returns the structured failure:
   ```json
   { "success": false, "error_code": "INVENTORY_UNAVAILABLE",
     "message": "Requested replacement inventory is no longer available at Mumbai." }
   ```
4. The agent, seeing this failure in its next turn, calls `search_inventory("PROD-HP01")`,
   observes Pune at quantity `2`, and proceeds to `reserve_inventory` + `create_replacement`
   for Pune. This is a genuine second tool call chain, not a pre-scripted branch.
5. `POST /api/demo/reset` restores Mumbai to `1`, Pune to `2`, deletes the case's replacement
   record and agent events, and sets `case.status` back to `open` — so the run is repeatable.

## Padding data (only if time allows — do NOT let this delay the hero path)

Add 6–8 more customers, 8–10 more orders across a couple more products, and 2–3 more policies
(e.g. `defective`, `wrong_item`, `late_delivery`) purely so the Data Explorer / Customers /
Orders tables don't look empty. Keep these boring and don't wire a second full agent demo
around them unless the hero flow is already rock solid.

## Secondary-scenario data (optional, only after hero path is bulletproof)

- **Refund-eligible order**: `ORD-1043`, same customer, status `delivered`, issue_type
  `damaged_on_arrival`, 3 days since delivery.
- **Escalation case (no inventory anywhere)**: a product with all warehouse quantities at `0`
  (Bengaluru above already covers this) — the agent should reach `status: "escalated"`
  rather than fabricate a resolution.
