---
project: ACT-JH
project_name: JusticeHub
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
claim_total_aud: 24547
category: core
ausindustry_registration: pending_jul_2026
status: in_progress
last_updated: 2026-05-07
---

# ACT-JH core activity 1: Federated community-led-services evidence layer

## Executive summary

JusticeHub (project code ACT-JH) is ACT's evidence platform for justice alternatives — 1,000+ verified alternative models mapped, 430 with evidence data, $94.6B funding tracked, 98,418 organisations indexed. The R&D-eligible work in FY26 is the federated evidence-and-services layer that maps community-led programs to government procurement codes while preserving community data sovereignty.

Total claim FY26: ~$24,547 (Ben Knight 10% × $250K Knight Photography invoicing × 95% R&D = $23,750 + ACT-JH-tagged bills $701 + ACT-JH-tagged transactions ~$96 — figures preliminary, subject to Standard Ledger reconciliation per `wiki/finance/money-framework-decision-log-2026-04-15.md`).
Expected refund at 43.5% offset: ~$10,678.
Lead: Ben Knight (with the wider JusticeHub team).
Provenance sidecar: `wiki/projects/justicehub/rd-activity-register.md.provenance.md` (TBD).

## Hypothesis

Community-led justice-alternative programs can be mapped to government procurement codes (Crown Commercial Schedule equivalents, Indigenous Procurement Policy categories, justice-reinvestment line items) at ≥80% match rate using a deterministic-rules-first / LLM-fallback approach, where existing service-registry products assume central authority over the service catalog and therefore cannot represent community-controlled services without breaching data sovereignty.

A second sub-hypothesis: the same federated layer can route impact-evidence (transcripts via Empathy Ledger v2; cost-per-outcome figures from CivicGraph) into a single funder-readable evidence object, without the underlying community data leaving its consent boundary.

## Technical uncertainty

Standard service-catalog products (e.g. UK Government's Crown Commercial framework, US General Services Administration Schedules, Australian AusTender) treat the catalog as a central authority registry. The owning entity controls the schema, the data, and the publish/withdraw decision.

Community-led services do not work that way. The catalog needs to:

1. Allow a community-controlled organisation (e.g. an ACNC charity governed by an Indigenous board) to publish service descriptions WITHOUT ceding control of the underlying data
2. Allow a funder to query the catalog for evidence of fit-against-program-criteria WITHOUT being able to retrieve the underlying community data
3. Map the service description to government procurement codes the funder CAN read, on the funder's side of the boundary
4. Carry consent metadata that the community organisation can revoke

The unresolved technical questions:

a) What's the schema for a federated service description that holds enough structured fields for the procurement-code mapping (location, modality, eligibility, capacity) without including any of the consent-protected client data?

b) Can the procurement-code mapping be performed deterministically for the common cases (>80% match rate) plus LLM-fallback for ambiguous cases, at <$0.001 per service-program-match?

c) Can the cross-system evidence linkage (program → outcome metrics → transcripts via EL) work at funder-readable scale (thousands of programs) without breaching the EL v2 cross-org gallery boundary defined in the ACT-EL register?

This is non-trivial because: (a) standard procurement registries fail on community-controlled cases; (b) consent boundary requirements are interpretive and not enforced by a single technical standard; (c) the evidence-linkage layer crosses three data systems (JusticeHub catalog, EL v2, CivicGraph entity-resolved organisations).

## Experiment design

- **Variables**: schema shape for the service description (fields included / excluded by consent); procurement-code mapping rule weights; LLM-fallback confidence threshold; evidence-linkage materialisation strategy (synchronous query vs. cached evidence object).
- **Controls**: a baseline match rate computed by string-match between service description name + tag and procurement code description, against a 100-row hand-labelled gold set.
- **Treatment**: deterministic-rules-first + LLM-fallback procurement-code mapping applied to 430 evidence-bearing programs.
- **Ground truth**: 100-row hand-labelled gold set of (program, correct procurement code(s)) pairs (TBD — needs to be assembled from existing JusticeHub evidence data).
- **Success criteria**:
  - ≥80% precision against the 100-row gold set
  - ≥70% recall
  - <$0.001 average mapping cost per program
  - 0% leakage of community-controlled data outside consent boundary in the evidence-routing layer (assert via cross-org leakage test, paired with ACT-EL S5)
- **Data capture**: JusticeHub evidence database; cross-references to `gs_entities` (CivicGraph entity-resolved orgs); cross-references to EL v2 `gallery_media_associations` for transcript-linked evidence.

## Expected outcome (in progress)

Pre-experiment estimate, dated 2026-04 (around the time of the Brave Ones field-pack rollout commit batch in the JusticeHub repo):

- Procurement-code mapping precision 78–85%, recall 68–78%, cost ~$0.0007 per program (mostly Haiku for ambiguous ~20%).
- Evidence-routing leakage rate 0% under nominal load.

## Actual outcome (interim, as of 2026-05-07)

Measured so far (interim, partial):

