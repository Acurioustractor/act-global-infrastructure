# Bookkeeping Workbook — Q2 FY26 (Oct-Dec 2025)

**Entity:** Nicholas Marchesi T/as A Curious Tractor
**ABN:** 21 591 780 066
**Period:** 2025-10-01 → 2025-12-31
**BAS Due:** 2026-02-28
**Generated:** 2026-04-08T19:49

---

## Headline Numbers (Cash Basis)

| Metric | Value |
|---|---|
| Income (invoices paid) | $308,946.00 |
| GST on income | $28,086.00 |
| Expenses (bank SPEND) | $122,086.83 |
| GST on expenses (estimated) | $11,098.80 |
| **Net GST position** | **$16,987.20** |
| R&D-eligible expenditure | $46,958.43 |
| R&D refund (43.5%) | $20,426.92 |

## Data Quality

| Metric | Value |
|---|---|
| Total expense transactions | 574 |
| With receipts | 58 (10%) |
| Reconciled | 321 (56%) |
| Missing receipts $ | $116,785.51 |
| Outstanding receivables | $339,600.00 |
| Outstanding payables | $190,827.15 |

## Files in This Workbook

- `income.csv` — 6 invoices paid this quarter
- `expenses.csv` — 574 SPEND transactions
- `expenses-by-project.csv` — 8 project-code groupings
- `rd-allocation.csv` — 512 R&D-eligible line items
- `missing-receipts.csv` — 516 transactions lacking a receipt (GST at risk: ~$10,616.86)
- `receivables-outstanding.csv` — 15 unpaid customer invoices
- `payables-outstanding.csv` — 262 unpaid supplier bills (some likely already paid — need reconciliation)

## How to Use

Open any CSV in Numbers / Excel / Google Sheets. Each file is a "tab" of the workbook. Filters worth applying:

- **expenses.csv** → filter `has_attachments = false` to see what still needs a receipt
- **expenses.csv** → filter `is_reconciled = false` to see what needs reconciliation in Xero
- **rd-allocation.csv** → filter `has_attachments = false` to see R&D refund at risk
- **receivables-outstanding.csv** → sort by `days_old` desc to triage aged debtors
