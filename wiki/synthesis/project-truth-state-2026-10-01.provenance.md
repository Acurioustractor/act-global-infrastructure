---
title: Project truth-state 2026-10-01 Provenance
status: Verified
date: 2026-10-01
type: provenance
tags:
  - provenance
  - verification
  - audit
  - alignment-loop
source_packet_id: alignment-loop-2026-10-01
canonical_entity: project-truth-state-2026-10-01
---

# Project truth-state 2026-10-01 Provenance

## Purpose

- Output: project registry synthesis report (config vs DB vs wiki vs Xero)
- Intended destination: `wiki/synthesis/project-truth-state-2026-10-01.md`
- Why it was generated: eleventh pass of the ACT Alignment Loop, 7 days after 2026-09-24 tenth pass; scheduled automated routine

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `config/project-codes.json` | canonical config | v1.8.0, `_meta.updated` stale at 2026-04-24 | Code list, status breakdown, total count |
| `xero_invoices` (Supabase `tednluwflfhxyucgwigh`) | runtime ledger | snapshot 2026-10-01 | GROUP BY project_code, top 20; total count |
| `wiki/projects/**` | wiki articles | find count | Article count (101 .md files) |
| `wiki/synthesis/project-truth-state-2026-09-24.md` | prior synthesis | 2026-09-24 | Baseline for drift comparison |
| Git log (--diff-filter=A wiki/projects/*.md) | version control | since 2026-09-24 | Wiki article additions attribution |

## Verification Status

- `Verified:` Config total (84 projects), status breakdown (32 active / 24 dormant / 2 ideation / 26 archived), wiki article count (101), Xero total (2,466), top-20 Xero code distribution, ACT-QD and ACT-RS confirmed in config
- `Corrected:` Prior passes incorrectly classified ACT-QD and ACT-RS as DB-only — both are in config as of PR #275 (ACT-QD active, ACT-RS dormant)
- `Corrected:` Wiki attribution — PR #275 added `act-hq.md`, PR #277 added `station-precinct.md` (not both from PR #277)
- `Estimated:` Score distribution (~34/~10/~32/~4/0) — covers active/ideation subset only; dormant/archived projects excluded from scoring as they are not expected to have multi-source presence
- `Unverified:` Null project_code invoices confirmed by direct query; score distribution for dormant projects not computed

## Human Decisions / Gates

- Editorial review: pending (automated synthesis — Ben to review)
- Cultural review: not-required
- Consent review: not-required
- Release approval: pending

## Known Gaps And Assumptions

- Score distribution estimates use "~" approximations and cover active/ideation projects only (~36 of 84). Dormant (24) and archived (26) are not scored.
- Config `_meta.updated` field is stale (2026-04-24) — content has been updated via PRs since then but the meta version field was not incremented

## Reproduction Steps

1. Parse `config/project-codes.json`: `python3 -c "import json; d=json.load(open('config/project-codes.json')); projects=d['projects']; ..."`
2. Count `wiki/projects/**`: `find wiki/projects -name "*.md" | wc -l`
3. Query `xero_invoices`: `SELECT project_code, COUNT(*) FROM xero_invoices WHERE project_code IS NOT NULL GROUP BY project_code ORDER BY 2 DESC LIMIT 20;`
4. Run `git log --oneline --diff-filter=A -- 'wiki/projects/*.md'` for recent article additions
5. Compare against prior synthesis `wiki/synthesis/project-truth-state-2026-09-24.md`

## Linked Artifacts

- Source packet: `config/project-codes.json`, Supabase `tednluwflfhxyucgwigh`, `wiki/projects/`
- Output artifact: `wiki/synthesis/project-truth-state-2026-10-01.md`
- Validation log: alignment loop PR #279
- Prior pass: `wiki/synthesis/project-truth-state-2026-09-24.md`
