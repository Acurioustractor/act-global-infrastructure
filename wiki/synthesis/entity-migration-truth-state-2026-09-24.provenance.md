---
title: Entity migration truth-state 2026-09-24 Provenance
status: Verified
date: 2026-09-24
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
  - entity-migration
source_packet_id: alignment-loop-2026-09-24
canonical_entity: entity-migration-truth-state-2026-09-24
---

# Entity migration truth-state 2026-09-24 Provenance

## Purpose

- Output: entity migration compliance and post-cutover status synthesis
- Intended destination: `wiki/synthesis/entity-migration-truth-state-2026-09-24.md`
- Why it was generated: tenth pass of the ACT Alignment Loop, 14 days after 2026-09-10 ninth pass; scheduled automated routine; entity migration cutover date (2026-06-30) passed 86 days ago

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `xero_invoices` GROUP BY xero_tenant_id (Supabase `tednluwflfhxyucgwigh`) | runtime ledger | snapshot 2026-09-24 | Confirms 1 Xero tenant (sole trader); total invoice count |
| `bank_statement_lines` GROUP BY bank_account | runtime ledger | snapshot 2026-09-24 | Bank account list; confirms sole NAB Visa ACT #8815; data end date |
| `xero_invoices` status/type summary | runtime ledger | snapshot 2026-09-24 | ACCREC/ACCPAY outstanding totals |
| `thoughts/shared/plans/` | local filesystem | HEAD 2026-09-24 | Migration-keyword grep; 9 matching files |
| `thoughts/shared/drafts/` | local filesystem | HEAD 2026-09-24 | Migration-keyword grep; 1 matching file |
| `wiki/synthesis/entity-migration-truth-state-2026-09-10.md` | prior synthesis | 2026-09-10 | Baseline for drift comparison |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | checklist | HEAD 2026-09-24 | Source-of-truth for migration item statuses |

## Verification Status

- `Verified:` Xero tenant count (1), total invoices (2,448), bank account (NAB Visa ACT #8815 only), bank data end date (2026-03-31), ACCREC outstanding total ($285,067.84), open invoice count (10), compliance dates (calculated from today 2026-09-24), draft artefact count
- `Inferred:` Status counts (DONE/UNCONFIRMED/IN-PROGRESS/NOT STARTED) — carry-forward from prior passes; no checklist items changed status this pass. D&O insurance overdue days calculated from ~2026-05-24 deadline (30 days post-registration confirmed in prior passes). BAS overdue days from standard lodgement date (2026-07-28) since concession date unknown.
- `Unverified:` D&O insurance actual bound status (no binding evidence visible across 10 passes); Pty Xero file status (may exist but unsynced); Standard Ledger BAS concession deadline; EOFY strategic fork resolution; Shareholders Agreement signing status

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- D&O insurance: 123 days past the ~2026-05-24 deadline. No binding evidence has ever appeared in DB or filesystem across ten passes. Status carries forward as UNCONFIRMED — risk is real but cannot be confirmed from data sources alone
- BAS Q4 FY26 overdue days calculated from standard due date (2026-07-28); Standard Ledger may have a concession extension to end-October 2026 — unconfirmed across ten passes
- Bank data ends 2026-03-31 (177 days stale) — Pty NAB business account cannot be confirmed or denied from DB
- Checklist item statuses are carry-forward; a fresh read of `act-entity-migration-checklist-2026-06-30.md` is recommended for any item marked UNCONFIRMED

## Reproduction Steps

1. Query `xero_invoices` GROUP BY `xero_tenant_id` — confirms 1 tenant, total count
2. Query `bank_statement_lines` GROUP BY `bank_account` — confirms account and date range
3. Query `xero_invoices` status/type summary for ACCREC/ACCPAY outstanding
4. `ls thoughts/shared/drafts/ | grep -iE 'novation|transition|migration|handover|...'` — artefact check
5. `ls thoughts/shared/plans/ | grep -iE '...'` — plan file check
6. Calculate compliance dates: `python3 -c "from datetime import date; ..."`
7. Compare against `wiki/synthesis/entity-migration-truth-state-2026-09-10.md`

## Linked Artifacts

- Source packet: Supabase `tednluwflfhxyucgwigh`, `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- Output artifact: `wiki/synthesis/entity-migration-truth-state-2026-09-24.md`
- Validation log: alignment loop PR #262
- Prior pass: `wiki/synthesis/entity-migration-truth-state-2026-09-10.md`
