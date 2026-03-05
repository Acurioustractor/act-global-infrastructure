# JusticeHub — Revenue Strategy & Sprint Plan

> **Position:** Australia's Recidiviz. The justice data platform that doesn't exist yet.
> **Revenue model:** Government contracts + institutional subscriptions + philanthropic partnerships.
> **North star:** Reduce First Nations youth incarceration by making intervention effectiveness visible, accountable, and community-led.

**Date:** March 2026

---

## The Opportunity

### Market Size

| Spending Pool | Annual Value | JusticeHub Position |
|---|---|---|
| Total government justice spending | $26.5 billion | Data & analytics layer |
| QLD Youth Justice alone | $770.9 million | First target state |
| Youth detention (per child/year) | $1.3 million | Cost JusticeHub reduces |
| Community supervision (per child/year) | ~$100K | Cost of the alternative |
| New NAJP (5-year federal package) | $3.9 billion ($780M/yr) | Procurement window NOW |
| Legal aid commissions (national) | $440+ million | Secondary buyers |
| 160+ Community Legal Centres | Unfunded (use CLASS) | Free tier users → data network |

### The Crisis That Creates Urgency

- First Nations youth are **21x more likely** to be in detention
- **60% of all youth in detention are First Nations** (6.6% of population)
- NT: **95% of detained children are Indigenous**, numbers up 74% since 2019-20
- NSW: Indigenous child detention up **86%** since 2020-21
- Only **4 of 19** Closing the Gap targets are on track
- Justice targets (10 and 11) are going **backwards**

**Translation:** Governments are spending $1.3M/child on detention and outcomes are getting worse. There is no data infrastructure telling them which interventions actually work. That's the product.

### Competitive Landscape

| Player | What They Do | Gap |
|---|---|---|
| Civica | Courts software, fines platforms ($103M VIC contract) | No community voice, no intervention tracking |
| NEC Australia | Corrections case management, biometrics | Surveillance-first, not community-led |
| CLASS (CLCs Australia) | CLC case data system | Legal aid only, no cross-agency view |
| ActionStep | Legal practice CMS | Lawyer workflow, not outcomes |
| Tyler Technologies | US courts giant ($2.3B revenue), eyeing AU/NZ | Coming but not here yet — 18-month window |
| **Recidiviz (US model)** | **17 US state partners, 40% of prison pop** | **No Australian equivalent exists** |

**JusticeHub's positioning:** Community-first Recidiviz for Australia. Co-designed with the communities most affected, not imposed on them.

---

## What's Already Built (Asset Audit)

### Working Features (Verified)

| Feature | Status | Revenue Relevance |
|---|---|---|
| **Call It Out** (NJP discrimination reporting) | Built, functional | Community reporting → aggregated data for govt |
| **Funding Operating System** | Built (workspace, discovery, applications, accountability) | Core value for grant-funded orgs |
| **Youth Scout** (goal tracking, mentor matching) | Built | Youth program tracking → outcome measurement |
| **Talent Scout** (program discovery) | Built | Intervention catalogue → effectiveness data |
| **Organization Hub** (portal per org, role-based access) | Built | Multi-tenant foundation exists |
| **Admin Dashboard** (27+ content metrics) | Built | Analytics foundation |
| **Auth System** (Supabase + Auth0 dual) | Built | User management ready |
| **Story/Content Syndication** (EL integration) | Built (infrastructure) | Narrative evidence layer |

### Technical Foundation

- **213 API routes** — substantial backend
- **233 database migrations** — mature, iterative schema
- **Organization model** — orgs table with types, members, roles
- **Activity logging** — user action tracking exists
- **AI integration** — Anthropic, Groq, ChromaDB embeddings
- **Mapping** — Leaflet + MapLibre (geographic visualization)
- **Data viz** — D3 + Recharts

### What's Missing

