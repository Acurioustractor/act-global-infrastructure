# Receipt Evidence Hub - Q2 + Q3 + Q4 FY26

Generated: 2026-05-15T11:40:26.959Z
Mode: APPLY
Date range: 2025-10-01 to 2026-06-30

## Summary

- Bank debit lines: 1542
- Debit spend: $493,903.11
- Evidence documents found: 6849
- Candidate links: 4126
- Candidate lines: 959
- High-confidence candidate lines: 877 ($353,094.42)
- Uncovered after candidates: 583
- Legacy-covered lines: 1474
- Minimum confidence threshold: 0.6

## Source Counts

- canonical_docs: 7161
- receipt_emails: 2256
- dext_receipts: 338
- xero_bills: 1282
- xero_transactions: 878

## Output Files

- thoughts/shared/reports/receipt-evidence-hub-2026-05-15/documents.csv
- thoughts/shared/reports/receipt-evidence-hub-2026-05-15/candidates.csv
- thoughts/shared/reports/receipt-evidence-hub-2026-05-15/uncovered-bank-lines.csv

## Verification Status

verified: Queried live Supabase bank lines and receipt evidence sources for 2025-10-01 to 2026-06-30.
inferred: Candidate confidence scores are deterministic heuristic calculations in scripts/receipt-evidence-hub.mjs.
unverified: No Xero UI reconciliation, Xero attachment upload, or BAS lodgement check was performed by this script.
