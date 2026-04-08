# Power Dynamics in Australian Philanthropy

> A data-driven audit of money concentration, donor-contractor overlaps, and structural information asymmetries in Australian civil society (March 2026).

## Overview

[[civicgraph|CivicGraph]] has assembled approximately 4.2 million records across 40+ database tables — creating what is likely the most comprehensive cross-referenced map of Australian money, power, and organisations built by a non-government entity. This article documents what that data reveals about structural power dynamics.

The verdict from the data: the platform is roughly **75% built** toward a complete Australian power map. The entity layer (who exists) is comprehensive. The money flow layer (who pays whom) is substantially built. The **person layer** (who controls what) and **community voice layer** (what communities actually need) remain the critical gaps.

---

## The Donor-Contractor Overlap

The flagship finding from cross-referencing political donations against government procurement:

- **140 entities** simultaneously donate to political parties AND hold government contracts
- **$80M** in total political donations from these entities
- **$4.7B** in government contracts held by these same entities
- **58x** dollar return per dollar donated (correlation, not causation — but the pattern is structural)
- **28 political parties** receive donations from entities that also contract with government
- Both major parties benefit — this is bipartisan, not partisan

This cross-reference is derived from matching `political_donations` → `donor_entity_matches` → `austender_contracts` by ABN. No other Australian platform can currently surface this relationship.

---

## Charity Sector: Enormous and Invisible

From ACNC data (64,473 registered charities, 7 years of financials):

- **$249 billion** combined annual revenue
- **$545 billion** combined assets
- **$2.99 billion** in grants distributed by foundations
- **94% of charitable donations go to 10% of organisations**

The charity sector is larger than many ASX-listed companies combined, yet no unified dashboard existed before CivicGraph. It operates largely invisible to public scrutiny.

---

## Foundation Giving: Concentrated and Opaque

From 10,779 foundations profiled (30% AI-enriched):

- 2,472 active funding programs mapped
- A single entity — **Minderoo Foundation Group** — reported **$4.9 billion** in donations in 2023, representing roughly **25% of the entire sector's donation revenue** that year
- The top 10 philanthropic families control foundations with combined annual giving exceeding **$1 billion**
- Their focus areas reflect **private preferences, not democratic priorities**

Australia's **2,196 private ancillary funds (PAFs)** distributed **$799 million** in 2022–23. The **1,445 public ancillary funds (PubAFs)** distributed another **$487 million**. Combined: **$1.287 billion** through structured grantmaking.

### Where structured philanthropy goes:

| Category | Combined distributions | Share |
|----------|----------------------:|------:|
| Welfare and rights | $431M | 33.5% |
| Multi-purpose | $270M | 21.0% |
| Cultural organisations | $127M | 9.9% |
| Health | $111M | 8.6% |
| Research | $55M | 4.3% |
| Environment | $54M | 4.2% |
| Education | $49M | 3.8% |
| International affairs | $15M | 1.1% |

Environment and international affairs — areas of existential urgency — receive less than **5.3% combined** of structured philanthropic distributions.

---

## Government Procurement: Who Gets the Money

From AusTender (670,303 contracts — full OCDS history from 2013):

- **87.5%** of federal procurement value goes to **10 entities**
- SMEs win 52% of contracts by number but only **35% by value**
- Government consulting spend: ~$1B in 2024–25
- Post-PwC spending shifted to other consulting firms, not reduced
- Cross-referenced with ACNC: shows which charities hold government contracts

---

## Tax Subsidies and Inequity

- **82% of the tax benefit** from charitable deductions accrues to the **top income decile**
- **71%** goes to individuals donating more than **$1 million** in a single year
- The public subsidy for giving: estimated at **$2.26 billion** in foregone revenue (2022–23)
- The share of taxpayers claiming any deductible donation has **fallen from 35.1% to 27.8%** over the past decade — fewer Australians giving through formal channels even as total dollars rise

### Geographic distortion in giving:

