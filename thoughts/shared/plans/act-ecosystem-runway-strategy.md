# ACT Ecosystem — 3-Year Runway to Financial Independence

> **Goal:** Build the runway so ACT's platforms pay for themselves in perpetuity. Those who can pay, pay — so communities who can't, never have to. Protect community ownership. Design for generational wealth.

**Date:** March 2026
**Authors:** Benjamin Knight, Nicholas Marchesi OAM

---

## Executive Summary

ACT has built four interconnected platforms sitting on top of **$28 billion** in annual government and philanthropic spending. The platforms are real, deployed, and solving real problems. What's missing is the revenue layer.

This strategy maps a 3-year path from grant-dependent to self-sustaining, using a **cross-subsidy model**: institutions and well-resourced organisations pay for premium access, which funds free access for excluded communities. The model mirrors ACT's values — those with capacity support those without.

**The numbers:**
- **Year 1:** $150K–$300K revenue (R&D refund + first paying customers + grants)
- **Year 2:** $500K–$1M ARR (20–50 paying orgs across platforms)
- **Year 3:** $1.5M–$3M ARR (100+ orgs, government contracts, potential acquisition interest)

**The insurance policy:** R&D Tax Incentive returns 43.5% of eligible dev spend as cash. At $200K spend = $87K cash back. This funds the runway while revenue ramps.

---

## Part 1: What We're Sitting On

### Total Addressable Market

| Spending Pool | Annual Value | ACT Platform |
|--------------|-------------|-------------|
| Government grants distributed | $23 billion | GrantScope |
| Philanthropic giving | $13 billion | GrantScope |
| Youth justice spending | $1.7 billion | JusticeHub |
| Legal aid / advocacy | $730 million | JusticeHub |
| Cultural heritage / GLAM | $2.5 billion | Empathy Ledger |
| Indigenous Languages & Arts | $37–48 million | Empathy Ledger |
| Community services total | $103.9 billion | All platforms |
| **Total addressable spending** | **~$145 billion** | |

### Serviceable Market (What We Can Actually Capture)

| Platform | Serviceable Market | Revenue Model |
|----------|-------------------|---------------|
| GrantScope | $5–15M/year | SaaS subscriptions for grantmakers + grant seekers |
| Empathy Ledger | $10–30M/year | Platform fees for cultural orgs, corporates, government |
| JusticeHub | $5–20M/year | Data subscriptions, government contracts |
| **Combined** | **$20–65M/year** | |

### Comparable Companies

| Company | What They Do | Revenue | Valuation |
|---------|-------------|---------|-----------|
| Instrumentl | Grant discovery (US) | Growing rapidly | $55M raised (2025) |
| Blackbaud | Nonprofit software | $1.15B/year | $2.28B market cap |
| SmartyGrants | Grant management (AU) | Dominant in AU | Private (Our Community) |
| Change.org | Civic petitions | Self-sustaining | 100% nonprofit-owned PBC |

**Key insight:** Instrumentl raised $55M to do for US grants what GrantScope does for Australia. Blackbaud proves nonprofit SaaS is a billion-dollar market. There is no Australian equivalent — we're building it.

---

## Part 2: Product Readiness (Where We Actually Are)

| Product | Completeness | Multi-Tenant | Payments | Time to First Revenue |
|---------|-------------|-------------|---------|----------------------|
| **Empathy Ledger** | 95% | Yes | None | 4–6 weeks |
| **GrantScope** | 65% | No | None | 8–10 weeks |
| **JusticeHub** | 70% (213 API routes, 233 migrations) | Yes (org model exists) | None | 3–6 months (govt pilot path) |
| **Command Center** | 50% | No | None | 12–16 weeks (extract components) |

### Empathy Ledger — Ready Now
- 131 components, 60+ API endpoints, 45+ database tables
- Full OCAP compliance, Elder review workflows, consent architecture
- Multi-tenant with RLS, organisation isolation, role-based access
- **Gap:** No billing. Add Stripe + pricing tiers = paid product.

### GrantScope — 4 Months to SaaS
- 14,000+ grants, 9,800+ foundations, 360K ACNC records
- AI enrichment pipeline working (multi-provider LLM rotation)
- **Gap:** Zero user accounts. Needs auth, multi-tenant redesign, API layer, billing.

### JusticeHub — Strategic Asset, Not Yet Built
- 1,000+ interventions catalogued, NJP tools mapped
- Strongest government contract potential ($1.7B spend, 24x overrepresentation)
- **Gap:** Everything. Needs strategy-first approach, likely built on EL codebase.

