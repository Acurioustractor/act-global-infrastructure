---
title: ACT Money Framework — Decision Log 2026-04-15 (R&D Salary Allocations)
status: Draft
date: 2026-04-15
type: decision_log
last_updated: 2026-05-07
audience: Ben, Nic, Standard Ledger, R&D consultant
canonical_sources:
  - wiki/finance/act-money-framework.md
  - wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md
  - wiki/finance/act-money-thesis-rebuttal.md
tags:
  - r-and-d
  - money-framework
  - decision-log
  - salary-allocation
---

# ACT Money Framework — Decision Log 2026-04-15

> **Purpose**: Canonical record of decisions taken on 15 April 2026 about FY25-26 R&D-eligible founder personnel cost allocations and the per-project split. Cited by every R&D activity register in `thoughts/shared/rd-pack-fy26/`. Supersedes all earlier per-project allocation guesses.

> **Status**: DRAFT. The total founder R&D allocation percentages (Ben 95%, Nic 40%) are documented in `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md` and reconcile to the Money Framework. The per-project split below is a working hypothesis pending Standard Ledger sign-off and Ben + Nic confirmation against time-tracking and commit-log evidence.

## Decision 1 — Founder R&D allocation totals

| Founder | FY26 R&D allocation (total) | FY26 R&D-eligible personnel cost | Source |
|---------|------------------------------|------------------------------------|--------|
| Ben Knight | **95%** of FY26 personnel cost | $237,500 (95% × $250,000 Knight Photography invoicing) | `founder-pay-and-rd-thesis-fy26-fy27.md` line 72; commit log + calendar evidence |
| Nicholas Marchesi | **40%** of FY26 personnel cost | $80,000 (40% × $200,000 retrospective director-salary characterisation) | `founder-pay-and-rd-thesis-fy26-fy27.md` line 91 |

**Total founder R&D personnel cost (FY26)**: $317,500.
**Founder R&D refund component** (43.5% of $317,500): $138,113.

## Decision 2 — Ben's FY26 project-mix (per Knight Photography invoicing schedule)

Ben's $250,000 Knight Photography invoicing is split across project codes per the thesis line 64:

| Code | Project | % of invoice | Revenue ($) | R&D-eligible at 95% ($) |
|------|---------|--------------|-------------|-------------------------|
| ACT-IN | Intelligence / agent system / ALMA / governed proof / platform infra | 60% | $150,000 | $142,500 |
| ACT-EL | Empathy Ledger | 10% | $25,000 | $23,750 |
| ACT-JH | JusticeHub | 10% | $25,000 | $23,750 |
| ACT-GD | Goods on Country | 10% | $25,000 | $23,750 |
| ACT-DO | Doing (operations / dashboards) | 5% | $12,500 | $11,875 |
| ACT-CORE | Cross-project core | 5% | $12,500 | $11,875 |
| **Total** | | **100%** | **$250,000** | **$237,500** |

**Note on code reconciliation**: The R&D pack at `thoughts/shared/rd-pack-fy26/` uses `ACT-CG` (CivicGraph) as the project code for the entity-resolution work. This sits within the broader `ACT-IN` (Intelligence) category in the founder-pay thesis. The CivicGraph activity register is therefore one core activity within the ACT-IN spend bucket, not a separate spend bucket. The activity register's claim figure (~$58K) is the dollar value attributable to the entity-resolution core activity specifically; the rest of ACT-IN spend ($150K Ben + $284K tagged R&D infra ≈ $434K) is allocated to other ACT-IN core activities not yet split out.

## Decision 3 — Nic's FY26 project-mix

Nic's R&D allocation per thesis line 91 is 40% of $200,000 = $80,000 R&D-eligible. The 60/40 split is:

- **40% R&D**: strategy, JusticeHub, Empathy Ledger contributions, Goods relationships
- **60% operational**: community / Harvest / Farm / non-R&D

The per-project R&D split for Nic, as a working hypothesis pending sign-off, mirrors his time emphasis:

| Code | Project | % of $200K direct salary | $ direct salary | R&D % | R&D-eligible $ |
|------|---------|---------------------------|------------------|-------|----------------|
| ACT-GD | Goods on Country | 25% (lead) | $50,000 | 25% | $50,000 (= 25% × $200K via direct allocation) |
| ACT-EL | Empathy Ledger | 15% | $30,000 | 15% | $30,000 |
| ACT-JH | JusticeHub | 0% (Ben + the JH team lead this; Nic at strategy level) | — | — | — |
| **R&D total** | | **40%** | **$80,000** | | **$80,000** |
| Operational | | 60% | $120,000 | 0% | — |

**Note on Nic vs Ben representation**: For Ben, the 95% R&D applies to his Knight Photography invoice revenue ($250K). For Nic, the 40% R&D applies to the retrospectively-journaled director salary ($200K). The mechanisms are different per the thesis but the R&D claim is computed on the underlying personnel cost in both cases.

## Decision 4 — Per-project R&D activity register reconciliation

The three R&D activity registers in the pack at `thoughts/shared/rd-pack-fy26/` claim the following total amounts:

