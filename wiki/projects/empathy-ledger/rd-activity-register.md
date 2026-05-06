---
project: ACT-EL
project_name: Empathy Ledger
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
claim_total_aud: 79750
category: core
ausindustry_registration: pending_jul_2026
status: in_progress
last_updated: 2026-05-07
---

# ACT-EL core activity 1: OCAP-respecting consent capture and multi-tenant story ledger

## Executive summary

Empathy Ledger v2 (EL v2) is the storytelling and consent ledger that backs ACT's community work and supplies media to artefacts (Minderoo Goods pitch, JusticeHub Brave Ones, STAY journal). The R&D-eligible work in FY26 is the consent-capture and multi-tenant ledger schema that allows verbal consent to operate as the audit trail in an OCAP (Ownership, Control, Access, Possession) protocol context, while also allowing media to span organisational boundaries without violating org-scoped read paths.

Total claim FY26: ~$79,750 (Nic Marchesi 15% × $200K director salary characterisation = $30,000 R&D-eligible + Ben Knight 10% × $250K Knight Photography invoicing × 95% R&D allocation = $23,750 R&D-eligible + Anthropic + Supabase + storage $26,000 — figures preliminary, subject to Standard Ledger reconciliation per `wiki/finance/money-framework-decision-log-2026-04-15.md` Decision 4 Option A).
Expected refund at 43.5% offset: ~$34,691.
Lead: Ben Knight.
Provenance sidecar: `wiki/projects/empathy-ledger/rd-activity-register.md.provenance.md` (TBD).

## Hypothesis

A consent-capture system in an OCAP protocol context can use the recording itself as the audit trail (rather than a paper signature) at ≥99% verifiability, where verifiability is defined as: any third-party reviewer (community elder, lawyer, ethics board) can in <60 seconds locate (a) the moment of verbal consent, (b) the conditions of consent, (c) any subsequent withdrawal, for any story in the ledger.

A second sub-hypothesis: a multi-tenant story ledger can hold both org-scoped read paths (each organisation sees only its own stories by default) and cross-org gallery sharing (media from one org can appear in another org's project gallery via the `act_project_code` ecosystem key) without leaking provenance or breaking consent.

## Technical uncertainty

The OCAP literature (First Nations Information Governance Centre principles; CARE Principles for Indigenous Data Governance; Maiam nayri Wingara Indigenous Data Sovereignty Collective) describes the rights but does not specify a verifiable engineering schema. Standard consent-management tooling (OneTrust, TrustArc, etc.) assumes:

1. Consent is a click on a form
2. The form is the audit trail
3. The data subject is identifiable by email or account ID

None of those assumptions hold for ACT's context:

1. Consent is verbal, in language, with cultural protocol surrounding it
2. The recording itself is the audit trail; if there is no recording there is no consent
3. The data subject may not have an email account; cultural protocol may forbid naming the deceased

The unresolved technical questions:

a) Can a media-asset record carry a verifiable consent timestamp + scope + withdrawal provision in a way a non-technical reviewer can trace in <60s?
b) Can an org-scoped database (RLS by `organization_id`) support cross-org gallery sharing via a separate ecosystem-key (`act_project_code`) without breaching tenancy?
c) What's the minimum schema that holds protocol-respect (no posthumous naming, "do-not-redistribute" flags, time-bound permission) without becoming a checkbox interface that funders mistake for surveillance?

## Experiment design

- **Variables**: schema shape of `gallery_media_associations` (which carries `cultural_context` + `is_cover_image` + caption); read-path query patterns (org-scoped vs ecosystem-scoped vs project-scoped); consent metadata location (on `media_assets` vs on `gallery_media_associations` vs on a separate `consent_log` table).
- **Controls**: a baseline read path that hits all 5,039 `media_assets` rows directly (the pre-multi-tenancy state, before commit batch on EL v2); a baseline consent record that uses paper signature only.
- **Treatment**: org-scoped multi-tenant schema with `gallery_media_associations` carrying cultural context, and verbal-consent recording linked via `media_assets.cdn_url` to the relevant audio/video file.
- **Ground truth**: 4 active community approvals already in flight (Oonchiumpa, BG Fit, Mounty Yarns, PICC) where verbal consent has been recorded and the protocol has been observed in person. These are the real-world test cases.
- **Success criteria**:
  - 100% of stories in the 4-community approval set have a verbal-consent recording locatable in <60s by a third-party reviewer.
  - 0% leakage of any story across org boundaries except where `act_project_code` is set on the project.
  - Multi-tenant query at `/api/projects/[id]/photos` returns the correct project's media only, with the cross-org chain working correctly for ecosystem projects.
- **Data capture**: `gs_entities`-equivalent audit pattern on `gallery_media_associations`; existing pattern at `/api/projects/[id]/photos` already uses the gallery chain + dedup.

## Expected outcome (in progress)

Pre-experiment estimate (dated 2026-04-06 around the time of the multi-tenant fix):

- Verbal-consent locatability ≥99% across the 4-community approval set.
- 0 cross-org leakage incidents on the 43-project, 91-gallery, 3,793-association corpus.
- Read-path latency at `/api/projects/[id]/photos` <500ms p95 against the multi-tenant query plan.

## Actual outcome (interim, as of 2026-05-07)

Measured so far (interim, partial):

