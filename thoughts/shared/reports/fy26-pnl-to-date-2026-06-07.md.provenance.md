---
title: "ACT FY26 P&L — year to date Provenance"
status: Final
date: 2026-06-07
type: provenance
tags:
  - provenance
  - verification
  - finance
source_packet_id: na
canonical_entity: act-fy26-pnl
---

# ACT FY26 P&L — year to date Provenance

## Purpose

- Output: financial report (FY26 P&L to date, by project, monthly shape, cash cross-check, pipeline health)
- Intended destination: `thoughts/shared/reports/fy26-pnl-to-date-2026-06-07.md`; input to the Standard Ledger / EOFY Pty-cutover conversation (30 Jun 2026)
- Why it was generated: Ben asked to "run the pipeline" for the full current financial year up to now (session 2026-06-07), following the finance-suite walkthrough

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `project_monthly_financials` (Supabase shared `tednluwflfhxyucgwigh`) | canonical accrual ledger | `month >= '2025-07-01' AND month < '2026-07-01'`, queried 2026-06-07 ~04:55 UTC | Org P&L totals, by-project P&L, monthly shape (§1–3 of report) |
| `xero_transactions` (same DB) | runtime cash ledger | `date >= '2025-07-01' AND date < '2026-07-01'`, `status='AUTHORISED'`, `bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')` | Cash SPEND/RECEIVE totals, spend by project, reconciliation + receipt + tagging gauges (§4–5) |
| `information_schema.columns` | schema check | live | Verified column names before querying (schema-first rule) |

All aggregation done server-side via the `exec_sql` RPC (SQL `SUM`/`COUNT`), never via
supabase-js row fetches — avoids the PostgREST 1000-row cap truncation class of error.

## Verification Status

- `Verified:` Org revenue $1,905,445 / expenses $1,090,085 / net $815,360; all by-project and monthly figures; cash SPEND $848,454 (1,649 lines); cash RECEIVE $284,297; tagged 99.8% by dollars (9 lines / $1,525 untagged); reconciled-flag 1,341/1,649; receipted-flag 880/1,649; 444 DELETED rows excluded; exact bank-account strings (incl. `NM Personal ` trailing space) and status values confirmed by query.
- `Inferred:` "Accrual − cash gap ≈ ACT-HQ accrual layer" ($241,631 vs $244,042, ~$2.4K residual — arithmetic, not traced line-by-line); "expense discipline tightened from Jan 2026" (trend reading of verified monthlies); "June ≈ $0 is partial month + sync lag" (not confirmed against Xero direct).
- `Unverified:` exact last-sync timestamp of the Xero→Supabase mirror; Spending Intelligence's 95.3% receipted figure (carried from memory of the live system, not re-queried this session); founder-drawings/R&D-basis figures (~$55K of $238K flag) carried from the 2026-05/06 reconciliation worklist sessions, not re-derived here.

## Human Decisions / Gates

- Editorial review: pending (Ben)
- Cultural review: not-required (no community/storyteller content)
- Consent review: not-required
- Release approval: internal only — NOT cleared for funder/board use without refreshing the two ⚠-flagged mirror gauges against live Xero

## Known Gaps And Assumptions

- `is_reconciled` and `has_attachments` are known-drifting mirror flags; the report quotes them with explicit ⚠ caveats. True reconciliation state requires per-transaction single-GET against the Xero API; true receipt coverage comes from the Spending Intelligence refresh.
- Cash RECEIVE structurally undercounts income (settlements arrive as RECEIVE-TRANSFER) — the report forbids quoting it as income.
- Accrual P&L scope: `project_monthly_financials` is the repo's canonical accrual source; its own upstream build (invoices + transactions mapping) was not re-audited in this session.
- Founder drawings (acct 880) excluded from expenses — affects any "what does ACT cost to run" reading.
- FY26 is incomplete: 23 days remain; EOFY adjustments (Telford Smith double-pay recovery, acct 429 recodes, INV-0314 decision) will move final numbers.

## Reproduction Steps

1. Schema check: `SELECT column_name FROM information_schema.columns WHERE table_name IN ('project_monthly_financials','xero_transactions')` via `exec_sql` RPC.
2. Run the five aggregate queries exactly as recorded in the session transcript (org P&L, by-project, monthly, cash spend/income, health gauges) — filters as in the Data Sources table above. A rerunnable copy of the cash-side script existed transiently at `.fy26-read.tmp.mjs` (repo root, deleted after run); reconstruct from this sidecar's filters.
3. Verify: ACT-CORE and ACT-GD cash SPEND sums should equal their `project_monthly_financials` expense sums to the dollar; accrual-minus-cash gap should sit within ~1% of ACT-HQ expenses.

## Linked Artifacts

- Source packet: na (live DB queries)
- Output artifact: `thoughts/shared/reports/fy26-pnl-to-date-2026-06-07.md`
- Validation log: session transcript 2026-06-07 (queries + raw results); related: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, `scripts/reconciliation-worklist.mjs`