| State | Average claim | Median claim | Total claimed |
|-------|-------------:|------------:|--------------:|
| WA | $11,534 | $120 | $5.49B |
| NSW | $1,063 | $170 | $1.49B |
| VIC | $968 | $130 | $1.21B |
| QLD | $660 | $120 | $0.55B |
| SA | $656 | $120 | $0.18B |
| NT | $509 | $120 | $0.02B |

WA's average is ten times higher than Queensland's — but the **median** in WA is just $120. A tiny number of mining-wealth mega-donations make the state appear extraordinarily generous while typical donor experience is nearly identical everywhere.

---

## Indigenous Self-Governance Infrastructure

From ORIC corporations data (7,369 records, 3,366 active):

- **41%** (1,389) are also registered as ACNC charities
- Distribution: QLD (854), WA (809), NSW (694), NT (663), SA (144), VIC (131)
- By size: 281 Large, 804 Medium, 2,281 Small
- AI enrichment identifies specific language groups, traditional country, and community roles
- **Gap**: No procurement data showing what percentage of government contracts go to Indigenous businesses

---

## The Five Power Layers: Completion Assessment

### Layer 1: Entity Registry — 90% Complete

Who exists: 100K+ entities across charities, companies, foundations, Indigenous corps, social enterprises. Critical gap: no directors/officers (ASIC data is paid, ~$23/entity).

### Layer 2: Money Flows — 80% Complete

- Federal procurement: done (670,303 contracts)
- Political donations: done (312,933 records)
- Foundation grants: done (18,069 opportunities)
- ATO tax data: done (26,241 records)
- Justice funding: done (52,133 records)
- **Missing**: State procurement (NSW, QLD, VIC, WA, SA), GrantConnect awards

### Layer 3: Tax and Revenue — 70% Complete

Large taxpayer data done. Company financials (ASIC) and superannuation flows remain unavailable or paywalled.

### Layer 4: Person Layer — 10% Complete

**The most underbuilt layer relative to its importance.** The interlocking-directorate angle — people who sit on charity boards AND donate to political parties AND direct companies with government contracts — is the investigative goldmine. The schema supports it; the data pipelines don't exist yet.

- `gs_entities` supports `person` type — 0 person records exist
- `gs_relationships` supports `directorship` type — 0 directorship records exist
- ACNC bulk CSV does NOT include responsible person names (only count)
- Cross-referencing charity directors with political donors requires getting ACNC responsible person names first

### Layer 5: Community Voice — 5% Complete

**This is the layer that makes CivicGraph different from every other transparency platform.** Everyone else stops at showing where money goes. The thesis: you also need to show whether money matched what communities actually need.

Current state: place pages show money and demographics only. Zero Empathy Ledger integration, zero community stories, zero community-defined outcomes data.

---

## What the Data Can't Yet Address

1. **Informal power** — board dinners, golf club networks, school ties, family connections
2. **International money flows** — Australian entities with offshore structures, foreign-owned companies, international foundation grants
3. **Media ownership and influence** — not tracked in any current dataset
4. **Lobbying effectiveness** — the register shows who lobbies, not what they achieve
5. **Beneficial ownership** — the register goes live ~2027, currently unavailable

---

## The Structural Case for Transparency

When the data is fragmented, those with resources to navigate the complexity (large foundations, corporate advisors, government agencies) have information advantages over those who need funding most (small community organisations, First Nations groups, regional services).

A critical accounting reality: philanthropic flows are counted multiple times across different systems. A donation appears in a tax return, then in the PAF's accounts, then in the recipient charity's revenue, then in that charity's program expenditure. There is **no single official "total philanthropy" figure** in Australia that avoids double-counting. This isn't just a measurement problem — it's a power problem.

---

## Sources

- Raw: `wiki/raw/2026-04-07-gs-power-dynamics.md`
- Raw: `wiki/raw/2026-04-07-gs-why.md`

## Backlinks

- [[civicgraph|CivicGraph]] — the platform that generated this analysis
- [[funding-transparency|Funding Transparency]] — the case for making this data public
- [[civic-world-model|Civic World Model]] — the architectural vision
