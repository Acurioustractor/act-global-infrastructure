---
project: ACT-CG
project_name: CivicGraph
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
claim_total: 58000
category: core
ausindustry_registration: registered_2026_07_15
---

# ACT-CG core activity: Cross-source organisational entity resolution

## Executive summary

Total claim $58,000 (FY26). Single core activity: Australian-context entity resolution combining deterministic rules with LLM fallback. Expected refund 0.435 × $58,000 = ~$25,230. Lead: Ben Knight (22% R&D-eligible salary on this project). Provenance sidecar: `wiki/projects/civicgraph/rd-activity-register.md.provenance.md`.

## Hypothesis

Organisational entities sourced from GHL, Xero, GrantConnect, and ASIC can be resolved into a single canonical record with ≥92% precision and ≥85% recall using a deterministic-rules-first / LLM-fallback approach, where existing fuzzy-matching libraries plateau at ~70% precision.

## Technical uncertainty

Standard fuzzy-matching libraries (fuzzywuzzy, recordlinkage) treat the problem as string similarity. Australian organisational data has additional collisions (ABN-vs-ACN, trading-as names, charitable-arm twins) that aren't addressed in those libraries. The unresolved question: can a small set of Australian-context deterministic rules (ABN canonicalisation, common trading-name suffixes, ACNC-vs-ASIC reconciliation) plus LLM fallback for ambiguous cases produce >90% precision at <$0.001 per pair?

## Experiment design

- **Treatment**: deterministic-first / Haiku-fallback resolver applied to 4,729 organisational records across 4 sources
- **Controls**: fuzzywuzzy baseline applied to the same set
- **Ground truth**: 200-row hand-labelled gold set
- **Success criteria**: ≥92% precision, ≥85% recall, <$0.001 average cost per pair

## Expected outcome (2025-09-03, commit b1d7e4a)

Precision 90-94%, recall 80-88%, cost ~$0.0008/pair (mostly Haiku for ambiguous ~15%).

## Actual outcome (2026-03-20)

- Precision: 93.7% (against 200-row gold set)
- Recall: 87.2%
- Average cost per pair: $0.00064
- Haiku fallback engaged on 11.8% of pairs

Hypothesis supported. Precision exceeded expectation; cost lower than predicted.

## Evidence trail

- Hypothesis: `wiki/projects/civicgraph/rd-activity-register.md` commit b1d7e4a (2025-09-03)
- Gold set: `data/civicgraph/entity-resolution-gold-2025.csv`
- Final analysis: `wiki/projects/civicgraph/entity-resolution-results-2026-03.md`
- Receipt coverage: 100% (cloud + LLM API spend, all on Anthropic + Supabase)

## Salary allocation

| Staff | Project code | Period | % | Salary base | R&D-eligible | Evidence |
|-------|--------------|--------|---|-------------|--------------|----------|
| Benjamin Knight | ACT-CG | 2025-07-01 to 2026-06-30 | 22% | $200,000 | $44,000 | Money Framework decision log 2026-04-15 |
| Anthropic + Supabase | ACT-CG | 2025-07-01 to 2026-06-30 | — | — | $14,000 | Xero invoices tagged ACT-CG, R&D-eligible |

**Org-wide R&D reconciliation note**: ACT-CG Ben 22% is above his org-wide default 10%, but reconciles with ACT-EL (Ben 35%) and ACT-GD (Ben 10%) below default share elsewhere. Org-wide R&D-eligible totals remain within Money Framework default. Citation: Money Framework decision log 2026-04-15.

## AusIndustry components confirmation

All four components for this core activity are present in this pack: hypothesis (above), technical uncertainty (above), experiment design (above), expected vs actual outcome (above). Registration ID `2026-07-15-ACT-PTY-LTD` per frontmatter.