---

## Part 3: Revenue Model — The Cross-Subsidy Engine

### Principle: Power Take-Off (PTO)

Those with institutional power and resources pay for access. That payment funds free access for communities who need it most. The paying customers get genuine value — not charity. The free tier isn't limited — it's the full platform.

### Tier Structure (Per Platform)

| Tier | Who | Price | What They Get |
|------|-----|-------|--------------|
| **Community** | First Nations orgs, grassroots, <$500K budget | Free forever | Full platform, sovereign data, cultural protocols |
| **Organisation** | NFPs, charities, $500K–$5M budget | $200–500/month | Full platform + analytics, API access, priority support |
| **Institution** | Government, universities, large NFPs | $1,000–5,000/month | Full platform + white-label, custom integrations, SLA |
| **Enterprise** | Corporates, consulting firms | $5,000–15,000/month | Full platform + API, bulk data, ESG reporting, custom |

### Revenue Projections

**Conservative (Year 1–3):**

| Year | Community (free) | Org ($350/mo avg) | Institution ($2.5K/mo) | Enterprise ($8K/mo) | ARR |
|------|-----------------|-------------------|----------------------|--------------------|----|
| Y1 | 10 | 5 | 2 | 0 | $81K |
| Y2 | 25 | 15 | 5 | 2 | $405K |
| Y3 | 50 | 40 | 12 | 5 | $888K |

**Moderate (with GrantScope + JusticeHub revenue):**

| Year | EL Revenue | GS Revenue | JH Revenue | R&D Refund | Grants | Total |
|------|-----------|-----------|-----------|-----------|--------|-------|
| Y1 | $81K | $0 | $0 | $87K | $150K | $318K |
| Y2 | $250K | $120K | $50K | $87K | $100K | $607K |
| Y3 | $500K | $400K | $200K | $130K | $50K | $1.28M |

**Aggressive (with government contracts):**

| Year | SaaS Revenue | Govt Contracts | R&D Refund | Total |
|------|-------------|---------------|-----------|-------|
| Y1 | $81K | $0 | $87K | $168K |
| Y2 | $420K | $200K | $87K | $707K |
| Y3 | $1.1M | $500K | $130K | $1.73M |

---

## Part 4: R&D Tax Incentive — The Runway Funder

### How It Works

ACT Ventures (Pty Ltd) spends money on eligible R&D. The ATO returns **43.5%** as cash — even if we make zero revenue.

| R&D Spend | Cash Refund (43.5%) | Net Cost |
|-----------|-------------------|---------|
| $100,000 | $43,500 | $56,500 |
| $200,000 | $87,000 | $113,000 |
| $300,000 | $130,500 | $169,500 |
| $500,000 | $217,500 | $282,500 |

### Eligible R&D Activities (Ranked by Strength)

1. **Empathy Ledger** — consent-first data sovereignty architecture (genuinely novel, no existing solutions)
2. **GrantScope** — AI enrichment pipeline, multi-provider LLM architecture, embedding-based semantic search
3. **Community data sovereignty tools** — novel technical territory, no established patterns
4. **JusticeHub** — privacy-preserving analytics, systemic evidence aggregation

### Critical Structure Decision

**The CLG (ACT Foundation) cannot claim the refundable R&D offset.** Tax-exempt entities get zero benefit.

**ACT Ventures (Pty Ltd)** is the correct vehicle — BUT only if it is **not controlled (50%+) by the Foundation**. If the Foundation controls Ventures, Ventures only gets non-refundable offset (useless without taxable income).

**Action required:** Review ACT Foundation / ACT Ventures control relationship with a tax advisor immediately. If Ventures is Foundation-controlled, restructure before claiming.

### Timeline

| Date | Action |
|------|--------|
| **Now** | Start tracking developer time on R&D activities (git commits + time logs) |
| **30 June 2026** | End of FY26 — first eligible claim period |
| **30 April 2027** | Deadline to register FY26 R&D activities with AusIndustry |
| **When lodging FY26 tax return** | Include R&D Tax Incentive Schedule |
| **4–8 weeks after lodging** | Receive cash refund |

### Minimum Spend

$20,000 per financial year. We're well above this already.

---

## Part 5: The 3-Year Sprint Plan

### Phase 1: Foundation (Months 1–6) — "Build the Engine"

**Goal:** First paying customers on Empathy Ledger. R&D tracking started. GrantScope user layer designed.

