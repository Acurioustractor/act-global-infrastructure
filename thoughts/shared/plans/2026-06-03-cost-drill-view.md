# Per-project Cost-Drill view — plan

**Date:** 2026-06-03 · **Branch:** `wip/ecosystem-ghl-architecture-2026-06-02` · **Effort:** xhigh (money attribution)
**Goal:** A command-center view to see each project's FY26 P&L and fix cost attribution line-by-line — primarily to pull JusticeHub's and PICC's real costs out of the ACT-Infrastructure / Core / untagged pool onto them.

## The problem (from the loaded ledger, 2026-06-03 PM-2)
Revenue is well-attributed; **expenses are NOT.** JH shows $118k rev / **$1.1k exp**; PICC $365k / **$42k**; ACT-Infrastructure is a **−$157k overhead pool**. The costs those projects caused are pooling in ACT-IN / Core / untagged. The fix is per-line recategorization of the actual Xero transactions + bills behind each project.

## What already exists (reuse, don't rebuild)
- **`lib/finance/ledger.ts`** — `getProjectPL` / `buildProjectPLRows` build per-project P&L from `project_monthly_financials`, paginated, budget-joined, **compute by `revenue`/`expenses` (positive) not sign**. *Gap:* does **not fold legacy codes** (ACT-HQ→ACT-CORE, ACT-CG→ACT-CS, ACT-PC→ACT-PI). The rollup keeps them separate; the resolver folds them.
- **`GET /api/finance/projects/[code]/transactions`** — already returns the lines behind a project's expenses: bills (ACCPAY AUTHORISED/PAID) + spends, dedupes bill-payments (vendor+amount+date±14d), Xero deep-links, audit notes. *Gap:* select omits `has_attachments` → no receipt flag.
- **`/api/finance/tagging-apply`** — the **reversible Apply/Undo contract**: validates codes vs the `projects` registry, returns `applied[] {prevCode,newCode}` so the cockpit can re-POST prevCodes to Undo. (`/api/transactions/tag` sets `source='manual'` but is **not** reversible — no prevCode.)
- **`/finance/tagging` cockpit** — the Apply/Undo UI pattern (staged decisions → sticky Apply bar → Undo last apply) to mirror.
- **`scripts/lib/project-resolver.mjs`** — `LEGACY_WRAPPERS` + `normalizeCode` (source of the fold map; `.mjs`, not importable into the TS app → need a tiny TS sibling).

## Money discipline (binding)
- **TDD-first on the fold math** — pin the known folded per-project + FY26 totals in a FAILING test before the aggregation. A silent wrong total is the expensive finance failure.
- **Compute by type, not sign** — already handled upstream (rollup stores positive revenue/expenses; the line drill reads `type` SPEND/RECEIVE).
- **Paginate past the 1000-row cap** — reuse `fetchAllRows`; the `[code]/transactions` route already `.range(0,9999)` per project (per-project counts are well under the cap).
- **Two-account rule** — NAB Visa #8815 + NJ Marchesi T/as ACT Everyday only (inherited via the rollup + the bills/spend reads).
- **Mirror-only writes, reversible** — `project_code` + `project_code_source='manual'` on our Supabase `xero_transactions`/`xero_invoices`. **Never a Xero API write from this view.** `manual`-sourced rows are already protected from the auto-taggers.
- **Provenance sidecar** for the pinned numbers.
- **Tracer-bullet** — reassign ONE line end-to-end (apply + verify mirror + Undo) before any bulk run.

## Phases (one at a time, `npx tsc --noEmit` between files, commit at each boundary)

### Phase 0 — Refresh rollup + ground-truth the numbers (no app code)
- `node scripts/calculate-project-monthly-financials.mjs` — idempotent; pulls June + current tags into `project_monthly_financials`.
- Raw SQL (uncapped) to compute the **folded** FY26 per-project revenue/expenses/net and the org totals — these become the TDD pins.
- Write `thoughts/shared/plans/2026-06-03-cost-drill-view.provenance.md` (source tables, query, verified vs inferred, as-of).

### Phase 1 — Legacy-fold money math (TDD-first)
- New `lib/finance/project-codes.ts`: `LEGACY_WRAPPERS` (mirrors the resolver), `normalizeProjectCode()`, pure `foldMonthlyByCanonical(rows)`.
- FAILING test in `lib/finance/project-codes.test.ts`: (a) ACT-HQ rows merge into ACT-CORE etc.; (b) folded FY26 per-project totals + org total ($1.91M rev / $1.19M exp / $719k net) match Phase-0 ground-truth.
- Implement → green. `npx tsc --noEmit`.

### Phase 2 — P&L table API + receipt flag on the drill
- New `GET /api/finance/cost-drill`: folded per-project P&L (reuses `getProjectPL` rows → `foldMonthlyByCanonical` → merged budgets/names) + totals.
- Extend `GET /api/finance/projects/[code]/transactions`: add `has_attachments` to both selects → `hasReceipt` per row. Additive only.
- `npx tsc --noEmit`.

### Phase 3 — Reversible reassign writer
- New `POST /api/finance/cost-reassign`, modeled on `tagging-apply`: `decisions[] = {id, kind:'transaction'|'invoice', code}`; validate codes vs registry; set `project_code` + `project_code_source='manual'`; return `applied[] {id,kind,prevCode,newCode}`. Mirror-only, reversible by re-POSTing prevCodes. (Keeps `/api/transactions/tag` untouched so tagger-v2 doesn't change.)
- `npx tsc --noEmit`.

### Phase 4 — UI `/finance/cost-drill/page.tsx`
- Folded P&L table: revenue/expenses/net per project, sorted, JH/PICC surfaced. Click a project → drill panel.
- Drill: lines grouped by vendor/contact (amount, date, receipt flag, audit note, Xero link); inline reassign per group + per line; bulk select; sticky **Apply + Undo** (tagging-cockpit pattern) hitting `cost-reassign`.
- `npx tsc --noEmit` + `pnpm --filter @act/command-center build`.

### Phase 5 — Verify + commit
- Tracer: reassign one line, verify mirror change + Undo restores prevCode, before bulk.
- Finalize provenance. Commit per phase.

## Open decision for Ben
**Reassign writer:** new reversible `POST /api/finance/cost-reassign` (tagging-apply pattern, returns prevCode for Undo) vs extending `/api/transactions/tag` (currently not reversible). **Recommend the new route** — honors the `source='manual'` + reversible intent without changing the existing tagger-v2 caller.

## Out of scope
- No Xero API writes. No resolver changes. No changes to `/finance/tagging` or `/finance/tagger-v2`. No new rollup logic (reuse the script).
