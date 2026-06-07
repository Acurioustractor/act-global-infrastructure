# Provenance - Xero Draft Approval Queue Q2 + Q3 FY26

Report: thoughts/shared/reports/xero-draft-approval-queue-2026-05-15/summary.md
Generated: 2026-05-15T06:04:51.290Z
Command: node scripts/xero-draft-approval-queue.mjs --quarters Q2,Q3

## Queried Sources

- public.v_finance_bank_line_evidence: bank lines, receipt evidence status, candidate counts, Xero mirror IDs, project/R&D mirror fields

## Verified

- Live Supabase data was queried during this run.
- The report is read-only.

## Inferred

- Rows with unreconciled debit bank status and no Xero target ID are treated as Xero draft/create/reconcile assist rows.
- Receipt readiness is inferred from receipt evidence status and candidate counts.

## Unknown / Not Checked

- Whether a matching Xero Expenses draft currently exists for each row.
- Whether Xero UI has already been manually reconciled after the last mirror sync.
