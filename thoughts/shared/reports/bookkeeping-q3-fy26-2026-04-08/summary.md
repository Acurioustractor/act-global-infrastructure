# Bookkeeping Workbook — Q3 FY26 (Jan-Mar 2026)

**Entity:** Nicholas Marchesi T/as A Curious Tractor
**ABN:** 21 591 780 066
**Period:** 2026-01-01 → 2026-03-31
**BAS Due:** 2026-04-28
**Generated:** 2026-04-08T19:49

---

## Headline Numbers (Cash Basis)

| Metric | Value |
|---|---|
| Income (invoices paid) | $140,322.48 |
| GST on income | $12,814.27 |
| Expenses (bank SPEND) | $57,411.86 |
| GST on expenses (estimated) | $5,219.26 |
| **Net GST position** | **$7,595.01** |
| R&D-eligible expenditure | $42,848.98 |
| R&D refund (43.5%) | $18,639.31 |

## Data Quality

| Metric | Value |
|---|---|
| Total expense transactions | 373 |
| With receipts | 100 (27%) |
| Reconciled | 333 (89%) |
| Missing receipts $ | $26,125.26 |
| Outstanding receivables | $339,600.00 |
| Outstanding payables | $190,827.15 |

## Files in This Workbook

- `income.csv` — 7 invoices paid this quarter
- `expenses.csv` — 373 SPEND transactions
- `expenses-by-project.csv` — 15 project-code groupings
- `rd-allocation.csv` — 260 R&D-eligible line items
- `missing-receipts.csv` — 273 transactions lacking a receipt (GST at risk: ~$2,375.02)
- `receivables-outstanding.csv` — 15 unpaid customer invoices
- `payables-outstanding.csv` — 262 unpaid supplier bills (some likely already paid — need reconciliation)

## How to Use

Open any CSV in Numbers / Excel / Google Sheets. Each file is a "tab" of the workbook. Filters worth applying:

- **expenses.csv** → filter `has_attachments = false` to see what still needs a receipt
- **expenses.csv** → filter `is_reconciled = false` to see what needs reconciliation in Xero
- **rd-allocation.csv** → filter `has_attachments = false` to see R&D refund at risk
- **receivables-outstanding.csv** → sort by `days_old` desc to triage aged debtors
