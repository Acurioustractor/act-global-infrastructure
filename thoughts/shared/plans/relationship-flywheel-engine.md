# The Relationship Flywheel Engine
## A self-improving machine that links every business in Australia to ACT's mission

**Date:** 2026-03-15
**Status:** Vision / Architecture
**Owner:** Benjamin Knight

---

## The Core Idea

ACT has something almost no nonprofit in Australia has: **a unified view of who funds what, who governs what, who buys what, and who you already know.** The flywheel connects your real human relationships (GHL, LinkedIn, Gmail, Calendar) to Australia's institutional graph (GrantScope: 138K entities, 296K relationships, 673K government contracts, 29K grants) and uses that to tell you exactly what to do next.

Every interaction you have feeds the model. Every grant you win or lose teaches it. Over time, it stops being a database and starts being a strategist.

---

## What You Already Have (Same Supabase)

### Your Network (ACT infra)
| Source | Records | What It Knows |
|--------|---------|---------------|
| GHL contacts | 5-20K | Names, emails, orgs, tags, pipeline stage |
| LinkedIn imports | 13,810 | Connections with company, title, industry |
| Gmail | 50K+ emails | Who you talk to, how often, sentiment |
| Calendar | Meetings | Who you meet with, frequency |
| Contact signals | Computed | Engagement velocity, response rates |
| Relationship health | Scored | LCAA stage, days since contact, warmth |
| Cultural protocols | Protected | Sacred relationship data (never syncs out) |

### Australia's Graph (GrantScope)
| Source | Records | What It Knows |
|--------|---------|---------------|
| gs_entities | 138K | Every nonprofit, foundation, company with ABN |
| gs_relationships | 296K | Who funds who, who contracts who, directorships |
| person_roles | 50K+ | Board members, directors, officeholders (ASIC) |
| gs_grants | 29K | Individual grants with amounts, dates, programs |
| austender_contracts | 673K | Government procurement (who buys what from who) |
| gs_acnc_charities | 359K | Every registered charity in Australia |
| foundations | 10K | Grant-making foundations with programs, boards |
| foundation_programs | 866 | Specific funding programs with focus areas |

### The Gap Today
These two worlds are **in the same database** but barely connected. A few scripts do basic name matching. The relationship intelligence API built today does entity-to-contact mapping. But the flywheel isn't spinning yet.

---

## The Flywheel (5 Stages)

```
    ┌──────────────────────────────────────────────┐
    │                                              │
    ▼                                              │
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌───────┐    ┌──────────┐
│ INGEST  │───▶│  LINK   │───▶│ ANALYZE  │───▶│  ACT  │───▶│  LEARN   │
│         │    │         │    │          │    │       │    │          │
│ Gmail   │    │ Contact │    │ Warm     │    │ Call  │    │ Won/lost │
│ LinkedIn│    │ ↔ Entity│    │ paths    │    │ Email │    │ feedback │
│ GHL     │    │ ↔ Board │    │ Board    │    │ Event │    │ Response │
│ Calendar│    │ ↔ Grant │    │ overlap  │    │ Social│    │ rates    │
│ Web     │    │ ↔ Govt  │    │ Funding  │    │ Intro │    │ Timing   │
│         │    │         │    │ patterns │    │       │    │          │
└─────────┘    └─────────┘    └──────────┘    └───────┘    └──────────┘
                                                               │
                                                               │
                                              Feeds back into ──┘
                                              LINK + ANALYZE
```

### Stage 1: INGEST — Get Everything In
**Already built:** Gmail sync, GHL sync, LinkedIn import, calendar sync, contact auto-creation
**To build:**
- **Continuous Gmail scan** — flag new contacts, extract intros, detect warm handoffs
- **Calendar relationship signals** — who you meet with regularly = warm relationship
- **LinkedIn activity monitor** — who's engaging with ACT content (manual import for now)
- **Event attendance tracking** — conferences, workshops, webinars (manual + GHL)

