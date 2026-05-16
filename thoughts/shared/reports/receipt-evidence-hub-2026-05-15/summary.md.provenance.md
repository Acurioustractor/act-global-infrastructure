# Provenance - Receipt Evidence Hub Q2 + Q3 + Q4 FY26

Report: thoughts/shared/reports/receipt-evidence-hub-2026-05-15/summary.md
Generated: 2026-05-15T11:40:26.962Z
Command: node scripts/receipt-evidence-hub.mjs --quarters Q2,Q3,Q4 --fy 26 --apply

## Queried Sources

- public.bank_statement_lines: debit lines from 2025-10-01 to 2026-06-30
- public.finance_receipt_documents: canonical evidence in 2025-08-02 to 2026-08-29
- public.receipt_emails: raw receipt email mirror
- public.dext_receipts: Dext receipt mirror
- public.xero_invoices: ACCPAY invoices with attachments
- public.xero_transactions: transactions with attachments

## Verified

- Live Supabase rows were fetched during this run.
- Report files were written locally under thoughts/shared/reports.

## Inferred

- Receipt-to-bank-line links are heuristic unless match_method is xero_id or reference_amount.

## Unknown / Not Checked

- Xero UI reconciliation state after the last mirror sync.
- BAS lodgement report values in Xero UI.
- Whether every external mailbox has been captured.
