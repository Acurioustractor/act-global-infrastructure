---
project: ACT-FY26-RD-PACK
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
status: assembling
last_updated: 2026-05-07
target_lodgement: 2027-04-30
total_claim_aud: 329500
expected_refund_aud_low: 121833
expected_refund_aud_high: 143333
lead_contact_for_pack: Ben Knight (ben@benjamink.com.au)
---

# R&D Tax Incentive evidence pack — FY25-26

## Executive summary

| Field | Value |
|-------|-------|
| Registrant | A Curious Tractor Pty Ltd |
| ACN | 697 347 676 |
| Financial year | FY25-26 (1 Jul 2025 – 30 Jun 2026) |
| Registration status | Pending (target window: Jul 2026 – 30 Apr 2027 per Path C plan) |
| Path | Path C (sole-trader period FY24-25 forfeited per decision logged 2026-04-27) |
| Total preliminary claim (this pack — three core registers only) | **AUD $329,500** |
| Refund rate | 43.5% (R&D refundable offset for sub-$20M aggregated-turnover entities) |
| Expected refund — three registers only (range) | **AUD $121,833 – $143,333** (low = 0.435 × claim × 0.85 receipt threshold; high = 0.435 × claim) |
| Money Framework total R&D-eligible spend (per founder pay thesis) | **AUD ~$627,000** (founders' personnel cost $317.5K + ACT-IN tagged $284K + per-project tagged ~$12.5K + SaaS/API ~$13K) |
| Money Framework realistic refund range | **AUD $200,000 – $250,000** (per `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md` line 108) |
| Coverage of the three registers vs Money Framework total | ~52% — the three core activity registers cover Empathy Ledger consent + multi-tenancy, CivicGraph entity resolution, and Goods buyer-supplier matching. The remaining ~48% is ACT-IN core activities (agent system, ALMA, governed proof, platform infrastructure) not yet split into discrete registers, plus founders' personnel cost on those activities. |
| Money Framework realistic-range estimate | $180–220K (per `wiki/finance/act-money-thesis-rebuttal.md`) |
| Lead contact for this pack | Ben Knight |
| Pack status | **Assembling — WARN (will become PASS as gaps below close)** |

> The Money Framework realistic-range estimate ($180-220K) is higher than this pack's preliminary total ($147,250) because the framework includes R&D-eligible spend across cloud, contractors, and supporting activities not yet fully accounted for in the per-project registers. The two will converge as the registers close out.

## Three core activity registers (one per project)

The core activities are documented in per-project registers, symlinked into this pack from the canonical wiki location:

| Project code | Project name | Register (in pack) | Canonical (wiki) | Lead | Preliminary claim |
|--------------|--------------|--------------------|-------------------|------|-------------------|
| ACT-GD | Goods on Country | `act-gd-rd-activity-register.md` | `wiki/projects/goods/rd-activity-register.md` | Nic Marchesi | $188,250 |
| ACT-EL | Empathy Ledger | `act-el-rd-activity-register.md` | `wiki/projects/empathy-ledger/rd-activity-register.md` | Ben Knight | $79,750 |
| ACT-CG | CivicGraph | `act-cg-rd-activity-register.md` | `wiki/projects/civicgraph/rd-activity-register.md` | Ben Knight | $61,500 |

Each register contains: hypothesis, technical uncertainty, experiment design, expected outcome, actual outcome (interim), linked supporting activities, evidence trail (real commit hashes), and salary allocation.

## Path C decision context

Per the R&DTI Path C decision logged 2026-04-27:

- The 30 Apr 2026 deadline does NOT apply to ACT (sole trader period FY24-25 is forfeited because Nic's sole trader was not an eligible R&D entity).
- FY25-26 is the first eligible claim year. Lodgement window: Jul 2026 – 30 Apr 2027.
- Registrant is A Curious Tractor Pty Ltd (ACN 697 347 676), registered 2026-04-24.
- Entity is a small base-rate company under the $20M aggregated-turnover threshold, qualifying for the 43.5% refundable offset.

See `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md` for the full Path C decision record.

## Salary allocation summary (thesis-aligned)

Per the Money Framework decision log (`wiki/finance/money-framework-decision-log-2026-04-15.md`), the FY26 founder R&D allocations are:

| Founder | Personnel cost basis | Total R&D % | R&D-eligible $ |
|---------|----------------------|-------------|-----------------|
| Ben Knight | $250,000 (Knight Photography invoicing) | 95% | **$237,500** |
| Nic Marchesi | $200,000 (retrospective director-salary characterisation) | 40% | **$80,000** |
| **Founders combined** | $450,000 | — | **$317,500** |

**Per-project distribution of founder R&D-eligible** (Decision 2 + Decision 3):

| Code | Project | Ben (10% etc × 95%) | Nic (per Decision 3) | This pack covers? |
|------|---------|----------------------|------------------------|--------------------|
| ACT-IN | Intelligence / agent / ALMA / platform infra | 60% × $250K × 95% = $142,500 | — | partial — CivicGraph activity register only ($47,500 of $142,500) |
| ACT-EL | Empathy Ledger | 10% × $250K × 95% = $23,750 | 15% × $200K = $30,000 | yes ✓ |
| ACT-JH | JusticeHub | 10% × $250K × 95% = $23,750 | — | no — JH register not in this pack |
| ACT-GD | Goods on Country | 10% × $250K × 95% = $23,750 | 25% × $200K = $50,000 | yes ✓ |
| ACT-DO | Doing / dashboards / ops | 5% × $250K × 95% = $11,875 | — | no |
| ACT-CORE | Cross-project core | 5% × $250K × 95% = $11,875 | — | no |
| **Total founders' R&D-eligible** | | **$237,500** | **$80,000** | **$317,500** |

**Salary-base note**: Both founders' personnel cost bases ($250K Ben Knight Photography invoicing; $200K Nic retrospective director-salary characterisation) are documented in `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md`. Standard Ledger sets the fair-market figure for Nic's characterisation at lodgement. Post-cutover (1 Jul 2026 onwards), the Money Framework moves both founders to PAYG $10K/mo = $120K/yr per `wiki/finance/act-money-framework.md` line 81.

## How this pack is graded

Weekly: `node scripts/grade-pack.mjs --rubric thoughts/shared/rubrics/rd-evidence-pack.md --pack thoughts/shared/rd-pack-fy26/`

Weekly grade output is included in the Monday weekly-reconciliation Telegram message under "R&D pack readiness".

## Calibration anchors

For comparison, calibrated good-pass examples are in `thoughts/shared/rubrics/fixtures/rd-evidence/`. The three real registers in this pack are modelled on those templates but use real commit hashes, real DB row counts, and real codebase artefacts.

## What's still missing (gating items before lodgement)

| Item | Owner | Blocks |
|------|-------|--------|
| AusIndustry registration submission | Standard Ledger + Ben | Hard rule 1.2 — ausindustry: missing |
| ~~Per-project Xero invoice + transaction back-tagging~~ | ~~Ben~~ | **DONE** — DB-attested 2026-05-07. ACT-GD bills 99.5%, ACT-IN bills 98.5%, ACT-EL bills 100% receipt coverage by value. See `receipt-coverage-attestation.md`. |
| Money Framework decision log 2026-04-15 in pack | Ben | Hard rule 1.5 — salary reconciliation evidence |
| Per-project provenance sidecars (`*.provenance.md`) | Ben | Warning 4.2 |
| Standalone `salary-allocations.csv` | Ben + Standard Ledger | Warning rubric input spec |
| Standalone `supporting-activities.md` | Ben | Warning rubric input spec |
| `audit-trail.md` (commit hashes + dates per activity) | Ben | Warning rubric input spec |
| Per-project receipt coverage attestation | Ben (via Spending Intelligence v3) | Hard rule 1.4 |
| Close-out of in-progress actual outcomes (gold sets, audits, conversion measurements) | Ben + Nic | Warning 2.4 |

## ACT-OO (Oonchiumpa) deferred

ACT-OO Oonchiumpa technical components are TBD with Kristy Bloomfield and Tanya Turner. No claim is attached to this project in this pack until the technical components are jointly defined and the OCAP boundaries around the work are confirmed with the community partners. This is documented as a structural gap in the pack rather than as a claim, to avoid funder-side overclaim before community alignment.

## Cross-references

- Money Framework: `wiki/finance/act-money-framework.md`
- Money thesis rebuttal (refund range, CGT concession, IPP JV note): `wiki/finance/act-money-thesis-rebuttal.md`
- Path C plan: `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`
- ACT entity migration checklist: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- Yesterday's session handoff (added voice grader + R&D rubric to weekly cron): `thoughts/shared/handoffs/2026-05-07-end-of-day.md`
- R&D rubric (this pack is graded against): `thoughts/shared/rubrics/rd-evidence-pack.md`
- R&D rubric calibration fixtures: `thoughts/shared/rubrics/fixtures/rd-evidence/`

## Pack contents

```
thoughts/shared/rd-pack-fy26/
├── README.md                                  ← this file (executive summary + gating items)
├── act-gd-rd-activity-register.md             ← symlink → wiki/projects/goods/rd-activity-register.md
├── act-el-rd-activity-register.md             ← symlink → wiki/projects/empathy-ledger/rd-activity-register.md
└── act-cg-rd-activity-register.md             ← symlink → wiki/projects/civicgraph/rd-activity-register.md
```

The symlink pattern keeps the wiki version canonical for working drafts and the pack version stable for audit. They are the same file.