- Multi-tenancy schema is live (`projects.organization_id` populated; `external_references.act_infrastructure.tier` JSONB carrying display tier; `act_project_code` carrying ecosystem key).
- Cross-org photo manager works: photos linked to projects with `act_project_code` set are now reachable by the ACT (hub) org's photo manager. Verified 2026-04-06 in commit batch on `el-v2-projects-alignment` branch.
- Tier reassignment for CFTC, Dad.Lab.25, Junes Patch, RAF (partner → studio) was applied as a live DB update; no schema breakage observed.
- Empty-projects toggle (commit `ddbc9d3c`) is live; cross-org photo manager (commit `ddbc9d3c`) is live.
- Verbal-consent locatability has not yet been measured against an external reviewer. The 4-community approval set is real but the third-party-reviewer audit (the success criterion) has not been run.

What's not yet measured:

- The <60s third-party-reviewer audit. This needs a non-ACT reviewer (likely a community elder + an outside lawyer) and a ~10-story sample.
- Read-path latency p95 numbers under realistic load. The query plan is in place but no production-scale benchmark has been captured.
- Cross-org leakage audit. The schema is correct in theory but no automated test asserts the negative.

## Linked supporting activities

- ACT-EL-S1: EL v2 multi-tenant schema migration (projects table upgraded; `organization_id` populated; tier JSONB added).
- ACT-EL-S2: Cross-org photo manager (commit `ddbc9d3c` on `el-v2-projects-alignment`).
- ACT-EL-S3: Hide-empty-projects client-side toggle.
- ACT-EL-S4: Wiki living library pipeline (commit e3a0728 "feat(wiki): EL v2 → wiki living library pipeline + OCAP governance").
- ACT-EL-S5: Consent-in-action dashboard (commit 4fff285 "feat(dashboard): Consent in action — Indigenous data sovereignty as lived practice").
- ACT-EL-S6: Live-consent placeholder replacement (commit 4856e13 "fix(consent): replace placeholders with live EL v2 data").

## Evidence trail

- This register: commit TBD on first commit.
- EL v2 multi-tenant DB state verified 2026-04-06: 43 projects, 412 storytellers, 91 galleries, 3,793 gallery_media_associations, 5,039 media_assets.
- Wiki living library pipeline: commit e3a0728.
- Consent dashboard: commit 4fff285.
- OCAP governance commits: e3a0728, 4856e13, 4fff285.
- Linked invoices for cohort-cost tracking: `xero_invoices` filtered by `project_code = 'ACT-EL'` — 8 bills, $1,304 total, FY26.
- Receipt coverage attestation: **PASS — 100% by value on ACT-EL bills FY26** per `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` (DB queried 2026-05-07). Note: ACT-EL bills total $1,304; the larger SaaS spend attributable to EL work is bundled in ACT-IN at the bill level.

## Salary allocation

| Staff | Project code | Period | % of personnel cost | Personnel basis | R&D-eligible | Evidence |
|-------|--------------|--------|---------------------|------------------|--------------|----------|
| Nicholas Marchesi | ACT-EL | 2025-07-01 to 2026-06-30 | 15% of $200K director salary characterisation | $200,000 | $30,000 | Money Framework decision log 2026-04-15 Decision 3 |
| Benjamin Knight | ACT-EL | 2025-07-01 to 2026-06-30 | 10% of $250K Knight Photography invoicing × 95% R&D | $250,000 | $23,750 | Money Framework decision log 2026-04-15 Decisions 1, 2 (thesis line 64 project-mix) |
| Anthropic + Supabase + storage | ACT-EL | 2025-07-01 to 2026-06-30 | — | — | $26,000 | Xero invoices tagged ACT-EL — 8 bills, $1,304, 100% receipt coverage FY26 (DB attestation 2026-05-07; full attestation in `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md`) |

**Org-wide R&D reconciliation note**: Ben's total FY26 R&D allocation is 95% × $250K Knight Photography invoicing = $237,500 R&D-eligible (Money Framework decision log 2026-04-15 Decision 1, citing thesis line 72). Ben's allocation to ACT-EL specifically (10% × $250K × 95% = $23,750) follows the thesis project-mix at line 64. Nic's allocation to ACT-EL (15% × $200K = $30,000 R&D-eligible) is per Decision 3 of the decision log. Decision log: `wiki/finance/money-framework-decision-log-2026-04-15.md`.

## AusIndustry components confirmation

All four components for this core activity are present in this register:
- Hypothesis (above)
- Technical uncertainty (above)
- Experiment design (above)
- Expected vs actual outcome (above — actual is `in_progress`, will close out before Jul 2026 lodgement window)

AusIndustry registration: pending. Target window Jul 2026 – 30 Apr 2027 per `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`.

## Open items before lodgement

1. Run the third-party-reviewer audit on the 4-community approval set (Oonchiumpa, BG Fit, Mounty Yarns, PICC). Capture the <60s locatability result.
2. Capture read-path latency p95 numbers at `/api/projects/[id]/photos` under realistic load.
3. Write an automated test that asserts cross-org leakage = 0 on the 43-project corpus.
4. Tag historical Xero invoices with `project_code = 'ACT-EL'` for receipt-coverage attestation.
5. Write the provenance sidecar.
6. Confirm OCAP framing language with community partners before lodgement (avoid funder-side overclaim).
