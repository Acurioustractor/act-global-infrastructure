---
title: "ACT-CG R&D Activity Register Provenance"
status: Draft
date: 2026-05-07
type: provenance
tags:
  - provenance
  - r-and-d
  - civicgraph
  - audit
source_packet_id: rd-pack-fy26
canonical_entity: civicgraph
---

# ACT-CG R&D Activity Register — Provenance

## Purpose

- Output: R&D activity register for project ACT-CG (CivicGraph)
- Intended destination: `wiki/projects/civicgraph/rd-activity-register.md` (canonical) and `thoughts/shared/rd-pack-fy26/act-cg-rd-activity-register.md` (pack via symlink)
- Why generated: FY25-26 R&D Tax Incentive evidence pack assembly per Path C decision (2026-04-27). Lodgement window Jul 2026 – 30 Apr 2027.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| Git log on `Acurioustractor/act-global-infrastructure` | source-of-truth | 2025-07-01 to 2026-05-07 | Real commit hashes (c910fad, 29d48be, cbc67fe, f8d5f0c, 3a16982) for evidence trail |
| `scripts/entity-resolution.mjs` | source code | current | Resolver implementation cited as evidence |
| `scripts/enrich-contacts-from-acnc.mjs` | source code | current | Tier 1.5 ACNC API endpoint citation |
| `scripts/enrich-contacts-from-website.mjs` | source code | current | Tier 2 yield rate citation |
| `scripts/enrich-contacts-via-agent.mjs` | source code | current | Tier 3 yield rate citation |
| `scripts/gs-entities-data-quality-sweep.mjs` | source code | current | DQ sweep citation |
| Memory file `project_civicgraph_contact_enrichment.md` | session memory | 2026-04-21 | Baseline numbers (4,729 clean orgs, 2,093 emails, 1,918 phones); flagged as 16-day-old, verified against git log dates |
| `thoughts/shared/handoffs/2026-05-07-end-of-day.md` | handoff | 2026-05-07 | Yesterday's `grant_opportunities` dedup metrics (9,474 dupes deleted; 32,503→23,029) |
| `wiki/finance/act-money-framework.md` | canonical finance doc | current | R&D refund rate 43.5% [V]; FY26 R&D-eligible spend ceiling [V] |

## Verification Status — dollar figures

| Figure | Status | Evidence | Notes |
|---|---|---|---|
| Total claim AUD $58,000 | **Inferred** | Sum of below | Subject to Money Framework reconciliation |
| Ben Knight 22% × $200,000 = $44,000 | **Unverified** | Money Framework decision log 2026-04-15 (cited but not yet present in pack) | Per-project elevation above org-wide default 10% requires the decision log to be in the pack before lodgement |
| Anthropic + Supabase consumption $14,000 | **Unverified** | Xero invoices to be back-tagged with `project_code = 'ACT-CG'` | Tagging COMPLETE in DB (FY26): 516 ACT-IN bills, $224K total, 98.5% receipt coverage by value — see `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` |
| Salary base $200,000 | **Unverified** | Calibration fixture used $200K; Money Framework default for post-cutover PAYG salary is $10K/mo = $120K/yr | Will be re-applied to reconciled basis at lodgement (the cutover is 2026-06-30) |
| Refund rate 43.5% | **Verified** | ATO RDTI rate schedule for refundable offset, sub-$20M aggregated turnover | `wiki/finance/act-money-framework.md` line 49 |

## Verification Status — non-dollar figures

| Figure | Status | Evidence |
|---|---|---|
| 4,729 clean orgs after DQ sweep | **Verified** | Commit f8d5f0c (2026-04-20) "feat(dq): gs_entities 3-pass cleanup — 4,010 rows reclassified"; cross-referenced in memory and handoff |
| 8,826 → 4,729 row reduction | **Verified** | Same commit |
| 2,093 emails / 1,918 phones (interim) | **Verified** | Commit cbc67fe (2026-04-20) "feat(enrichment): Tier 1-3 contact pipeline — 660 emails + 752 phones added" + memory baseline |
| Tier 1.5 yield 99.4% (1,441/1,449) | **Inferred** | Memory citation; commits cited; per-tier audit logs in `wiki/output/contact-enrichment/` |
| Tier 2 yield 80% (796/997) | **Inferred** | Same |
| Tier 3 yield 92% (22/24 with confidence ≥3) | **Inferred** | Same |
| 9,474 grant_opportunities dupes deleted | **Verified** | Yesterday's session handoff; `grant_opportunities_source_name_uniq` partial unique index in DB |
| 200-row hand-labelled gold set | **Not yet assembled** | Open item before lodgement |
| Precision 92%/recall 85% expected | **Predicted** | Pre-experiment estimate; actual not yet measured |

## Human Decisions / Gates

- Editorial review: pending Ben + Standard Ledger review before lodgement
- Cultural review: not required (technical infrastructure work)
- Consent review: not required
- Release approval (to ATO): pending — gated on AusIndustry registration + Money Framework decision log + receipt back-tagging

## Known Gaps And Assumptions

- The 22% per-project allocation for Ben on ACT-CG is pulled from the calibrated good-3 fixture as a reasonable working number. The actual percentage requires Ben's confirmation against time-tracking or Money Framework split.
- The $14,000 Anthropic + Supabase consumption figure is a placeholder. Real number requires Xero invoice back-tagging.
- The salary base of $200K differs from the Money Framework's post-cutover default of $120K/yr ($10K/mo PAYG). Pre-cutover the founders were paid under sole-trader / Knight Photography arrangements, which complicates the FY25-26 basis. Standard Ledger reconciliation required.
- AusIndustry registration is pending; without the registration ID the activity register is incomplete from the ATO's perspective even if all other evidence is in place.

## Reproduction Steps

1. Re-run the commit history filter:
   ```
   git log --since="2025-07-01" --until="2026-06-30" --pretty=format:"%h|%ad|%s" --date=short \
     -- scripts/entity-resolution.mjs scripts/enrich-contacts-from-acnc.mjs scripts/enrich-contacts-from-website.mjs scripts/enrich-contacts-via-agent.mjs scripts/gs-entities-data-quality-sweep.mjs scripts/resolve-ambiguous-matches.mjs scripts/detect-entity-duplicates.mjs
   ```
2. Cross-check `gs_entities` row counts against the memory baseline:
   ```sql
   SELECT count(*) FROM gs_entities WHERE is_community_controlled = true;
   ```
3. Verify the `grant_opportunities_source_name_uniq` partial unique index exists.
4. Re-grade the activity register against `thoughts/shared/rubrics/rd-evidence-pack.md` using `scripts/grade-pack.mjs`.

## Status

Draft. Will be promoted to `status: final` only after AusIndustry registration is in place, Money Framework decision log is included in pack, and Xero invoice back-tagging is complete.