- JusticeHub evidence platform live with **1,000+ alternative models mapped**, **430 with evidence data**, **$94.6B funding tracked**, **98,418 organisations indexed** (per `wiki/projects/justicehub/justicehub.md`).
- Cross-EL integration working: hero-photo API fetch via Empathy Ledger v2 from JusticeHub funder-pitch surface (commit 6329d53 "Funder one-pager: refactor to fetch hero photo via Empathy Ledger v2 API", 2026-05-05).
- Brave Ones field pack shipped — pages, postcards, QR system (commit 6eb2c93, 2026-04-15) — operational artefact that uses the evidence layer in the field.
- Phase 3 Minderoo partnership reframe with CoLI 2024 alignment landed (commit 8cb8345, 2026-04-27).
- Service catalog API + resilience pattern (degrade to empty success on DB error) in commits c7a59c2 + 7a127b9 (2026-05-05).

What's not yet measured:

- The 100-row hand-labelled gold set is not yet assembled.
- Procurement-code mapping precision/recall has not been benchmarked against gold truth.
- Cost-per-program-mapping has not been measured end-to-end.
- The 0% leakage assertion does not yet have an automated test.

## Linked supporting activities

- ACT-JH-S1: JusticeHub evidence database population — 430 models with evidence data, sourced from operational practice + research synthesis.
- ACT-JH-S2: Cross-EL integration (`/api/contained/tour-intelligence` + Funder one-pager EL v2 fetch). Commit: 6329d53.
- ACT-JH-S3: Brave Ones digital field pack (postcards, QR system, password-gated funder pitch). Commit: 6eb2c93.
- ACT-JH-S4: Service catalog + resilience pattern (`api/services` degrade-to-empty). Commits: c7a59c2, 7a127b9.
- ACT-JH-S5: Centre of Excellence rewrite (Harvest at Witta + four anchors). Commit: 1da8f83.
- ACT-JH-S6: Funding regression smoke + DB schema alignment. Commits: 234de33, b2fb971, f3e881a.

## Evidence trail

- This register: commit TBD on first commit.
- Canonical JusticeHub wiki article: `wiki/projects/justicehub/justicehub.md`.
- Constellation files (sources): `wiki/projects/justicehub/{the-full-idea,three-circles,staying,the-brave-ones,minderoo-pitch-package}.md`.
- JusticeHub repository (separate codebase): `/Users/benknight/Code/JusticeHub` — 601 FY26 commits.
- Linked invoices for cohort-cost tracking: `xero_invoices` filtered by `project_code = 'ACT-JH'` — 3 bills, $701 total, FY26.
- Receipt coverage attestation: **PASS — 100% by value on ACT-JH bills FY26** per `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` (DB queried 2026-05-07).
- Voice-grade companion review (canonical pitch + exec summary, 2026-05-07): `thoughts/shared/reviews/minderoo-justicehub-pitch-2026-05-07.voice-grade.md`.

## Salary allocation

| Staff | Project code | Period | % of personnel cost | Personnel basis | R&D-eligible | Evidence |
|-------|--------------|--------|---------------------|------------------|--------------|----------|
| Benjamin Knight | ACT-JH | 2025-07-01 to 2026-06-30 | 10% of $250K Knight Photography invoicing × 95% R&D allocation | $250,000 | $23,750 | Money Framework decision log 2026-04-15 Decisions 1, 2 (thesis line 64 project-mix) |
| ACT-JH-tagged bills | ACT-JH | 2025-07-01 to 2026-06-30 | — | — | $701 | 3 invoices DB-attested 2026-05-07; 100% receipt coverage |
| ACT-JH-tagged transactions | ACT-JH | 2025-07-01 to 2026-06-30 | — | — | $96 | 4 transactions DB-attested 2026-05-07 |

**Org-wide R&D reconciliation note**: Ben's total FY26 R&D allocation is 95% × $250K Knight Photography invoicing = $237,500 R&D-eligible (per Money Framework decision log Decision 1, citing thesis line 72). Decision 2 splits this per the thesis project-mix at line 64; ACT-JH takes 10% × $250K × 95% = $23,750. The wider JusticeHub team's contribution to this R&D activity (e.g. evidence data curation, content authoring) is not yet allocated as R&D-eligible personnel cost in this register; that allocation is open for review with the JH team and Standard Ledger before lodgement.

## AusIndustry components confirmation

All four components for this core activity are present in this register:
- Hypothesis (above)
- Technical uncertainty (above)
- Experiment design (above)
- Expected vs actual outcome (above — actual is `in_progress`, will close out before Jul 2026 lodgement window)

AusIndustry registration: pending. Target window Jul 2026 – 30 Apr 2027 per `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`.

## Open items before lodgement

1. Assemble the 100-row hand-labelled procurement-code gold set from existing JusticeHub evidence data.
2. Run controls and treatment; record precision / recall / cost-per-mapping.
3. Write the 0% leakage cross-system assertion test (paired with ACT-EL).
4. Confirm with the JH team whether their personnel cost should be R&D-allocated for ACT-JH (and at what percentage).
5. Write the provenance sidecar.
6. Confirm the consent-boundary phrasing with community partners (Oonchiumpa, BG Fit, Mounty Yarns, PICC) — the federated-evidence claim must not overclaim community endorsement.
