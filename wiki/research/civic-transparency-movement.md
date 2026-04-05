# Civic Transparency Movement

> The emerging practice of using AI to make government legible to citizens — reversing the historical flow where states made societies legible to themselves.

**Status:** Active research  
**Compiled:** 2026-04-06  
**Related:** [[civicgraph|CivicGraph]], [[civic-world-model|Civic World Model]], [[third-reality|The Third Reality]], [[global-precedents|Global Precedents]]

---

## Karpathy's Thesis

In 2025, Andrej Karpathy (co-founder of OpenAI, creator of Andrej Karpathy's Neural Networks course, and one of the most-followed AI researchers globally) articulated a compelling vision for AI's role in civic life:

> AI agents will be able to process the full corpus of government procurement, lobbying disclosures, campaign finance filings, and legislative text — creating a persistent watchdog that no individual journalist or NGO could sustain.

The core insight: **governments produce enormous volumes of machine-readable public data** (procurement, legislation, corporate registrations, grant disclosures, court filings) but that data is functionally inaccessible to most citizens because the volume and complexity exceed human processing capacity. AI removes that constraint.

This is not about replacing investigative journalism. It is about enabling a new kind of **structural accountability** — one that catches patterns across thousands of contracts, tracks the same entity through multiple regulatory disclosures, and surfaces relationships that only become visible at scale.

---

## "Seeing Like a State" — The Reversal

The political theorist James C. Scott's 1998 book *Seeing Like a State* described how modern states make society *legible* in order to govern it:

- Cadastral land surveys that convert complex communal land use into clean property titles
- Standardised surnames that make individuals trackable across administrative systems
- Scientific monoculture farming that maximises measurable yield at the cost of ecological complexity
- Urban planning grids that prioritise administrative clarity over the organic logic of communities

Scott's argument was that this "high modernist" simplification destroys the local, practical knowledge (*metis*) that makes communities actually function. The state gains legibility; the people lose complexity.

**The civic transparency movement inverts this dynamic.**

AI can now process government's own administrative outputs — the procurement databases, the company registrations, the grant disclosures, the legislative text — and make them navigable by the people those governments are meant to serve. Instead of the state making society legible to administrators, **society can now make the state legible to itself**.

This is not just a technical capability. It is a democratic rebalancing.

---

## What Gets Made Legible

The volume of public government data that is technically available but practically inaccessible is extraordinary:

**Procurement and contracts**
- Federal and state government procurement records: who won, what amount, which department
- Subcontracting relationships that obscure beneficial ownership
- Contract variations and extensions that increase total value without fresh competition
- Patterns of awards to connected entities

**Legislative complexity**
- Omnibus bills that bundle hundreds of unrelated provisions into a single vote
- Amendment histories that show what was added, removed, or watered down and by whom
- Regulatory impact statements vs actual outcomes
- Sunset clauses and review triggers that are quietly allowed to lapse

**Political finance**
- Donation flows from corporate entities to political parties and candidates
- The timing of donations relative to policy decisions or procurement outcomes
- Shell company structures that obscure the ultimate donor
- Third-party campaigning and issue advertising expenditure

**Lobbying disclosures**
- Which entities lobbied which ministers on which legislation
- Revolving door: former officials who now lobby their former departments
- The gap between disclosed lobbying and actual policy outcomes

**Local government**
- Development application approvals and who benefits
- Council procurement and who receives contracts
- Councillor pecuniary interest registers vs their voting records
- Rates, valuations, and exemptions

---

## CivicGraph: Already Implementing This

[[civicgraph|CivicGraph]] is ACT's implementation of civic transparency at scale. As of early 2026:

- **587,000 entities** — organisations, people, government bodies, projects
- **1.5M+ relationships** — funding, employment, governance, geographic
- **$74 billion in contracts tracked** across federal and state procurement
- **Political donation flows** mapped between corporate donors and recipients
- **Justice funding streams** visible including ACCO sector funding (see [[acco-sector-analysis|ACCO Sector Analysis]])

CivicGraph does not just aggregate data — it makes the *relationships* visible. The same entity appearing as a contractor, a donor, and a board member of a peak body is not visible in any single dataset. It only becomes visible when those datasets are joined and the entity resolution problem is solved. That is the hard technical work CivicGraph has done.

The [[civic-world-model|Civic World Model]] is the conceptual framing: a continuously-updated, AI-maintained model of how civic power flows in Australia — who funds whom, who employs whom, who influences policy and how.

---

## Global Precedents

The civic transparency movement is not unique to Australia. Several practitioners are building equivalent systems in other jurisdictions:

**Harry Rushworth — UK "Machinery of Government"**  
Rushworth's project maps the organisational structure of the UK government as a living, navigable document — not a static org chart but a queryable model of which department does what, who leads it, what its budget is, and how it connects to quangos, contractors, and arm's-length bodies. The project draws on Companies House data, civil service publications, and parliamentary disclosures. It is the structural complement to the financial data layer: understanding *how* government is organised is a prerequisite for understanding *where* money flows.

**Michael Adams — US City-Level Mapping**  
Adams is building equivalent infrastructure for US cities — the municipal level that is often the most opaque and the most directly impactful on daily life. City procurement, zoning decisions, police budgets, and school board contracts are governed by a patchwork of disclosure rules that vary dramatically between jurisdictions. Adams' work is notable for prioritising the city scale: where federal data is messy but plentiful, city data is often genuinely inaccessible.

**OpenSecrets / FollowTheMoney (US)**  
Long-established campaign finance tracking, now being extended with AI-assisted entity resolution and relationship mapping.

**Who Funds You? (UK)**  
Media ownership and funding transparency project — who owns the outlets that shape public discourse.

See [[global-precedents|Global Precedents]] for broader international examples of civic accountability infrastructure.

---

## ACT's Unique Angle: The Third Reality

Most civic transparency projects focus on making structural data legible: the numbers, the entities, the flows. This is necessary and valuable. But it is not sufficient.

Data without human meaning is just evidence waiting to be weaponised by whoever controls the narrative.

ACT's contribution to the civic transparency movement is the [[third-reality|Third Reality]] — the methodology that insists on connecting structural data (what government does, what money flows where) with experiential data (what communities feel, what outcomes look like at the human level).

The Third Reality is not a rebuke of data-driven accountability. It is its completion. A procurement record that shows a contract awarded to a connected entity is concerning. A procurement record *plus* a community story about what happened when that contractor arrived — that is accountability with teeth.

This is where [[empathy-ledger|Empathy Ledger]] enters the civic transparency picture. EL is not just a storytelling platform — it is a structured, consent-governed repository of community experience that can be linked to the structural data in CivicGraph. The combination is what distinguishes ACT's approach from pure transparency infrastructure.

---

## Indigenous Funding Flows and the ACCO Sector

One of the most opaque areas in Australian civic data is **funding to and through the ACCO sector** — Aboriginal Community Controlled Organisations.

The structural problem:
- Federal and state government funding for Indigenous programs flows through dozens of different programs, departments, and mechanisms
- ACCO funding is often bundled into broader program categories in procurement data
- Many ACCOs receive funding from multiple government sources simultaneously, making total funding hard to reconstruct
- The distinction between direct funding to ACCOs vs funding to non-Indigenous organisations *for* Indigenous programs is rarely visible in raw procurement data

CivicGraph is beginning to make these flows visible. This matters for:

- **Community self-determination**: communities being able to see what is being spent in their name
- **Policy advocacy**: evidence base for arguing that direct ACCO funding produces better outcomes than mainstreamed service delivery
- **Accountability**: tracking whether government commitments to community-controlled organisations are actually being met
- **The Closing the Gap framework**: connecting expenditure data to outcome data

This is the specific intersection where [[civicgraph|CivicGraph]] connects to ACT's broader mission of supporting community control and Indigenous sovereignty.

---

## The AI Advantage

What makes this moment different from previous civic transparency efforts (FOI requests, parliamentary budget offices, investigative journalism) is the combination of:

1. **Scale**: AI can process the full corpus, not a sample
2. **Persistence**: AI watchdogs don't burn out, don't change beats, don't get reassigned
3. **Entity resolution**: AI can identify that "Acme Pty Ltd", "Acme Services", and "Acme Group" are the same beneficial owner across different datasets
4. **Relationship mapping**: AI can surface n-hop relationships (A funds B which employs C who is a board member of D which received a contract from A's department)
5. **Temporal analysis**: AI can track how an entity's relationships, funding, and activities change over time
6. **Natural language interface**: AI makes the data accessible to citizens, journalists, and community organisations without requiring technical expertise

The limiting factors remain data access (not all public data is machine-readable), entity resolution quality (names are messy), and the political will to act on what is surfaced.

---

## Backlinks

- [[civicgraph|CivicGraph]] — ACT's implementation of civic transparency infrastructure
- [[civic-world-model|Civic World Model]] — the conceptual framing for AI-maintained civic intelligence
- [[third-reality|The Third Reality]] — connecting structural data to human experience
- [[global-precedents|Global Precedents]] — international examples and comparators
