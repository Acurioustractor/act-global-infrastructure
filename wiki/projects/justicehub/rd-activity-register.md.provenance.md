---
title: "ACT-JH R&D Activity Register Provenance"
status: Draft
date: 2026-05-07
type: provenance
tags:
  - provenance
  - r-and-d
  - justicehub
  - audit
source_packet_id: rd-pack-fy26
canonical_entity: justicehub
---

# ACT-JH R&D Activity Register — Provenance

## Purpose

- Output: R&D activity register for project ACT-JH (JusticeHub)
- Intended destination: `wiki/projects/justicehub/rd-activity-register.md` (canonical) and `thoughts/shared/rd-pack-fy26/act-jh-rd-activity-register.md` (pack via symlink)
- Why generated: FY25-26 R&D Tax Incentive evidence pack assembly per Path C decision (2026-04-27).

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| Git log on `Acurioustractor/JusticeHub` (separate repo) | source-of-truth | 2025-07-01 to 2026-05-07 | 601 FY26 commits; commit hashes 6329d53, 6eb2c93, 8cb8345, 1da8f83, c7a59c2, 7a127b9 cited as evidence |
| `wiki/projects/justicehub/justicehub.md` | canonical wiki | 2026-04-11 | Scale numbers (1,000+ alts, 430 with evidence, $94.6B funding tracked, 98,418 orgs) |
| `wiki/projects/justicehub/{the-full-idea,three-circles,staying,the-brave-ones,minderoo-pitch-package}.md` | constellation files | current | Cross-referenced for narrative context |
| Supabase project `tednluwflfhxyucgwigh` | DB attestation | 2026-05-07 | ACT-JH tagged bills (3 rows, $701, 100% receipted); ACT-JH tagged transactions (4 rows, $96) |
| `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` | sibling pack file | 2026-05-07 | Receipt coverage cited |
| `thoughts/shared/reviews/minderoo-justicehub-pitch-2026-05-07.voice-grade.md` | sibling review | 2026-05-07 | Voice-grade companion validation |
| `wiki/finance/money-framework-decision-log-2026-04-15.md` Decisions 1, 2 | canonical decision log | 2026-05-07 | Ben 10% × $250K × 95% = $23,750 ACT-JH R&D-eligible per thesis project-mix |

## Verification Status — dollar figures

| Figure | Status | Evidence | Notes |
|---|---|---|---|
| Total claim AUD $24,547 | **Inferred** | Sum of below | Subject to Money Framework reconciliation |
| Ben Knight 10% × $250K × 95% R&D = $23,750 | **Unverified** | Money Framework decision log 2026-04-15 Decisions 1+2 (cited but pending Standard Ledger sign-off) | Per-project elevation per thesis project-mix line 64 |
| ACT-JH-tagged bills $701 | **Verified** | DB query 2026-05-07: 3 xero_invoices ACCPAY rows tagged project_code='ACT-JH', 100% receipt coverage | Reproduce via SQL in `receipt-coverage-attestation.md` |
| ACT-JH-tagged transactions $96 | **Verified** | DB query 2026-05-07: 4 xero_transactions rows tagged project_code='ACT-JH', rd_eligible=false / rd_category=review | Note: marked review, not eligible — may need re-tagging |
| Salary base $250,000 | **Unverified** | Knight Photography invoicing schedule per `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md` line 64 | GST registration timing pending Standard Ledger advice |
| Refund rate 43.5% | **Verified** | ATO RDTI rate schedule | `wiki/finance/act-money-framework.md` line 49 |

## Verification Status — non-dollar figures

