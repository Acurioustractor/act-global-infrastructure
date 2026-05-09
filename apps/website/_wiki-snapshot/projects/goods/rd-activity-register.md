---
project: ACT-GD
project_name: Goods on Country
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
claim_total_aud: 188250
category: core
ausindustry_registration: pending_jul_2026
status: in_progress
last_updated: 2026-05-07
---

# ACT-GD core activity 1: Buyer-supplier matching and demand-side procurement infrastructure

## Executive summary

Goods on Country (ACT-GD) is the demand-side procurement infrastructure for First Nations enterprise. The R&D-eligible work in FY26 is the buyer-supplier matching layer plus the Demand Register schema plus the Procurement Analyst agent (A1) — three coupled components that together attempt to lift first-order conversion above the manual-pairing baseline of ~12%.

Total claim FY26: ~$188,250 (Nic Marchesi 25% × $200K director salary = $50,000 R&D-eligible + Ben Knight 10% × $250K Knight Photography invoicing × 95% R&D = $23,750 R&D-eligible + algorithm engineering contractor $42,000 + cloud + LLM consumption $72,500 — figures preliminary, subject to Standard Ledger reconciliation per `wiki/finance/money-framework-decision-log-2026-04-15.md` Decision 4 Option A).
Expected refund at 43.5% offset: ~$81,889.
Lead: Nic Marchesi.
Provenance sidecar: `wiki/projects/goods/rd-activity-register.md.provenance.md` (TBD).

## Hypothesis

A multi-criteria scoring algorithm combining:
- geographic proximity,
- supplier delivery-ceiling profile (inferred from invoice history + capability self-report + observed fulfilment),
- buyer spend velocity,
- Indigenous Procurement Policy (IPP) compliance signal,

will produce buyer-supplier matches with ≥40% first-order conversion rate against the manual-pairing baseline of ~12%, with on-time delivery within 5 percentage points of baseline.

## Technical uncertainty

Existing supplier-buyer matching products (Supply Nation directory, GovERP, ATO Indigenous Business Directory) treat the problem as a static directory query. Literature on procurement matching (e.g. Tomlinson & Page 2022 on dynamic procurement networks; Indigenous Business Council technical notes on IPP compliance) does not address dynamic delivery-ceiling profiling under sparse-history conditions.

The unresolved technical questions:

a) Can a delivery-ceiling profile be inferred from invoice history + capability self-reports + observed fulfilment, with sufficient accuracy to drive automated buyer assignment without false-positive risk to fulfilment?

b) Standard collaborative filtering fails because most suppliers have <5 historical orders. What does a hybrid (rules + LLM-proposed inference + human review at low-confidence threshold) pipeline look like, and what's the right confidence threshold for human review?

c) Can the same pipeline carry IPP compliance signal (registered Indigenous business, percentage Indigenous ownership, etc.) without that signal becoming a checkbox interface that buyers gam to satisfy reporting requirements without actually shifting spend?

## Experiment design

- **Variables**: weight tuple `(w_geo, w_ceiling, w_velocity, w_policy)` in the matching score; LLM-confidence threshold for human review; size of the "ambiguous" buffer that goes to A1 the Procurement Analyst.
- **Controls**: manual-pair baseline cohort of 30 buyer-supplier introductions (continuing from FY24-25 manual practice).
- **Treatment**: algorithm-driven cohort of buyer-supplier introductions over FY26 H1, with A1 agent (Procurement Analyst) proposing the top 3 weekly buyer touches each Monday after the reconciliation cron.
- **Success criteria**:
  - ≥40% first-order conversion within 90 days of introduction (vs ~12% baseline).
  - ≥80% on-time delivery for first orders.
  - A1's top-3 weekly proposals accepted by Ben/Nic at ≥60% rate (validates the LLM pre-rank).
  - Demand Register pipeline retains ≥80% of CivicGraph-generated community demand signals (per `migrate-goods-demand-signals.mjs`) without manual re-entry.