| Sprint | Duration | Focus | Outcome |
|--------|----------|-------|---------|
| 1.1 | 2 weeks | Stripe integration for Empathy Ledger | Payment processing live |
| 1.2 | 2 weeks | Pricing page + tier management UI | Self-serve subscription |
| 1.3 | 2 weeks | Self-serve org signup flow | Orgs can onboard without ACT |
| 1.4 | 2 weeks | Usage metering (storage, stories, API calls) | Tier enforcement works |
| 1.5 | 4 weeks | First 3 paying org customers (outreach) | Revenue starts |
| 1.6 | 4 weeks | GrantScope: Auth system + user accounts | Foundation for paid GS |
| 1.7 | 4 weeks | GrantScope: Multi-tenant DB redesign | Org isolation works |
| 1.8 | Ongoing | R&D time tracking + documentation | Claim-ready by June |

**Key hires/costs:**
- R&D tax advisor engagement: $5–10K (one-time)
- Stripe/billing infrastructure: $0 (self-build)
- Marketing/outreach: $2–5K
- **Total Phase 1 investment:** $10–20K

**Revenue target:** 2–5 paying EL organisations = $4–30K ARR

### Phase 2: Growth (Months 7–12) — "Prove the Model"

**Goal:** 10+ paying customers. GrantScope launched as paid product. First government conversations.

| Sprint | Duration | Focus | Outcome |
|--------|----------|-------|---------|
| 2.1 | 4 weeks | GrantScope: REST API + documentation | Developer-ready API |
| 2.2 | 4 weeks | GrantScope: Pricing + Stripe integration | Paid tiers live |
| 2.3 | 4 weeks | GrantScope: Premium features (alerts, saved searches, analytics) | Value differentiation |
| 2.4 | Ongoing | EL customer expansion (NFP sector outreach) | 10+ paying orgs |
| 2.5 | 4 weeks | JusticeHub: Strategy + architecture planning | Clear product roadmap |
| 2.6 | 4 weeks | Government engagement (QLD/NT youth justice depts) | Pipeline started |
| 2.7 | Q4 | Lodge first R&D Tax Incentive claim | $43–87K cash refund |

**Revenue target:** $150–300K (SaaS + R&D refund + grants)

### Phase 3: Scale (Months 13–24) — "Institutional Adoption"

**Goal:** 50+ paying organisations. Government pilot contract. Acquisition-ready if the right buyer appears.

| Sprint | Duration | Focus | Outcome |
|--------|----------|-------|---------|
| 3.1 | 8 weeks | JusticeHub: MVP build (on EL codebase) | Working prototype |
| 3.2 | 8 weeks | JusticeHub: NJP integration (Call It Out, CopWatch) | Community reporting live |
| 3.3 | Ongoing | Government pilot (youth justice data platform) | First govt contract |
| 3.4 | 4 weeks | Enterprise tier launch (corporate ESG/impact) | High-value customers |
| 3.5 | Ongoing | GrantScope: National coverage + foundation outreach | 100+ foundation users |
| 3.6 | 4 weeks | Cross-platform dashboard (civic intelligence layer) | Unified offering |
| 3.7 | Ongoing | Partnership development (universities, SNAICC, NJP) | Ecosystem growth |

**Revenue target:** $500K–$1.5M ARR

### Phase 4: Independence (Months 25–36) — "Generational Wealth"

**Goal:** Self-sustaining revenue. Grant dependency near zero. Strategic options open (grow, partner, or partial exit).

| Focus Area | Target |
|-----------|--------|
| Empathy Ledger ARR | $500K–$1M |
| GrantScope ARR | $400K–$800K |
| JusticeHub ARR + Govt contracts | $200K–$500K |
| R&D Tax Refund | $130K+ |
| **Total annual revenue** | **$1.3M–$2.5M** |
| Grant dependency | <10% of revenue |
| Team size | 3–5 people |
| Burn rate | $50–80K/month |
| Runway | Indefinite (profitable) |

---

## Part 6: Exit / Partnership Strategy

### The Principle

ACT designs for its own obsolescence. Communities own and operate independently. Any exit must preserve this.

### Strategic Options at Year 3

