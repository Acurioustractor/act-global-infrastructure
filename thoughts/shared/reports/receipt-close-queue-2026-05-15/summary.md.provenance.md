# Provenance - Receipt Close Queue Q2 + Q3 + Q4 FY26

Report: thoughts/shared/reports/receipt-close-queue-2026-05-15/summary.md
Generated: 2026-05-15T09:17:09.282Z
Command: node scripts/analyze-receipt-close-queue.mjs --quarters Q2,Q3,Q4

## Queried Sources

- public.v_finance_bank_line_evidence: debit bank lines and receipt candidates
- public.xero_payments: invoice payment mirror
- public.xero_transactions: bank transaction mirror

## Verified

- Live Supabase data was queried during this run.
- The analysis script was read-only.

## Inferred

- Strict match confidence depends on the receipt evidence scoring model.
- Xero UI actionability is inferred from mirror IDs and duplicate target checks.

## Unknown / Not Checked

- Whether Xero UI currently shows each row in the bank reconciliation queue.
- BAS lodgement report figures.
