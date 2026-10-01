---
title: Entity migration truth-state 2026-10-01 Provenance
status: Verified
date: 2026-10-01
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
  - entity-migration
source_packet_id: alignment-loop-2026-10-01
canonical_entity: entity-migration-truth-state-2026-10-01
---

# Entity migration truth-state 2026-10-01 Provenance

## Purpose

- Output: entity migration and compliance synthesis report
- Intended destination: `wiki/synthesis/entity-migration-truth-state-2026-10-01.md`
- Why it was generated: eleventh pass of the ACT Alignment Loop, 7 days after 2026-09-24 tenth pass; scheduled automated routine

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `xero_invoices` GROUP BY xero_tenant_id | runtime ledger | snapshot 2026-10-01 | Tenant count (1), invoice total (2,466) |
| `bank_statement_lines` GROUP BY bank_account | runtime ledger | snapshot 2026-10-01 | Bank account list, data freshness (ends 2026-03-31) |
| `xero_invoices` status/type summary | runtime ledger | snapshot 2026-10-01 | ACCREC AUTHORISED total ($285,067.84), ACCREC DRAFT count (0) |
| `thoughts/shared/plans/` (grep + listing) | planning artefacts | as-of 2026-10-01 | Migration plan file count; `act-one-company-alignment-2026-09-07.md` newly surfaced |
| `thoughts/shared/drafts/` (grep) | draft artefacts | as-of 2026-10-01 | Migration draft count (1: novation-letter-templates.md) |
| `wiki/synthesis/entity-migration-truth-state-2026-09-24.md` | prior synthesis | 2026-09-24 | Baseline for drift comparison |

## Verification Status

- `Verified:` Xero tenant count (1), invoice total (2,466), ACCREC outstanding ($285,067.84 on 10 invoices), bank data range (ends 2026-03-31), days post-cutover (93), days to tax return (30), BAS overdue days (65), D&O overdue days (130)
- `Newly surfaced:` `act-one-company-alignment-2026-09-07.md` (PR #258) settles entity structure as Option A — was missed by prior keyword greps (`novation|transition|migration|...`); its content was verified by reading the first ~50 lines
- `Inferred:` Status of most compliance items (D&O, Shareholders Agreement, Pty Xero file, BAS lodgement) inferred from absence of confirming evidence across eleven passes — actual status requires external confirmation
- `Unverified:` Whether Pty Xero file is open but unsynced; whether D&O insurance is actually bound; actual BAS concession deadline from Standard Ledger

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- Bank statement data ends 2026-03-31 (184 days stale) — cannot confirm whether Pty NAB account exists from DB alone
- All compliance item statuses are "not confirmed" based on absence of evidence in plans/drafts — this does not mean they are not done, only that no evidence is visible in monitored sources
- Days calculations use `date -u +%Y-%m-%d` → 2026-10-01 as reference

## Reproduction Steps

1. Confirm Supabase: `mcp__Supabase__get_project_url` → `tednluwflfhxyucgwigh`
2. Tenant count: `SELECT DISTINCT xero_tenant_id, COUNT(*) FROM xero_invoices GROUP BY xero_tenant_id;`
3. Bank accounts: `SELECT bank_account, COUNT(*), MIN(date), MAX(date) FROM bank_statement_lines GROUP BY bank_account;`
4. ACCREC summary: `SELECT status, type, COUNT(*), SUM(amount_due) FROM xero_invoices WHERE status NOT IN ('DELETED','VOIDED','PAID') GROUP BY status, type;`
5. ACCREC detail: `SELECT contact_name, invoice_number, status, date, amount_due, project_code FROM xero_invoices WHERE type='ACCREC' AND status IN ('AUTHORISED','DRAFT') AND amount_due > 0 ORDER BY status, date;`
6. Plans check: `ls thoughts/shared/plans/ | grep -iE 'novation|transition|migration|handover|assignment|shareholders|announcement|insurance|pty|funder-notice|entity|cutover|one-company'`
7. Drafts check: `ls thoughts/shared/drafts/ | grep -iE 'novation|transition|migration|...'`

## Linked Artifacts

- Source packet: Supabase project `tednluwflfhxyucgwigh`, `thoughts/shared/plans/`, `thoughts/shared/drafts/`
- Output artifact: `wiki/synthesis/entity-migration-truth-state-2026-10-01.md`
- Validation log: alignment loop PR #279
- Prior pass: `wiki/synthesis/entity-migration-truth-state-2026-09-24.md`
- Key plan: `thoughts/shared/plans/act-one-company-alignment-2026-09-07.md`
