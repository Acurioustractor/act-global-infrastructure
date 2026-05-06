---
project: ACT-FY26-RD-PACK
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
status: assembling
last_updated: 2026-05-07
target_lodgement: 2027-04-30
---

# R&D Tax Incentive evidence pack — FY25-26

> **Status: assembling.** This directory grows weekly toward the FY25-26 R&DTI Path C lodgement. Target window: Jul 2026 to 30 Apr 2027.
> **Registrant**: A Curious Tractor Pty Ltd (ACN 697 347 676). Sole trader period (FY24-25) is forfeited per the Path C decision logged 2026-04-27.
> **Refund**: 43.5% offset. Realistic estimate $180–220K (per `wiki/finance/act-money-thesis-rebuttal.md`).

## Planned core activities (one register per project as wiki grows)

- **ACT-GD — Goods on Country**: Buyer-supplier matching algorithm, Demand Register schema, Procurement Analyst agent. See `wiki/projects/goods/rd-activity-register.md` (when written).
- **ACT-EL — Empathy Ledger**: OCAP-respecting consent capture, event-sourced ledger schema, audit-trail tooling. See `wiki/projects/empathy-ledger/rd-activity-register.md` (when written).
- **ACT-CG — CivicGraph**: Cross-source organisational entity resolution (deterministic + LLM-fallback), 4,729 records across 4 sources. See `wiki/projects/civicgraph/rd-activity-register.md` (when written).
- **ACT-OO — Oonchiumpa**: TBD (technical components to be defined with Kristy + Tanya).

## How this pack is graded

Weekly: `node scripts/grade-pack.mjs --rubric thoughts/shared/rubrics/rd-evidence-pack.md --pack thoughts/shared/rd-pack-fy26/`

Weekly grade output is included in the Monday weekly-reconciliation Telegram message under "R&D pack readiness".

## Calibration anchors

For comparison, calibrated good-pass examples are in `thoughts/shared/rubrics/fixtures/rd-evidence/`. Use those as templates when writing per-project activity registers.

## Salary allocation (org-wide)

| Staff | Default org-wide R&D % | Source |
|-------|------------------------|--------|
| Nicholas Marchesi | 25% of $200K = $50,000 | Money Framework decision log 2026-04-15 |
| Benjamin Knight | 10% of $200K = $20,000 | Money Framework decision log 2026-04-15 |

Per-project allocations may deviate as long as org-wide totals reconcile.

## What's missing right now (this is a placeholder pack)

- Per-project activity registers (4 expected, 0 written)
- AusIndustry registration confirmation file or ID
- Provenance sidecars for vendor/cost lines
- Salary allocation tabular sheet (full)
- Receipt coverage attestation per project
