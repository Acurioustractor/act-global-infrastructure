---
title: "Close pack FY26-Q3 Provenance"
status: Generated
date: 2026-05-29
type: provenance
tags: [provenance, finance, close-the-books, audit]
---

# Close pack FY26-Q3 — Provenance

## Purpose
- Output: period close pack (ready-to-close gate across 7 lenses)
- Intended destination: thoughts/shared/reports/close-pack-FY26-Q3-2026-05-29.md → Standard Ledger handoff / Pty cutover prep
- Why generated: close-the-books assistant (#4 ongoing-bookkeeping roadmap)

## Data Sources Queried
| Source | Type | Range | How used |
|---|---|---|---|
| xero_invoices (ACCPAY) | app DB (NEXT_PUBLIC) | 2026-01-01–2026-03-31 | bills: receipts, tagging, GE-429, 1B GST, bills-raised |
| xero_invoices (ACCREC) | app DB | 2026-01-01–2026-03-31 | sales: income, 1A GST |
| xero_transactions | app DB | 2026-01-01–2026-03-31 | recon%, bank spend, tagging, R&D (rd_eligible) |
| detect-finance-anomalies.mjs --json | script | all-time, filtered to window | void/dup candidates (cleanliness lens) |
| .xero-sync-state.json | sync cursor | 2026-05-29T08:00:01.587Z | data-freshness stamp |

## Verification Status
- `Verified:` reconciliation %, receipt coverage, tagging %, GE-429 $, anomaly counts, R&D-eligible $ — all computed directly from the app DB (same DB as /finance/mirror).
- `Inferred:` BAS 1A/1B are INDICATIVE accruals (line_amount/11 on tax_type) — NOT the cash-basis lodgement figures (run prepare-bas.mjs). P&L "net cash" excludes unpaid bills.
- `Unverified:` R&D bank-txn classification depends on tag-rd-eligibility.mjs having been applied to this DB (547 txns classified); bills carry no R&D flag.

## Known Gaps And Assumptions
- BAS slice is invoice/accruals-based and single-sourced (bills only for 1B) to avoid double-counting settled-bill payments — will differ from the cash-basis BAS worksheet.
- P&L shows sales / bank-spend / bills-raised separately; it does NOT net bills against their bank payments (memory: bill payments often sit outside xero_transactions).
- Cleanliness GE-429 is period-scoped from bills; void/dup candidates come from the all-time detector filtered to the window.

## Reproduction Steps
1. `node scripts/close-the-books.mjs FY26-Q3` (human) or `--json` (machine)
2. `node scripts/close-the-books.mjs FY26-Q3 --save` regenerates this pack + sidecar
3. Cross-check: recon%/untagged vs `finance-daily-digest.mjs`; anomalies vs `detect-finance-anomalies.mjs`; BAS vs `prepare-bas.mjs Q3`

## Linked Artifacts
- Output artifact: thoughts/shared/reports/close-pack-FY26-Q3-2026-05-29.md
- Gate verdict: 🔴 NOT READY TO CLOSE
