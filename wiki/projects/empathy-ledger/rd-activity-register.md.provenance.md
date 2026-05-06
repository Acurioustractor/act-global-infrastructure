---
title: "ACT-EL R&D Activity Register Provenance"
status: Draft
date: 2026-05-07
type: provenance
tags:
  - provenance
  - r-and-d
  - empathy-ledger
  - audit
source_packet_id: rd-pack-fy26
canonical_entity: empathy-ledger
---

# ACT-EL R&D Activity Register — Provenance

## Purpose

- Output: R&D activity register for project ACT-EL (Empathy Ledger)
- Intended destination: `wiki/projects/empathy-ledger/rd-activity-register.md` (canonical) and `thoughts/shared/rd-pack-fy26/act-el-rd-activity-register.md` (pack via symlink)
- Why generated: FY25-26 R&D Tax Incentive evidence pack assembly per Path C decision (2026-04-27).

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| Git log on `Acurioustractor/act-global-infrastructure` | source-of-truth | 2025-07-01 to 2026-05-07 | Real commit hashes (e3a0728, 4fff285, 4856e13, c880e70, fc38b2a, 67e288d, 29e33c1) for evidence trail |
| Memory file `project_el_multi_tenancy.md` | session memory | 2026-04-06 | DB row counts (43 projects, 412 storytellers, 91 galleries, 3,793 gallery_media_associations, 5,039 media_assets); column traps on `media_type` (always NULL) and `project_id` (always NULL) |
| `apps/command-center/src/app/api/projects/[id]/photos/` | source code | current | Read-path implementation cited as evidence |
| `wiki/finance/act-money-framework.md` | canonical finance doc | current | R&D refund rate 43.5% [V]; founder salary baseline |

## Verification Status — dollar figures

| Figure | Status | Evidence | Notes |
|---|---|---|---|
| Total claim AUD $126,000 | **Inferred** | Sum of below | Subject to Money Framework reconciliation |
| Nic Marchesi 15% × $200,000 = $30,000 | **Unverified** | Money Framework decision log 2026-04-15 (cited but not yet present in pack) | Per-project elevation requires decision log |
| Ben Knight 35% × $200,000 = $70,000 | **Unverified** | Same | Per-project elevation above org-wide default 10% |
| Anthropic + Supabase + storage $26,000 | **Unverified** | Xero invoices to be back-tagged with `project_code = 'ACT-EL'` | Tagging COMPLETE in DB (FY26): 8 ACT-EL bills $1,304 (100% receipted); larger SaaS bundled in ACT-IN ($224K, 98.5% receipted) — see `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` |
| Salary base $200,000 | **Unverified** | See ACT-CG provenance — same caveat | Will be re-applied to reconciled basis at lodgement |
| Refund rate 43.5% | **Verified** | ATO RDTI rate schedule | `wiki/finance/act-money-framework.md` line 49 |

## Verification Status — non-dollar figures

| Figure | Status | Evidence |
|---|---|---|
| 43 projects in `projects` table | **Verified** | Memory baseline 2026-04-06; verifiable against current DB |
| 412 rows in `project_storytellers` | **Verified** | Same |
| 91 rows in `galleries` | **Verified** | Same |
| 3,793 rows in `gallery_media_associations` | **Verified** | Same |
| 5,039 rows in `media_assets` | **Verified** | Same |
| 4 active community approvals (Oonchiumpa, BG Fit, Mounty Yarns, PICC) | **Verified** | Memory file `project_wiki_story_sync.md` |
| Cross-org photo manager working post commit ddbc9d3c | **Verified** | Yesterday's handoff cites the commit and the live behaviour |
| Verbal-consent locatability ≥99% | **Predicted** | Pre-experiment estimate; not yet audited by third-party reviewer |
| Read-path latency p95 <500ms | **Predicted** | Pre-experiment estimate; not yet benchmarked under load |
| Cross-org leakage = 0 | **Predicted** | No automated test asserts the negative yet |

## Human Decisions / Gates

- Editorial review: pending Ben + Standard Ledger review before lodgement
- Cultural review: **required**. OCAP framing in the activity register must be confirmed with community partners (Oonchiumpa, BG Fit, Mounty Yarns, PICC representatives) to avoid funder-side overclaim.
- Consent review: not applicable to the register itself; the *register describes the consent system*, but the system's audit (third-party-reviewer locatability test) is itself a consent-adjacent activity.
- Release approval (to ATO): pending — same gating items as ACT-CG plus the cultural review above.

## Known Gaps And Assumptions

- The 35% per-project allocation for Ben on ACT-EL is pulled from the calibrated good-2 fixture as a reasonable working number. The actual percentage requires Ben's confirmation against time-tracking or Money Framework split.
- The 15% per-project allocation for Nic on ACT-EL is also from good-2 fixture; same caveat.
- The $26,000 Anthropic + Supabase + storage figure is a placeholder. Real number requires Xero invoice back-tagging.
- The third-party-reviewer audit (the success criterion for the verbal-consent locatability hypothesis) has not been run. This is a critical actual-outcome gap.
- AusIndustry registration is pending.
- The cultural review is a hard gate — the OCAP framing must not be released to the ATO without community partner alignment.

## Reproduction Steps

1. Re-run the commit history filter:
   ```
   git log --since="2025-07-01" --until="2026-06-30" --pretty=format:"%h|%ad|%s" --date=short \
     -- 'apps/command-center/src/app/api/projects/' 'apps/command-center/src/app/organisations/'
   ```
2. Cross-check DB row counts:
   ```sql
   SELECT 'projects' AS t, count(*) FROM projects
   UNION ALL SELECT 'project_storytellers', count(*) FROM project_storytellers
   UNION ALL SELECT 'galleries', count(*) FROM galleries
   UNION ALL SELECT 'gallery_media_associations', count(*) FROM gallery_media_associations
   UNION ALL SELECT 'media_assets', count(*) FROM media_assets;
   ```
3. Run the third-party-reviewer audit on the 4-community approval set (this is the gating item for actual outcome).

## Status

Draft. Will be promoted to `status: final` only after AusIndustry registration, cultural review, third-party-reviewer audit, and Xero invoice back-tagging are complete.
