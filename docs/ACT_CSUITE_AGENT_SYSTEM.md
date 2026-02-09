# ACT C-Suite Agent System
## Strategic Architecture & Build Specification

**Created:** 2026-02-07
**Status:** Architecture Complete → Ready to Build
**Author:** Benjamin Knight — Founder, ACT

---

## 1. The Vision

ACT already has an operational agent layer — eight domain agents (Ralph, Scout, Scribe, Ledger, Cultivator, Shepherd, Oracle, Herald) that execute tasks across finance, relationships, content, research, and projects. What's missing is a **strategic layer**: agents that think like executives, notice what the system doesn't know yet, and actively pull knowledge out of the founder to make the whole ecosystem smarter.

The C-Suite Agent System introduces **five executive-level agents** that sit above the operational layer. They don't replace the existing agents — they **direct** them, **interview** the founder to fill knowledge gaps, and **coordinate** across domains to surface insights that no single agent could find alone.

> **The core loop:** Each agent maintains a *knowledge-gaps model* — things it knows it doesn't know. It interviews Ben to fill those gaps, stores answers as structured context, and shares that context with every other agent. Over time, the gaps shrink and the agents shift from interviewing to advising.

---

## 2. Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  STRATEGIC LAYER (C-Suite Agents)                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  CEO Agent   │  │  CFO Agent   │  │  CDO Agent   │          │
│  │  Strategist  │  │  Finance     │  │  Storyteller  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│  ┌──────┴───────┐  ┌──────┴───────┐                             │
│  │  CMO Agent   │  │    Brand     │                             │
│  │  Growth      │  │   Manager    │                             │
│  └──────┬───────┘  └──────┬───────┘                             │
│         │                 │                                      │
│         ▼                 ▼                                      │
│    Directs operational agents below                              │
├──────────────────────────────────────────────────────────────────┤
│                OPERATIONAL LAYER (Domain Agents)                 │
│                                                                  │
│  Ralph    Scout     Scribe    Ledger                            │
│  (Tasks)  (Research) (Content) (Finance Ops)                    │
│                                                                  │
│  Cultivator  Shepherd   Oracle    Herald                        │
│  (Relations) (Projects) (Knowledge) (Comms)                     │
└─────────────────────────────────────────────────────────────────┘
```

Strategic agents set direction and identify gaps. Operational agents execute. The CEO agent doesn't write blog posts — it tells Scribe what topics matter this quarter based on ACT's strategic priorities.

---

## 3. Agent Profiles

### 3.1 CEO Agent — Chief Strategist

**Role:** Owns the vision graph. Knows ACT's 3-year plan, current priorities, decision frameworks, and what keeps Ben up at night. Every other agent references this as their north star. The meta-agent that all others depend on.

**Data Sources:**
- Notion: Strategic docs, project briefs, meeting notes
- Google Calendar: Time allocation patterns, meeting context
- Gmail: Key correspondence, partnership discussions
- GitHub: Project velocity, what's being built vs. what's planned
- All other C-Suite agents: Synthesises their domain insights

**Interview Questions:**
- What does success look like for ACT in 2028?
- Of your 50 projects, which 5 would you invest everything in if forced to choose?
- What partnerships would transform ACT's trajectory?
- What are you saying no to right now, and does that feel right?
- If you hired your first employee tomorrow, what would they do?
- What decisions are you avoiding? What would make them easier?
- Which project has the highest ratio of potential impact to current investment?

**Key Outputs:**
- Strategic Priority Matrix (updated quarterly)
- Decision Log: what was decided, why, what was considered
- Knowledge Graph: structured context all agents can query
- Weekly Strategic Brief: what changed, what needs attention
- Directs: Scout (research priorities), Shepherd (project focus)

---

### 3.2 CFO Agent — Financial Strategist

**Role:** Sits on top of Ledger and Xero but thinks about cash flow strategy, not just transactions. Connects financial reality to strategic intent. Notices spending patterns, flags risks, and asks about pricing decisions.

**Data Sources:**
- Xero: Invoices, payments, receipts, P&L, balance sheet
- Ledger Agent: Transaction categorisation, receipt matching
- Supabase: Subscription tracking, recurring revenue
- CEO Agent: Strategic priorities (for budget allocation)
- R&D Tax Incentive: Eligible activity tracking

**Interview Questions:**
- What's your target monthly revenue for ACT by end of 2026?
- How do you think about pricing for each project? Cost-plus, value-based, community?
- Which projects should be revenue-generating vs. grant-funded vs. pro-bono?
- You haven't reconciled receipts in 3 weeks — are there expenses I should know about?
- What's the R&D tax incentive claim looking like? Which activities qualify?
- What financial risks keep you up at night?
- How much runway does ACT have at current burn rate?

**Key Outputs:**
- Monthly Financial Health Report (auto-generated from Xero)
- Budget vs. Actual by project code
- Cash Flow Forecast (3-month rolling)
- R&D Eligibility Tracker for tax claims
- Directs: Ledger (transaction processing), flags to CEO (budget decisions)

---

### 3.3 CDO Agent — Chief Storyteller / Data Officer

**Role:** The storyteller relationship brain. Not just "who haven't we contacted" (Cultivator does that) but which stories are we missing, which narratives are gaining traction, where's the impact evidence weak. Thinks about the Empathy Ledger as a portfolio of stories with strategic value.

**Data Sources:**
- Empathy Ledger: Story database, ALMA analysis, Content Hub
- Cultivator Agent: Relationship health scores, contact history
- GHL: Contact records, communication logs, storyteller tags
- Notion: Story briefs, production schedules, impact notes
- CMO Agent: What narratives are performing (for amplification)

**Interview Questions:**
- Which storytellers haven't we checked in with in 60+ days?
- What stories are we missing from the portfolio? Geographic gaps? Thematic gaps?
- How do we measure impact for each story? What evidence would be compelling?
- Which stories have the most potential for partnership or funding leverage?
- What's the consent and ethics review process looking like?
- Are there stories that connect across projects (JusticeHub + Empathy Ledger)?
- What does the ideal storyteller pipeline look like at scale?

**Key Outputs:**
- Storyteller Portfolio Dashboard: who, what stage, last contact, impact score
- Narrative Gap Analysis: what's missing from the collection
- Cross-Project Story Map: where narratives connect across ACT ecosystem
- Impact Evidence Tracker: metrics, testimonials, outcomes per story
- Directs: Cultivator (outreach), Scribe (story content), Scout (story research)

---

### 3.4 CMO Agent — Growth & Marketing Strategist

**Role:** Brand positioning, content pipeline, channel strategy. Knows what's been posted across GHL social accounts, what's performing, what the audience looks like. Connects storyteller narratives to amplification strategy.

**Data Sources:**
- GHL: Social accounts (LinkedIn, YouTube, Google Business, Bluesky)
- Webflow: Website analytics, page performance
- Scribe Agent: Content pipeline, drafts in progress
- CDO Agent: Which narratives to amplify
- CEO Agent: Strategic priorities for messaging
- Google Analytics: Traffic, conversion, audience data

**Interview Questions:**
- Who is ACT's primary audience right now? Who do you want it to be?
- Which channel is most important: LinkedIn, email, community, events?
- What content has resonated most in the last 6 months? What flopped?
- How do you want partners to discover ACT? What's the ideal journey?
- Which of the 7 projects needs the most visibility right now?
- What's the relationship between ACT the organisation and ACT the brand?
- Are there events, conferences, or moments we should be building around?

**Key Outputs:**
- Content Calendar: what's publishing where, when, and why
- Channel Performance Dashboard: engagement metrics across platforms
- Audience Insight Report: who's engaging, what they care about
- Amplification Recommendations: which CDO stories to push, where
- Directs: Scribe (content creation), Herald (distribution), Scout (competitor research)

---

### 3.5 Brand Manager — Voice Guardian

**Role:** The consistency agent. Makes sure everything going out across all 7 projects sounds like ACT. Reviews content before it ships. Maintains the brand guide and LCAA framework as living knowledge. Catches drift before it becomes a problem.

**Data Sources:**
- All 7 codebases: Frontend copy, UI text, marketing pages
- Scribe Agent: Content drafts for review
- Herald Agent: Communications for tone check
- Brand Guidelines: LCAA framework, voice/tone docs
- Webflow: Live site content across ACT + JusticeHub sites

**Interview Questions:**
- If ACT were a person at a dinner party, how would they speak?
- What language should ACT never use? What words feel wrong?
- How does tone shift between projects? Empathy Ledger vs. Goods vs. JusticeHub?
- What's the LCAA framework and how should it show up in every touchpoint?
- Are there brand moments where ACT's voice has been perfect? What made them work?
- How do we talk about First Nations collaboration with appropriate respect?
- What visual and verbal patterns tie the ecosystem together?

**Key Outputs:**
- Living Brand Guide: tone, voice, vocabulary, visual patterns
- Content Review Queue: pre-publish brand alignment checks
- Brand Consistency Audit: periodic scan across all projects
- LCAA Framework Reference: how the method shows up in every context
- Reviews output from: Scribe, Herald, CMO before publication

---

## 4. The Interview Engine

The most powerful feature of the C-Suite system is the interview loop. This is how the agents get smarter over time.

### How It Works

**Step 1 — Knowledge Gap Detection:** Each agent maintains a structured model of what it knows and what it doesn't. When the CEO agent has never been told ACT's 3-year revenue target, that's a gap. When the CDO agent doesn't know the consent process for storytellers, that's a gap. Gaps are ranked by importance: how many other agents or decisions depend on this information?

**Step 2 — Interview Sessions:** When Ben has time for a structured session, an agent presents its top 3-5 knowledge gaps as focused questions. Ben's answers are stored as structured context with timestamps, confidence levels, and cross-references to related knowledge. A 15-minute session with the CEO agent might fill 10 knowledge gaps that unlock insights for 3 other agents.

**Step 3 — Conversational Capture:** Outside structured sessions, agents passively listen to Ben's conversations (in Cowork, Discord, meeting transcripts) and capture relevant insights. If Ben mentions in a meeting that The Harvest CSA needs 50 more subscribers, the CMO agent logs that as a growth target without needing a formal interview.

**Step 4 — Async Daily Prompts:** Each morning brief includes 1-2 questions from the agent with the highest-priority knowledge gaps. Over coffee, Ben answers a CDO question about storyteller pipeline and a CFO question about Q2 budget expectations. Takes 2 minutes, fills critical gaps.

**Step 5 — Cross-Agent Propagation:** When the CEO agent learns that ACT's top priority this quarter is Empathy Ledger partnerships, that context automatically propagates. The CMO agent adjusts content priorities. The CFO agent reallocates budget attention. The CDO agent identifies which storytellers to feature. One answer cascades across the entire system.

### Knowledge Storage Schema

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID PK | Unique identifier |
| `domain` | TEXT | Which agent captured this (ceo, cfo, cdo, cmo, brand) |
| `topic` | TEXT | Structured topic tag (e.g. 'revenue_targets', 'storyteller_pipeline') |
| `question` | TEXT | The question that was asked |
| `answer` | TEXT | Ben's response, stored as structured text |
| `confidence` | INT (1-5) | How confident is Ben in this answer |
| `source` | TEXT | interview, conversation, async |
| `expires_at` | TIMESTAMPTZ | When to re-ask (knowledge decay) |
| `depends_on` | UUID[] | References to related knowledge |
| `unlocks` | TEXT[] | Decisions/insights this enables |
| `created_at` | TIMESTAMPTZ | When captured |
| `updated_at` | TIMESTAMPTZ | Last modified |

---

## 5. Cross-Agent Intelligence

The real power is not individual agents — it's the intelligence that emerges when they share context.

### Loop 1: Story → Strategy
CDO notices a storyteller's narrative is gaining traction → tells CMO to amplify it across channels → CMO reports engagement metrics back → CDO tells CEO this narrative resonates → CEO flags it as a potential partnership hook → CFO allocates budget for expansion. **A single story insight cascades into strategic action.**

### Loop 2: Finance → Focus
CFO notices a project is consuming 40% of spend but generating 10% of outcomes → flags to CEO as a resource allocation question → CEO interviews Ben about whether this is intentional investment or drift → decision propagates to all agents. **Shepherd reprioritises. CMO adjusts messaging. CDO shifts storyteller focus.**

### Loop 3: Brand → Content
Brand Manager scans all 7 project websites and finds JusticeHub tone has drifted from the LCAA framework → flags to CMO for content review → CMO asks Scribe to rewrite key pages → Brand Manager reviews the rewrites before publish. **Quality control loop that runs continuously.**

### Loop 4: Gap → Opportunity
CDO identifies a geographic gap in the storyteller portfolio (no stories from regional NSW) → tells CEO this represents an unserved community → CEO connects it to a potential partnership with a regional organisation → CMO develops outreach messaging → Cultivator executes the relationship building. **A knowledge gap becomes a growth opportunity.**

### Loop 5: Calendar → Capacity
CEO agent analyses Google Calendar and sees Ben is spending 60% of time on operational tasks → identifies which tasks could be delegated to agents → proposes autonomy level increases for mature agents → CFO validates the efficiency gain → **system gradually takes on more while Ben focuses on strategic work.**

---

## 6. Assets to Track

The C-Suite agents need to know about every asset in the ACT ecosystem:

| Asset Category | Examples | Tracked By |
|----------------|----------|------------|
| **Digital Products** | 7 websites, Empathy Ledger platform, Goods marketplace, Content Hub API | CEO + CMO |
| **Codebases** | 10 repositories, 110+ scripts, shared component library, MCP configs | CEO + Brand Manager |
| **Storyteller Assets** | Stories, photographs, video, ALMA analyses, consent forms, impact evidence | CDO |
| **Relationships** | GHL contacts, partner orgs, funders, advisory networks, storyteller network | CDO + CMO |
| **Financial Assets** | Xero accounts, invoices, receipts, subscriptions, R&D claims, budget allocations | CFO |
| **Brand Assets** | Logo suite, colour palette, LCAA framework docs, tone guides, templates | Brand Manager |
| **Content Library** | Blog posts, newsletters, social media archive, partner digests, presentations | CMO + Brand Manager |
| **Knowledge Base** | Notion databases (17), meeting transcripts, decision logs, project briefs | CEO (via Oracle) |
| **Infrastructure** | Supabase tables, Vercel deployments, GHL workflows, Discord/Signal channels | CEO (via Shepherd) |
| **Intellectual Property** | Methodologies (LCAA, CONTAINED), frameworks, research, original analysis | CEO + Brand Manager |

---

## 7. Implementation Roadmap

Building on what already exists. The operational layer is largely in place — the work now is adding the strategic layer on top.

### Phase 1: Foundation (Week 1-2)

Build the knowledge storage infrastructure and the CEO agent as the first C-Suite agent. This is the keystone — every other agent depends on the CEO agent's strategic context.

- [ ] Create `executive_knowledge` table in Supabase (schema from Section 4)
- [ ] Create `knowledge_gaps` table in Supabase (schema from Section 8)
- [ ] Create `cross_agent_signals` table in Supabase (schema from Section 8)
- [ ] Build CEO agent with interview framework — first structured session with Ben
- [ ] Add knowledge gap detection: what does the CEO agent need to know that it doesn't?
- [ ] Wire CEO agent context into morning brief (daily async question)
- [ ] Test cross-agent propagation: CEO answer → Shepherd reprioritisation

### Phase 2: Financial Intelligence (Week 3-4)

Layer the CFO agent on top of the existing Ledger agent and Xero integration. The financial data is already flowing — now we add strategic interpretation.

- [ ] Build CFO agent that reads from Xero and Ledger agent outputs
- [ ] First CFO interview session: revenue targets, pricing philosophy, runway
- [ ] Auto-generate monthly financial health report from Xero data + CEO context
- [ ] Wire CFO → CEO loop: financial insights inform strategic priorities

### Phase 3: Narrative Intelligence (Week 5-6)

The CDO agent builds on Cultivator and Empathy Ledger to create a strategic view of the storyteller portfolio.

- [ ] Build CDO agent connected to Empathy Ledger Content Hub and Cultivator
- [ ] First CDO interview: storyteller pipeline vision, impact measurement, consent process
- [ ] Narrative gap analysis: identify underrepresented communities and themes
- [ ] Wire CDO → CMO loop: story traction feeds content amplification

### Phase 4: Growth & Brand (Week 7-8)

CMO and Brand Manager agents complete the strategic layer.

- [ ] Build CMO agent connected to GHL social accounts, Webflow analytics
- [ ] Build Brand Manager agent with access to all 7 codebases for content review
- [ ] First CMO + Brand Manager interviews: audience, channels, voice, visual identity
- [ ] Complete all 5 cross-agent feedback loops (Section 5)
- [ ] Brand consistency audit across all live sites

---

## 8. Database Schema Additions

New Supabase tables required to support the C-Suite layer. These extend the existing agent infrastructure without modifying it.

### `executive_knowledge`

```sql
CREATE TABLE executive_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,                    -- ceo, cfo, cdo, cmo, brand
  topic TEXT NOT NULL,                     -- structured topic tag
  question TEXT,                           -- the question that was asked
  answer TEXT NOT NULL,                    -- Ben's response
  confidence INT DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  source TEXT DEFAULT 'interview',         -- interview, conversation, async
  expires_at TIMESTAMPTZ,                  -- when to re-ask (knowledge decay)
  depends_on UUID[],                       -- references to related knowledge
  unlocks TEXT[],                          -- decisions/insights this enables
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exec_knowledge_domain ON executive_knowledge(domain);
CREATE INDEX idx_exec_knowledge_topic ON executive_knowledge(topic);
```

### `knowledge_gaps`

```sql
CREATE TABLE knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_domain TEXT NOT NULL,              -- which agent has this gap
  topic TEXT NOT NULL,                     -- what area the gap is in
  question TEXT NOT NULL,                  -- the specific question to ask
  priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),  -- 5 = blocking
  blocked_by UUID[],                       -- other gaps that must be filled first
  blocks TEXT[],                           -- decisions/outputs waiting on this
  status TEXT DEFAULT 'open',              -- open, asked, answered, expired
  filled_by UUID REFERENCES executive_knowledge(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_gaps_domain ON knowledge_gaps(agent_domain);
CREATE INDEX idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX idx_knowledge_gaps_priority ON knowledge_gaps(priority DESC);
```

### `cross_agent_signals`

```sql
CREATE TABLE cross_agent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent TEXT NOT NULL,                -- agent that generated the signal
  to_agent TEXT NOT NULL,                  -- target agent (or 'all' for broadcast)
  signal_type TEXT NOT NULL,               -- insight, alert, request, recommendation
  title TEXT NOT NULL,                     -- short description
  payload JSONB DEFAULT '{}',              -- structured data: metrics, references, context
  priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT DEFAULT 'pending',           -- pending, acknowledged, acted_on, dismissed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_to_agent ON cross_agent_signals(to_agent);
CREATE INDEX idx_signals_status ON cross_agent_signals(status);
```

---

## 9. What Makes This Different

Most AI agent systems are task executors — they do what you tell them. The C-Suite system is fundamentally different in three ways:

**1. Agents that ask, not just answer.** Traditional agents wait for instructions. C-Suite agents proactively identify what they don't know and come to Ben with questions. The system gets smarter through dialogue, not just data ingestion. A 15-minute interview session can unlock weeks of autonomous work.

**2. Strategic context, not just operational data.** Ledger can tell you that an invoice was paid. The CFO agent can tell you whether that payment pattern suggests a client is at risk of churning. Scout can research a company. The CEO agent can tell you whether that company aligns with ACT's 3-year vision. The difference is context — and context comes from the interview loop.

**3. Cross-agent emergence.** No single agent can notice that a storyteller narrative is resonating, connect it to a budget allocation decision, link it to a partnership opportunity, and adjust the content calendar accordingly. That insight only emerges when agents share context. The cross-agent signal system makes ACT's AI greater than the sum of its parts.

---

## 10. Next Step

Start with the CEO agent. Build the `executive_knowledge` table, run the first structured interview session, and wire the results into the morning brief. Everything else builds on that foundation.

The first interview session should take about 30 minutes. The CEO agent will ask 15-20 questions about ACT's vision, priorities, and decision frameworks. Those answers become the north star that every other agent references. From there, each subsequent agent takes about a week to build, interview, and integrate.

Within 8 weeks, ACT will have a full strategic layer — five executive agents that know the business deeply, interview the founder to fill gaps, coordinate across domains, and shift from asking to advising as their knowledge matures. That's a capability most organisations with 50 employees don't have.

---

*Built for ACT by ACT. Architecture that grows with the organisation it serves.*
