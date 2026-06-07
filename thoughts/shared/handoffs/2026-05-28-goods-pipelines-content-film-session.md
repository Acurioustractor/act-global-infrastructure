# Session handoff — Goods pipelines, operating model, content + impact film (2026-05-28)

Long session. Picked up the Goods grant-intelligence work, shipped the 3-pipeline operating model + unit ledger + funnel dashboard, cleaned the GHL pipelines, wrote the Notion guide + recording playbook + AI-tooling note, and built a data-driven Remotion impact film. Canonical detail lives in memory `goods-foundation-pipeline.md`. This doc is the **open-items checklist to close in the next session.**

## What shipped (merged)

**grantscope main:**
- #38 / #39 — Goods grant-intelligence (scoring-noise fix, source-vector ingest, Phase-3 AusTender open-tenders) landed on main.
- #40 — Phase 1 surfacing: `discovery_method` filter chip on /grants, repeat-buyer intel (31 warm targets), workbench Capital panel.
- #41 — 3-pipeline roll-up cockpit (`scripts/goods-pipeline-rollup.mjs`).
- #42 — live funnel dashboard at `/org/[slug]/goods/funnel`.
- #43 — funnel link on the Goods OS header.

**act-infra main:**
- #115 — 3-pipeline operating model doc + GHL unit-ledger wiring (`scripts/goods-wire-unit-ledger.mjs`).
- #117 — Demand Register dedup (`scripts/goods-dedup-demand-register.mjs` + restore JSON).

**GHL (live, not git):** created 2 opportunity custom fields — `Goods: Beds` = `mi9ZW3KLhmpcez14cNbx`, `Goods: Washing machines` = `UtxtfnyEd6p1epMEJ0b2` ($ = native monetaryValue). Backfilled ALIVE $60K, Hewitt 10 beds. Deduped 3 Demand Register communities (Papunya, Barunga, Mount Liebig); 100 → 97 rows.

**Notion (under ⚙️ Comms & CRM Operating System hub):**
- Guide: `36debcf981cf81a48f9bd56727137d84` — Goods funding & demand system + strategy.
- Recording playbook (child of guide): `36debcf981cf811d977fcf7f770862a9` — video run-sheet, video slot at top.
- AI toolkit note: `36debcf981cf81b79e45dd6c48843b46` — how to use Remotion/Runway/Higgsfield/etc., brand-guardrailed.
- All three marked **draft for review.**

**Vercel:** confirmed `GHL_API_KEY` + `GHL_LOCATION_ID` already set in grantscope Production (funnel's Ordered/Funded populate in prod).

## OPEN — close these next session

1. **grantscope PR #44 (impact film) — watch + merge.** Watch `/Users/benknight/Code/grantscope/apps/video/out/goods-impact.mp4` (60s vertical, data-driven). On merge: register `build-goods-impact-data` in `scripts/lib/agent-registry.mjs` (from a branch off LATEST main — #44's branch predates the Phase-1 merges, so don't edit agent-registry on it).
2. **act-infra PR #118 (CRM guide doc) — review + merge.**
3. **3 Notion pages: draft → final.** Review the guide / playbook / AI-toolkit pages above and lift the "draft for review" note when happy.
4. **Kaltukatjara dedup decision.** Demand Register has two council rows (Kaltukatjara Nguratjaku Council vs Community Council). Couldn't safely tell if same entity. Confirm → merge one, or leave. (Did NOT delete — risk of losing a real org.)
5. **Runway companion cut — blocked.** Needs Runway wired as a tool AND Utopia footage consent confirmed with the person + Oonchiumpa. Real Utopia frames are in `Goods Asset Register/wiki/outputs/utopia-media` (11 photos). Not actionable until both clear.
6. **Notion guide wording fix.** The guide says the funnel lives "in the command centre" — it actually lives in CivicScope (grantscope app). Correct that line.
7. **grantscope dirty pile (NOT this session's).** ~107 untracked files in the grantscope MAIN worktree (`api/procurement/*` routes, atlas, youth-justice graph, the recovered `apps/video` app now committed via #44). ~6 days old, not mine. Ben to triage: commit useful parts, discard the rest. The main worktree is parked on `wip/goods-scoring-noise-fix-2026-05-27` (merged) — switching to main needs the pile handled.
8. **(info only) Pre-existing open PRs, not ours:** grantscope #37 (entity-service CI fix, open since 2026-05-04 — this is the test that makes our grantscope PRs show UNSTABLE), act-infra #87 (alignment loop).

## Key facts for the new session

- **The model:** 3 GHL pipelines = one funnel. Demand Register (need) → Buyer Pipeline (procurement, pays) OR Supporter Journey (support, donates) → delivery. Cockpit: NEED 12,504 beds / 1,563 washers (curated active+lead) · ORDERED $1.84M · FUNDED $1.38M · DELIVERED 520/41 · GAP 11,984/1,522.
- **The one habit:** set beds/washers/$ on a GHL opp when a deal gets real → cockpit + funnel + film all roll up from that.
- **GHL trap:** numeric opp custom fields read back under `fieldValueNumber` (write API takes `field_value`).
- **The film refreshes itself:** `node --env-file=.env scripts/build-goods-impact-data.mjs && cd apps/video && npm run render:goods`.
- **Funnel URL:** `/org/[slug]/goods/funnel` (CivicScope / grantscope app).

## Restart prompt

> Pick up the Goods work. Read memory `goods-foundation-pipeline.md` + this handoff (`thoughts/shared/handoffs/2026-05-28-goods-pipelines-content-film-session.md`). Goal this session: close the open items. Start by watching the impact film (`grantscope/apps/video/out/goods-impact.mp4`) and merging PR #44 + #118 if good, then work the open list (Notion drafts → final, Kaltukatjara decision, the guide wording fix). Leave Runway and the grantscope pile for explicit decisions.
