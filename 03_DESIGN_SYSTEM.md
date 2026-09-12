# ResolveAI — Design System (concrete, not vibes)

Your source docs say "premium, minimal, not AI-looking" — but that instruction alone is what
*every* AI-generated dashboard is told, which is why they all still look the same. The way to
actually get a human-feeling UI is to make specific, opinionated choices grounded in what this
product actually is, and to explicitly avoid the handful of tells that make interfaces read as
generated. This file is that: paste it into Antigravity as-is.

## Ground the aesthetic in the actual subject matter

ResolveAI is not a generic SaaS dashboard. It is closer to an **operations/incident console** —
the visual world of air-traffic control boards, trading-desk order blotters, and logistics
control towers: places where a conflict happens, gets noticed, and gets resolved, live, in
front of you. Lean into that. The agent timeline is not a chat log — it's an operations log.

## Color — named hex values, not "a professional palette"

Light mode (default):
- `--surface: #FAFAF8` — page background, slightly warm off-white, not cream
- `--surface-raised: #FFFFFF` — cards/panels
- `--ink: #1C1E22` — primary text
- `--ink-muted: #5B5F68` — secondary text/metadata
- `--line: #E3E1DC` — hairline borders
- `--signal: #C1631E` — the ONE accent color, a burnt ochre/amber, used only for primary
  actions and active-state highlights (deliberately not Claude's terracotta #D97757 or a
  generic SaaS blue/purple)
- `--success: #2F7D5C` (muted forest, not bright green)
- `--warning: #B8860B` (dark goldenrod)
- `--error: #A63A2E` (muted brick red, not saturated stop-sign red)
- `--info: #3E5C76` (slate blue)

Dark mode (use for the Agent Execution screen specifically — it should feel like a night-shift
ops console; keep the rest of the app light):
- `--surface: #14161A`, `--surface-raised: #1B1E24`, `--ink: #EDEDEA`, `--line: #2A2D33`,
  same `--signal`/status colors, slightly desaturated for contrast on dark.

Do not use gradients as decoration. The only permitted gradient is a 1–2% subtle vertical
falloff on the dark execution screen background, nothing else.

## Typography

- UI/body typeface: **Inter** or **General Sans** (via Fontshare) — one family, used with a
  real type scale (not just 3 sizes). Weights: 400 body, 500 for emphasis/labels, 600 for
  headings. No 700+/black weights anywhere — restraint is the point.
- Data/monospace typeface: **IBM Plex Mono** or **JetBrains Mono** — used ONLY for genuinely
  tabular/precise data: timestamps, order IDs, case IDs, quantities, currency figures in
  tables. Never for body copy or navigation labels.
- Do not use a serif anywhere. This product doesn't need editorial warmth; it needs precision.
- Avoid these specific tells: no ALL-CAPS tracked-out eyebrow labels above headings; no
  middle-dot-joined metadata strings ("Case · Order · 2h ago" — use a plain comma or a proper
  divider glyph "·" sparingly if at all); no arrow glyphs appended to buttons ("Resolve →");
  don't bold/color a single word inside a headline for emphasis.
- Line length for any paragraph text: keep under ~75 characters measure.

## Layout logic (not generic card soup)

- App shell: a **narrow icon+label rail** on the left (not a wide labeled sidebar with a logo
  lockup at top like every SaaS template) — 64px collapsed, expandable to 200px on hover/pin.
- Main content uses a real grid, left-aligned, not centered cards floating in whitespace.
- The Agent Execution screen is the one place to spend your visual "boldness budget" (per
  design principle: spend boldness in one place, keep everything else quiet):
  - **Left pane (narrow, ~280px)**: Case facts — customer, order, issue, goal. Plain key-value
    rows with hairline dividers, not individually-cards-for-every-field.
  - **Center pane (dominant)**: the operations log. Each event is a single row: monospace
    timestamp, a short status word (COMPLETED / BLOCKED / REPLANNING / VERIFIED — real words,
    not icons-only), and the event description. New rows append with a single quiet
    slide-in-and-settle (150ms), not a bouncy animation. When status flips to BLOCKED, that row
    briefly gets a `--error` left-border accent that fades after a couple seconds — draw the
    eye once, don't leave it flashing.
  - **Right pane (narrow, ~280px)**: Live state — a plain data table of current order/inventory/
    resolution state that visibly updates (a numeral or word changes) at the moment the backend
    state actually changes. This live *change* is more convincing than any loading spinner.
- Tables (Data Explorer, Customers, Orders): dense, real tables with sortable headers and
  right-aligned numerics — not each row exploded into its own card.
- Status "pills": rectangular with a small radius (4px, not fully rounded), colored text on a
  10%-opacity tint of the status color, not solid color chips. This alone reads as more
  "enterprise software" than "generated dashboard."

## Motion

One orchestrated moment only: when a case moves from RUNNING to RESOLVED, the live-state panel
and the case-status pill transition together (color shift + a single checkmark-shaped path
draw, ~400ms, once). Everywhere else: hover states are a 100ms background/border shift, nothing
more. No fade-slide-up on every section load. No pulsing anything.

## Copy voice

Interface copy is plain and active: "Create replacement," not "Submit," not "Initiate
Replacement Process." Empty states say what to do next ("No cases yet — create one to see the
agent run"), not "No data available." Errors state what happened and what's next, in the
system's own voice, never apologetic ("Inventory unavailable at Mumbai — searching alternate
warehouses" not "Oops, something went wrong!").

## Self-check before calling any screen done

For each major screen, ask: would this be mistaken for a template with the logo swapped out?
If yes — find the one place you can make a choice specific to *this* product (an operations
log, a conflict-and-recovery moment, a warehouse map) and push on that, then quiet everything
else around it.
