---
title: Civic World Model
status: Active
source_of_truth: wiki/concepts/soul.md
reframed_by: wiki/decisions/2026-05-25-civic-cerebellum-reframe.md
note: This page was rewritten on 2026-05-25 to drop earlier "replacement for top-down hierarchy" framing (too close to civic-CEO positioning the reframe ADR rejects). Stats and Block's four architectural principles are preserved. Framing verbs are shifted from "replace" to "sense, illuminate, feed."
---

# Civic World Model

> The intelligence sensorium of the [[civic-operating-system|Civic Operating System]]. CivicGraph maps entities, capital flows, and social outcomes so practitioners, communities, journalists, and funders can act with situational awareness. It does not replace the humans in the system; it gives them the field of view they have been missing.

> This concept sits downstream of [[soul|Soul]]. If anything in this page contradicts soul, soul is right. It was rewritten on 2026-05-25 per [[../decisions/2026-05-25-civic-cerebellum-reframe|the Civic Cerebellum Reframe ADR]].

## Origin

Inspired by Block's "[From Hierarchy to Intelligence](https://block.xyz/inside/from-hierarchy-to-intelligence)" thesis, which describes the shift from routing information through slow human middle-layers to coordinating through deterministic, machine-readable models of an organisation's state.

CivicGraph applies the same idea to the social sector. Capital flows, contracts, donations, board interlocks, grant decisions, and procurement awards are scattered across dozens of government data systems and made legible only through delayed, narrative-shaped annual reports. CivicGraph reads those systems directly and makes the underlying state of civic Australia visible to the people who need to see it: community organisations, place-based collaboratives, journalists, researchers, ethically-minded funders, and government departments who want their own sector held to honest mirrors.

The point is not to replace human judgment in grant-making or policy. The point is to make sure the humans doing that work are not flying blind.

## Four Architectural Principles (from Block)

### 1. The Honest Signal

Block treats transaction data as the most honest signal. In social impact, the dominant signals are subjective grant applications and marketing-shaped annual reports. CivicGraph redefines the honest signal by tracking actual money flows (procurement, donations, grants) cross-referenced with [[alma|Australian Living Map of Alternatives (ALMA)]]-governed evidence records.

Honest does not mean complete. Every CivicGraph chart, brief, or atlas ships with a methodology page that names what the signal measures, what it does not measure, and how to cite or challenge it. Honesty about limits is part of the signal.

### 2. Humans at the Frontline, AI at the Reflex Layer

Block's principle is "humans at the edge" — meaning the people doing the actual work in communities, not the administrative middle layers. CivicGraph reads the same way: the human work stays where it always was, with community leaders running diversion programs, storytellers contributing to Empathy Ledger, designers of Goods on Country, caseworkers in [[justicehub|JusticeHub]] Practice. CivicGraph removes the administrative drag of finding the right grants, mapping the right partners, evidencing the right outcomes, so that human time goes to relationships, judgment, and the work AI should never do.

This is the [[civic-reflex-automation|Civic Reflex Automation]] thesis applied to intelligence: the reflex work (sensing, mapping, linking) gets automated; the human work (deciding, relating, judging) stays human.

### 3. Capabilities vs. Interfaces

CivicGraph is the underlying **capability and intelligence layer**: the atomic data primitive of the civic OS. [[justicehub|JusticeHub]], [[empathy-ledger|Empathy Ledger]], journalist explorers, foundation deep-dive briefs, and government dashboards are **interfaces** that surface this civic intelligence to different audiences.

The same dataset feeds many surfaces. The Funding Deserts Atlas is one surface. The Revolving Door Explorer is another. A foundation deep-dive brief is a third. The Open API ([[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|FY27 ops plan]] §7.3) is the fourth, letting researchers, journalists, and partner organisations build their own.

### 4. A Machine-Readable State of the Civic Sector

Block's principle: a machine-readable model of an organisation's operations, priorities, and roadblocks in real time. CivicGraph applies this to the public benefit sector: 566,522 entities connected by 1,536,626 relationships across 254 tables and 29.5M records, refreshed on a published cadence, queryable by anyone with an API key.