- **No payment/billing** — Same gap as EL and GS
- **CopWatch** — Referenced but not built (vapourware)
- **Cross-agency data integration** — The core Recidiviz-like capability
- **Intervention effectiveness dashboard** — The product governments will buy
- **Public evidence platform** — Making what works visible
- **Government-grade security/compliance** — IRAP, data sovereignty requirements

---

## Revenue Model: Three Revenue Streams

### Stream 1: Government Contracts (Primary — Year 2-3)

**The pitch:** "Your department spends $770M on youth justice and outcomes are getting worse. We built the platform that tracks which interventions actually reduce reoffending — co-designed with the communities you're trying to serve. Every child diverted from detention saves $1.2M/year."

| Contract Type | Target Buyer | Value | Timeline |
|---|---|---|---|
| Youth Justice Data Platform pilot | QLD Dept of Youth Justice | $200–500K/year | Year 2 |
| Closing the Gap reporting dashboard | Federal PM&C / NIAA | $300–800K/year | Year 2-3 |
| Intervention effectiveness analytics | NT/WA corrections departments | $150–400K/year | Year 2-3 |
| Cross-agency data integration | State attorney-generals | $500K–$1M/year | Year 3 |

**How to win:**
- Start with QLD (Ben + Nick are based there, QLD budget is $770M)
- Use Palm Island data as proof of concept
- Partner with ATSILS for credibility (they have community trust but no tech budget)
- Position as complement to existing systems (Civica, NEC) not replacement
- Leverage NAJP procurement window ($3.9B starting July 2025)

### Stream 2: Institutional Subscriptions (Secondary — Year 1-2)

**The pitch:** "Access Australia's first intervention effectiveness database. Know what works before you fund it."

| Tier | Who | Price | What They Get |
|---|---|---|---|
| **Community** | ATSILS, grassroots legal orgs, CLCs | Free forever | Full Call It Out, program discovery, basic analytics |
| **Organisation** | Mid-size NFPs, advocacy groups | $200–500/month | Funding OS, outcome tracking, API access, evidence platform |
| **Institution** | Universities, large charities, Legal Aid | $1,000–3,000/month | Full analytics, research datasets, custom reports, API |
| **Enterprise** | Government departments, consultancies | $5,000–15,000/month | Cross-agency dashboards, policy modelling, SLA, white-label |

**Early targets for Organisation/Institution tier:**
1. **National Justice Project** — Already partnered, built Call It Out for them
2. **SNAICC** — National voice for Aboriginal children, needs outcome data
3. **ANU True Justice Lab** — Research partnership, needs data access
4. **Jesuit Social Services** — Runs Turning Point program, needs outcome tracking
5. **Youth Advocacy Centre (QLD)** — Direct service provider
6. **ChangeMakers Australia** — Youth advocacy network
7. **Legal Aid QLD** — State legal aid, potential institutional customer
8. **University of NSW (Jumbunna Institute)** — Indigenous justice research

### Stream 3: Philanthropic Partnerships (Bridge — Year 1)

**The pitch:** "Fund Australia's first open justice data infrastructure. Like 360Giving for justice outcomes."

| Funder Type | Examples | Ask | What They Fund |
|---|---|---|---|
| Justice-focused foundations | Paul Ramsay Foundation, Myer Foundation, Vincent Fairfax | $100–300K/year | Platform development, community co-design |
| Tech-for-good funders | Google.org, Schmidt Futures, Patrick J. McGovern Foundation | $200–500K | AI/data infrastructure, open-source components |
| Government innovation funds | NIAA, QLD Advance Queensland | $50–200K | Pilot programs, proof of concept |

---

## Sprint Plan: JusticeHub to Revenue

### Phase 0: Position & Pitch (Months 1-2) — "Tell the Story"

**Goal:** Create the narrative and materials that win meetings.