### Stage 2: LINK — Connect Your People to Australia's Graph
**Already built:** Contact enrichment engine (today), basic entity matching
**To build:**
- **ABN/company matching** — take contact's org, find it in gs_entities by name/ABN
- **Board member discovery** — "You know Sarah at Foundation X. She also sits on the board of Foundation Y which funds Indigenous programs"
- **Grant recipient mapping** — "Org X received $500K from Foundation Y last year for a youth justice program — that's your sector"
- **Government buyer mapping** — "Department Z spent $2.3M on consulting last year via austender — ACT Ventures could bid"
- **Shared director networks** — "This director sits on 3 foundation boards that all fund in your space"

### Stage 3: ANALYZE — Find the Opportunities
**Already built:** Relationship health scoring, project matching, grant pipeline
**To build:**

#### 3a. Warm Path Analysis
For any target foundation/org/person:
- **Degree 1:** You know someone there directly
- **Degree 2:** You know someone who knows someone there (shared board, shared funder, shared event)
- **Degree 3:** You know someone at an org that was funded by the same foundation
- Each path gets a **warmth score** based on: recency of contact, depth of relationship, number of touchpoints

#### 3b. Foundation Intent Modeling
- What has this foundation funded before? (gs_grants history)
- What programs do they run? (foundation_programs)
- What's their stated focus? (enrichment data)
- How does that map to ACT's 7 projects?
- **Prediction:** likelihood of funding ACT, suggested program, suggested amount range

#### 3c. Procurement Intelligence
- Which government departments buy services ACT Ventures could provide?
- What's the typical contract size, duration, procurement method?
- Who in your network has connections to those departments?
- When do contracts typically renew? (austender historical patterns)

#### 3d. Network Gap Analysis
- Where are the **structural holes** in your network? (sectors/regions with no contacts)
- Which foundations fund in your space but you have zero connection to?
- Which board members appear across multiple targets? (high-leverage introductions)

### Stage 4: ACT — Tell You What to Do
**Already built:** Daily briefing, relationship alerts, auto-followups
**To build:**

#### Weekly Playbook (automated, delivered via Telegram + email)
```
🎯 THIS WEEK'S PRIORITIES

CALL (warm paths hot right now)
├── Katie Norman (Orange Sky) — hasn't heard from you in 45 days
│   └── She knows the CEO of Foundation X which just opened applications
├── David Chen (QUT) — responded to your LinkedIn post yesterday
│   └── His dept received $1.2M from NIAA last year — intro to program manager?

EMAIL (timely outreach)
├── Foundation Y — applications close in 21 days
│   └── You know 2 board members. Draft intro email? [one-tap]
├── Department Z — contract renewal in 60 days
│   └── Last RFT was $450K for community engagement consulting

ATTEND (strategic events)
├── Impact Investing Summit (Apr 12) — 4 target foundation reps attending
├── Reconciliation Week events — 3 warm contacts speaking

POST (social media moves)
├── Tag @FoundationX in your Goods on Country impact story
│   └── Their board member Sarah liked your last 3 posts
├── Comment on David Chen's research thread about community resilience

CONNECT (new introductions to pursue)
├── Ask Katie for intro to Foundation X program manager
├── Ask Nicholas's Orange Sky network for Foundation Y contact
```

