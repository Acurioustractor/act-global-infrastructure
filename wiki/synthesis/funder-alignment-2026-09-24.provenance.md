---
title: Funder alignment 2026-09-24 Provenance
status: Verified
date: 2026-09-24
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
source_packet_id: alignment-loop-2026-09-24
canonical_entity: funder-alignment-2026-09-24
---

# Funder alignment 2026-09-24 Provenance

## Purpose

- Output: financial synthesis report (receivables state, funder alignment)
- Intended destination: `wiki/synthesis/funder-alignment-2026-09-24.md`
- Why it was generated: tenth pass of the ACT Alignment Loop, 14 days after 2026-09-10 ninth pass; scheduled automated routine

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `xero_invoices` (Supabase `tednluwflfhxyucgwigh`) | runtime ledger | snapshot 2026-09-24 | ACCREC AUTHORISED/DRAFT, amount_due > 0 — outstanding receivables list |
| `xero_invoices` status/type summary | runtime ledger | snapshot 2026-09-24 | Aggregate counts and totals by status/type |
| `wiki/narrative/funders.json` | canonical note | v2, 25 entries | Funder registry cross-reference |
| `wiki/synthesis/funder-alignment-2026-09-10.md` | prior synthesis | 2026-09-10 | Baseline for drift comparison |

## Verification Status

- `Verified:` ACCREC outstanding total ($285,067.84), invoice count (10), all invoice amounts and dates, Joy House INV-0349 absence from outstanding list (cleared), funders.json entry count (25)
- `Inferred:` Joy House INV-0349 was "cleared" — it no longer appears in the `amount_due > 0` query; its Xero status (paid vs voided) was not explicitly verified from a separate status query
- `Unverified:` BAS concession deadline from Standard Ledger; GHL communications recency for funder contacts (comms query returned limited data); whether funder comms count is accurate

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- Joy House INV-0349 disposition unknown — absent from outstanding ACCREC but Xero status (paid vs voided vs deleted) not confirmed; reported as "cleared" throughout
- GHL communications history query for funder contacts was not run this pass due to token constraints — communications recency unchanged from Sep 10
- BAS concession date from Standard Ledger unknown — overdue day count uses standard lodgement date (2026-07-28)

## Reproduction Steps

1. Query `xero_invoices` on Supabase project `tednluwflfhxyucgwigh`: `SELECT contact_name, invoice_number, status, date, amount_due, project_code FROM xero_invoices WHERE type='ACCREC' AND status IN ('AUTHORISED','DRAFT') AND amount_due > 0 ORDER BY status, date;`
2. Read `wiki/narrative/funders.json` to count entries and check for new stubs
3. Compare against prior synthesis `wiki/synthesis/funder-alignment-2026-09-10.md`
4. Derive ages using `date -u +%Y-%m-%d` as reference

## Linked Artifacts

- Source packet: Supabase project `tednluwflfhxyucgwigh`
- Output artifact: `wiki/synthesis/funder-alignment-2026-09-24.md`
- Validation log: alignment loop PR #262
- Prior pass: `wiki/synthesis/funder-alignment-2026-09-10.md`