| Task | Duration | Outcome |
|---|---|---|
| Write the "Australia's Recidiviz" positioning paper | 1 week | 5-page strategic document for decision-makers |
| Build public-facing evidence dashboard (prototype) | 2 weeks | Visual demo of intervention effectiveness data |
| Create government pitch deck | 1 week | 15-slide deck with ROI modelling |
| Identify and warm 10 institutional leads | 2 weeks | Pipeline of real conversations |
| Map QLD Youth Justice procurement pathways | 1 week | Know who to talk to and how |
| NJP + SNAICC co-design workshops | Ongoing | Community endorsement of approach |

### Phase 1: Minimum Viable Data Platform (Months 3-6) — "Prove It Works"

**Goal:** Working prototype that demonstrates intervention tracking with real data.

| Sprint | Duration | Focus | Outcome |
|---|---|---|---|
| JH-1.1 | 3 weeks | Intervention effectiveness dashboard | Visual proof of what works |
| JH-1.2 | 2 weeks | Call It Out → aggregated insights pipeline | Discrimination data → systemic evidence |
| JH-1.3 | 3 weeks | Cross-agency data model (design) | Architecture for stitching police/courts/corrections |
| JH-1.4 | 2 weeks | Stripe + billing (replicate EL pattern) | Payment rails ready |
| JH-1.5 | 2 weeks | Public evidence platform | Open data for researchers/advocates |
| JH-1.6 | Ongoing | Government engagement (QLD first) | First pilot conversation |

### Phase 2: Government Pilot (Months 7-12) — "Land the First Contract"

**Goal:** Signed pilot with QLD Youth Justice or equivalent.

| Sprint | Focus | Outcome |
|---|---|---|
| JH-2.1 | QLD Youth Justice data integration pilot | Real government data flowing |
| JH-2.2 | Closing the Gap reporting module | Automated progress tracking |
| JH-2.3 | IRAP-ready security hardening | Government compliance |
| JH-2.4 | Multi-agency data sharing framework | Technical + governance model |
| JH-2.5 | Institutional customer acquisition (5 orgs) | $60K+ ARR |

### Phase 3: Scale (Months 13-24) — "National Platform"

| Focus | Target |
|---|---|
| Expand to NT, WA, NSW | 3+ state partnerships |
| Federal Closing the Gap contract | $300–800K/year |
| Research partnerships (ANU, UNSW, UQ) | Data validation + academic credibility |
| Open evidence platform launch | Public good positioning |
| International interest (NZ, Canada) | Expansion pathway |

---

## Revenue Projections

### Conservative

| Year | Institutional SaaS | Govt Contracts | Philanthropy | Total |
|---|---|---|---|---|
| Y1 | $30K (5 orgs) | $0 | $150K | $180K |
| Y2 | $120K (15 orgs) | $200K (1 pilot) | $100K | $420K |
| Y3 | $300K (30 orgs) | $600K (2-3 contracts) | $50K | $950K |

### Moderate (with Recidiviz-style growth)

| Year | Institutional SaaS | Govt Contracts | Philanthropy | Total |
|---|---|---|---|---|
| Y1 | $50K | $0 | $250K | $300K |
| Y2 | $200K | $400K | $150K | $750K |
| Y3 | $500K | $1.2M | $100K | $1.8M |

### Why Governments Will Pay

**The ROI is irresistible:**

| Scenario | Cost Without JH | Cost With JH | Saving |
|---|---|---|---|
| Divert 1 youth from detention to community | $1.3M/year | $100K/year + $50K platform | **$1.15M/year** |
| Divert 10 youth (small pilot) | $13M/year | $1M + $200K platform | **$11.8M/year** |
| Divert 50 youth (state-wide) | $65M/year | $5M + $500K platform | **$59.5M/year** |

A single diverted child pays for the platform 23x over. No government procurement officer can argue with that ROI.

---

## The Recidiviz Playbook (What We Can Learn)

Recidiviz grew from a YC startup to partnering with 17 US states (40% of US prison population). Their model:

