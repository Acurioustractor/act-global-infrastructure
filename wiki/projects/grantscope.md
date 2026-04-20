---
title: GrantScope (CivicGraph)
code: ACT-CS
subtitle: Decision infrastructure for Australian government and social sector
status: Active — Circle One technical reference for [[three-circles|The Three Circles]]
cluster: data-infrastructure
tier: foundational
canonical_review: thoughts/shared/handoffs/staying/grantscope-review.md
upstream_repo: /Users/benknight/Code/grantscope
---

# GrantScope (CivicGraph)

> *Decision infrastructure connecting supplier intelligence, place-based funding data, and outcome evidence.*
> *The agentic insight layer underneath JusticeHub. The Living Brain that makes [[three-circles|Circle One]] real.*

**Status:** Active, partly deployed | **Stack:** Next.js 15 · TypeScript · Tailwind 4 · Supabase Postgres · MCP server · vector embeddings | **Repo:** `/Users/benknight/Code/grantscope` (separate codebase from this wiki) | **Canonical review:** `thoughts/shared/handoffs/staying/grantscope-review.md` (2026-04-08, agent-verified)

## What it is

GrantScope (the codebase name) is **CivicGraph** (the public product name) — a shared data and agentic insight layer that connects every dataset and entity touching the Australian government and social sector. It is the **decision infrastructure** that helps institutions allocate better and communities access fairly. For [[three-circles|The Three Circles]] pitch, GrantScope is the technical reality of *Circle One — The Living Brain*: it is what already exists, what Minderoo would be funding the next layer of, and what the program theory leans on most heavily.

GrantScope holds the agentic + history layer beneath [[justicehub|JusticeHub]]. JusticeHub is the *youth-justice-facing* application; GrantScope is the *cross-sector data substrate and AI agent system* that powers it. They share a Supabase database and enrichment pipelines.

## Repo orientation

| Directory | What lives there |
|---|---|
| `/apps/web` | Next.js 15 frontend, the public CivicGraph application |
| `/data` | 71 source datasets — AIHW, ROGS, BOCSAR, Closing the Gap, AusTender, ACNC, ORIC, AEC, ATO, ASIC, ABR, foundations, grants, social enterprises, Hansard, more |
| `/scripts` | 320+ agentic tasks — scrapers, enrichers, bridgers, verifiers |
| `/migrations` | Schema for the shared Supabase Postgres database |
| `/mcp-server` | MCP (Model Context Protocol) server exposing 6 tools to AI agents |
| `/output` | Intelligence reports — PICC dashboard, philanthropy power briefs, founder intake PRDs |
| `/thoughts/outreach/` | Foundational narrative work including *the-cure-already-exists-v2.md* |

The shared Supabase database is the **same instance** as JusticeHub and Empathy Ledger — three projects, one substrate.

## Live data layer (verified 2026-04-08)

| Asset | Number | Notes |
|---|---:|---|
| **Entities resolved** | **100,036** | F1 match precision **94.1%**. Target 150K+. |
| **Relationships mapped** | **199,001** | Funding flows, board overlaps, political donations, ALMA links. Target 200K+. |
| **Geographic coverage** | **96% postcode · 96% remoteness · 95% LGA · 94% SEIFA** | Enables gap analysis showing where alternatives are systematically unfunded |
| **Justice funding rows** | **71,000** in `justice_funding` table | State, recipient, program, amount, year, announcement date — bridged to ALMA via `alma_intervention_id` |
| **AusTender contracts** | **770,000 rows** | Across all sectors; justice subset extractable via contract category |
| **Foundations** | **10,779 rows** | 30% enriched with descriptions; LLM enriching the remaining 7,500 |
| **JusticeHub orgs linked to CivicGraph** | **315 of 556 (57%)** | Bridge in progress; ABN fuzzy-matching enrichment running |
| **ALMA verified interventions** | **1,155** | The most comprehensive map of Australian youth justice alternatives in existence |

## Live youth-justice datasets

- **`rogs-youth-justice/youth-justice-2026.csv`** (2,444 rows) — AIHW Rules of Government Spending youth justice by state, jurisdiction, measure (detention vs community), age 10–17, rates per 10,000. Covers FY 2016–17 through 2024–25. Latest: **3,177 young people under supervision** (2024–25); detention rate **2.7/10,000**; community rate **9.4/10,000**.
- **`closing-the-gap/ctg-youth-justice.csv`** (815 rows) — Closing the Gap youth detention trajectory projections by state and Indigenous status through 2030–31. **Aboriginal/TSI projection: 24.6 / 10,000 by 2030–31** versus 11.9 for all youth.
- **`bocsar/nsw-lga-crime.xlsx`** — NSW Bureau of Crime Statistics LGA crime data; provides crime context for youth justice geography.
- **`prf-reports/`** (5 PDFs) — Maranguka (Bourke) annual report 2024 · JRI Youth Justice SA 2024 · HRLC annual report · NTCOSS annual report. *These are the anchor community organisations documented as PDFs; structured ingestion still pending for some.*

