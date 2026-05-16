# Provenance - Xero Reconciliation Review

Report: thoughts/shared/reports/xero-reconciliation-review-2026-05-15/summary.md
Generated: 2026-05-14T22:07:53.893Z

## Data Sources

- Supabase https://tednluwflfhxyucgwigh.supabase.co
- public.v_finance_bank_line_evidence

## Verified

- Queried all Q2/Q3 debit rows using paginated Supabase reads.
- Used current evidence_status and receipt_candidates after the latest receipt-evidence-hub apply.

## Inferred

- xero_action categories are workflow guidance only.
- Xero bank-feed reconciliation still requires Xero UI/manual approval.

## Unknown

- Current Xero UI state if the mirror is stale.
- BAS lodgement figures.