The model is descriptive, not prescriptive. It tells you what is, not what should be. What should be is a question for humans, communities, and democratic processes. CivicGraph informs that conversation; it does not arbitrate it.

## CivicGraph Platform Stats (Live)

| Domain | Tables | Records |
|---|---|---|
| Registries | 9 | 23.5M |
| Entity Graph | 9 | 3.4M |
| Procurement | 12 | 1.1M |
| People & Governance | 4 | 357K |
| Influence & Accountability | 10 | 340K |
| Funding & Grants | 25 | 248K |
| Social & Disability | 14 | 479K |
| Evidence & Outcomes | 35 | 127K |
| **Total** | **254** | **29.5M** |

## Entity Linkage

The ABN (Australian Business Number) is the universal join key. 559K+ entities resolved from 8 government data systems using ABN matching and normalised name fuzzy-matching.

Key linkage rates:
- Justice Funding: **86%** (146K records)
- Federal Contracts: **85%** (791K records)
- Foundations: **100%** (10.8K records)
- Political Donations: **59%** (313K records)
- ALMA-governed intervention records: **56%** (1.4K records)

## Data Coverage Gaps

Honest about what is missing:
- NSW, VIC, WA, SA, TAS, NT, and ACT lack org-level funding data. Only Queensland publishes granular per-recipient grants. Every CivicGraph state-comparison artifact names this limit.
- 94,162 funding records remain unclassified by topic. Topic tagging continues incrementally; the unclassified pool is shrinking but visible.
- 873 LGAs identified as funding deserts in the current materialised view; the methodology page for the Funding Deserts Atlas explains how the score is computed and what it does not capture.

## Role within the Civic Operating System

CivicGraph is the **intelligence layer** of the [[civic-operating-system|Civic Operating System]], per [[../decisions/2026-05-25-civic-cerebellum-reframe|the Reframe ADR]] (2026-05-25). The other two layers are [[justicehub|JusticeHub]] (practice) and [[empathy-ledger|Empathy Ledger]] (accountability).

How CivicGraph connects to the other two:

- Every public CivicGraph artifact writes provenance events to **Empathy Ledger's accountability API**. This is how CivicGraph claims become traceable.
- **JusticeHub Practice fetches opportunities, grants, and funder intelligence** from CivicGraph when partner organisations are doing live practice work. JusticeHub does not reinvent intelligence; it consumes it.
- CivicGraph's public-good artifacts (Funding Deserts Atlas, Revolving Door Explorer, State of Civic Money) **publish openly regardless of who pays for commissioned work**. This is the public-good non-negotiable rule from the reframe ADR.

## What This Page Used to Say

For honest record-keeping: an earlier version of this page (pre-2026-05-25) framed CivicGraph as "a replacement for the archaic, top-down hierarchy of traditional grant-making and policy-creation" and described the work as "replacing the middle management of the state and philanthropy." That framing was retired by the [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Cerebellum Reframe ADR]] as too close to the agentic-CEO positioning ACT explicitly rejects. The retired framing is preserved in git history.

CivicGraph does not replace civic institutions or the humans inside them. It gives those humans, and the communities they serve, a field of view they did not previously have. The difference matters.

## Backlinks

- [[civic-operating-system|Civic Operating System]] — the architecture this layer sits inside
- [[civic-reflex-automation|Civic Reflex Automation]] — the thesis this layer expresses for intelligence
- [[third-reality|The Third Reality]] — the methodology this model enables
- [[civicgraph|CivicGraph]] — the platform itself
- [[funding-transparency|Funding Transparency]] — the public-money legibility problem this architecture is designed to surface
- [[acco-sector-analysis|ACCO Sector Analysis]] — one of the audiences the model serves
- [[ai-ethics|AI Ethics]] — the principles that constrain how CivicGraph data is used
- [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Cerebellum Reframe ADR]] — the decision that established this layer's role in the civic OS