| Figure | Status | Evidence |
|---|---|---|
| 1,000+ verified alternative models mapped | **Inferred** | Cited in `wiki/projects/justicehub/justicehub.md`; not independently verified against the JusticeHub DB in this session |
| 430 models with evidence data | **Inferred** | Same |
| $94.6B funding tracked | **Inferred** | Same |
| 98,418 organisations indexed | **Inferred** | Same |
| 601 FY26 commits in JusticeHub repo | **Verified** | `git log --since=2025-07-01 --until=2026-06-30 --oneline | wc -l` on `/Users/benknight/Code/JusticeHub` |
| Brave Ones field pack shipped | **Verified** | Commit 6eb2c93 "feat(judges): ship Judges on Country field pack — pages, postcards, QR system" (2026-04-15) |
| EL v2 hero-photo API integration | **Verified** | Commit 6329d53 "Funder one-pager: refactor to fetch hero photo via Empathy Ledger v2 API" (2026-05-05) |
| Service catalog resilience pattern | **Verified** | Commits c7a59c2 + 7a127b9 (2026-05-05) |
| Procurement-code mapping precision/recall | **Predicted** | Pre-experiment estimate; gold set not assembled |
| 0% data-sovereignty leakage | **Predicted** | Cross-system assertion test not written |

## Human Decisions / Gates

- Editorial review: pending Ben + Standard Ledger review before lodgement
- Cultural review: **required**. The federated-evidence claim implicates community-controlled data sovereignty. Community partners (Oonchiumpa, BG Fit, Mounty Yarns, PICC, plus any JH-specific partners) must align on the consent-boundary phrasing before lodgement.
- Consent review: not applicable to the register itself; the register *describes* the consent system at the JH–EL boundary.
- Release approval (to ATO): pending — gated on AusIndustry registration + Money Framework decision log + JH team personnel allocation review + cultural review.
- Funder release (Minderoo JH pitch is a separate artefact): the pitch lives at `/Users/benknight/Code/JusticeHub/output/proposals/` and the canonical doc currently fails Curtis voice-grade per the 2026-05-07 review.

## Known Gaps And Assumptions

- The 10% per-project allocation for Ben on ACT-JH follows the thesis project-mix at line 64. The actual percentage requires Ben's confirmation against time-tracking or commit-log evidence on the JusticeHub repo.
- The wider JH team's R&D-eligible personnel cost is NOT included in this register. If the JH team contributes to evidence-data curation, schema design, or procurement-code mapping in a way that meets the R&D-eligible test, that personnel cost should be added before lodgement.
- The 100-row procurement-code mapping gold set has not been assembled. Without it the precision/recall hypothesis cannot be tested.
- The 0% data-sovereignty leakage assertion is a strong claim. An automated test must be written and run before lodgement to back it up.
- The ACT-JH-tagged transactions ($96) are currently marked `rd_category='review'` in the DB, suggesting the R&D tagger flagged them for human review (not auto-eligible). The $96 figure is included here as a placeholder; the human-review outcome may shift it to ineligible.
- AusIndustry registration is pending.
- The cultural review at the consent-boundary is a hard gate.

## Reproduction Steps

1. Re-run the FY26 commit count on the JusticeHub repo:
   ```
   cd /Users/benknight/Code/JusticeHub
   git log --since="2025-07-01" --until="2026-06-30" --oneline | wc -l
   ```
2. Verify ACT-JH bills + transactions in DB:
   ```sql
   SELECT count(*), ROUND(SUM(total::numeric)::numeric, 2)
   FROM xero_invoices
   WHERE date BETWEEN '2025-07-01' AND '2026-06-30'
     AND type = 'ACCPAY'
     AND project_code = 'ACT-JH';

   SELECT count(*), ROUND(SUM(ABS(total::numeric))::numeric, 2), rd_eligible, rd_category
   FROM xero_transactions
   WHERE date BETWEEN '2025-07-01' AND '2026-06-30'
     AND project_code = 'ACT-JH'
   GROUP BY rd_eligible, rd_category;
   ```
3. Cross-check the JusticeHub scale numbers against the live JH database (separate Supabase project, not the shared Command Center DB).

## Status

Draft. Will be promoted to `status: final` only after AusIndustry registration, JH team personnel allocation review, cultural review, gold-set assembly, and the 0% data-sovereignty leakage test are complete.
