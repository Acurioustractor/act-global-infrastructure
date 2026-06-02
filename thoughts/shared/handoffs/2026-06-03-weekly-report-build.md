# Handoff — Weekly business-strength report build (issue #140 §4)

**Date:** 2026-06-03 · **Branch:** `wip/opus-4-8-prompting-2026-05-31` (committed locally, NOT pushed) · **Plan:** `thoughts/shared/plans/2026-06-03-project-aligned-finance.md` (§4 is the spec) · **Issue:** #140

## What this is
A weekly per-project + whole-org "business strength" report at **`/finance/weekly`**. Architecture: **one source of truth in `lib/finance/ledger.ts`** → API **`/api/finance/weekly/route.ts`** → client page **`app/finance/weekly/page.tsx`**. Front-door tile already on `/finance`. Read-only.

## Shipped (slices 1–4, all TDD'd + live-verified against #8815)
| Slice | Section | Commit |
|---|---|---|
| 1 | Whole-org snapshot (cash · runway · burn · month/week net) + FY income-vs-spend chart | `24bd82c`, `92faef2`, tile `5c9859f` |
| 2 | Per-project P&L (income/spend/net, % of budget, funded vs ACT-subsidised) | `7583cc2` |
| 3 | People costs (payroll 477/478/486, drawings 880/882 flagged separate, by-project) | `d41c940` |
| 4 | GST/BAS (derived) + receipt coverage + R&D pointer | `142e0e7` |

`apps/command-center/src/lib/finance/ledger.test.ts` — **10/10**. tsc + eslint clean.

### Live numbers (verified 2026-06-02/03 — drift over time)
cash $225,786 · burn $64,278/mo · runway 3.5mo · 30 projects (ACT-GD +$203K, ACT-IN −$157K) · payroll $174,177 · drawings $250,562 · GST collected $123,878 / paid $126,176 / net −$2,298.

## Verified data gotchas (DON'T re-learn these the hard way)
- **`line_items` is snake_case JSON** (array OR string): keys are `account_code`, `line_amount`, `tax_type`, `tracking[]`. **There is NO `tax_amount`** — GST is *derived* (10% of `line_amount` by `tax_type`: `OUTPUT*`=income/collected, `INPUT*`=expense/paid; EXEMPT/GSTFREE/BASEXCLUDED→0). `tax/route.ts`'s `PAYROLL_ACCOUNTS=['8000'…]` are GENERIC placeholders — wrong for ACT.
- **ACT people accounts: 477 Wages · 478 Super · 486 Sub-contractors.** Drawings: **880 (Nic) / 882 (Ben)** — owner draw, NOT a business people cost.
- **`project_monthly_financials` (accrual rollup) LAGS** — reads $0 for the current incomplete month. Snapshot uses **live cash basis (`getOrgLedger`) for month/week**, accrual only for trailing burn. Columns: `project_code, month, revenue, expenses, net`.
- **`project_budgets`**: `project_code, budget_type ∈ {expense,revenue,grant}, budget_amount, fy_year='FY26'`. Pivot via `aggregateProjectBudgets` (budgets.ts). FY label = `FY${getFYDates(now).fyEnd.slice(2,4)}`.
- **R&D `rd_eligible` flag is drawings-inflated** (gross ~$500K via getOrgLedger vs ~$55K real basis). Both rd routes use the gross flag. Weekly view points to `/finance/rd-dashboard`, does NOT restate the 43.5%.
- **`has_attachments` drifts low** (~50% vs the ~95% spending-intelligence figure). Receipt coverage labelled "approx".
- PostgREST 1000-row cap → use the module-private `fetchAllRows` for line-item / financial fetches.
- Supabase project id (shared/operational): `tednluwflfhxyucgwigh`.

## Pure functions in ledger.ts (all TDD'd)
`monthStartISO`, `trailingMonthsWindow`, `weekStartISO`, `monthlyBurnFromTrailing`, `computeRunwayMonths`, `budgetVariancePct`, `pctConsumed`, `buildProjectPLRows`, `summarizePeopleSpend`, `gstFromRows`. Async: `getWeeklySnapshot`, `getMonthlySeries`, `getProjectPL`, `getLineItemFacts`.

## Remaining (slices 5–7)
1. **Slice 5 — committed / "betting on":** forward spend (open bills = `getOrgLedger().billsOutstanding`, recurring subs, payroll run-rate), committed-but-unfunded, **weighted pipeline (value×probability)**, secured-unbilled, cash gap = committed − (cash + secured).
2. **Slice 6 — opportunities & pile-mix:** top open opps, pile mix vs FY27 target (Voice/Flow/Ground/Grants), single-funder concentration %, next-90-day inflows, stalled opps.
   - **UNKNOWN to resolve first:** where the GHL opps live in Supabase (table + fields: value, probability, stage, `pipeline_name`, funder/contact, pile). `pipeline-rollup.ts` is ONLY radar-exclusion helpers (`isRadarPipeline`, `excludeRadar`) — the weighted/concentration math is net-new. **Always `excludeRadar` (the "Grants" pipeline is a GrantScope dump = ~91% of headline value; including it 10×-overstates.)** Check `/api/finance/pipeline-intelligence|review|update` routes + `scripts/align-ghl-opportunities.mjs` for the table.
3. **Slice 7 — Notion digest wiring:** emit the snapshot line into `scripts/weekly-money-digest.mjs` by **fetching `/api/finance/weekly`** (single source of truth — do NOT duplicate the math). The cron can't import the app's `@/`-aliased TS. **Tier 2/3 external write (day-shift)** — confirm endpoint reachability/auth before any Notion push; build code, don't auto-push.

## Discipline (carry forward)
TDD every emitted dollar (failing test pinned to a known total FIRST) · reuse existing infra, don't rebuild · `npx tsc --noEmit` + `npx tsx --test src/lib/finance/ledger.test.ts` between phases · curl `localhost:3002/api/finance/weekly` to verify live before claiming done · commit per slice with `Plan: 2026-06-03-project-aligned-finance` · read-only (no API writes that reconcile/code).
