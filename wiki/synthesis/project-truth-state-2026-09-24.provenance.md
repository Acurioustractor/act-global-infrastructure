---
title: Project truth-state 2026-09-24 Provenance
status: Verified
date: 2026-09-24
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
source_packet_id: alignment-loop-2026-09-24
canonical_entity: project-truth-state-2026-09-24
---

# Project truth-state 2026-09-24 Provenance

## Purpose

- Output: project registry health synthesis (config × DB × wiki × Xero)
- Intended destination: `wiki/synthesis/project-truth-state-2026-09-24.md`
- Why it was generated: tenth pass of the ACT Alignment Loop, 14 days after 2026-09-10 ninth pass; scheduled automated routine

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `config/project-codes.json` | canonical config | commit HEAD 2026-09-24 | Project code registry; count, version, ghost codes |
| `xero_invoices` (Supabase `tednluwflfhxyucgwigh`) | runtime ledger | snapshot 2026-09-24 | GROUP BY project_code top 20; total count |
| `wiki/projects/**` | wiki articles | filesystem count 2026-09-24 | Article count via `find` |
| `wiki/synthesis/project-truth-state-2026-09-10.md` | prior synthesis | 2026-09-10 | Baseline for drift comparison |

## Verification Status

- `Verified:` Config project count (78, corrected from prior-pass 74); ACT-DLB (Deadly Labs, active) and ACT-PB (Place-Based Policy Lab, active) confirmed present in config; ACT-QD and ACT-RS confirmed absent; Xero total (2,448); Xero top-20 codes; wiki/projects article count (99); ACT-PS gap status (closed, PR #243)
- `Inferred:` Score distribution (~34/~9/~27/~4 across 4/4–1/4) — estimated from active/ideation project subset, not recomputed from full scoring pass; ghost code status (flagged as non-projects in their own descriptions)
- `Unverified:` Whether ACT-QD and ACT-RS are in the `projects` Supabase table (inherited claim from prior passes, not re-queried this pass)

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- **CORRECTION from prior passes (important):** `config/project-codes.json` has 78 projects, not 74 as reported in passes 1–9. The `_meta.updated` field still reads `2026-04-24` but the `projects` object grew via post-baseline commits. ACT-DLB and ACT-PB were wrongly classified as "DB-only" — they are in config. This error propagated across all nine prior alignment loop passes.
- Score distribution is estimated, not freshly computed — a full scoring pass (wiki × DB × codebase × Xero) would be needed to verify exact counts
- ACT-QD and ACT-RS DB presence inherited from prior passes; not re-queried

## Reproduction Steps

1. `python3 -c "import json; d=json.load(open('config/project-codes.json')); print(len(d['projects']))"` — confirms 78 codes
2. Query `xero_invoices` on Supabase: `SELECT project_code, COUNT(*) FROM xero_invoices WHERE project_code IS NOT NULL GROUP BY project_code ORDER BY 2 DESC LIMIT 20;`
3. `find wiki/projects -name "*.md" | wc -l` — wiki article count
4. Compare against `wiki/synthesis/project-truth-state-2026-09-10.md`

## Linked Artifacts

- Source packet: `config/project-codes.json`, Supabase `tednluwflfhxyucgwigh`, `wiki/projects/`
- Output artifact: `wiki/synthesis/project-truth-state-2026-09-24.md`
- Validation log: alignment loop PR #262 (Codex finding #2 corrected in this pass)
- Prior pass: `wiki/synthesis/project-truth-state-2026-09-10.md`
