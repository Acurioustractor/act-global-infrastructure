# JusticeHub

> Evidence-based justice alternatives — proving what works, routing capital to what heals.

**Status:** Active | **Code:** ACT-JH | **Tier:** Ecosystem

## What It Is

JusticeHub is ACT's evidence platform for justice alternatives. It catalogs community-led programs, tracks their outcomes, and provides the fiduciary evidence needed to divert funds from detention to healing.

It is the **evidence layer** of [[third-reality|The Third Reality]].

## Scale (April 2026)

- **1,000+** verified alternative models mapped
- **430** models with evidence data
- **$94.6B** in funding tracked
- **98,418** organizations mapped
- **85%** recidivism rate for youth detention
- Indigenous young people face **24x** higher incarceration rates

## The Economic Case

| Approach | Annual Cost per Child | Success Rate |
|----------|--------------------|-------------|
| Youth detention | $1.3M/year ($3,634.90/day national average) | 15% (85% recidivism) |
| Community-led alternatives | ~$14,000 | 97x cheaper |

This isn't just better for communities — it's better economics. Community models are 97x cheaper than detention, and every dollar diverted creates compounding savings.

## Three Pathways

| Audience | Entry Point | Tool |
|---------|-------------|------|
| Youth | "I need help" | Youth Scout |
| Organizations | ALMA Network | Directory + evidence tools |
| Policymakers | Evidence dashboards | Cost Calculator, System Map, Impact Dashboard |

## Key Features

- **ALMA AI Chat** — conversational interface to the evidence base
- **Cost Calculator** — real-time cost comparison of detention vs community alternatives
- **System Map** — visual mapping of the justice ecosystem
- **Impact Dashboard** — outcome data across programs
- **Learning Trips** — international study visits (e.g. Spain Diagrama model)

## Funding Need

JusticeHub needs **$500K** to scale nationally.

## ALMA (Australian Living Map of Alternatives)

The "what works" layer sitting on top of funding data:
- Evidence-based interventions mapped by topic and geography
- 9 topic domains: child-protection, community-led, diversion, family-services, indigenous, legal-services, ndis, prevention, youth-justice
- Cross-referenced with CivicGraph entity graph (56% linkage rate)

## Local Proof Points

### BG Fit (Mount Isa)
- Reduced youth police contact from average of 5 incidents to less than 1
- Community-led physical activity and mentoring program

### Oonchiumpa (Alice Springs)
- 95% reduction in anti-social behavior
- Place-based Indigenous-led program

### Confit Pathways (Sydney)
- 60% reduction in recidivism
- Diversionary program with wraparound support

## Capital Routing Vision

### Impact-Weighted Quadratic Funding (ImpactQF)
- Integrating Gitcoin's open-source Allo Protocol for programmable capital allocation
- Matching funds distributed based on verified community outcomes, not popularity
- ALMA AI scores projects → capital follows evidence

### Hypercerts
- Semi-fungible tokens recording verified social outcomes
- Persistent, interoperable digital records of impactful work
- Any funder or government treasury can audit

### Catalytic Capital Framing
Following [[global-precedents|East African precedents]], JusticeHub funding is positioned as "catalytic capital" — high-leverage investment unlocking massive downstream savings.

## Connection to CivicGraph

JusticeHub evidence sits within the broader CivicGraph data model:
- `justice_funding` table: 145,242 records (86% linked to entities)
- `alma_interventions`: 1,357 records (56% linked)
- `crime_stats_lga`: 57,435 records
- `outcomes_metrics`: 8,962 records across all states
- `rogs_justice_spending`: 8,873 records

## Identity & Brand

### Purpose
JusticeHub exists to centre lived experience in youth justice reform. The platform connects research, evidence, and service directories to the people who actually know what works — communities, practitioners, and young people themselves. It is not a case management tool. It is infrastructure that communities can own, adapt, and use to advocate for alternatives to detention.

