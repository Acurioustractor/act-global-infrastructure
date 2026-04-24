---
title: The Three Circles
subtitle: A community-led advocacy infrastructure for youth justice in Australia
status: Canonical pitch — refreshed 2026-04-20 with 50-to-7/8 workshopped selection reframe + 5 confirmed anchors
date: 2026-04-11
entity_type: flagship-program
tagging_mode: parent-code
canonical_slug: three-circles
canonical_code: ACT-JH
website_slug: three-circles
website_path: /projects/three-circles
public_surface: project
cluster: justicehub
parent_project: justicehub
empathy_ledger_key: three-circles
tier: flagship
funder: Minderoo Foundation (lead, Lucy Stronach)
budget: $2.9M over 3 years (FY2026–FY2028)
methodology_name: Staying — Country & Council
artefact_name: The Country We're Building (documentary + book + platform) + per-young-person Journals
canonical_source: wiki/raw/2026-04-07-jh-three-circles-proposal.md
---

# The Three Circles

> *A community-led advocacy infrastructure for youth justice in Australia.*
> *FY2026–FY2028. $2.9M. 7–8 anchor communities, one per state and territory, co-selected with Minderoo from a 235-candidate pool. One artefact.*

**Status:** Canonical pitch — Lucy-warm, refreshed 2026-04-08 with the [[#methodology-layer-staying|Staying]] methodology and ledger artefact register | **Lead funder:** Minderoo Foundation | **Contact:** Lucy Stronach | **Total ask:** $2.9M / 3 years ($780K + $960K + $1.16M)

## Why this exists

Australian youth justice has more reports, frameworks, evaluations, peak bodies, lived-experience panels and government strategies than at any point in its history. It also has more children in detention, more recidivism, and more lateral violence in the sector than at any point in recent memory.

The problem is not absence of evidence. **It is that the evidence, the relationships, and the stories are all held in different rooms, and the rooms don't talk to each other.** Frameworks live in consultancy decks. Stories live in unfunded community organisations. Funding flows live in spreadsheets nobody reads. International models live in academic journals. Indigenous knowledge lives where it has always lived — in country, in elders, in Tuesday afternoon check-ins that no funder has ever counted as governance.

The Three Circles is built around one philosophy: **the work of fixing youth justice is the work of holding things together long enough for community-led models to be seen, trusted, and copied.** Not scaling. Not franchising. Not "best practice toolkits". *Holding.*

Funded over three years by Minderoo, the program produces a single national artefact in 2028 that lives well beyond it.

## Cluster Context

The Three Circles is a flagship-program page inside the [[projects/justicehub/README|JusticeHub Cluster]], not a parallel brand or a second source of truth. The wiki should hold the durable pitch logic and framing, [[empathy-ledger|Empathy Ledger]] should hold the live stories, portraits, journals, and field media that prove it, and the websites should compose those layers through the [[../../technical/wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]] and [[../../concepts/living-website-operating-system|Living Website Operating System]].

## What is already built (Minderoo is funding the next layer, not from zero)

The data spine is already live at [[justicehub|justicehub.com.au]] and [[civicgraph|civicgraph.app]] today. Numbers below are **verified against the [[grantscope|GrantScope (CivicGraph)]] data layer** (review 2026-04-08, agent report at `thoughts/shared/handoffs/staying/grantscope-review.md`):

| Asset | What it is | Status |
|---|---|---|
| **ALMA evidence base** (Australian Living Map of Alternatives) | **1,155 verified youth-justice interventions** documented with evidence type, methodology, outcomes, cultural authority, target cohort, geography. The most comprehensive map of Australian youth-justice alternatives in existence. | **Live (verified)** |
| **CivicGraph entity resolution** | **100,036 entities resolved** (target 150K+) across charities, Indigenous corps, social enterprises. F1 match precision **94.1%**. **199,001 relationships mapped** (target 200K+). | **Live (verified)** |
| **Geographic precision** | **96% postcode coverage, 96% remoteness, 95% LGA, 94% SEIFA** — enables gap analysis showing where alternatives are systematically unfunded. | **Live (verified)** |
| **Justice funding ledger** | **71K rows in `justice_funding` table** — state, recipient, program, amount, year, announcement date — bridged to ALMA interventions via `alma_intervention_id`. **315 of 556 JusticeHub orgs linked to CivicGraph entities (57%)**; 241 still to bridge. | **Live (verified)** |
| **AusTender contracts** | **770K rows** across all sectors; justice subset extractable via contract category. | **Live** |
| **Foundations layer** | **10,779 foundations** loaded; 30% enriched with descriptions; LLM enrichment running on the remaining 7,500. | **Live, enrichment in progress** |
| **CivicGraph MCP server** | **6 live agent tools** — `civicgraph_search`, `civicgraph_entity`, `civicgraph_power_index`, `civicgraph_funding_deserts`, `civicgraph_revolving_door`, `civicgraph_ask` (natural language across all datasets). Deployed and accessible. | **Live (verified)** |
| **QLD Hansard scraper** | Scrapes Queensland Parliamentary Hansard PDFs from sitting calendar, filters for justice-relevant keywords, ingests speeches tagged by relevance. Other jurisdictions next. | **Live, expanding** |
| **[[empathy-ledger|Empathy Ledger v2]]** | Story sovereignty layer — OCAP/CARE protocols, selective consent envelopes, full audit trail. Currently **9 live storytellers** (target 226). | **Live, scaling** |
| **[[contained|CONTAINED]]** | Physical shipping container surfacing local funding/evidence data, currently at Mounty (Mounty Aboriginal Youth & Community Services, Mt Druitt), touring 8 confirmed locations. | **Live, on tour** |

**Concrete proof points [[grantscope|GrantScope]] can defend in front of a funder:**

- **Oonchiumpa: 95% diversion rate, ~97.6% cheaper than detention** (~$31K/year per young person vs $1.3M) — *source: Oonchiumpa's own programmatic reporting*
- **PICC: $29M annual turnover, 208 FTE, $38.9M of tracked funding 2021–25**, with the Young Offender Support Service growing 3× since 2021
- **Diagrama (Spain): 13.6% recidivism, 5.64:1 cost-benefit ratio over 30 years** — €31K/year per young person
- **National detention cost: $1.3M per young person per year** (ROGS 2024–25); Victoria $2.6M
- **3,177 young people under youth-justice supervision in 2024–25** (AIHW); detention rate 2.7 / 10,000; Aboriginal/TSI projected 24.6 / 10,000 by 2030–31 (Closing the Gap)

**The $2.9M ask is not for invention.** It is for the relational and editorial work that turns this infrastructure into a national advocacy artefact.

> **Numbers retired in this refresh:** earlier drafts of the JusticeHub pitch cited "1,081 programs · 587K entities · 1.5M relationships · $114.9B across 35 sources." The GrantScope data layer review **could not verify** the 35-source / $114.9B aggregation; the entity, relationship, and intervention counts above are the verified replacements. See **§Data verification status** at the bottom of this page for the full reconciliation.

## The Three Circles

Everything in this program sits inside one of three concentric circles. They are not parallel workstreams. They feed each other.

### ◉ Circle One — The Centre: The Living Brain

A single, queryable, locally-hosted intelligence system that contains **everything** that exists on Australian youth justice — and tracks new things automatically as they appear.

What lives in the centre:
- Every program, evaluation, framework and toolkit ever published
- Every grant, contract, philanthropy disbursement and government appropriation
- Every Hansard mention, parliamentary inquiry, coronial finding and ombudsman report
- Every organisation, board member, political donor and funding relationship
- Every consented story from the Empathy Ledger, with story sovereignty preserved
- Every international model, framework and case study captured through the tour
- Every Indigenous community model documented with consent through the 7 anchor sites

How it works:
- **Local AI agents** running on dedicated infrastructure (not third-party APIs) so a community in Tennant Creek can query their own context without a data team and without their information leaving their control
- **Automatic tracking** — new Hansard speeches, new grants, new media coverage, new evaluations are picked up and integrated nightly
- **Open API** for journalists, magistrates, philanthropy, academia and community
- **Story sovereignty layer** ensuring every personal narrative carries its own consent envelope ([[empathy-ledger|Empathy Ledger]] OCAP / CARE protocols)

Why it matters: right now, the only way to know what's happening in Queensland youth justice is to scrape Hansard yourself with fuzzy search. That should not be the standard. The centre makes the answer to *"who is doing what, with what money, with what evidence, in this community right now"* a 30-second query for everyone who needs it. Magistrates use it before sentencing. Funders use it before granting. Journalists use it before writing. Communities use it before partnering. Government uses it (whether it likes it or not) because everyone else does.

### ◉ Circle Two — The Seven: Local Models, Held in Relationship

Seven community organisations, chosen with care, supported with **untied funding, minimised reporting, and maximised relationship over three years**. The number is deliberate. Twelve was Lucy's principle. We tightened to seven so each anchor is a deep relationship, not a portfolio entry, and so the artefact narrative stays manageable. Dunbar's depth tier sits well below twelve; seven is where genuine accountability lives.

For each of the seven, the program funds:

1. **Operational support** — untied, not project-tied, paid quarterly with relationship check-ins instead of acquittals
2. **Embedded storytelling** — a small editorial team captures the work longitudinally, on the community's terms, using the [[empathy-ledger|Empathy Ledger]] story sovereignty model — *the practice of doing this is called [[#methodology-layer-staying|Staying]] (see below)*
3. **Model documentation** — what the org actually does, why it works, how it's governed (including the informal governance funders typically miss), written into the centre
4. **Communication infrastructure** — website, media kit, advocacy assets, presence on JusticeHub, so the org can speak for itself rather than being spoken about
5. **Cross-community exchange** — each org hosts and visits two other anchor communities over three years, building relational impact that no conference produces
6. **A seat at the table in Year 3** — these are the orgs that speak at the convening, write the framework, and meet the international visitors

#### How the anchor communities are selected — the 50-to-7/8 workshop

Every other funding application Minderoo receives asserts *"we have ten anchor communities"* as established fact. Most are inflated. ACT's honest answer:

- **Four anchors confirmed today** with verbal community consent, stories flowing through Empathy Ledger v2, and ALMA interventions scored
- **235-candidate pool** queryable from ACT's data spine: 20+ community-led Aboriginal organisations per state/territory, drawn from 1,155 ALMA-verified youth-justice interventions + 100,036 CivicGraph-resolved entities
- **Final three anchors co-selected** with Minderoo via two 90-minute workshop sessions: one to narrow from 235 to ~20, one to confirm the final set after each community's own consent

This is not a fudge. It's the method of the program operating *in front of Minderoo, before funding*. If the method holds, Session 2 produces a national anchor network selected with both evidence and community consent. If the method fails, the workshop is where that becomes visible — before any community is publicly named.

**Working surfaces** (all live):
- Live dashboard: `act-global-infrastructure.vercel.app/minderoo-live-dashboard.html` — candidate pool, selection funnel, anchor-ground-truth health check, confirmed anchor cards
- Session 1 recommended shortlist: `thoughts/shared/drafts/minderoo-session-1-recommended-shortlist.md`
- Workshop proposal (one-pager in envelope): `thoughts/shared/drafts/minderoo-workshop-proposal.md`

#### Four anchors already in relationship

Verbal consent captured, governance recorded, stories flowing through ACT's wiki with per-storyteller provenance:

| # | Community / Org | Country / Place | Leadership | Confirmation |
|---|---|---|---|---|
| 1 | **[[oonchiumpa\|Oonchiumpa Consultancy & Services]]** | Mparntwe (Alice Springs), NT: Arrernte, Alyawarra, Luritja, Warlpiri | Kristy Bloomfield + Tanya Turner co-directors; Aunty Bev + Uncle Terry elder authority; Fred Campbell youth worker | **Confirmed** (verbal, 2026-04-13) |
| 2 | **[[picc\|Palm Island Community Company (PICC)]]** | Palm Island, QLD: Manbarra / Bwgcolman | Rachael Atkinson (CEO) | **Confirmed**: 21 ALMA interventions, $29M annual turnover |
| 3 | **Minjerribah Moorgumpin Elders-in-Council Aboriginal Corporation (MMEIC)** | Minjerribah (North Stradbroke Island), QLD: Quandamooka | Elders-in-Council governance (founded 1994) | **Confirmed**: highest-scoring anchor (0.815) after 2026-04-20 ALMA authoring |
| 4 | **Brodie Germaine Fitness Aboriginal Corporation (BG Fit)** | Mount Isa, QLD: Pita Pita Wayaka + Kalkadoon | Brodie Germaine (founder) | **Confirmed** (verbal, 2026-04-13): Tuesday gym + on-Country bush camps + Doomadgee quarterly remote |

**Approached, pending elder/CEO sign-off (held back from the envelope for clean four-confirmed framing):** Mounty Aboriginal Youth & Community Services (Mt Druitt, NSW): Daniel Daylight CEO verbal 2026-04-18, full elder approval pending; carried into the next envelope.

#### Remaining 2–3 anchor seats — one per state/territory, selected in workshop

ACT's recommended Session 1 candidates (evidence-ranked community-led Aboriginal Community Controlled organisations from the data spine):

| State / Territory | Strongest data-spine candidate | Years | Score | Alternative |
|---|---|---|---|---|
| **VIC** | Rumbalara Aboriginal Co-Operative (Greater Shepparton) | 46 | 0.803 | VACCA (Darebin), Wathaurong (Geelong), VAHS (Yarra) |
| **WA** | Kullarri Regional Communities IC (Derby-West Kimberley) | 9 | 0.708 | Dumbartung (Perth), Yorgum Healing (Vincent) |
| **SA** | Aboriginal Drug and Alcohol Council (SA) | 9 | 0.743 | Research candidates from 107 CC Indigenous corps pool |
| **TAS** | ATSILS Tasmania | — | 0.713 | Tasmanian Aboriginal Corporation (Hobart) |
| **ACT** | Gugan Gulwan Youth Aboriginal Corporation | 33 | 0.653 | Aboriginal Advancement Alliance |
| (NT) | Oonchiumpa confirmed | | | Bawinanga, Tangentyere (if a second NT seat) |

Selection decisions for Session 1 with Lucy Stronach:
1. **Final anchor count** — 7 or 8. ACT gets its own seat or affiliates with Mounty Yarns' NSW network?
2. **QLD treatment** — three QLD anchors already confirmed (PICC + MMEIC + BG Fit) from community relationships ACT has built. Keep all three or consolidate with two moving to affiliated network?
3. **Shortlist narrowing** — from ~20 in the session-1 shortlist to ~15 communities ACT approaches for consent between sessions.

**This is not a preselected list of grants.** It is a set of long-term relationships co-selected by Minderoo and ACT from a transparent, queryable pool. Every confirmed anchor's consent is recorded. Every shortlist candidate's community has the final say on participation. The centre learns from these communities, the international tour celebrates them, and the artefact in Year 3 is built around them.

### ◉ Circle Three — The Outer Ring: The Ecosystem & The World

The outermost circle is where everything plugs in. Because the centre holds everything and the seven anchor communities hold the stories, the outer ring becomes a place where:

- **Frameworks plug in**: the Frameworks Institute work Andrea Davidson and the Victorian Violence Reduction Unit are excited about can be tested against real community case studies in the seven, refined in dialogue with Indigenous experience, and published as a *contextualised Australian framework* rather than imported language
- **JRI and the establishment plug in**: the Justice Reform Initiative's advocacy and convening work has the establishment voices but is missing the place-based grounding. The seven become JRI's grounding. JRI becomes a distribution channel for the seven.
- **Philanthropy plugs in** — every grant given anywhere in Australian youth justice flows into the centre, becomes searchable, and lets PRF, Snow, Dusseldorp, Ritchie and Minderoo see what each other is funding without needing to ask. *Coordination by infrastructure, not by meetings.*
- **International peers plug in**: through the storytelling tour (outbound) and the Year 3 return visit (inbound). [[diagrama|Diagrama]] (Spain), Halt (Holland), Norwegian restorative justice, Portuguese diversion, South African community courts, Canadian First Nations sentencing circles. Each documented inside the centre and put into dialogue with the seven Australian sites.
- **Magistrates and judges plug in** — through the work already starting in Alice Springs with the 55 judges and magistrates on country. JusticeHub becomes the directory they use before sentencing.
- **Media and journalists plug in** — open API, verified data, real stories with consent. Investigative journalism becomes possible at a scale it currently isn't.

The outer circle is the **theory of change**. Not *"we will run programs that scale"*. The theory is: *if everything that exists is connected, and seven places are held with depth, then the gap between what's known and what's done collapses, and the political cover for detention-default goes with it.*

## The Artefact — *The Country We're Building*

Every three-year program needs something the people inside it are working *toward*. Not a final report. Not an acquittal. Something with weight. Something a young person in Tennant Creek can hold and a magistrate in Hobart can read and a Minister in Canberra has to respond to.

**One artefact, four forms** *(documentary + book + platform + per-young-person Journals — the fourth form added in this refresh from the [[#methodology-layer-staying|Staying methodology layer]]):*

### 1. *The Country We're Building* — a documentary (90 minutes)

A feature-length film tracking the seven communities over three years. Not a sector documentary, a country documentary. Young people, elders, workers, magistrates who came on country, international peers who visited, moments of failure and moments of recognition. Co-directed with each community, story sovereignty preserved throughout. Premiered at the Year 3 convening, then released nationally.

### 2. *The Country We're Building* — a book

Long-form, photography-rich, structured around the seven communities and the international counterparts. Each community gets a chapter on its own terms. Threaded through it: the framework, the data, the philosophy, and the case for community-led oversight as the next national settlement on youth justice. Published Year 3 with a major Australian publisher; community organisations retain rights and royalty share.

### 3. *The Country We're Building* — a living platform

The centre, opened to the public in its full form at Year 3 launch. Every framework, every story (consented), every evaluation, every dollar — searchable, citable, permanent.

### 4. **The Journals** — one bound book per young person *(new in this refresh)*

Each young person in deep relationship with the program over three years receives a hand-stitched A5 bound book of ~80–120 pages, owned by them, containing their own portraits (in the [[the-brave-ones|Brave Ones]] visual register), their own handwriting, voice transcripts from the [[empathy-ledger|Empathy Ledger]], letters from Aunties and uncles, ledger entries of who showed up and when, drawings, marks, place — and any international exchange experience captured as its own chapter.

**Owned by the young person.** Not Minderoo, not ACT. Right of withdrawal at any point. OCAP / CARE protocols at the data layer. One archival copy held by ACT for the program's evidence base, with explicit consent only.

The journals are the per-young-person counterpart to the country-scale documentary and book. They give every young person something the system never has — *a thing they made, that holds them whole.*

**Why one artefact in four forms matters:** it gives every person in this work (young people, community workers, Nick, Ben, the storytellers, the funders, the international visitors) a single thing they are part of building. It celebrates the individuals doing the work *and* builds the system. It makes the three years feel like a country-wide project rather than seven disconnected grants. And it produces something that outlives the funding cycle.

## How this connects to what Lucy raised

Three things from the conversation that this design directly responds to:

**1. *"Twelve organisations, one per month, one per state, minimised reporting, maximised relationship."***
This is the spine of Circle Two. We've gone with **seven** rather than twelve to leave depth headroom (Dunbar) and to make the artefact's narrative manageable, but the principle is yours.

**2. The Frameworks Institute interest from Victoria.**
Frameworks doesn't work as a standalone deliverable in Australia — Diagrama proved that, even with the best framework work in the world. It works *inside* a living evidence system grounded in Indigenous experience. Circle Three is where the framework work belongs, and where Andrea Davidson's interest can become a real test case rather than another expensive PDF.

**3. The Justice Reform Initiative tensions.**
We are not trying to replace JRI or compete with the lived-experience groups. We are trying to be the connective tissue that makes the factional split less consequential, because if the seven communities are visible in the centre and speaking with their own voices, no single conference becomes a chokepoint.

## The costed ask — $2.9M over 3 years

| Year | Total | What it buys |
|---|---:|---|
| **Year 1 — FY2026 (foundation)** | **$780,000** | Continuing JusticeHub + CivicGraph build (the live map of what works, the funder/spend database, six AI agent tools) · 7 × $35K untied anchor partnerships · 2 FTE storytelling team (1 North + 1 South) · 3 domestic exchanges · Africa + Europe international tour (Ben + 3 community leaders) |
| **Year 2 — FY2027 (deepening)** | **$960,000** | Continuing JusticeHub + CivicGraph build · oversight dashboards, magistrate-facing tools, Frameworks Institute integration · 7 × $35K anchor partnerships (with the trust dividend expressed as scaled storytelling support and exchanges, not bigger cheques) · 3 FTE storytelling team (adds film/editorial for the artefact) · 6 domestic exchanges · 10% Delta-model innovation reserve embedded in anchor lines |
| **Year 3 — FY2028 (national crescendo + the artefact)** | **$1,160,000** | JusticeHub + CivicGraph open to the sector (public API, journalist tooling) · 7 × $35K final-year anchor partnerships · Storytelling team: case study production, **documentary post-production, book editorial, journal binding** · The Doing Convening (workshop-led, no keynotes) · International return visit (2–3 international peers visit Australian anchor sites) |
| **Three-year total** | **$2,900,000** | One program, three circles, four forms of one artefact |

**For context:** the cost of detaining a single young person for one year is **$1.33M** (ROGS 2024–25 national average). **This program costs less per year than detaining one child** — and is designed to make the case for not detaining the next thousand.

The full per-line breakdown lives in the canonical source: `wiki/raw/2026-04-07-jh-three-circles-proposal.md`.

## What Minderoo could choose

We want this to be the easiest possible *yes* internally. Three options:

1. **Anchor funder, full program** — $2.9M over three years. Minderoo's name on the artefact, the convening, the framework launch.
2. **Lead Year 1 with right of first refusal on Years 2–3** — $780K now, watching traction before committing further. PRF, Snow, Dusseldorp, Ritchie co-fund subsequent years against demonstrated progress.
3. **Fund a single circle** — most likely **the Centre** ($520K over three years), as the durable infrastructure piece. We assemble a coalition for the community and storytelling layers separately.

Preference is option 1, because the three circles only work as one program. But we will make any of these work.

## Methodology layer — Staying

> *Every other youth justice program leaves. Staying is the move.*

The practice that runs through Circle Two — the embedded storytelling, the per-young-person journal, the *staying with* across three years instead of dropping in and leaving — is named **Staying**, with the subtitle **Country & Council**.

- *Country* is the place and the people on it
- *Council* is the form of community-led decision-making
- Both structures are non-negotiable

The methodology has its own visual register — the **ledger page**, hand-made and lived-in, with system as marginalia. Artist references: Christian Boltanski, Sophie Calle, Edmund Clark, Theaster Gates, Anselm Kiefer, Judy Watson, Daniel Boyd, Vernon Ah Kee, Tony Albert, Brook Andrew. See `tools/three-ripples-ledger.html` and the [[the-brave-ones|Brave Ones]] visual discipline.

**Staying is the name we use internally and with communities** for the practice of the embedded storytelling team. It is the answer to the question *"what is the team actually doing in those communities for three years?"* — and the answer that goes on the cover of every Journal.

The full Staying methodology page (drafted as an alternative shape of the same work) lives at [[staying|Staying — Country & Council]] and feeds the practice back into Circle Two without becoming a separate program or a competing pitch.

## Connections across the ecosystem

- [[justicehub|JusticeHub]] — the data spine that *is* Circle One; already operational
- [[empathy-ledger|Empathy Ledger]] — the story sovereignty layer; consent flows for every story and journal entry
- [[civicgraph|CivicGraph]] — the funding and relationship intelligence underneath the centre
- [[diagrama|Diagrama]] — Year 1 international tour partner; Spain leg
- [[contained|CONTAINED]] — physical proof tour, currently at Mounty (Mounty Aboriginal Youth & Community Services, Mt Druitt), distributing the platform into community
- [[the-brave-ones|The Brave Ones]] — visual discipline for the per-young-person Journals
- [[oonchiumpa|Oonchiumpa]] — anchor #1
- [[picc|PICC — Palm Island Community Company]] — anchor #2
- [[lcaa-method|LCAA Method]] — Listen / Curiosity / Action / Art mapped onto the three-year arc
- [[the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led|The Edge Is Where the Healing Is]] — the synthesis this program operationalises
- *Pending:* GrantScope review — the agentic insight + history layer. Agent in flight, output to `thoughts/shared/handoffs/staying/grantscope-review.md`. Will fold the verified data + frameworks findings into Circle One.

## Pitch refresh status — 2026-04-08

This page is the **canonical project page** for the Three Circles pitch. It supersedes earlier "Staying as a separate program" framing and the inflated wiki-deploy version of the pitch.

**What's locked:**
- $2.9M total ($780K / $960K / $1.16M)
- 7 anchor communities (4 confirmed: Oonchiumpa, PICC, MMEIC, BG Fit; 3 to co-select with Minderoo via the 50-to-7 workshop)
- Three Circles structure (Centre / The Seven / Outer Ring)
- *The Country We're Building* artefact in four forms (documentary, book, platform, and the per-young-person Journals added in this refresh)
- Lucy's *"12 orgs, one per month, one per state, minimised reporting, maximised relationship"* as the spine
- Staying as the Circle Two methodology name; ledger as the visual register
- Verified data layer numbers (see §Data verification status)

**What's pending:**
- Pitch deck refresh (the previous Staying-only deck at `thoughts/shared/handoffs/staying/minderoo-deck-v1.md` is being replaced — wrong shape, wrong numbers)
- ~~Final consent on Oonchiumpa naming convention for funder-facing material~~ **Resolved 2026-04-15:** Oonchiumpa is canonical (not "Ntumba"). Co-directors are Kristy Bloomfield + Tanya Turner (not "Christine"). All pitch documents corrected.
- Frameworks Institute / Andrea Davidson integration into Circle Three — **scoped as Year 1 deliverable** (2026-04-08); the Y1 Centre hardening line funds this integration. No longer a precondition.
- International tour data structuring — Norway, Portugal, South Africa, Canadian First Nations sentencing circles are narrative-only in GrantScope; needs at least a thin schema before Year 1
- Ingestion of `2026-04-07-jh-minderoo-executive-summary.md` and `2026-04-07-jh-minderoo-image-prompts.md` into a wiki research article

## Data verification status (2026-04-08)

The earlier JusticeHub pitch numbers were partly aspirational. Reviewed against the actual GrantScope/CivicGraph data layer (`thoughts/shared/handoffs/staying/grantscope-review.md`), here is the reconciliation:

| Original claim | Verified status | Replacement |
|---|---|---|
| "1,081 verified youth justice programs" | **Close — actual number is 1,155 ALMA interventions** | Use **1,155 ALMA verified interventions** |
| "587,000 entities" | **Inflated — actual is 100,036 entities resolved** (target 150K+) | Use **100,036 entities, F1 precision 94.1%** |
| "1.5 million relationships" | **Inflated — actual is 199,001 relationships** (target 200K+) | Use **199,001 relationships mapped** |
| "$114.9B tracked across 35 sources" | **Cannot be verified** — MISSION cites ~14 core sources; the higher number appears to roll in subcategories | **Retire this claim.** Use *"71K rows of justice funding tracked, $1B+ in justice spending mapped, 14 government and philanthropic source categories ingested"* |
| "38+ stories published" (Empathy Ledger) | **Overstated — actual is 9 live storytellers** (target 226) | Use *"Empathy Ledger v2 platform live with story sovereignty model; 9 storytellers onboarded, scaling to 226"* |
| "550:1 cost ratio" | **Defensible** ($1.3M detention vs ~$31K Diagrama-equivalent ≈ 42:1; the 550:1 figure compares to $1,708/year community programs which is a real ALMA data point) | Use **42:1 (Diagrama)** as the *international* comparator and **550:1 (ALMA community programs)** as the *Australian* comparator — be explicit about which |
| "1,000+ ALMA interventions" | **Verified, actual is 1,155** | Use **1,155** |
| "Live Hansard scraper" | **Verified — QLD only currently, others to follow** | Use as-is, scope to QLD |
| "MCP agentic interface" | **Verified — 6 tools live and deployed** | Use as-is; name the 6 tools if asked |

**What a sophisticated funder will press on (from the GrantScope review):**

1. *"How do you move from 315 linked orgs (57%) to 90%+ without manual matching?"* — answer: ABN fuzzy-match enrichment in flight, named in Circle One Year 1 hardening
2. *"Are Maranguka, PICC, Oonchiumpa actually in ALMA as evidence interventions, or just cited in PDFs?"* — answer: PICC is in ALMA dashboard; Maranguka is in PDF only and needs structuring; Oonchiumpa is in ALMA
3. *"If Frameworks Institute is a Circle Three anchor, where is the work documented?"*: **scoped as a Year 1 deliverable, not a precondition** (decision 2026-04-08). The Y1 hardening line in Circle One funds the integration work; Andrea Davidson's interest becomes a real test case during Year 1 dialogue with the seven anchor communities, not a pre-built artefact. Pitch language: *"Frameworks Institute integration is a Year 1 deliverable inside Circle One"*
4. *"What is the source of the 95% Oonchiumpa diversion claim?"* — **Oonchiumpa's own programmatic reporting** (decision 2026-04-08). Specific document reference to be confirmed before funder materials go live

## What sticks vs what we move past from GrantScope review

**Sticks (the strongest things to lead with):**
- 1,155 ALMA interventions
- Hansard scraper + 6-tool MCP server *live* (proof of agentic infrastructure)
- $38.9M of PICC funding tracked, 208 FTE — concrete community proof
- Oonchiumpa 95% diversion (cited from Oonchiumpa's own programmatic reporting; specific document reference TBC)
- Diagrama 13.6% recidivism, 5.64:1 cost-benefit
- Bridge between JusticeHub orgs and CivicGraph entities (315/556 done, 57%)
- $1.3M ROGS detention cost as the per-year framing (Lucy used this)

**Move past / replace:**
- The $114.9B / 35 sources composite number (replace with 71K rows + $1B+ justice spending)
- The 587K / 1.5M aggregate relationship counts (replace with 100K entities / 199K relationships, with target deltas honestly stated)
- The 38+ stories Empathy Ledger claim (replace with 9 live, 226 target)
- "1,081 programs" → 1,155 ALMA interventions

**Genuinely missing — close before pitching:**
- Frameworks Institute / Andrea Davidson narrative reframing work (zero in GrantScope)
- International tour structured data (Norway / Portugal / SA / Canada are narrative-only)
- Maranguka structured data (PDF only)
- Oonchiumpa diversion-rate citation (study not linked)

## LCAA Phase

In the [[lcaa-method|LCAA Method]], The Three Circles is the canonical pitch that funds the operationalisation of LCAA at national scale: the three concentric circles (Centre / Seven / Rest) and the three years of the program (Listen / Compare / Tell) are the LCAA arc made visible to a funder. The methodology layer is named separately as [[staying|Staying — Country & Council]].

LCAA arc for The Three Circles:
- **Listen — Circle One (The Living Brain)** — a single, queryable, locally-hosted intelligence system holding everything that exists on Australian youth justice; community queries running on local AI agents so a community in Tennant Creek can ask questions of their own context without a data team and without their information leaving their control
- **Curiosity — Circle Two (The Seven)**: seven community organisations chosen with care, supported with untied funding and minimised reporting; embedded storytelling on the community's terms; cross-community exchange building relational impact no conference produces; Year 2 international exchange to [[diagrama|Diagrama]], Halt, Children's Hearings
- **Action — Circle Three (The Rest)** — funders, government, and the wider sector changed by what travels outward from the centre; the data spine ([[grantscope|GrantScope]] / [[civicgraph|CivicGraph]]) makes funding flows, evidence, and outcomes legible to magistrates, philanthropy, and journalists in 30-second queries
- **Art — *The Country We're Building*** — the single national artefact in 2028: documentary + book + platform + per-young-person Journals; the form that makes the work outlive the funding

The Three Circles funds the *next layer* on top of an operational system — not invention. The $2.9M is for the relational and editorial work that turns infrastructure into a national advocacy artefact; [[staying|Staying]] is the methodology that does the work.

## Backlinks

- [[projects/justicehub/README|JusticeHub Cluster]] — the cluster this flagship program belongs to
- [[justicehub|JusticeHub]] — the data spine; Circle One IS JusticeHub
- [[empathy-ledger|Empathy Ledger]] — story sovereignty layer for every journal entry
- [[civicgraph|CivicGraph]] — funding and relationship intelligence layer
- [[staying|Staying — Country & Council]] — the methodology layer; sits inside Circle Two
- [[the-brave-ones|The Brave Ones]] — visual discipline for the Journals
- [[contained|CONTAINED]] — physical companion artefact, currently at Mounty (Mounty Aboriginal Youth & Community Services, Mt Druitt)
- [[diagrama|Diagrama]] — international tour partner (Spain leg)
- [[oonchiumpa|Oonchiumpa]] — anchor community #1
- [[picc|Palm Island Community Company]] — anchor community #2
- [[lcaa-method|LCAA Method]] — methodology mapping
- [[the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led|The Edge Is Where the Healing Is]] — synthesis
- [[visual-system|ACT Visual System]] — the locked Red Centre and woodcut grammar used across the pitch deck and companion artefacts
- [[../../technical/wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]] — the cross-system identity rules for this flagship page
- [[../../concepts/living-website-operating-system|Living Website Operating System]] — how this page should flow into EL and the public sites
- [[kristy-bloomfield|Kristy Bloomfield]] — cultural authority anchoring the Three Circles pitch
