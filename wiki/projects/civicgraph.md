# CivicGraph

> 587,390 entities connected by 1,535,772 relationships across 254 tables and 29.5M records. Making government spending, influence, and outcomes visible.

**Status:** Active | **Code:** ACT-CS | **Tier:** Satellite (CivicScope)

## What It Is

CivicGraph is ACT's civic transparency platform. It connects public data to make government spending, influence, and outcomes visible. Every claim is traceable to data.

It is the **systemic data layer** of [[third-reality|The Third Reality]] and the practical implementation of the [[civic-world-model|Civic World Model]].

## Scale (April 2026)

| Metric | Count |
|--------|-------|
| Entities | 587,390 |
| Relationships | 1,535,772 |
| Government contracts | 796,701 |
| Annual contract value | $74 billion |
| Donations tracked | 301,803 |
| Grants indexed | 30,724 |
| Foundations profiled | 10,837 |
| Charities cataloged | 359,678 |
| Integrated data sources | 21 |

### Database Domain Breakdown

| Domain | Tables | Records |
|--------|--------|---------|
| Registries | 9 | 23.5M |
| Entity Graph | 9 | 3.4M |
| Procurement | 12 | 1.1M |
| Social & Disability | 14 | 479K |
| People & Governance | 4 | 357K |
| Influence & Accountability | 10 | 340K |
| Funding & Grants | 25 | 248K |
| Evidence & Outcomes | 35 | 127K |
| Geography | 7 | 34K |
| Content & Knowledge | 48 | 30K |
| Finance & Ops | 39 | 23K |
| Platform & Ops | 22 | 20K |

## How It Connects

**Universal join key:** Australian Business Number (ABN)
**Resolution method:** ABN matching + normalized name fuzzy-matching against ASIC + ACNC registers
**Topic classification:** Database triggers auto-classify into 9 domains via deterministic keyword matching (auditable, no ML)

### Entity Linkage Rates

- Justice Funding: 86% (125K of 146K records linked)
- Federal Contracts: 85% (791K records)
- Foundations: 100% (10.8K records)
- Political Donations: 59% (313K records)
- ALMA Interventions: 56% (1.4K records)

### Cross-System Influence

2,696 entities appear in 3+ government systems — cross-system presence reveals influence concentration (who gets contracts AND donates AND receives justice funding).

## Open Data Sources

All from public government sources — no proprietary data, fully reproducible:
- AusTender (federal contracts)
- AEC (political donations)
- ACNC (charities)
- ATO (tax transparency)
- ROGS (government outcomes reporting)
- AIHW (health and welfare)
- State grant portals (QLD most granular)
- Parliamentary Hansard
- Lobbying registers

## Key Findings (Auto-Generated from Live Data)

1. 873 LGAs identified as **funding deserts** (high disadvantage + low per-capita funding)
2. Only QLD has granular org-level grant data — all other states have aggregate budget lines only
3. 94,162 funding records still unclassified by topic
4. 9 topic domains tracked across 38 state-topic combinations

## Topics Tracked

child-protection, community-led, diversion, family-services, indigenous, legal-services, ndis, prevention, youth-justice

## CivicScope Vision

CivicGraph evolves into **CivicScope** — the ability to not just map data but actively surface insights:

- **Active accountability:** Continuous monitoring, not just point-in-time reporting
- **Funding desert detection:** Algorithmic identification of underserved communities
- **Evidence-to-funding matching:** Which programs work → which programs get funded → gap analysis
- **Third Reality assessments:** Systemic data + Empathy Ledger stories = verified impact reports
- **Capital routing:** Impact-Weighted Quadratic Funding via Allo Protocol integration

## Products

| Product | Status | Description |
|---------|--------|-------------|
| Procurement Intelligence | Available | Government contract tracking and analysis |
| Allocation Intelligence | Available | Grants and funding allocation insights |
| Governed Proof | Coming soon | Verified impact reporting and certification |

**Domain:** civicgraph.app (also accessible at grantscope.vercel.app)

## Business Model Potential

| Revenue Stream | Description |
|---------------|-------------|
| Data-as-a-Service | API access to entity graph and funding data |
| Third Reality Certification | Other NGOs/government submit data for impact scoring |
| Subscription Analytics | Dashboards for policymakers, philanthropy, media |
| Enterprise Procurement Intelligence | Supply chain transparency for social enterprises |
| Catalytic Capital Routing | ImpactQF matching fund distribution |

## Backlinks

- [[third-reality|The Third Reality]] — the methodology
- [[civic-world-model|Civic World Model]] — the architectural vision
- [[justicehub|JusticeHub]] — the evidence layer
- [[empathy-ledger|Empathy Ledger]] — the narrative layer
- [[acco-sector-analysis|ACCO Sector Analysis]] — who it serves