| Option | What | Who | Protections |
|--------|------|-----|------------|
| **Keep building** | Continue growing revenue, expand platforms | ACT | Full control |
| **Strategic partnership** | Major partner funds growth in exchange for distribution | Blackbaud, Salesforce.org, TechSoup | Mission-lock in agreement |
| **Partial platform sale** | Sell GrantScope (most commercial) to fund EL + JH | PE firm, SaaS acquirer | Ring-fence community platforms |
| **Impact investment** | Raise growth capital from impact investors | Giant Leap, Airtree Impact | PBC structure, mission-lock |
| **Government partnership** | Become official infrastructure (like SmartyGrants for grants) | State/Federal govt | Public good mandate |

### Valuation Indicators

SaaS companies typically valued at 5–10x ARR:
- At $1M ARR = $5–10M valuation
- At $2.5M ARR = $12.5–25M valuation
- GrantScope alone (Australian 360Giving, no competition) could be worth $5–10M

### Mission Protection

Any deal must include:
1. **Community tier stays free forever** — non-negotiable
2. **Data sovereignty maintained** — communities own their data
3. **Open-source core** — playbook and base platform remain open
4. **ACT retains cultural governance role** — Elder review, OCAP compliance
5. **40% profit-sharing** maintained (ACT Ventures structure)

---

## Part 7: People & Resources

### Current Team
- **Benjamin Knight** — Systems designer, all platforms built
- **Nicholas Marchesi OAM** — Operations, community relationships, scaling

### Key Hires (Year 1–2)

| Role | When | Cost | Why |
|------|------|------|-----|
| R&D Tax Advisor | Month 1 | $5–10K (one-time) | Maximise R&D refund, structure advice |
| Part-time BD/Sales | Month 3 | $40–60K/year | Customer acquisition for EL + GS |
| Part-time Developer | Month 6 | $60–80K/year | Accelerate GrantScope + JusticeHub |
| Accountant (Xero) | Ongoing | $5K/year | Financial management, R&D compliance |

### Key Partnerships

| Partner | Value | Status |
|---------|-------|--------|
| Palm Island Community Company | Proof of concept, cultural authority | Active |
| Oonchiumpa | Cross-cultural proof, youth outcomes | Active |
| National Justice Project | JusticeHub integration, legal sector access | Active |
| SNAICC | Sector credibility, conference platform | Connected |
| ANU (True Justice) | Academic validation, research partnerships | Connected |
| 360Giving (UK) | Model for GrantScope, potential tech partnership | To approach |

---

## Part 8: Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| ACT Ventures controlled by Foundation (blocks R&D refund) | High | Review structure immediately with tax advisor |
| Slow customer acquisition | Medium | Start with warm network (PICC, Oonchiumpa, SNAICC contacts) |
| GrantScope rebuild takes longer | Medium | Phase it — API first, full SaaS later |
| Government procurement is slow | High | Don't depend on it in Year 1. SaaS revenue first. |
| Mission drift from commercial pressure | High | PBC structure, mission-lock, community board representation |
| Competitor enters Australian market | Low | First-mover advantage, community relationships can't be replicated |
| Key person risk (Ben builds everything) | High | Document, open-source core, hire dev in Year 1 |

---

## Immediate Next Steps (This Week)

1. **[ ] Review ACT Foundation / ACT Ventures control structure** — Critical for R&D Tax Incentive. Talk to accountant.
2. **[ ] Start R&D time tracking** — Simple: tag git commits + log hours against platform projects.
3. **[ ] Empathy Ledger: Scope Stripe integration** — 2-week sprint to add billing.
4. **[ ] Identify 5 warm-lead organisations for EL paid tier** — PICC, Oonchiumpa contacts, SNAICC network.
5. **[ ] Engage R&D tax advisor** — $5–10K investment for $87K+ return.
6. **[ ] Register on Mannifera portal** — Submit grant application by 5pm tomorrow.

---

## The Bottom Line

ACT is sitting on platforms that address $28 billion in annual spending. The technology is built. The proof of concept is live. The market has no Australian competitor for any of these platforms.

The 3-year path is clear:
1. **Year 1:** Monetise Empathy Ledger (ready now) + R&D refund = $150–300K
2. **Year 2:** Launch GrantScope SaaS + first government conversations = $500K–$1M
3. **Year 3:** JusticeHub + institutional customers + government contracts = $1.5M–$3M

At Year 3, ACT has options: keep growing, take impact investment, sell the most commercial platform (GrantScope) to fund the mission platforms, or partner with a global player.

The cross-subsidy model means this never becomes extractive. Communities always get free access. Institutions pay because the platforms are genuinely valuable — not because they're donating.

**Democracy isn't a lesson. It's a practice. And now it has a business model.**
