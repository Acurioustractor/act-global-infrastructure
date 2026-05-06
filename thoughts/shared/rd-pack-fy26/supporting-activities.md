---
project: ACT-FY26-RD-PACK
fy: FY26
entity: act-pty-ltd
last_updated: 2026-05-07
purpose: Catalogue of supporting activities linked to each core activity in the FY25-26 R&D pack. Each row identifies the supporting activity, the core activity it supports, the dollar amount (or "subsumed in core") attributed, the period of activity, and the direct-linkage evidence (commit hash, file, or audit log path).
---

# Supporting activities — FY25-26 R&D pack

> Per the AusIndustry guidance on R&DTI eligibility, supporting activities must directly relate to a registered core activity (s 355-30 ITAA 1997). This file makes the linkage explicit so an external reviewer can cross-check each supporting activity against its parent core activity in <60 seconds.

## ACT-CG — supporting activities (parent core: cross-source organisational entity resolution)

| ID | Supporting activity | Period | Dollar amount | Direct linkage to core |
|----|---------------------|--------|---------------|------------------------|
| ACT-CG-S1 | Tier 1.5 ACNC API discovery — locating undocumented private endpoints `/api/dynamics/search/charity` and `/api/dynamics/entity/<uuid>` that bypass the privacy-scrubbed bulk export. | 2026-04 | subsumed in core $47,500 personnel | Without S1 the resolver has no contact-data to resolve against; the bulk ACNC export is privacy-scrubbed by design. Commit: cbc67fe (2026-04-20). |
| ACT-CG-S2 | Tier 2 website-scrape contact extraction (`scripts/enrich-contacts-from-website.mjs`) with regex + AU-specific phone normalisation. | 2026-04 | subsumed in core | Provides supplementary contact data for orgs not in ACNC. Commit: c910fad (2026-04-20). |
| ACT-CG-S3 | Tier 3 agent-research enrichment (`scripts/enrich-contacts-via-agent.mjs`) — brief-emit + ingest pattern. | 2026-04 | subsumed in core (Anthropic SaaS line $14,000) | Implements the LLM-fallback portion of the core resolver hypothesis. |
| ACT-CG-S4 | gs_entities 3-pass DQ sweep (`scripts/gs-entities-data-quality-sweep.mjs`). | 2026-04 | subsumed in core | Cleans the 8,826-row input set down to 4,729 production rows. Without S4 the 46% pollution rate dominates resolver evaluation. Commit: f8d5f0c (2026-04-20). |

## ACT-EL — supporting activities (parent core: OCAP-respecting consent capture and multi-tenant story ledger)

| ID | Supporting activity | Period | Dollar amount | Direct linkage to core |
|----|---------------------|--------|---------------|------------------------|
| ACT-EL-S1 | EL v2 multi-tenant schema migration (projects table upgrade; `organization_id` populated; tier JSONB added). | 2026-04 | subsumed in core $53,750 personnel | Implements the cross-org gallery sub-hypothesis. Verified DB state 2026-04-06. |
| ACT-EL-S2 | Cross-org photo manager. | 2026-04 | subsumed in core | Enables ecosystem-key (`act_project_code`) resolution across org boundaries. Commit: ddbc9d3c on `el-v2-projects-alignment` branch. |
| ACT-EL-S3 | Hide-empty-projects client-side toggle. | 2026-04 | subsumed in core | UX signal that complements the multi-tenancy schema by suppressing org-scoped queries that return empty sets. |
| ACT-EL-S4 | Wiki living library pipeline + OCAP governance. | 2026-04 | subsumed in core | Implements the verbal-consent-as-audit-trail mechanism for the wiki surface. Commit: e3a0728 (2026-04-18). |
| ACT-EL-S5 | Consent-in-action dashboard. | 2026-04 | subsumed in core | Demonstrates the consent provenance to a third-party reviewer (success-criterion adjacent). Commit: 4fff285 (2026-04-20). |
| ACT-EL-S6 | Live-consent placeholder replacement. | 2026-04 | subsumed in core | Bridges the consent-capture spec to live EL v2 data. Commit: 4856e13 (2026-04-20). |

## ACT-GD — supporting activities (parent core: buyer-supplier matching and demand-side procurement infrastructure)

| ID | Supporting activity | Period | Dollar amount | Direct linkage to core |
|----|---------------------|--------|---------------|------------------------|
| ACT-GD-S1 | Demand Register schema design + GHL pipeline construction (stage "Signal" + migration script `scripts/migrate-goods-demand-signals.mjs`). | 2026-04 | subsumed in core $73,750 personnel | Implements the data-capture mechanism for the matching algorithm's input side. |
| ACT-GD-S2 | A1 Procurement Analyst agent stub + data-fetch layer (`scripts/agents/agent-procurement-analyst.mjs`). | 2026-04 | subsumed in core | Implements the LLM-fallback portion of the matching pipeline (top-3 weekly buyer touches). Commit: 5610fe3 (2026-04-24). |
| ACT-GD-S3 | A2 second agent stub. | 2026-04 | subsumed in core | Companion to A1 in the agent fan-out design. Commit: 5610fe3 (2026-04-24). |
| ACT-GD-S4 | Goods CRM kanban UI + Xero↔GHL reconciler. | 2026-04 | subsumed in core | Provides the operational measurement infrastructure for the experiment (cohort tracking, conversion measurement). Commits: 0db21ce, b6ca767, 52c9f8b (2026-04-24). |
| ACT-GD-S5 | Pipeline measurement infrastructure — dedup + weighted-pipeline correctness on `/finance/projects/[code]`. | 2026-05-07 | subsumed in core | Without correct pipeline measurement the experiment cannot evaluate its own conversion data. Commit: 119f479 (2026-05-07). |
| ACT-GD-S6 | Receipt automation for invoice ingestion (cross-references ACT-EL S5/S6). | shared FY26 | shared with ACT-EL | Enables the cohort-cost tracking element of the experiment. |

## Supporting:core ratio assessment

The rubric flagged 3.2 (Reasonable proportion — supporting:core ratio unverifiable) as a warning because no expenditure was assigned to supporting activities separately from core. This is by design: the supporting activities above are "subsumed in core" because they are the engineering effort that *produces* the core activity. The personnel cost on the core activity register IS the cost of doing the supporting activities. There is no double-counting; the personnel time covers both the core hypothesis-and-experiment-design framing and the supporting engineering that implements it.

For external review purposes, the dollar attribution is:

| Project | Core personnel | SaaS / vendor | Supporting (engineering effort, subsumed) | Total claim |
|---------|----------------|---------------|--------------------------------------------|-------------|
| ACT-CG | $47,500 | $14,000 | included in $47,500 | $61,500 |
| ACT-EL | $53,750 ($23,750 Ben + $30,000 Nic) | $26,000 | included in $53,750 | $79,750 |
| ACT-GD | $73,750 ($23,750 Ben + $50,000 Nic) | $114,500 | included in $73,750 | $188,250 |

The supporting engineering effort (S1 through S6 per project) is the *content* of the personnel cost; it is not an additional line item.