### Philosophy

| Principle | How It Shows Up |
|-----------|----------------|
| **Community authority comes first** | Lived-experience advisors shape platform direction. Community organisations control their data. |
| **Evidence is story, not surveillance** | Research hub indexes evidence without profiling individuals. Stories carry context. |
| **Build for handover** | Open-source platform. Designed for community ownership. |
| **Make with lived experience** | Pathways for lived-experience leadership in justice advocacy. |
| **Identity before product** | We start with who holds authority in justice spaces, then build tools around that. |

### Brand Voice
- Evidence-based but community-led
- "Justice infrastructure" not "justice tech"
- Centre young people's agency, not their trauma
- Never describe young people as "offenders" — they are system-impacted
- Lead with what works, not what's broken

### LCAA in Practice

| Stage | How It Manifests |
|-------|-----------------|
| **Listen** | AI research chat surfaces community voice alongside policy evidence. Service directory built from community knowledge. |
| **Curiosity** | International comparisons (Diagrama, Spain). Inquiry database indexes what's been tried. |
| **Action** | [[contained|CONTAINED]] art installation brings justice reform into public consciousness. Service directory connects youth to support. |
| **Art** | CONTAINED exhibitions make system change felt, not abstract. Network visualisations reveal hidden connections. |

### What Makes This Different
Most justice platforms are built for the system. JusticeHub is built for the communities the system impacts. The research hub doesn't just index policy — it foregrounds lived experience evidence. The service directory doesn't just list providers — it maps networks of community support. The [[contained|CONTAINED]] program doesn't just advocate — it makes the case for change through art and direct experience.

## Engagement & Partnership Strategy

### Stakeholder Tiers
JusticeHub reaches 63,112 scored entities across the sector:

| Tier | Score | Count | Approach |
|------|-------|-------|----------|
| Hot leads | 80+ | 16 | Personal outreach only |
| Nurture | 60–79 | 3,760 | Warm broadcast |
| Cold awareness | 40–59 | ~3,700 | Campaign email + social |
| Organic only | <40 | 59,336 | No contact |

### Partnership Asks by Type
- **Funders:** Fund specific tour stops ($25K–$75K each) or JusticeHub platform ($500K total)
- **Allies:** Feature their work in CONTAINED Room 3; amplify through networks
- **Decision-makers:** Walk through CONTAINED; nominate peers; use data in submissions
- **Research partners:** Rohan Lulham (USyd) offered research partnership — *"keen to do some research around the concept"*

### Key Partner Organisations
- **Minderoo Foundation** — funder prospect (Lucy Stronach, score 79, email sent)
- **Uniting** — Emma Maiden (Director Advocacy): wants NSW MPs to walk through
- **Reconciliation WA** — Megan McCormack (CEO): state-level reconciliation leadership
- **EPIC Pathways** (Brisbane) — Rhian Miller: QLD youth services partner
- **Prevention Not Detention Tasmania** — Loic Fery: coalition ready to organise TAS stop
- **Just Reinvest** — Nicole Mekler: advocacy co-partner

### Comms Principles
Direct, evidence-based, community-centred. What not to say:
- "Excited to announce" → say "This is happening"
- "We believe" → say "The evidence shows"
- "At-risk youth" → say "young people affected by the system"
- Every stat has a named source; no rounding up; no "approximately"

## Technical Identity

