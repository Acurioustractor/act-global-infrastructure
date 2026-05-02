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
- ALMA-governed intervention records: 56% (1.4K records)

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

## The Problem It Solves

Australia's charitable sector reported **$222 billion** in total revenue in 2023. **$107 billion** came from government. **672,000+ federal contracts** flow through AusTender. **$312 million+** moves through political donations. **$8.86 billion** in grants were distributed by charities in 2023 alone.

Yet no single system connects them. A government procurement officer cannot easily check whether a supplier also donates to the party in power. A program manager cannot see which postcodes are most underserved. A community organisation in regional Queensland cannot answer: **who funds what, where, and does it work?**

The data exists — scattered across AusTender, ACNC returns, AEC disclosures, ATO statistics, state grant portals, and foundation annual reports — but was never assembled into a coherent decision layer. See [[funding-transparency|Funding Transparency]] for the structural case.

ACT's [[community-capital|Community Capital]] retreat is the relational complement to this data layer. CivicGraph makes capital flows legible; Community Capital creates the room where new funder-community matches can actually happen.

One of the clearest current ACT uses of this intelligence layer is [[goods-on-country|Goods on Country]], where procurement and capital discovery are used to identify plausible buyers, community demand, and funder fit rather than leaving that work to manual relationship memory.

## The $107B Transparency Gap

Key structural findings from the data:

- **82% of the tax benefit** from charitable deductions accrues to the **top income decile**. The public subsidy for giving — estimated at **$2.26 billion** in foregone revenue (2022–23) — disproportionately benefits those already economically advantaged.
- A single entity (Minderoo Foundation Group) reported **$4.9 billion** in donations in 2023, representing ~25% of the entire sector's donation revenue.
- **140 entities** simultaneously donate to political parties AND hold government contracts — they donated $80M and received $4.7B in contracts (a 58x correlation, not causation).
- **94% of charitable donations go to 10% of organisations.**
- Geographic distortion is extreme: WA's average donation claim is $11,534 vs Queensland's $660 — driven by a tiny number of mining-wealth mega-donations masking near-identical typical donor behaviour across states.

See [[power-dynamics-philanthropy|Power Dynamics in Australian Philanthropy]] for the full data audit.

## Mission

> Build decision infrastructure for Australian government and social sector — connecting supplier intelligence, place-based funding data, and outcome evidence into the layer that helps institutions allocate better and helps communities access fairly.

**Know who to fund. Know who to contract. Know it worked.**

## Revenue Model (Detailed)

- **Free public layer** — search, place pages, entity pages, core evidence
- **Paid professional layer** — procurement intelligence, alerts, API, bulk exports, due diligence
- **5 tiers** — Community (free), Professional ($79), Organisation ($249), Funder ($499), Enterprise ($1,999)
- **Institutional licensing** — foundations, universities, ESG/compliance firms, anti-corruption bodies ($10K–$200K/yr)
- **Surplus distribution** — 40% infrastructure, 30% member patronage rebates, 20% community treasury (via ACT Foundation), 10% reserves

## Legal Structure

CivicGraph is structured as a **Distributing Co-operative (CNL QLD)** — genuinely member-owned, one member one vote, with patronage rebates to member orgs proportional to usage. This sits alongside:

- **ACT Foundation (CLG)** — holds charitable purpose, administers the 20% community grants allocation
- **ACT Ventures (Pty Ltd)** — provides operational services to the cooperative under contract

## The Four Truth Layers

1. **Raw record** — exactly what the source published (carries `source_dataset`, `source_url`)
2. **Resolved entity** — best canonical representation (`gs_id` format: `AU-ABN-12345678901`)
3. **Relationship** — donated to, contracted by, funded by, directs, operates in
4. **Community voice** — local priorities, lived experience, community-defined outcomes (integrated via [[empathy-ledger|Empathy Ledger]])

**The core insight:** formal money data + formal organisation data + community-defined reality. When linked, you get quantitative accountability + qualitative legitimacy.

## AI Use in the Platform

AI does six jobs — none involving fabricated certainty:

1. **Extraction** — turn PDFs and reports into structured records
2. **Entity resolution** — match names to ABNs, ACNs, ORIC entries, charity IDs
3. **Relationship inference** — suggest likely links between entities
4. **Gap analysis** — find where money is concentrated, absent, or misaligned with need
5. **Story synthesis** — plain-English briefings for places, orgs, or issues
6. **Community signal matching** — link formal spend patterns to what communities say they need

**The rule: AI proposes. Evidence proves. Communities interpret.**

Every AI output shows source, confidence, whether exact or inferred, and how to verify it.

## Indigenous Data Sovereignty

CivicGraph partners WITH Indigenous communities — it does not claim ownership of Indigenous data:

- ORIC and Supply Nation data is presented as those organisations publish it, without re-interpretation
- Indigenous corporations can claim their profile and control how community context is presented
- The community layer for Indigenous places is curated in partnership, not extracted unilaterally

## Sustainability Lesson

Every major transparency platform globally is financially fragile: OpenSecrets laid off a third of staff (Nov 2024), Sunlight Foundation closed (2020), 360Giving remains foundation-funded. CivicGraph must generate its own revenue from the data itself — foundations reprioritise, but procurement intelligence has persistent institutional demand.

## Public Voice

*How CivicGraph describes itself on its public website (civicgraph.app, captured 2026-04-07)*

