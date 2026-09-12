# ResolveAI — 1-Day Reality Check & Scope Plan

Your original spec (the three source docs) is a ~2-week enterprise build. Here is what
survives the compression to one day, and why. Read this before you paste the master prompt —
it explains the calls the master prompt already makes for you.

## The one rule that matters

**The hero scenario must work end-to-end, live, twice in a row, before you touch anything else.**
Everything else is negotiable. If you're at hour 8 and the failure→replan→resolve loop isn't
bulletproof yet, stop building new pages and fix that loop.

## What stays (non-negotiable — this IS the hackathon submission)

- Real Postgres-backed state (SQLite is fine for a 1-day build — see note below)
- Real tool functions the LLM calls (not the LLM narrating fake steps)
- The one hero flow: damaged order → replacement → inventory conflict → replan →
  alternate warehouse → verify → resolved
- AgentEvent audit trail written by the backend, rendered live in the UI
- Demo Mode with a working Reset
- A landing/overview page + Create Case page + Agent Execution screen (the 3 screens that
  carry the whole demo)
- A README that explains the architecture and how the agentic loop satisfies the rubric

## What gets cut or downgraded (and what to say if asked)

| Original spec | 1-day version | Why |
|---|---|---|
| PostgreSQL (Supabase) + SQLAlchemy | **SQLite + SQLModel**, same schema | Zero external setup, zero network flakiness on demo day. Swapping to Postgres later is a one-line connection string change if SQLModel is used correctly — mention this in the README as "production would use managed Postgres." |
| Vercel + Render/Railway separate deploy | **Single deploy**: FastAPI serves the built Next.js static export, OR both on Render as one service. One deploy target = one thing that can break. | Judges care that it's *live and working*, not your infra topology. |
| SSE/WebSocket real-time | **Polling every 700ms–1s** while a run is active, with a clean `useAgentRun` hook so it *looks* real-time | SSE is a common last-mile time sink. Polling a `/events?since=` endpoint is indistinguishable to a viewer and takes 20 minutes instead of 3 hours. |
| 4 demo scenarios (replace/refund/cancel/escalate) | **1 scenario fully polished** (replacement + inventory conflict). Stub the eligibility-check code path for refund/cancel so it's visible in the tool list but not wired into a second full UI flow. | Judges remember the one flow that worked flawlessly, not four half-working ones. |
| Full 25-item README + separate hackathon-alignment.md + architecture.md with Mermaid | **One README** with a short "Why this is agentic, not a chatbot" section and a Mermaid diagram inline | Three docs nobody reads in a 1-day timeline; one good one they will. |
| Automated test suite (12 tests) | **3–4 pytest tests** covering: happy path, inventory-conflict→replan path, verify_resolution logic | This is what actually derisks your live demo. Skip UI tests entirely. |
| Docker Compose | **Skip.** `pip install` + `npm install` + one seed script. | Docker adds setup time you don't have; nobody will run docker-compose to judge you. |
| Operations Dashboard + Analytics + full Data Explorer | **Build after the hero flow is bulletproof**, as time allows. Analytics can be 4 real numbers computed with a SQL COUNT, not a chart library. | These are "if time permits" — the master prompt phases them last on purpose. |

## Hour-by-hour (assuming ~10–12 working hours)

1. **Hr 0–0.5** — Repo scaffold, env vars, confirm LLM API access works with a trivial call.
2. **Hr 0.5–2** — DB models + seed script. Run it. Query it manually. Confirm data is real
   before writing a single line of agent code.
3. **Hr 2–4** — Tool functions (`get_customer`, `get_order`, `get_inventory`,
   `create_replacement` with the injected conflict, `search_inventory`,
   `reserve_inventory`, `verify_resolution`). Test each with a script, not through the LLM yet.
4. **Hr 4–6** — Agent orchestrator loop calling those tools via structured tool-calling.
   Get the hero flow working from a terminal script / raw API call, no UI yet.
5. **Hr 6–6.5** — **CHECKPOINT.** If the flow above doesn't reliably fail-and-recover twice in a
   row, do not proceed to UI. Fix it first.
6. **Hr 6.5–9** — Frontend: landing → create case → agent execution screen (the polling
   timeline, live state panel, case panel). This is where `03_DESIGN_SYSTEM.md` matters.
7. **Hr 9–10** — Demo Mode + Reset endpoint wired to a UI button. Run the full acceptance test
   from the master prompt 3 times.
8. **Hr 10–11** — Deploy. Smoke-test the deployed URL, not just localhost.
9. **Hr 11–12** — README, short hackathon-alignment section, record the demo video against the
   *deployed* URL (not localhost, in case something env-specific breaks).

## Give yourself a hard stop for new features

Pick a time (e.g., hour 9) after which you add **zero new scope** — only fix what's broken.
Judges cannot penalize a missing Analytics page. They will absolutely notice a broken demo.
