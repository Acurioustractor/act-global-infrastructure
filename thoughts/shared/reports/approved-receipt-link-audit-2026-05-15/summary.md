# Approved Receipt Link Audit - 2026-05-15

Mode: READ ONLY
Quarters: Q2, Q3, Q4
Rows scanned: 1542
Approved links scanned: 684
Unsafe approved links: 158
Definitely wrong approved links: 0
Apply target: definitely wrong approved links only
Links demoted to needs_review: 0

## Rule

Approved links should have confidence >= 0.95, amount delta <= $1, date delta <= 7 days, and vendor-token overlap with the bank line.

## Output

- thoughts/shared/reports/approved-receipt-link-audit-2026-05-15/unsafe-approved-links.csv
- thoughts/shared/reports/approved-receipt-link-audit-2026-05-15/definitely-wrong-approved-links.csv

## Verification Status

verified: Queried live Supabase v_finance_bank_line_evidence.
verified: Read-only mode; no Supabase writes were made.
unverified: No Xero UI reconciliation state was changed or checked by this script.
