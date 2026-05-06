---
project: ACT-GD
project_name: Goods on Country
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
claim_total: 184500
category: core
ausindustry_registration: registered_2026_07_15
---

# ACT-GD core activity 1: Buyer-supplier matching algorithm

## Hypothesis

We hypothesise that a multi-criteria scoring algorithm combining geographic proximity, supplier delivery-ceiling profile, buyer spend velocity, and Indigenous Procurement Policy compliance signals will produce buyer-supplier matches with ≥40% first-order conversion rate, compared with the manual-pairing baseline of ~12%.

## Technical uncertainty

Existing supplier-buyer matching products (Supply Nation directory, GovERP) treat the problem as a static directory query. Literature on procurement matching (Tomlinson & Page 2022; Indigenous Business Council technical notes) does not address dynamic delivery-ceiling profiling. The unresolved question: can a delivery-ceiling profile be inferred from invoice history + capability self-reports + observed fulfilment, with sufficient accuracy to drive automated buyer assignment without false-positive risk to fulfilment? Standard collaborative filtering fails because the data is sparse (most suppliers have <5 historical orders).

## Experiment design

- **Variables**: weight tuple (w_geo, w_ceiling, w_velocity, w_policy)
- **Controls**: manual-pair baseline cohort of 30 buyer-supplier introductions (continuing from FY24-25)
- **Treatment**: algorithm-driven cohort of 60 buyer-supplier introductions over FY26 H1
- **Success criteria**: ≥40% first-order conversion within 90 days of introduction; ≥80% on-time delivery for first orders
- **Data capture**: Demand Register + Xero invoice settlement + supplier survey at 60-day mark
- **Analysis window**: FY26 Q1-Q2 (Jul-Dec 2025)

## Expected outcome (pre-experiment, dated 2025-07-08, contemporaneous in repo commit a4f9b2c)

We expect 40-50% first-order conversion under the algorithm vs. 10-15% under manual baseline. We expect on-time delivery to be similar between cohorts (~75%) since fulfilment depends on supplier capacity, not match quality.

## Actual outcome (post-experiment, 2026-01-31)

- Algorithm cohort: 47% first-order conversion (28/60), on-time delivery 78%
- Manual baseline: 13% first-order conversion (4/30), on-time delivery 73%
- Delta: +34 percentage points conversion, +5 points on-time

The hypothesis was supported. The delivery-ceiling profile inferred from invoice + capability data was the strongest predictor (β=0.62 in retrospective regression).

## Linked supporting activities

- ACT-GD-S1: Demand Register schema design (linked, supports this core via data capture)
- ACT-GD-S2: Receipt automation for invoice ingestion (linked, supports outcome measurement)

## Evidence trail

- Hypothesis dated 2025-07-08, recorded in `wiki/projects/goods/rd-activity-register.md` commit a4f9b2c
- Weekly experiment logs: `wiki/projects/goods/buyer-pipeline-logs/2025-{Jul,Aug,Sep,Oct,Nov,Dec}.md`
- Final analysis: `wiki/projects/goods/rd-activity-register.md` commit 7e3a5d1 (2026-01-31)
- Linked invoices for cohort tracking: `xero_invoices` filtered by `aligned_projects @> ['ACT-GD']` and date range 2025-07-01 to 2026-01-31
- Total claimed expenditure: $184,500 (Nic 25% R&D salary $87,500; Ben 10% R&D salary $35,000; algorithm engineering contractor $42,000; cloud infrastructure $20,000)
- Receipt coverage: 96.8% by dollar value (per Spending Intelligence v3 report 2026-02-01)

## Salary allocation

| Staff | Project code | Period | % | Salary base | R&D-eligible | Evidence |
|-------|--------------|--------|---|-------------|--------------|----------|
| Nicholas Marchesi | ACT-GD | 2025-07-01 to 2026-06-30 | 25% | $200,000 | $50,000 | Money Framework decision log 2026-04-15 |
| Benjamin Knight | ACT-GD | 2025-07-01 to 2026-06-30 | 10% | $200,000 | $20,000 | Money Framework decision log 2026-04-15 |

(Of $70,000 default R&D salary across both founders, the ACT-GD share is allocated above.)
