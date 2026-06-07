# Handoff — Command-center "honest by construction" + Phase 4 (2026-05-27)

**Status:** all shipped to `main`, deployed, verified live on `https://command.act.place`. Nothing
pending. 10 PRs merged (#94–103). This was a long single session; safe to `/clear` after reading this.

## Headline
The command-center dashboard was silently showing zeros/stale data because queries referenced
tables/columns that no longer exist. Now: **schema-contract baseline 87 → 0, fully strict and
CI-enforced** — every Supabase query is bound to the live schema; `main` blocks any PR that introduces
drift or a build error. Plus two dead data pipelines re-lit and several money-surface bugs fixed.

## What shipped (PRs #94–103, all merged + live)
- **Schema-contract burn-down 87 → 0.** Extended the checker to filter columns (`.eq/.gte/.is/.ilike/
  .order`) with a fluent-chain walker (kills false positives). Fixed 18 silent-zero bugs, archived 14
  truly-dead routes (→ `apps/command-center/src/app/_archived/2026-05-27-dead-table-routes/`), renamed
  drifted refs, retired 24 genuinely-gone-table queries (safe empty defaults), and resolved the
  needs-intent batch: `api_usage→llm_usage`, `project_budgets` aggregation (`lib/finance/budgets.ts`),
  `agent_audit_log→agent_proposals`, subscriptions `account_status`, etc.
- **Final 2 closed via migration** `supabase/migrations/20260527000000_contact_project_links_ghl_contact_id.sql`
  (Ben chose per-GHL-contact): added `ghl_contact_id text` + UNIQUE `(ghl_contact_id, project_code)` +
  index, kept `entity_id` FK, backfilled all 487 rows from `ghl_contacts.canonical_entity_id→ghl_id`.
  Baseline then emptied → fully strict.
- **Phase 4 pipelines re-lit:** `relationship_health` (populator `relationship-health.mjs update` was
  never scheduled → added daily 3:15am cron) and the `/pipeline` kanban (no populator ever existed →
  built `scripts/populate-relationship-pipeline.mjs`, daily 8am cron; 1,458 rows: 430 deals + 400 grants
  + 628 foundations).
- **Money-surface fixes:** `/business/overview` + `/finance/overview` bank balance now use the
  two-account `getCashPosition`/`isActBankAccount` filter → **$130,147** (was null / −$245,844 incl. NM
  Personal). `/api/pipeline` paginated past the 1000-row cap (1,458 rows). ALMA naming correction shipped.
- **Enforcement:** `main` branch-protected — required checks **`Verify schema contract` + `Type Check &
  Lint`** (both made always-run; path filters removed). `strict:false`, no required reviews,
  `enforce_admins:false`. Re-set via `gh api -X PUT .../branches/main/protection --input <json>` (the
  auto-mode classifier blocks this write — Ben runs it; body pattern at `/tmp/bp.json`).

## Load-bearing facts / traps (carried into MEMORY.md)
- **`exec_sql` is SELECT-only** (no DDL/DML) — use Supabase MCP `apply_migration` or psql for migrations;
  delete-by-id via supabase-js, not exec_sql.
- **PostgREST 1000-row cap** bites any unpaginated `.select('*')` — paginate or aggregate.
- **`/finance/overview` has a 6h cache** (`financial_overview_cache` table, key=fy); `?live=true`
  bypasses AND re-writes it — use to bust stale values post-deploy.
- **Prod smoke-check pattern:** pages are cookie-gated, `/api/*` is not — curl with
  `-H Referer:https://command.act.place/ -H Origin:https://command.act.place` to hit prod APIs.
- **Bank balance source:** `xero_bank_accounts.current_balance` (synced daily by `xero-bank-balances`
  cron); ACT cash = `isActBankAccount` only (ACT Everyday + NAB Visa #8815).
- **love_score=0** on the /pipeline kanban — `opportunities_unified.contact_ids` is empty across all
  rows, so no contact-warmth link (logic built, inert until that field populates).

## Open (all optional, low-priority — your call, nothing blocked)
- **EL-v2 storyteller schema** not covered by the contract (separate instance; would need a 2nd contract).
- **D1/D2** fundraising-read migration (6 routes → `opportunities_unified`; low payoff, 14 stale rows).
- **Housekeeping:** stale local branches + ~200 cron-generated dirty files in the working tree (block
  `checkout main`).

## Plans
`thoughts/shared/plans/2026-05-27-command-center-p3-honest-by-construction.md` (baseline 87→0) and
`thoughts/shared/plans/2026-05-27-pipeline-consolidation.md` (Phase 4, D1–D4). Burn-down detail:
`thoughts/shared/reviews/command-center-trust-map/H-schema-contract-burndown.md`.