- **Data capture**: GHL Goods pipeline (Buyer + Demand Register), Xero invoice settlement, supplier survey at 60-day mark, A1 agent run logs (Sonnet tier, ≤$0.04 per Monday run).
- **Analysis window**: FY26 Q1-Q2 (Jul-Dec 2025) for first complete cohort.

## Expected outcome (in progress)

Pre-experiment estimate (dated 2026-04-XX around the time A1 was scaffolded in commit 5610fe3 "feat(goods): A1+A2 agent stubs + May CEO letter"):

- Algorithm cohort: 40-50% first-order conversion vs 10-15% manual baseline.
- On-time delivery similar between cohorts (~75%) since fulfilment depends on supplier capacity, not match quality.
- A1 top-3 acceptance rate ≥60%.
- Demand Register migration (`migrate-goods-demand-signals.mjs`) retains 100% of CivicGraph-generated demand signals matching the pattern `COMMUNITY — Goods Demand $XK`.

## Actual outcome (interim, as of 2026-05-07)

Measured so far (interim, partial):

- Demand Register pipeline created in GHL (per `thoughts/shared/drafts/ghl-pipeline-setup-instructions.md`) with stage "Signal".
- `scripts/migrate-goods-demand-signals.mjs` exists, dry-run mode tested. Idempotent migration logic is in place.
- A1 Procurement Analyst agent stub committed (5610fe3); data-fetch layer is real; prompt composition exercises runtime; production deployment scheduled May Week 1 (per stub header comment) — pending PM2 registration.
- A2 second agent stub committed in same commit.
- Goods CRM upgrade (commit 0db21ce): pipeline kanban UI + Xero↔GHL reconciler now live; production-ready after live-run fixes (commit b6ca767).
- Funder matcher + reconciler fix + opp drawer (commit 52c9f8b) live.
- Pipeline panel deduplication on `/finance/projects/[code]` (yesterday's session 2026-05-07): 97 → 27 unique opportunities on ACT-GD, $138.9M → $1.46M weighted, probabilities now correct. This is a measurement infrastructure improvement, not a buyer-supplier match itself.

What's not yet measured:

- First-order conversion rate against the manual baseline. The algorithm is partially built; the baseline cohort exists but the treatment cohort has not yet been run.
- A1 top-3 acceptance rate. A1 has not yet entered production use.
- Demand Register retention rate of CivicGraph signals. The migration script is ready but has not yet been run in production (only dry-run).
- On-time delivery for either cohort.

## Linked supporting activities

- ACT-GD-S1: Demand Register schema design + GHL pipeline construction.
- ACT-GD-S2: A1 Procurement Analyst agent stub + data-fetch layer (`scripts/agents/agent-procurement-analyst.mjs`).
- ACT-GD-S3: A2 second agent stub (commit 5610fe3).
- ACT-GD-S4: Goods CRM kanban UI + Xero↔GHL reconciler (commits 0db21ce, b6ca767, 52c9f8b).
- ACT-GD-S5: Pipeline measurement infrastructure (dedup + weighted-pipeline correctness on `/finance/projects/[code]`, 2026-05-07 session).
- ACT-GD-S6: Receipt automation for invoice ingestion (cross-references ACT-EL S5/S6 — the automation layer is shared).

## Evidence trail

- This register: commit TBD on first commit.
- A1+A2 agent stubs: commit 5610fe3 "feat(goods): A1+A2 agent stubs + May CEO letter + Centrecorp forensics".
- Goods CRM kanban UI: commit 0db21ce "feat(goods): CRM upgrade — pipeline kanban UI + Xero↔GHL reconciler".
- Production-ready fix: commit b6ca767 "fix(goods-crm): make seed + migrate production-ready after live run".
- Funder matcher + opp drawer: commit 52c9f8b "feat(goods): Option A — funder matcher + reconciler fix + opp drawer".
- Pipeline dedup work: commit 119f479 (yesterday) — see `thoughts/shared/handoffs/2026-05-07-end-of-day.md` for full detail.
- DB-side dedupe of `grant_opportunities`: 9,474 rows removed; partial unique index `grant_opportunities_source_name_uniq` added.
- Linked invoices for cohort-cost tracking: `xero_invoices` filtered by `project_code = 'ACT-GD'` — 154 bills, $247,837 total, FY26.
- Receipt coverage attestation: **PASS — 99.5% by value on ACT-GD bills FY26** per `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` (DB queried 2026-05-07).
- Minderoo Goods pitch (the funder-facing artefact this work supports): `thoughts/shared/writing/drafts/goods-minderoo-pitch/`. Voice grade WARN/85 as of 2026-05-07.

## Salary allocation

| Staff | Project code | Period | % of personnel cost | Personnel basis | R&D-eligible | Evidence |
|-------|--------------|--------|---------------------|------------------|--------------|----------|
| Nicholas Marchesi | ACT-GD | 2025-07-01 to 2026-06-30 | 25% of $200K director salary characterisation | $200,000 | $50,000 | Money Framework decision log 2026-04-15 Decision 3 |
| Benjamin Knight | ACT-GD | 2025-07-01 to 2026-06-30 | 10% of $250K Knight Photography invoicing × 95% R&D | $250,000 | $23,750 | Money Framework decision log 2026-04-15 Decisions 1, 2 (thesis line 64 project-mix) |
| Algorithm engineering contractor | ACT-GD | 2025-07-01 to 2026-06-30 | — | — | $42,000 | Xero invoices tagged ACT-GD — 154 bills, $247,837, 99.5% receipt coverage by value FY26 (DB attestation 2026-05-07; full attestation in `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md`) |
| Cloud infrastructure + LLM consumption | ACT-GD | 2025-07-01 to 2026-06-30 | — | — | $72,500 | Xero invoices tagged ACT-GD — 154 bills, $247,837, 99.5% receipt coverage by value FY26 (DB attestation 2026-05-07; full attestation in `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md`) |

**Org-wide R&D reconciliation note**: Nic's total FY26 R&D allocation is 40% × $200K director salary characterisation = $80,000 R&D-eligible (Money Framework decision log 2026-04-15 Decision 1, citing thesis line 91). Decision 3 splits this as ACT-GD 25% / ACT-EL 15%, summing to 40%. Ben's total FY26 R&D allocation is 95% × $250K Knight Photography invoicing = $237,500 R&D-eligible (Decision 1, thesis line 72). Decision 2 splits this per the thesis project-mix at line 64: ACT-IN 60% / ACT-EL 10% / ACT-JH 10% / ACT-GD 10% / ACT-DO 5% / ACT-CORE 5%. ACT-GD therefore takes 10% × $250K × 95% = $23,750 of Ben's R&D-eligible. Decision log: `wiki/finance/money-framework-decision-log-2026-04-15.md`.

## AusIndustry components confirmation

All four components for this core activity are present in this register:
- Hypothesis (above)
- Technical uncertainty (above)
- Experiment design (above)
- Expected vs actual outcome (above — actual is `in_progress`, will close out before Jul 2026 lodgement window)

AusIndustry registration: pending. Target window Jul 2026 – 30 Apr 2027 per `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`.

## Open items before lodgement

1. Run A1 Procurement Analyst in production for at least 8 Mondays. Capture top-3 acceptance rate.
2. Execute the Demand Register migration in production. Capture retention rate.
3. Run the first algorithm-driven cohort of buyer-supplier introductions and capture 90-day first-order conversion + on-time delivery numbers.
4. Run the manual-baseline cohort in parallel for paired comparison.
5. Tag historical Xero invoices with `project_code = 'ACT-GD'` for receipt-coverage attestation.
6. Write the provenance sidecar.
7. Confirm IPP compliance phrasing with First Australians Capital and Supply Nation contacts before lodgement (avoid funder-side overclaim).