1. **Started with publicly available data** — didn't wait for government partnerships
2. **Built tools governments couldn't refuse** — free dashboards, then upsold contracts
3. **Non-profit structure** — removed procurement barriers (no profit motive concern)
4. **Co-designed with corrections professionals** — not imposed from outside
5. **Revenue mix:** ~40% government contracts, ~60% philanthropy (shifting toward govt)

**ACT's advantage over Recidiviz:**
- Community-led design (Recidiviz is technocrat-built, not community-first)
- First Nations cultural authority (OCAP, Elder review — governments need this)
- Dual-entity structure (Foundation for credibility, Ventures for contracts)
- Already has community relationships (PICC, Oonchiumpa, NJP)

---

## Strategic Partnerships for JusticeHub

| Partner | What They Bring | What JH Brings | Status |
|---|---|---|---|
| **National Justice Project** | Legal credibility, advocacy voice, existing tools | Tech platform, data infrastructure | Active (Call It Out built) |
| **SNAICC** | National authority on Aboriginal children, sector reach | Outcome data, Closing the Gap dashboards | Connected |
| **ATSILS (national)** | Community trust, cultural authority, case data | Technology they can't afford to build | To approach |
| **Legal Aid QLD** | Government funding, institutional weight | Innovation, data analytics | To approach |
| **ANU True Justice Lab** | Academic validation, research methodology | Platform, data access, community connections | Connected |
| **QLD Youth Justice Dept** | Budget ($770M), policy authority, data | Platform, community co-design, intervention evidence | To approach |
| **Recidiviz** | US model validation, technical patterns, network | Australian expansion partner, community-first approach | To approach |

---

## Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Government procurement is slow (12-18 months) | High | Philanthropy + institutional SaaS fund the wait |
| Data sovereignty concerns | High | OCAP compliance already built into EL (leverage for JH) |
| Competitor enters (Tyler Technologies eyeing AU) | Medium | 18-month first-mover window, community relationships can't be replicated |
| ATSILS can't partner (unfunded, capacity-limited) | Medium | Partner model — JH provides tech, ATSILS provides authority |
| Community resistance to data collection | High | Co-design from day one, community ownership of data |
| IRAP compliance cost for government contracts | Medium | Budget $50–100K for security assessment in Year 2 |

---

## Immediate Next Steps

1. **[ ] Write "Australia's Recidiviz" 5-page positioning paper** — The document that opens doors
2. **[ ] Map QLD Youth Justice procurement** — Who decides? What's the process? Budget cycles?
3. **[ ] Schedule NJP strategy session** — Align on JusticeHub direction, CopWatch priority
4. **[ ] Identify 3 philanthropic funders** — Paul Ramsay Foundation, Myer, Google.org
5. **[ ] Build intervention effectiveness prototype** — Visual demo using existing JH data
6. **[ ] Approach Recidiviz** — Learn from their model, explore AU partnership

---

## The Bottom Line

JusticeHub is not a "concept" — it's a substantially built platform (213 API routes, 233 migrations, working features) sitting in front of the biggest market gap in Australian justice tech. Nobody is building this. Governments are spending $1.3M per detained child and outcomes are getting worse.

The Recidiviz model proves this can work at scale. ACT's community-first approach is what makes it defensible. The $3.9B NAJP creates a procurement window. The Closing the Gap targets going backwards creates political urgency.

**JusticeHub doesn't just have opportunity to charge organisations. It has opportunity to be the infrastructure that governments can't afford NOT to buy.**

Revenue path:
- **Year 1:** $180–300K (philanthropy + early institutional customers)
- **Year 2:** $420–750K (first government pilot + growing SaaS)
- **Year 3:** $950K–$1.8M (multiple state contracts + national platform)

Combined with EL ($500K–$1M) and GrantScope ($400K–$800K) at Year 3, the ecosystem reaches **$1.8M–$3.6M ARR** — financially independent, community-owned, and solving problems worth $26.5 billion.
