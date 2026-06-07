# Handoff — Weekly dashboard restructure + unified tagging engine (Phase 1)

**Date:** 2026-06-03 · **Branch:** `wip/ecosystem-ghl-architecture-2026-06-02` (pushed through `c054973`) · **Session:** claude (Opus 4.8, 1M)

## What shipped (all committed + pushed, all read-only/gated discipline held)

| Work | Commit |
|---|---|
| Weekly report slices 5+6 (commitments + opps/pile-mix) | `bb76247` |
| Slice 7 (business-strength block in Notion digest — fetches API) | `7e399e1` |
| **Weekly dashboard restructure** (action-first, 4-tier) | `60fa92c` |
| Tagging design — ADR + concept + plan | `9aa372f` |
| Tagging **Phase 1** — resolver (13/13) + read-only sweep | `e7cbb83` |
| Tagging Phase 1 **T3** — `tagging_sweep_runs` table + `/finance/tagging` view | `c054973` |

Only production write this session: the additive `tagging_sweep_runs` table (migration `20260603000000`, applied + verified). No re-tagging, no money writes, no Notion push.

## Weekly dashboard (`/finance/weekly`) — now action-first

Built via a grill. 4 tiers: **attention panel** (trustworthy alerts + all-clear, never manufactured) → **glance** (13-week projected-cash headline) → **evidence** (projects as exceptions, opps, people) → **periodic** (GST/pile-mix collapsed). All math in `lib/finance/ledger.ts` (the one ledger), 24/24 tests. Plan: `2026-06-03-weekly-dashboard-restructure.md` (completed).

**Key verified data facts (carry forward):**
- **AP is PHANTOM** — $503K open bills, **100% overdue, oldest Jan 2025** (unreconciled, NOT real debt). EXCLUDED from the cash number, surfaced as the #1 critical alert. Never subtract it.
- 13-week projected cash = `cash + collectible AR − burn×3` = **$197K** (hard data only).
- AR $164,250 ($103,750 overdue). Untagged real income = **$0** (all FY26 receipts tagged — genuine all-clear).
- GHL opp `expected_close` is **88% empty** → don't headline a 90-day GHL inflow number; use dated Xero AR.

## Tagging engine — Phase 1 done, Phases 2–3 PARKED (day-shift, gated)

- **One resolver:** `scripts/lib/project-resolver.mjs` — `resolveProjectCode(signals,index)→{code,confidence,source}`, precedence manual→system→linked→registry→vendor→prefix→pipeline→keyword, legacy wrappers folded (ACT-CG→ACT-CS, ACT-HQ→ACT-CORE, ACT-PC→ACT-PI). 13/13 tests (`scripts/tests/project-resolver.test.mjs`).
- **Read-only sweep:** `scripts/tagging-sweep.mjs` → persists to `tagging_sweep_runs` + writes `thoughts/shared/financials/tagging-sweep-<date>.{md,json}`. View at **`/finance/tagging`** ("Tagging health").
- **Sweep findings:** GHL opps 64% / subs 49% / Xero invoices 97%; **11 opp↔invoice conflicts** (pattern: opps lazily tagged **ACT-CA** while the invoice is the real project); **204/277 untagged opps + 29/35 untagged subs auto-fillable**.
- Design: ADR `wiki/decisions/2026-06-03-unified-project-code-resolver.md`, concept `wiki/concepts/project-code-resolution.md`, plan `thoughts/shared/plans/2026-06-03-unified-tagging-engine.md`.
- **SoR model:** registry = code set + mapping; Xero Project Tracking = money-row SoR; resolver = GHL opps/subs; `opportunities_unified` = projection.

## Parked for day-shift (need explicit go — all the external writes)

1. **Slice-7 Notion push** — `node scripts/weekly-money-digest.mjs` (or rides Mon 7:55am cron). Built + dry-run-verified, NOT run.
2. **Tagging Phase 2 (tracer)** — prove the re-tag path on ONE GHL opp end-to-end (resolve → propagate linked-invoice code → write one opp, gated, revert-able).
3. **Tagging Phase 3 (gated writers)** — lift opps 64%→~90%, subs 49%→~94%, fix the 11 conflicts. **GUARD:** never auto-apply the ACT-CA catch-all from a pipeline hint over a sharper linked-invoice code (that's what caused the conflicts).
4. Optional: add `tagging-sweep` to PM2 cron to keep `/finance/tagging` fresh.

## Note
The earlier handoff `2026-06-03-weekly-report-build.md` had a STALE branch ref (`wip/opus-4-8-prompting-…`); the real branch is `wip/ecosystem-ghl-architecture-2026-06-02`.
