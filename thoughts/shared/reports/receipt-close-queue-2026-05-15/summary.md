# Receipt Close Queue - Q2 + Q3 + Q4 FY26

Generated: 2026-05-15T09:17:09.277Z
Mode: READ ONLY
Supabase: https://tednluwflfhxyucgwigh.supabase.co

## Strict Dext-Backed Unreconciled Queue

- Rows: 22
- Value: $40,113.23

## Categories

- already_reconciled_exact_payment: 0 ($0.00)
- invoice_payment_amount_mismatch: 3 ($797.95)
- invoice_no_reconciled_payment: 4 ($24,711.94)
- bank_transaction_reconciled_unique: 0 ($0.00)
- bank_transaction_duplicate_target: 3 ($3,650.00)
- bank_transaction_unreconciled_or_unknown: 0 ($0.00)
- no_xero_target: 12 ($10,953.34)

## Output Files

- thoughts/shared/reports/receipt-close-queue-2026-05-15/strict-dext-backed-unreconciled.csv

## Verification Status

verified: Queried live Supabase v_finance_bank_line_evidence, xero_payments, and xero_transactions.
verified: This script performed no Xero writes and no Supabase writes.
inferred: Strict receipt matches are based on deterministic receipt-evidence scores and mirror IDs.
unverified: Xero UI was not clicked; duplicate bank transaction targets require manual/Xero UI review.
