# Spending Intelligence System — Session Handoff
**Date:** 2026-04-13
**Session:** Bank statement lines discovery + reconciliation system build

## What happened

Discovered that **Xero API cannot expose raw bank feed statement lines** — only reconciled transactions. This means ~35% of card spend was invisible to the entire BAS pipeline. The Mounty Yarns investigation ($27.5k invoice for JR NSW) revealed the gap when $20k+ of supplier charges (Kennards, Sand Yard, Container Options, Bunnings Minchinbury) appeared in Xero's bank feed UI but not via API.

## What was built

### Database
- **`bank_statement_lines`** table — 914 lines ingested for Q2 FY26 (Oct-Dec 2025), with columns for project_code, project_source, receipt_match_id/score/status, subscription_group_id
- **`location_project_rules`** — 31 rules mapping merchant suburbs to projects (Minchinbury→ACT-MY, Garbutt→ACT-HV, Alice Springs→ACT-GD, etc.)
- **`subscription_patterns`** — 38 recurring vendors with expected amounts, receipt email, no_receipt_needed flag

### Scripts
- **`scripts/ingest-statement-lines.mjs`** — Manual JSON ingestion (used for first batch)
- **`scripts/ingest-statement-lines-raw.mjs`** — Parses raw Xero UI paste (tab-separated), handles payee extraction with 80+ vendor patterns
- **`scripts/tag-statement-lines.mjs`** — Project tagger: vendor overrides → location rules → subscription patterns → trip date rules → meal/travel during trips
- **`scripts/reconciliation-report.mjs`** — THE one script to run before Xero. Shows: ready to reconcile, need receipts, ambiguous, BAS readiness score. Includes receipt matcher with Dice coefficient fuzzy vendor matching, date scoring, amount scoring with GST tolerance, high-frequency vendor handling (Uber/Qantas)
- **`scripts/weekly-reconciliation.mjs`** — Cron orchestrator: runs tagger + matcher, generates BAS readiness score, sends Telegram summary

### Data files
- `data/statement-lines-oct-nov-2025.txt` — Raw Xero paste for Oct-Nov 2025

## Current state — Q2 FY26

| Metric | Value |
|--------|-------|
| Total debit lines | 872 |
| Matched to receipt | 448 (51%) |
| No receipt needed | 233 (27%) |
| **BAS coverage by value** | **86.3%** |
| Need receipts (>$82.50) | 88 items |
| Project-tagged | 691/872 (79%) |
| Untagged | 181 items ($37k) |

### Spend by project
| Project | Spend |
|---------|------:|
| ACT-IN (internal) | $92,719 |
| ACT-PI (PICC) | $63,401 |
| ACT-HV (Harvest) | $42,552 |
| ACT-GD (Goods on Country) | $31,213 |
| ACT-FM (Farm) | $26,124 |
| ACT-MY (Mounty Yarns) | $25,737 |
| ACT-JH (JusticeHub) | $1,615 |
| Untagged | $37,005 |

## What's next

### Immediate
1. **Resolve 181 untagged lines** ($37k) — mostly Qantas flights and Uber rides between trips. Need Ben to confirm trip dates for Nov 1-20 and any Oct trips not covered by current trip rules
2. **Resolve 88 missing receipts** — run `reconciliation-report.mjs` for the full list, chase top items (Carla Furnishers $11k, Defy Design $24k, Kennards $8k)
3. **Ambiguous Uber/Qantas matches** — 197 items where multiple receipts match at similar scores. Consider: exact amount + exact date = auto-match, otherwise leave for human review

### System improvements
4. **Automate statement line ingestion** — currently requires manual paste from Xero UI. Options: Playwright browser automation, or NAB API (Open Banking CDR)
5. **Wire up weekly cron** — add `weekly-reconciliation.mjs` to PM2 cron schedule (Monday 8am)
6. **Xero auto-reconcile** — for matched items, create BankTransactions via API that will auto-match against statement lines in Xero's reconciliation screen
7. **Refactor bas-completeness.mjs** — switch from xero_transactions to bank_statement_lines as source of truth

### Mounty Yarns response to Daniel
- Cost breakdown is ready at `thoughts/shared/plans/mounty-yarns-cost-breakdown.md`
- Draft response ready to refine — 6 line items totalling $25k ex GST / $27.5k inc GST
- INV-0295 needs updating in Xero (consolidate 3 invoices, change date to 1 March 2026)
- Script `update-mounty-invoices.mjs` is ready but hasn't been run

## Key design decisions
- `bank_statement_lines` is the source of truth, not `xero_transactions`
- Trip rules (date range → project) handle travel tagging without manual per-line assignment
- Location rules in `particulars` field are the strongest signal for project tagging on hardware/hire charges
- No-receipt-needed classification covers: bank fees, transfers, cash advances, subscriptions flagged as no_receipt_needed, items under $82.50 at known low-value vendors
- Matching uses weighted composite score: vendor fuzzy (35%) + date (25%) + amount (40%), with reweighting for high-frequency vendors (Uber/Qantas: vendor 15%, date 35%, amount 50%)
