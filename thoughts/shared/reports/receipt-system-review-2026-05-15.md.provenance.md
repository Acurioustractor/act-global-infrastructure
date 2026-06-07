---
title: Receipt Matching System Review Provenance
status: Draft
date: 2026-05-15
type: provenance
tags:
  - provenance
  - verification
  - audit
  - finance
source_packet_id: na
canonical_entity: act-finance-receipts
---

# Receipt Matching System Review Provenance

## Purpose

- Output: finance system review
- Intended destination: `thoughts/shared/reports/receipt-system-review-2026-05-15.md`
- Why it was generated: The receipt/Xero/Dext workflow produced repeated wrong matches, confusing states, and slow reconciliation work. This review documents what was verified, what is inferred, and what should change.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `receipt_emails` | Supabase table | live snapshot on 2026-05-15 | Counted receipt rows by source/status and whether files/Xero targets exist. |
| `finance_receipt_documents` | Supabase table | live snapshot on 2026-05-15 | Counted imported Dext/Gmail/Xero Me/manual evidence documents. |
| `finance_receipt_bank_line_links` | Supabase table | live snapshot on 2026-05-15 | Counted approved evidence links and missing Xero target blockers. |
| `bank_statement_lines` | Supabase table | Q2/Q3 FY26 and broader live snapshot | Checked bank-line status, receipt links, and missing Xero transaction mapping. |
| `v_finance_bank_line_evidence` | Supabase view | Q2/Q3 FY26 | Counted bank-line evidence coverage by quarter and status. |
| `xero_transactions` | Supabase table | live Xero mirror snapshot on 2026-05-15 | Checked Xero attachment/reconciliation state in the mirror. |
| `scripts/upload-evidence-receipts-to-xero.mjs` | repo script | current workspace file | Confirmed current upload bridge behavior and target-ID requirements. |
| `scripts/import-dext-export-evidence.mjs` | repo script | current workspace file | Confirmed Dext export import is evidence-only and does not write to Xero. |
| `scripts/analyze-receipt-close-queue.mjs` | repo script | current workspace file | Confirmed strict receipt-backed close queue separates evidence from Xero accounting state. |
| `thoughts/shared/reports/xero-evidence-upload-2026-05-15/*` | generated report | 2026-05-15 | Used previous verified upload bridge outputs: already attached vs blocked missing Xero transaction. |

## Verification Status

- `Verified:` Live Supabase counts for receipt source/status, evidence coverage, approved links, missing Xero target blockers, and Xero mirror attachment state.
- `Verified:` The current Dext import script does not write to Xero.
- `Verified:` The current evidence upload bridge requires an exact Xero target and defaults to dry-run.
- `Verified:` The current close queue script is read-only by default and explicitly separates receipt evidence from safe reconcile/attach categories.
- `Inferred:` The root cause is state-model confusion across bank lines, evidence, Xero accounting targets, and attachments.
- `Inferred:` The best operating model is bank-line-first because Xero bank-feed reconciliation is the accounting state that must be closed.
- `Unverified:` No Xero UI actions were performed in this review.
- `Unverified:` No fresh Xero API attachment upload was performed in this review.
- `Unverified:` BAS final lodgement figures were not checked against Xero BAS Report or Standard Ledger.

## Human Decisions / Gates

- Editorial review: pending
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- Supabase plugin tools were requested but were not exposed by tool discovery in this session; live Supabase data was queried through the repo's configured service-role client instead.
- Some Xero mirror rows may be stale until another Xero sync is run after UI reconciliation.
- `bank_statement_lines.status` may include parser/import drift and should not be treated as authoritative attachment readiness without Xero target IDs.
- This review does not decide final tax treatment for personal, R&D, BAS-sensitive, asset, or related-party items.

## Reproduction Steps

1. Run live Supabase grouped counts against `receipt_emails`, `finance_receipt_documents`, `finance_receipt_bank_line_links`, `bank_statement_lines`, `v_finance_bank_line_evidence`, and `xero_transactions`.
2. Inspect `scripts/upload-evidence-receipts-to-xero.mjs`, `scripts/import-dext-export-evidence.mjs`, and `scripts/analyze-receipt-close-queue.mjs`.
3. Compare current live state with generated reports in `thoughts/shared/reports/xero-evidence-upload-2026-05-15/`.
4. Validate future fixes by rerunning the Xero sync, evidence hub, close queue, and upload bridge dry-run.

## Linked Artifacts

- Output artifact: `thoughts/shared/reports/receipt-system-review-2026-05-15.md`
- Provenance: `thoughts/shared/reports/receipt-system-review-2026-05-15.md.provenance.md`
- Xero upload report: `thoughts/shared/reports/xero-evidence-upload-2026-05-15/action-queue.md`
- Dext routing report: `thoughts/shared/reports/dext-routing-pack-2026-05-15/`
- Close queue report: `thoughts/shared/reports/receipt-close-queue-2026-05-15/`
