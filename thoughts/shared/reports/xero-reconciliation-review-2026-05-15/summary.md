# Xero Reconciliation Review - Q2/Q3 FY26

Generated: 2026-05-14T22:07:53.892Z
Supabase: https://tednluwflfhxyucgwigh.supabase.co
Scope: debit bank_statement_lines from 2025-10-01 to 2026-03-31

## Headline

- Total debit lines: 1542 ($493,903.11)
- Xero mirror unreconciled: 535 ($336,992.95)
- Actionable in Xero now: 487 ($295,334.53)
- Ready without receipt review: 472 ($287,629.33)
- Needs receipt review first: 15 ($7,705.20)
- Still uncovered: 48 ($41,658.42)

## Xero Action Breakdown

- attach_file: 272 lines, $233,834.91
- find_match: 28 lines, $17,380.81
- none: 187 lines, $44,118.81

## Recommended Order

1. Process find_match rows first in Xero UI: existing Xero bills/transactions should be matched to bank-feed lines.
2. Process attach_file rows next: receipt evidence exists; attach or use Dext/Xero document context before reconciling.
3. Leave none rows for bank-line sufficient, transfers, ATO, or bookkeeper judgement.
4. Review candidate/high-confidence candidate rows before Xero clicks.
5. Escalate uncovered rows to Gmail/Dext/manual receipt search or Standard Ledger.

## Files

- xero-actionable-queue.csv
- ready-evidence-queue.csv
- review-first-queue.csv
- uncovered-queue.csv

## Verification

verified: Queried live Supabase v_finance_bank_line_evidence after receipt-evidence-hub apply.
inferred: xero_action is derived from best receipt candidate metadata and does not prove Xero UI can complete the reconciliation without human review.
unverified: No Xero UI Reconcile/OK/Save action was performed.
