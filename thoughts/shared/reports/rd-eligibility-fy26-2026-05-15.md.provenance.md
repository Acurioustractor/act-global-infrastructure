---
title: "R&D Eligibility FY26 2026-05-15 Provenance"
status: Draft
date: 2026-05-15
type: provenance
tags:
  - provenance
  - verification
  - audit
source_packet_id: xero-supabase-rd-fy26-2026-05-15
canonical_entity: act-global-infrastructure
---

# R&D Eligibility FY26 2026-05-15 Provenance

## Purpose

- Output: FY26 R&D eligibility classification report.
- Intended destination: internal ACT R&D preparation and Standard Ledger review.
- Why it was generated: Establish a conservative R&D claim baseline and identify the highest-value review pile.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `public.xero_transactions` | Supabase Xero mirror | `2025-07-01` to `2026-06-30`, generated 2026-05-15 | Classified authorised spend transactions and wrote `rd_eligible` / `rd_category` flags. |
| `public.xero_invoices` | Supabase Xero mirror | `2025-07-01` to `2026-06-30`, generated 2026-05-15 | Classified ACCPAY bills in the report only; bill classifications were not persisted. |
| `scripts/tag-rd-eligibility.mjs` | Classification logic | commit working tree on 2026-05-15 | Conservative 4-tier R&D model: core, supporting, review, ineligible. |

## Verification Status

- `Verified:` `node scripts/tag-rd-eligibility.mjs --fy 26 --apply` completed and applied 1248/1248 `xero_transactions` updates. Report totals: confirmed eligible `$238,958.10`, estimated 43.5% refund `$103,946.77`, review pile `$1,030,728.70`.
- `Verified:` Follow-up Supabase aggregation showed persisted FY26 SPEND R&D flags on `xero_transactions`: core `$12,860.05`, supporting `$42,672.25`, plus pre-existing salary-tagged eligible spend `$238,653.88`.
- `Inferred:` Eligibility is rules-based, not tax advice. Review and unclassified piles require human/accountant decisions before being claimed.
- `Unverified:` Payroll/salary R&D support, bill-level R&D classifications, and travel/hardware support claims have not been reviewed against AusIndustry evidence requirements.

## Human Decisions / Gates

- Editorial review: pending.
- Cultural review: not-required.
- Consent review: not-required.
- Release approval: pending Standard Ledger/accountant signoff.

## Known Gaps And Assumptions

- The script persists only transaction-level R&D flags; ACCPAY bill classifications remain report-only.
- Travel, accommodation, hardware, utilities, and mixed-use vendors default to review/ineligible until a human can tie them to specific R&D activities.
- Confirmed eligible totals in the report include bill classifications; persisted transaction aggregation is lower except for separately existing salary tags.

## Reproduction Steps

1. Run `node scripts/sync-xero-to-supabase.mjs transactions --days=365`.
2. Run `node scripts/tag-rd-eligibility.mjs --fy 26 --sample 8` to preview.
3. Run `node scripts/tag-rd-eligibility.mjs --fy 26 --apply` to write transaction flags.
4. Re-query `public.xero_transactions` grouped by `rd_eligible` and `rd_category`.

## Linked Artifacts

- Output artifact: `thoughts/shared/reports/rd-eligibility-fy26-2026-05-15.md`

