---
title: Funder alignment 2026-10-01 Provenance
status: Verified
date: 2026-10-01
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
source_packet_id: alignment-loop-2026-10-01
canonical_entity: funder-alignment-2026-10-01
---

# Funder alignment 2026-10-01 Provenance

## Purpose

- Output: financial synthesis report (receivables state, funder alignment)
- Intended destination: `wiki/synthesis/funder-alignment-2026-10-01.md`
- Why it was generated: eleventh pass of the ACT Alignment Loop, 7 days after 2026-09-24 tenth pass; scheduled automated routine

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `xero_invoices` (Supabase `tednluwflfhxyucgwigh`) | runtime ledger | snapshot 2026-10-01 | ACCREC AUTHORISED/DRAFT, amount_due > 0 — outstanding receivables list |
| `xero_invoices` status/type summary | runtime ledger | snapshot 2026-10-01 | Aggregate counts and totals by status/type |
| `wiki/narrative/funders.json` | canonical note | v2, 25 entries | Funder registry cross-reference |
| `wiki/synthesis/funder-alignment-2026-09-24.md` | prior synthesis | 2026-09-24 | Baseline for drift comparison |

## Verification Status

- `Verified:` ACCREC outstanding total ($285,067.84), invoice count (10), all invoice amounts and dates match Sep 24 (zero movement confirmed), funders.json entry count (25)
- `Inferred:` Invoice ages computed from `date -u +%Y-%m-%d` (2026-10-01) and invoice dates
- `Unverified:` BAS concession deadline from Standard Ledger; GHL communications recency (not re-queried this pass); whether Standard Ledger holds a concession filing window for the sole-trader tax return

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- GHL communications history query not run this pass — comms recency unchanged from Sep 24
- BAS concession date from Standard Ledger unknown — overdue day count uses standard lodgement date (2026-07-28)
- Zero receivables movement could reflect either no payments received or a sync gap — not independently verified

## Reproduction Steps

1. Confirm Supabase project: `mcp__Supabase__get_project_url` → `tednluwflfhxyucgwigh`
2. Query `xero_invoices`: `SELECT contact_name, invoice_number, status, date, amount_due, project_code FROM xero_invoices WHERE type='ACCREC' AND status IN ('AUTHORISED','DRAFT') AND amount_due > 0 ORDER BY status, date;`
3. Query status/type summary: `SELECT status, type, COUNT(*), SUM(amount_due) FROM xero_invoices WHERE status NOT IN ('DELETED','VOIDED','PAID') GROUP BY status, type ORDER BY type, status;`
4. Read `wiki/narrative/funders.json` to count entries
5. Compare against prior synthesis `wiki/synthesis/funder-alignment-2026-09-24.md`
6. Derive ages using `date -u +%Y-%m-%d` as reference

## Linked Artifacts

- Source packet: Supabase project `tednluwflfhxyucgwigh`
- Output artifact: `wiki/synthesis/funder-alignment-2026-10-01.md`
- Validation log: alignment loop PR #279
- Prior pass: `wiki/synthesis/funder-alignment-2026-09-24.md`