### Core Tagline

> Decision Infrastructure for Government & Social Sector
> **Know Who to Fund. Know Who to Contract. Know It Worked.**

The SEO title is "CivicGraph - Infrastructure for Fairer Markets." The site leads with procurement — not transparency, not reform. This is deliberate B2G (business-to-government) positioning, different from the internal framing which emphasises the $107B transparency gap and community equity.

### The Problem Named Publicly

> $74 billion in government contracts awarded annually. Procurement officers make supplier decisions from spreadsheets. Nobody connects the contract to the community outcome.

This frames the customer as the procurement officer with a problem to solve — not the community missing out. The transparency/justice angle lives in the investigations section, not the hero copy.

### Flagship Investigation as Public Hook

> 1443 entities donated $3.8B to political parties and received $268.5B in government contracts. 70x return per dollar donated.

Notably: the internal wiki says "140 entities, $80M donated, $4.7B contracts, 58x." The public site numbers are much larger — appears to be expanded scope or wider date range.

### "Defend Decisions" as the Government Sell

The government page describes CivicGraph as:
> "Not a grant search engine. It's the decision layer that connects who gets funded, who gets contracted, and where services go — with the data to defend every allocation."

The "Defend Decisions" step in the workflow is a compliance/audit sell — the institutional trust-building mechanism that precedes any community benefit conversation.

### Divergence: Public vs Internal Framing

| Dimension | Internal Wiki | Public Website |
|-----------|--------------|----------------|
| Primary customer | Communities, social sector | Government procurement officers |
| Hero claim | "$107B transparency gap" | "$74B contracts on spreadsheets" |
| Core benefit | Equity, visibility, justice | Defensible decisions, audit trail |
| Legal structure | Distributing Co-operative | Not mentioned |
| Revenue model | 5 tiers + community treasury | Not mentioned |
| Update frequency | Implied | Explicitly "Updated daily" (trust signal) |

The public site omits the co-operative structure, community treasury, and mission-lock framing — likely intentional for the government buyer, but creates a gap between what ACT talks about internally and what a philanthropic funder researching CivicGraph from the outside would find.

The "Updated daily" trust signal is underused in internal comms and should appear in all funder pitches for CivicGraph.

## LCAA Phase

In the [[lcaa-method|LCAA Method]], CivicGraph is the **Curiosity** infrastructure of the ACT ecosystem — the systemic data layer that lets anyone interrogate the relationship between money, power, and outcomes in Australia's social sector. The wiki backlink already names it: *"CivicGraph is the Curiosity infrastructure layer inside the ACT ecosystem."*

LCAA arc for CivicGraph:
- **Listen** — community-defined outcomes and place-based priorities surfaced through the fourth truth layer (community voice, integrated via [[empathy-ledger|Empathy Ledger]]); Indigenous data sovereignty maintained by partnering with rather than appropriating ORIC, Supply Nation, and ACCO data
- **Curiosity** — 587K resolved entities, 1.5M relationships, $74B of contracts, 30K grants; cross-system queries that reveal who is funded AND donating AND contracting; funding-desert algorithms that surface communities the market can't see
- **Action** — Procurement Intelligence and Allocation Intelligence products live; Governed Proof certification coming; institutional licensing that funds the open public layer; member-owned distributing co-operative structure that returns surplus to communities
- **Art** — the *Aesthetics of Asymmetry* data-art campaign turning the data layer into a six-month public investigation; investigations like *"1443 entities donated $3.8B and received $268.5B"* that make the abstraction visceral

The rule that guards every output: AI proposes, evidence proves, communities interpret.

## Backlinks

- [[lcaa-method|LCAA Method]] — CivicGraph is the Curiosity infrastructure layer inside the ACT ecosystem
- [[third-reality|The Third Reality]] — the methodology
- [[civic-world-model|Civic World Model]] — the architectural vision
- [[justicehub|JusticeHub]] — the evidence layer
- [[empathy-ledger|Empathy Ledger]] — the narrative layer
- [[ocap-principles|OCAP Principles]] — governance baseline for any Indigenous community context appearing in CivicGraph’s community layer
- [[acco-sector-analysis|ACCO Sector Analysis]] — who it serves
- [[funding-transparency|Funding Transparency]] — the structural case for the platform
- [[community-capital|Community Capital]] — relational convening complement to CivicGraph's funding intelligence
- [[goods-on-country|Goods on Country]] — current procurement-intelligence use case through the Goods Workspace
- [[power-dynamics-philanthropy|Power Dynamics in Australian Philanthropy]] — the data audit behind the thesis
- [[2026-04-founder-lanes-and-top-two-bets|Founder Lanes and Top Two Bets]] — the founder decision that treats CivicGraph and JusticeHub as one flagship stack
- [[five-year-cashflow-model|Five-Year Cashflow Model]] — CivicGraph revenue assumptions in the five-year projection
- [[rdti-claim-strategy|R&D Tax Incentive Claim Strategy]] — CivicGraph development as eligible R&D activity
- [[grantscope|GrantScope (CivicGraph)]] — the technical implementation and codebase behind CivicGraph's data platform
- [[aesthetics-of-asymmetry|The Aesthetics of Asymmetry]] — 6-month data art campaign built on CivicGraph's public API; marketing, R&D evidence, and commercial-arm demand generator in one
