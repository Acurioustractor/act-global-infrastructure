# Bank-Line Action Queue 2026-05-15 Provenance

## Purpose

- Output: Q2/Q3 bank-line close action queue.
- Intended destination: ACT finance close workflow and Xero Page Copilot validation.
- Why it was generated: Convert receipt/Xero/Dext/project state into one next action per bank line.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `v_finance_bank_line_evidence` | Supabase view | Q2, Q3 FY26 | Base bank-line and evidence status queue. |
| `finance_receipt_bank_line_links` | Supabase table | Q2, Q3 FY26 | Approved/rejected receipt evidence state. |
| `finance_receipt_documents` | Supabase table | Q2, Q3 FY26 linked rows | Receipt file/source/Xero target metadata. |
| `xero_transactions` | Supabase mirror | Q2, Q3 FY26 | Xero target attachment/reconciliation state. |
| `xero_invoices` | Supabase mirror | Q2, Q3 FY26 | Exact bill candidates for Find & Match. |

## Verification Status

- verified: Report was generated from live Supabase mirrors.
- inferred: Next action, risk, owner, and Xero coding suggestions are rule-based classifications.
- unverified: No Xero UI action, Xero write, attachment upload, Dext publish, or BAS lodgement check was performed.

## Reproduction Steps

1. Run `node scripts/build-bank-line-action-queue.mjs --quarters Q2,Q3`.
2. Review `thoughts/shared/reports/bank-line-action-queue-2026-05-15/action-queue.md`.
3. Use `thoughts/shared/reports/bank-line-action-queue-2026-05-15/queue.csv` for filtered close work.