## Named programs in GrantScope's funding data

- **Oonchiumpa** (Alice Springs) — *95% diversion* (cited from Oonchiumpa's own programmatic reporting)
- **Palm Island Community Company** — **78% diversion · $29M annual turnover · 208 FTE**
- **Mountie Yarns** (Mt Druitt)
- **Young Offender Support Service** (QLD DCYJMA)
- **Operation Luna** (NT Police)

## International precedents in the data layer

| Model | Coverage | Status |
|---|---|---|
| **Diagrama (Spain)** | 13.6% recidivism · €31K/year cost · 5.64:1 cost-benefit ratio. Featured in `/thoughts/outreach/the-cure-already-exists-v2.md` (foundational piece). Appears in PICC dashboard as international partner. | **Narrative + numerical proof points; no schema** |
| **Halt (Holland)** | Referenced in narrative | Narrative only — not in structured data |
| **Norwegian restorative justice** | Mentioned as tour stop | Narrative only |
| **Portuguese diversion** | Mentioned as tour stop | Narrative only |
| **Canadian First Nations sentencing circles** | Mentioned as tour stop | Narrative only |
| **South African community courts** | Mentioned as tour stop | Narrative only |
| **Maranguka (Bourke)** | Annual report PDF (2024); marked as "In ALMA" in PICC dashboard | **PDF only — structured ingestion pending** |
| **Whole System Approach (Scotland)** | Not found in GrantScope | **Gap** |

The international tour data is currently **narrative-only**. Structuring it into the schema is a **Year 1 deliverable** of [[three-circles|Three Circles]] Circle One.

## Live agentic infrastructure

### MCP server — `civicgraph-mcp`

**Live, deployed.** Exposes **6 tools** to any AI agent that connects:

| Tool | What it does |
|---|---|
| `civicgraph_search` | Full-text + vector search across all 100K+ entities |
| `civicgraph_entity` | Returns full profile + power scores for any entity |
| `civicgraph_power_index` | Cross-system rankings (funding + governance + influence) |
| `civicgraph_funding_deserts` | Surfaces underserved LGAs by sector |
| `civicgraph_revolving_door` | Cross-references lobbying, donations, and contracts |
| `civicgraph_ask` | Natural language interface across all datasets |

This is the **strongest concrete proof** of Circle One — the Living Brain — being real. It is what magistrates, funders, journalists, and communities will eventually query directly. It is operational *today*.

### Hansard scraper

**Live for Queensland**, expanding to other jurisdictions. Scrapes Parliamentary Hansard PDFs from the sitting calendar, filters speeches for justice-relevant keywords (*youth justice, detention, Indigenous, funding, reform*), and ingests them tagged by relevance. This is what makes "every Hansard mention" in the Three Circles pitch real, not aspirational.

### Bridge: JusticeHub ↔ CivicGraph

`bridge-justice-to-graph.mjs` links JusticeHub organisations to CivicGraph entities via ABN fuzzy matching. **315 of 556 matched (57%)** at last count; 241 still to bridge. Closing this gap is one of the **Year 1 hardening deliverables** under Circle One.

### ALMA enrichment pipeline

`enrich-alma-orgs.mjs` and the `link-alma-*.mjs` family enrich ALMA intervention records with CivicGraph entity data — ABN, location, sector, SEIFA, remoteness, revenue. Cascades organisation enrichment backward to interventions. **Live, running.**

### Output reports

Generated weekly by the agent layer to `/output/`:
- `picc-comprehensive-dashboard.md` — $38.9M tracked PICC funding, BAU program map, Station Precinct innovation brief
- `civicgraph-founder-intake-prd.md` — product positioning, data layer documentation
- 15+ philanthropy power briefs — foundation giving profiles, openness scores, geographic focus matched to local orgs

## Why GrantScope matters for Three Circles

GrantScope is what makes Circle One *more than a wishlist*. Without it, the Three Circles pitch would be claiming a queryable national intelligence layer that doesn't exist yet. With it, the pitch is funding the *next layer* on top of an operational system.

**Specifically, GrantScope provides for the pitch:**

1. **The verified data backbone** — 100K entities, 199K relationships, 71K justice funding rows, 1,155 ALMA interventions. These numbers replace the inflated earlier claims.
2. **The live agentic interface** — 6 MCP tools, Hansard scraper, ALMA enrichment, organisation bridging. Proof that Circle One is operational *today*, not vapourware.
3. **The geographic precision** — 96% postcode coverage means a funder can ask "where are the alternatives systematically unfunded by remoteness category" and get an answer in seconds.
4. **The international precedent numbers** — Diagrama, especially. 13.6% recidivism, 5.64:1 cost-benefit, €31K/year vs $1.33M.
5. **The PICC dashboard** — $38.9M of tracked funding, 208 FTE, 78% diversion. The strongest concrete community proof point in the entire pitch.

## Gaps to close before pitching Three Circles

These are the things a sophisticated funder will press on:

1. **JusticeHub ↔ CivicGraph bridge at 57%** — 241 orgs still unmatched. Funder query *"which community-led orgs work on youth diversion in QLD"* may not return Oonchiumpa if the join is incomplete. **Y1 hardening priority.**
2. **Frameworks Institute / Andrea Davidson integration is zero** in GrantScope. Scoped as a **Year 1 deliverable**, not a precondition.
3. **International tour data is narrative-only.** Norway / Portugal / SA / Canada need at least a thin schema before Year 1 — a few weeks of structured work.
4. **Maranguka is PDF only** — needs structured ingestion. Maranguka is one of the strongest community-led precedents in Australia and not having it in the data layer is a real weakness.
5. **Empathy Ledger has 9 live storytellers** (target 226). Either reframe in pitch language or commit to a number we can hit by pitch date.
6. **Foundation enrichment 30% complete** — 7,500 foundations still awaiting LLM descriptions.
7. **ASIC director linkage not yet ingested** — 2.2M companies awaiting selective extraction.
8. **Supply Nation Indigenous business verification** — pending API integration (7,822 → 10K+ target).

## Numbers retired from earlier JusticeHub pitch claims

The earlier JusticeHub Minderoo pitch cited some numbers that **could not be verified** in the GrantScope data layer. These are retired in the canonical [[three-circles|Three Circles]] page:

| Earlier claim | Verified replacement |
|---|---|
| "1,081 verified youth justice programs" | **1,155 ALMA verified interventions** |
| "587,000 entities" | **100,036 entities resolved** (target 150K+) |
| "1.5 million relationships" | **199,001 relationships mapped** (target 200K+) |
| "$114.9B tracked across 35 sources" | **71K rows of justice funding · $1B+ in justice spending mapped · 14 government and philanthropic source categories** |
| "38+ stories published" (Empathy Ledger) | **Empathy Ledger v2 platform live with story sovereignty model; 9 storytellers onboarded, scaling to 226** |
| "1,000+ ALMA interventions" | **1,155** (verified, slightly more than originally claimed) |

See [[three-circles#Data verification status|Three Circles → Data verification status]] for the full reconciliation.

## How GrantScope connects to the rest of ACT

- [[three-circles|The Three Circles]] — GrantScope IS Circle One; the canonical 3-year, $2.9M Minderoo pitch funds the next layer of work on top of GrantScope's existing data substrate
- [[justicehub|JusticeHub]] — the youth-justice-facing application that sits on top of GrantScope's shared Supabase
- Empathy Ledger — the third application sharing the Supabase substrate; provides the story sovereignty layer
- [[civicgraph|CivicGraph]] — the public product brand for GrantScope's data layer (codebase name = GrantScope, public name = CivicGraph)
- Diagrama — the international precedent numbers (13.6% recidivism, 5.64:1 cost-benefit) live in GrantScope narrative + PICC dashboard
- Oonchiumpa — anchor community whose 95% diversion proof point lives in the data layer
- Palm Island Community Company — the strongest community proof point in GrantScope; full dashboard at `/output/picc-comprehensive-dashboard.md`

## LCAA Phase

In the [[lcaa-method|LCAA Method]], GrantScope is the technical implementation of [[civicgraph|CivicGraph]] and therefore the codebase that carries the **Curiosity** infrastructure of the ACT ecosystem — the queryable national intelligence layer that makes Circle One of [[three-circles|The Three Circles]] real today rather than aspirational.

LCAA arc for GrantScope:
- **Listen** — community-defined priorities surface through the JusticeHub bridge (315 of 556 orgs linked, scaling) and through Empathy Ledger's story sovereignty layer on the same Supabase substrate; PICC, Oonchiumpa, and Maranguka are anchored as named community proof points in the data
- **Curiosity** — 100K resolved entities, 199K relationships, 71K justice-funding rows, 1,155 ALMA verified interventions, 770K AusTender contracts; six MCP tools (search, entity, power index, funding deserts, revolving door, natural-language ask) that any AI agent can query
- **Action** — live MCP server, live Hansard scraper (QLD, expanding), live ALMA enrichment pipeline, live JusticeHub ↔ CivicGraph bridge, weekly intelligence reports landing in `/output/` (PICC dashboard, founder intake PRDs, philanthropy power briefs)
- **Art** — the public CivicGraph product brand and the *Aesthetics of Asymmetry* campaign that turns the data layer into a public investigation; the agentic interface that lets magistrates, funders, and journalists query the system in plain language

GrantScope is also the ledger of what the Three Circles pitch can and cannot defensibly claim; the gaps it documents (international tour data, Maranguka structuring, foundation enrichment, ASIC linkage) are the Year 1 hardening priorities, not unknowns.

## Backlinks

- [[three-circles|The Three Circles]] — GrantScope is Circle One technical reference
- [[justicehub|JusticeHub]] — youth-justice-facing application on shared Supabase
- [[civicgraph|CivicGraph]] — public product brand
- `thoughts/shared/handoffs/staying/grantscope-review.md` — the agent-verified canonical review of what's actually in the repo
