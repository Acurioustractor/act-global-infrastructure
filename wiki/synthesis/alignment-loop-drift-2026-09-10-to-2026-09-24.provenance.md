---
title: Alignment Loop drift 2026-09-10 to 2026-09-24 Provenance
status: Verified
date: 2026-09-24
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
source_packet_id: alignment-loop-2026-09-24
canonical_entity: alignment-loop-drift-2026-09-10-to-2026-09-24
---

# Alignment Loop drift 2026-09-10 to 2026-09-24 Provenance

## Purpose

- Output: 14-day drift summary across Q1 (funder alignment), Q2 (project truth-state), Q3 (entity migration)
- Intended destination: `wiki/synthesis/alignment-loop-drift-2026-09-10-to-2026-09-24.md`
- Why it was generated: tenth pass of the ACT Alignment Loop; compares fresh data to the 2026-09-10 ninth pass

## Data Sources Queried

All queries are shared with the three companion synthesis files for this pass. See their provenance documents for full details.

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `xero_invoices` (Supabase `tednluwflfhxyucgwigh`) | runtime ledger | 2026-09-24 | ACCREC outstanding, tenant/invoice counts |
| `bank_statement_lines` | runtime ledger | 2026-09-24 | Bank account and date range |
| `config/project-codes.json` | canonical config | HEAD 2026-09-24 | Project code count (corrected to 78) |
| `wiki/projects/**` | wiki filesystem | 2026-09-24 | Article count |
| `thoughts/shared/plans/` and `drafts/` | local filesystem | HEAD 2026-09-24 | Migration artefact check |
| `wiki/synthesis/*-2026-09-10.md` | prior syntheses | 2026-09-10 | Three baseline documents for delta computation |

## Verification Status

- `Verified:` All absolute figures (ACCREC total, invoice count, tenant count, Xero total, wiki count, compliance dates) verified against live DB queries and filesystem
- `Inferred:` Direction arrows (↑ ↓ →) computed from verified absolute values; "first zero-movement week" claim carried forward from Sep 10 (Joy House cleared breaks the streak)
- `Correction:` Q2 drift table corrected to 78 config codes (from 74) and 2 DB-only codes (from 4) following Codex review finding #2

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- Same gaps as companion Q1/Q2/Q3 provenance documents — see those files
- Joy House INV-0349 disposition (paid vs voided) not confirmed from a direct Xero status query; reported as "cleared" throughout
- GHL communications query not re-run this pass

## Reproduction Steps

1. Run the three companion synthesis queries (see each file's provenance)
2. Compare each metric against the 2026-09-10 synthesis values
3. Compute delta and direction

## Linked Artifacts

- Output artifact: `wiki/synthesis/alignment-loop-drift-2026-09-10-to-2026-09-24.md`
- Companion provenances: `funder-alignment-2026-09-24.provenance.md`, `project-truth-state-2026-09-24.provenance.md`, `entity-migration-truth-state-2026-09-24.provenance.md`
- Validation log: alignment loop PR #262
- Prior pass: `wiki/synthesis/alignment-loop-drift-2026-09-03-to-2026-09-10.md`
