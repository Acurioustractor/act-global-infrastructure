---
name: tag-transactions
description: Review and tag untagged Xero transactions / bank lines / invoices with project codes — the cross-project spend & income alignment workflow. Use when user says "tag transactions", "fix transaction tagging", "improve transaction coverage", or "align spend/income across projects".
---

# Tag Transactions — cross-project spend & income alignment

There are two surfaces. **Default to the workbench for human review/alignment**; use the vendor-rule script only for bulk auto-tagging of known vendors.

## Front door: the Finance Workbench (`/finance/workbench`)

The single review surface that unifies **bank_statement_lines + xero_transactions + xero_invoices** for the FY into one queue, with per-row project/receipt/reconciliation/R&D flags and AI suggestions. Lib: `apps/command-center/src/lib/finance/workbench.ts`; API: `GET/PATCH /api/finance/workbench`.

- **Navigate by clicking the KPI cards** (they set Source + Queue + Direction for you — don't hand-juggle the dropdowns):
  - **Project gaps** → untagged rows across all mirrors (assign a project)
  - **Review ACT-IN** → rows tagged to the ACT-IN catch-all (reassign to a real project)
  - **Receipt gaps / Candidates / Draft assist / Unreconciled / R&D review** → the other queues
- **Saves are single-row and live** — the PATCH writes `project_code` + stamps `project_code_source = 'manual_workbench'` (bank lines: `project_source`), which the nightly auto-taggers skip. Human calls are protected.
- If a view is empty, the empty state tells you why and offers "Show In + out, all projects".

## Bulk path: vendor-rule auto-tagger (known vendors only)

```bash
node scripts/tag-transactions-by-vendor.mjs --stats   # coverage now
node scripts/tag-transactions-by-vendor.mjs           # dry-run: what would tag, by which rule
node scripts/tag-transactions-by-vendor.mjs --apply   # apply (after user approval)
```
It skips rows where `project_code_source LIKE 'manual%'` (never overwrites human/workbench tags). Any new tagger MUST keep that guard.

## Load-bearing guards — read before tagging anything

1. **Two-account rule.** ACT business money lives ONLY in **NAB Visa ACT #8815** + **NJ Marchesi T/as ACT Everyday**. Exclude `NM Personal` and `NJ Marchesi T/as ACT Maximiser` from project totals.
2. **Transfers are NOT taggable.** `SPEND-TRANSFER` / `RECEIVE-TRANSFER` (Xero) and credit-card payoffs ("Internet Payment" on the NAB Visa) are internal money movement between ACT's own accounts. **Never assign them a project** — doing so double-counts a project's spend AND income. The workbench already excludes them from "needs project".
3. **DELETED/voided rows don't count.** Every `xero_transactions`/`xero_invoices` money read must exclude `status='DELETED'` (NULL-safe: `IS DISTINCT FROM 'DELETED'` / `.or('status.is.null,status.neq.DELETED')`). Voided rows inflated the R&D claim by ~$32K once. → memory `command-center-finance-truth.md`.
4. **Credit-card credits ≠ income.** On the NAB Visa (a liability), a `credit` is a payoff (transfer) or a vendor refund (contra-expense), never income. Don't tag refunds as income.
5. **PostgREST 1000-row cap.** Unpaginated supabase-js sums silently truncate >1000 rows. Paginate via `fetchAllRows()` / aggregate in SQL. → memory.

## Tracer-bullet, then bulk
Before any batch: tag ONE row end-to-end and confirm the move is correct. The 2,779 "untagged transactions" once turned out to be 100% transfers — bulk-tagging would have created errors. Prove the path first.

## Verify (after any tagging that changes a project total)
- Re-check the changed project's total against **`project_monthly_financials`** (the canonical accrual P&L). A silent wrong number is the expensive failure.
- Refresh health scores: `node scripts/compute-project-health.mjs --apply`
- The workbench logic is unit-tested: `cd apps/command-center && node --import tsx --test src/lib/finance/workbench.test.ts` (this repo has no vitest — use `node --import tsx --test`).

## Subscriptions
Subscription tagging lives in the **scan-subscriptions** skill, not here (the old `backfill-subscription-projects.mjs` was removed).