| Register | Claim ($) | Comprises |
|----------|-----------|-----------|
| ACT-CG (CivicGraph entity resolution) | $58,000 | Ben 22% × $200K + Anthropic/Supabase $14K |
| ACT-EL (Empathy Ledger consent + multi-tenancy) | $126,000 | Nic 15% × $200K + Ben 35% × $200K + SaaS/storage $26K |
| ACT-GD (Goods buyer-supplier matching) | $184,500 | Nic 25% × $200K + Ben 10% × $200K + contractor $42K + cloud/LLM $72.5K |
| **Sum across three registers** | **$368,500** | |

**Reconciliation status (as of 2026-05-07): Option A applied.**

Each activity register's salary table has been updated to match Decision 2's project-mix and Decision 3's split, on the correct personnel-cost bases:
- Ben Knight: $250K Knight Photography invoicing × 95% R&D allocation = $237,500 R&D-eligible (per Decision 1)
- Nicholas Marchesi: $200K retrospective director-salary characterisation × 40% R&D allocation = $80,000 R&D-eligible (per Decision 1)

**Per-project register R&D-eligible totals (post-update)**:

| Register | Ben portion | Nic portion | Vendor/SaaS | Total |
|----------|-------------|-------------|-------------|-------|
| ACT-CG | $47,500 (≈20% × $250K × 95%, subset of ACT-IN bucket) | — | $14,000 | $61,500 |
| ACT-EL | $23,750 (10% × $250K × 95%) | $30,000 (15% × $200K) | $26,000 | $79,750 |
| ACT-GD | $23,750 (10% × $250K × 95%) | $50,000 (25% × $200K) | $114,500 | $188,250 |
| **Sum across three registers** | **$95,000** | **$80,000** | **$154,500** | **$329,500** |

**Coverage of total R&D claim**: The three registers cover ~$329,500 of the ~$614K total R&D-eligible spend identified in the founder-pay thesis (~52%). The remaining ~$284K is largely ACT-IN core activities (agent system, ALMA, governed proof, platform infrastructure) not yet split into discrete activity registers, plus SaaS/API consumption attributable to those activities. These will be added to the pack as additional core activity registers before the lodgement window closes (30 Apr 2027).

**Open reconciliation item**: Ben's portion of ACT-CG (~$47,500) is an estimate of what fraction of the ACT-IN bucket (60% × $250K × 95% = $142,500) is attributable specifically to the entity-resolution work. The remaining ~$95K of Ben's ACT-IN time covers other R&D activities not yet split out. Standard Ledger to confirm the appropriate split before lodgement.

## Decision 5 — Aggregated turnover and refundable threshold

Per `wiki/finance/act-money-framework.md` line 50, the R&D refundable threshold is aggregated turnover < $20M. ACT Pty Ltd is well under this threshold for FY26. Decision: claim is refundable, not non-refundable. Refund rate 43.5%.

## Decision 6 — Salary basis at cutover

Per `wiki/finance/act-money-framework.md` line 81, post-cutover (1 Jul 2026 onwards) the founder salary basis is $10K/mo PAYG = $120K/yr each. Pre-cutover (FY25-26 / sole-trader period) the founder personnel costs are characterised differently:

- Ben: Knight Photography invoicing ($250K total)
- Nic: retrospective director-salary characterisation ($200K of the $238K net drawings)

The activity registers' use of $200K as a placeholder salary base does NOT correspond to either the Knight Photography invoicing total ($250K) or the post-cutover PAYG basis ($120K/yr). It was used as a calibration-fixture placeholder. Decision: at lodgement, the registers' R&D-eligible amounts must be re-applied to the correct basis per Decisions 1, 2, and 3.

## Decision 7 — Path C registrant

Per the R&DTI Path C decision logged 2026-04-27 (separate decision log), the registrant is **A Curious Tractor Pty Ltd** (ACN 697 347 676). Sole-trader period FY24-25 forfeited.

## Decision 8 — Lodgement target

Window: Jul 2026 – 30 Apr 2027.

## Open questions for Standard Ledger

1. Confirm Option A vs Option B (per Decision 4).
2. Confirm the fair-market figure for Nic's director salary characterisation — thesis says $200K, but this is conservative against the $238K net drawings. If $238K is fair-market, the R&D eligible figure shifts to $238K × 40% = $95,200.
3. Confirm Ben's Knight Photography GST registration timing (backdated to 1 July 2025 if Standard Ledger advises, per thesis line 70).
4. Confirm the ACT-IN code is acceptable as the parent category for CivicGraph + agent system + platform infra, or whether each should be split into discrete project codes for the R&D registration.

## Provenance

This decision log was drafted 2026-05-07 by collating:
- The Money Framework canonical doc (`wiki/finance/act-money-framework.md`)
- The Founder Pay & R&D Thesis (`wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md`)
- The Money Thesis Rebuttal (`wiki/finance/act-money-thesis-rebuttal.md`)
- The R&DTI Path C plan (`thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`)

The 2026-04-15 date in the title corresponds to the Money Framework's signing date; the actual content of this log was assembled 2026-05-07 in preparation for the FY26 R&D pack lodgement window. Ben + Nic + Standard Ledger should counter-sign on or before 30 Jun 2026 (cutover).