#### On-Demand "Get Me Closer" Analysis
User asks: "How do I get closer to the Paul Ramsay Foundation?"
System returns:
- Everything known about PRF (grants, programs, board, focus areas)
- Your current connections (0, 1, or 2 degrees)
- Top 3 warm paths ranked by likelihood of success
- Suggested messaging (based on PRF's stated priorities + your alignment)
- Timeline: "Their next round opens in August. Build relationship by June."

### Stage 5: LEARN — Get Smarter Over Time
**Already built:** grant_feedback table, engagement status tracking
**To build:**
- **Outcome tracking** — did the intro happen? Did the grant application succeed? Did the contract bid win?
- **Response pattern learning** — which types of outreach get responses? What day/time works best?
- **Foundation preference modeling** — after 10+ applications, learn what each foundation actually funds vs what they say they fund
- **Network ROI** — which relationships have generated the most value? Which events led to real connections?
- **Strategy refinement** — weight recommendations by what's actually worked before

---

## The Self-Improving Model

This is what makes it a flywheel, not just a dashboard:

```
Month 1:  Recommendations based on data matching alone
Month 3:  + feedback from 50 outreach attempts (what worked?)
Month 6:  + grant outcomes (which foundations actually funded us?)
Month 12: + procurement wins/losses (what makes a winning bid?)
Month 18: + network growth patterns (which events/intros led to lasting relationships?)
Month 24: The model knows your org better than any consultant
```

The system doesn't just store data — it **develops opinions**:
- "Foundation X says they fund Indigenous programs but 80% of their grants go to universities — deprioritize"
- "Your hit rate is 3x higher when Nicholas makes the intro vs cold outreach — route accordingly"
- "Government contracts under $100K have a 40% win rate; over $500K drops to 5% — focus on smaller bids"
- "Contacts engaged via events convert 2x faster than LinkedIn connections — attend more events"

---

## Technical Architecture

### What Exists Today (same Supabase, `tednluwflfhxyucgwigh`)
- `@act/contacts` package — matching, enrichment, relationships (just built)
- `relationship-intel` API — dashboard, mapping, warm paths, recommendations
- `contact-enricher` — Tavily + OpenAI + LinkedIn + GitHub + website scraping
- `contact-signals` — engagement velocity computation
- `relationship-health` — LCAA stage tracking
- GrantScope full dataset — entities, grants, directors, contracts

### What Needs Building

| Component | Effort | Dependencies |
|-----------|--------|-------------|
| **Contact → Entity linker** (ABN/name match at scale) | 1 day | gs_entities access |
| **Board network traversal** (degree-2 path finding) | 1 day | person_roles, mv_director_network |
| **Weekly playbook generator** (combines all signals into actions) | 2 days | All above |
| **Outcome tracking** (won/lost/responded/ignored) | 1 day | New table + GHL webhook |
| **Foundation intent model** (grant history → prediction) | 2 days | gs_grants analysis |
| **Procurement matcher** (austender → ACT Ventures capabilities) | 1 day | austender_contracts |
| **"Get Me Closer" query** (on-demand target analysis) | 1 day | All above |
| **Learning loop** (outcome → recommendation weight adjustment) | 2 days | Outcome tracking |
| **Telegram/email delivery** (weekly playbook push) | 0.5 day | Existing bot infra |

**Total:** ~12 days of implementation to reach full flywheel

### Data Flow
```
                    ┌─────────────┐
                    │   GHL CRM   │◄─── GHL webhooks
                    └──────┬──────┘
                           │
    ┌──────────┐    ┌──────▼──────┐    ┌──────────────┐
    │  Gmail   │───▶│  Supabase   │◄───│  GrantScope  │
    │  Calendar│    │  (shared)   │    │  entities    │
    │  LinkedIn│    │             │    │  grants      │
    └──────────┘    │  ghl_contacts│   │  directors   │
                    │  comms_hist │    │  contracts   │
                    │  rel_health │    │  foundations  │
                    └──────┬──────┘    └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Flywheel   │
                    │  Engine     │
                    │             │
                    │  Link       │
                    │  Analyze    │
                    │  Recommend  │
                    │  Learn      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──┐  ┌──────▼──┐  ┌─────▼────┐
       │ Command │  │Telegram │  │  Email    │
       │ Center  │  │  Bot    │  │ Playbook  │
       └─────────┘  └─────────┘  └──────────┘
```

---

## Why This Is Unique

No one in Australia has this combination:
1. **GrantScope's data** — 138K entities, 296K relationships, 673K government contracts
2. **Your actual CRM** — real relationships, real email history, real meeting notes
3. **AI that learns from outcomes** — not static matching, but a model that gets smarter

Clay, Apollo, Salesforce — they have contact enrichment. But they don't have Australia's grant/foundation/procurement graph. And they don't learn from YOUR specific outcomes.

This is the difference between "here's a list of foundations" and "here's exactly who to call, what to say, and when — based on everything we know about how this foundation actually behaves, who you already know there, and what's worked for you before."

**The flywheel for A Curious Tractor: every relationship you build makes the next one easier to find.**

---

## Next Steps

1. **Deploy what's built** — relationship-intel API + contact enricher are ready
2. **Run first entity linkage** — match GHL contacts to gs_entities (1 day)
3. **Build weekly playbook v1** — even without learning loop, the data-driven recommendations are valuable (2 days)
4. **Add outcome tracking** — start collecting the feedback data now so the model has history to learn from (1 day)
5. **Iterate** — each week's playbook teaches us what to add next