| Element | Value |
|---------|-------|
| Framework | Next.js 14.2.35, React 18, TypeScript |
| Database | Supabase (3 instances: main, YJSF, QJT) + ChromaDB |
| AI | Claude, OpenAI, Groq |
| Hosting | Vercel |
| Live URL | [justicehub.com.au](https://justicehub.com.au) |
| Alternate | justicehub.act.place |
| GitHub | [act-now-coalition/justicehub-platform](https://github.com/act-now-coalition/justicehub-platform) |
| Local dev | `npm run dev` → http://localhost:3003 |

## Infrastructure & Operations

### Supabase Instances

JusticeHub runs across three Supabase instances by design — separating platform data from partner-specific datasets. Core key tables: `empathy_ledger_core` (story integration), `story_workspaces` (collaborative editing), `services` (support service directory), `organizations` (service providers), `art_innovation` (Contained art programs).

### External Integrations

- **GHL CRM:** Pipeline "Justice", tags: `youth-justice`, `justicehub`, `contained`.
- **Xero:** Tracking category `JH`, project codes `JH-CORE` and `JH-CONTAINED`.
- **Firecrawl:** Automated web scraping for the Queensland service directory.
- **Notion:** Research and content management integration.

### Platform Routes

| Section | URL |
|---------|-----|
| Research Hub | `/youth-justice-report/*` |
| Intelligence | `/intelligence/*` |
| Services | `/services` |
| Programs | `/community-programs/*` |
| Contained | `/contained/*` |

## Public Voice

*How JusticeHub describes itself on its public website (justicehub.com.au, captured 2026-04-07)*

### Hero Statement

> Australia locks up children. The alternative exists.

The site leads not with JusticeHub as a platform, but as a data statement: "1,000 community models proving it works better and costs less." The positioning is declarative — "this is the transparency engine for youth justice in Australia" — rather than pitch-style.

### Three Doors (Audience Entry Points)

Named by role, not urgency:
- **"I need help"** — direct to crisis/service support, "No judgment, just options"
- **"I do the work"** — ALMA Network framing, peer-to-peer
- **"I fund or shape policy"** — evidence first, "Make decisions based on data, not lobby groups"

The three-door design is notably non-hierarchical. Young people in need get top billing alongside funders.

### Wall of Proof (Live Data, 2026-04-07)

| Metric | Internal Wiki | Public Site (live) |
|--------|--------------|-------------------|
| Verified models | "1,000+" | **1,387** |
| Evidence-backed | "430 with evidence data" | 57 proven/effective, 474 promising |
| Avg cost/YP | "$14,000" | **$15K** |
| Recidivism (detention) | 85% | 84% |
| Cost comparison | 97x cheaper | **86x** cheaper (updated) |

The public site shows updated figures. Internal wiki cost/recidivism data is from an earlier state — worth syncing.

On Indigenous-led models, the site says: *"These models don't need Western evidence frameworks to prove they work — they have 65,000 years of proof."*

### CONTAINED Tour Framing

> "One shipping container. Three rooms. Thirty minutes. Touring Australia. We are building it as we go because the people who need to see it cannot wait for perfect."

Tour dates (2026): Mount Druitt (May), Brisbane (May), Adelaide (June), Townsville (July), Perth (August), Tennant Creek (September — **confirmed**). Each stop costs $30K to stage. SA has the starkest ratio in the country: $50M detention vs $8M community.

### Number Divergence: Platform Name vs Mission

The site's SEO title is "JusticeHub — Empowering Youth Through Storytelling" but the live experience is evidence-based reform infrastructure at scale. The SEO title undersells the platform for any funder who googles before a meeting.

## Backlinks

- [[three-circles|The Three Circles]] — the canonical 3-year, $2.9M Minderoo pitch. **JusticeHub IS Circle One** — the data spine, the Living Brain. The $2.9M ask funds the next layer of work on top of what's already operational.
- [[staying|Staying — Country & Council]] — the *methodology layer* of Three Circles' Circle Two; per-young-person Journal artefact + ledger visual register
- [[third-reality|The Third Reality]] — the methodology
- [[civicgraph|CivicGraph]] — the data layer
- [[empathy-ledger|Empathy Ledger]] — the narrative layer
- [[acco-sector-analysis|ACCO Sector Analysis]] — who it serves
- [[global-precedents|Global Precedents]] — capital routing models
- [[contained|CONTAINED]] — the Art phase campaign layer
