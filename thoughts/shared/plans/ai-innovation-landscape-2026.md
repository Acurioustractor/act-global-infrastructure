# AI Innovation Landscape for ACT — Strategic Research

**Date:** 2026-03-20
**Status:** RESEARCH COMPLETE

---

## TL;DR

The AI landscape has matured fast. Six big moves for ACT:

**Finance:**
1. **Booke.ai ($50/mo)** — AI bookkeeper that lives inside Xero. Auto-categorises, matches receipts, reconciles. Could replace half our finance scripts.
2. **Xero JAX** — Already included. Auto bank reconciliation at 80-90% match rate. Check if it's enabled on our plan.
3. **Swanson Reed TaxTrex** — AI that prepares R&D tax claims in 90 minutes. April 30 AusIndustry deadline is 6 weeks away. Contact them NOW.

**Infrastructure:**
4. **Model routing (70/20/10 Haiku/Sonnet/Opus)** — could cut AI API costs 60%. Most of our 110+ scripts probably use Sonnet for tasks Haiku handles fine.
5. **Mastra** — TypeScript-native agent orchestration from the Gatsby team. 150K weekly downloads, MCP support, workflow persistence. Best fit for our stack.

**Impact & Community:**
6. **Kaitiakitanga License model** — Te Hiku Media's open-source Indigenous data sovereignty license. Fork it, adapt for Australian First Nations context. Gold standard for Empathy Ledger.

For BD/relationships: **Attio** (free CRM, API-first, replaces GHL pain), **Fathom** (free meeting intelligence), **Relevance AI** (Australian-built agent platform).

The biggest gap in the market: **no Australian R&D tax claim automation tool exists**. ACT already has the raw data (git commits, calendar, Xero, Notion). This is a productisable opportunity.

---

## Part 1: AI Accounting & Finance

### The New Wave: AI-Native Accounting

| Tool | What | Xero? | Cost | ACT Fit |
|------|------|-------|------|---------|
| **Booke.ai** | AI bookkeeper inside Xero. Auto-categorise, receipt OCR+match, anomaly detection | Deep native | $50/client/mo | **HIGHEST** |
| **Xero JAX** | Built-in AI assistant. Natural language invoicing, auto-reconciliation | Native | Included | **HIGH** |
| **Numeric** | AI close automation. Checklists, variance analysis, flux reporting | Yes | Free tier | **MODERATE** |
| **Basis** | Autonomous accounting agents. First AI to complete a full tax return | No (US/QBO) | Enterprise | Low |
| **Consark Noa** | Autonomous finance close agents. 99.9% matching | No (ERP) | Outcome-based | Low |
| **Vic.ai** | AP automation. 99% accuracy on invoice processing | Yes | $500-800/mo | Low |

### Booke.ai — The One to Try

- Logs into Xero like a team member
- Each client gets isolated "AI Brain" trained on YOUR data
- Auto-categorisation improves over time
- Receipt OCR with automatic transaction matching (any language/currency)
- Error detection and anomaly alerts
- At $50/month, cheaper than the dev time maintaining our custom scripts

**The question:** Does Booke.ai handle project tracking categories? If yes, it could replace `tag-transactions-by-vendor.mjs`, `auto-tag-fy26-transactions.mjs`, `goods-auto-tagger.mjs`, and parts of the receipt pipeline. If not, it handles the 80% commodity work and our scripts handle the 20% project intelligence layer.

### Xero JAX (Just Ask Xero)

- Rolled out across Xero plans in 2025-2026
- Natural language: "Create an invoice for Centrecorp, $84,700, due in 30 days"
- Auto bank reconciliation: learns from historical patterns, 80-90% accuracy
- Available on desktop, mobile, WhatsApp, and email
- **Action:** Check if JAX is enabled on ACT's Xero plan. If so, the auto-reconciliation alone could eliminate most manual bank matching.

### What Basis Means for the Industry

Basis raised $100M at $1.15B valuation (Feb 2026) — the sector's first AI accounting unicorn. Used by 30% of top 25 US firms. Driving 20-50% efficiency gains. First AI agent to complete an end-to-end 1065 tax return autonomously.

**Signal:** Autonomous accounting agents are now validated by the market. The question isn't "will AI do accounting" — it's "when does this reach Xero-scale businesses in Australia?"

### Receipt Processing: The Shift

| Traditional (OCR + Manual Match) | Next-Gen (AI End-to-End) |
|----------------------------------|--------------------------|
| Dext: 99.9% OCR accuracy, manual Xero matching | Booke.ai: OCR + auto-match + reconcile in one flow |
| Hubdoc: Free with Xero, limited automation | JAX: Conversational reconciliation |
| AutoEntry: Credit-based, Sage-owned uncertainty | Datamolino: 4.9 stars, competitive pricing |

**Key insight:** The traditional receipt processors (Dext, Hubdoc) extract data but still require manual matching. The innovation is in platforms that combine extraction + matching + reconciliation into one automated flow. ACT currently does: Gmail → Dext → manual match in Xero. Booke.ai could collapse that to: Gmail → Booke.ai → done.

---

## Part 2: R&D Tax Claims — The Biggest Gap

### Australian Market: Almost No AI Tooling

| Tool | Focus | Relevance |
|------|-------|-----------|
| **Swanson Reed TaxTrex** | AI R&D claim prep in 90 minutes | **HIGH — contact now** |
| TaxRobot | US R&D credits (IRC 41) | Wrong jurisdiction |
| TaxCredit.ai | US R&D credits | Wrong jurisdiction |
| Instead.com | US R&D credits | Wrong jurisdiction |
| **Radium Capital** | Cash advance against R&D refund | **Useful for runway** |

**There is no Australian equivalent of TaxRobot.** The market is advisory firms (Swanson Reed, Standard Ledger, William Buck) doing human-led claims with varying software. Swanson Reed's TaxTrex is the closest to automation but it's proprietary to their practice.

### What ACT Already Has (Raw R&D Evidence)

- **Git commits** = timestamped experimental work evidence
- **Calendar events** = time records and meeting evidence
- **Xero project tracking** = cost allocation to R&D projects
- **Notion activity logs** = contemporaneous records
- **Supabase data layer** = all of the above unified

### The Opportunity: Build the R&D Evidence Pipeline

ACT could build an automated pipeline: git commits + calendar + Xero costs + Notion logs → AusIndustry-compliant R&D documentation.

This is:
1. Immediately valuable for ACT's own FY25 claim ($407K potential at $937K eligible spend)
2. **Productisable** for other Australian tech companies
3. A genuine R&D activity in itself (experimental AI-driven compliance documentation)

### Critical Dates
- AusIndustry registration deadline: **April 30, 2026** (6 weeks away)
- R&D tax schedule: lodged with company tax return
- Records retention: 5 years after lodgement

---

## Part 3: AI Business Development & Relationships

### CRM / Relationship Intelligence

| Tool | What | Cost | ACT Fit |
|------|------|------|---------|
| **Attio** | Programmable CRM. Auto-enrichment, relationship timelines, GraphQL API | Free (3 seats) | **HIGH** |
| **Folk** | Notion-like contact CRM. Simple, clean | $17.50/user/mo | Medium |
| **Clay** | Data enrichment. 150+ providers, waterfall matching | $185+/mo | Medium (overkill) |
| UserGems | Job change signals | $30K+/year | Low |
| Common Room | Community signal aggregation | $500+/mo | Low |

### Attio — The GHL Replacement?

- API-first (GraphQL + REST + webhooks)
- Auto-enriches from email and calendar
- Relationship timelines built automatically
- "AI Attributes" that analyse records on-the-fly
- Free for up to 3 seats
- Native Zapier, Slack, direct API integrations

**Why this matters:** GHL is powerful but painful to develop against. Attio's programmable architecture is philosophically aligned with ACT's infrastructure approach. Webhooks fire → Supabase updates → Command Center reflects. Clean.

### AI Sales Agents: The Reality Check

**Autonomous AI SDRs have underperformed.** 11x.ai, Artisan, Regie.ai — companies deploying these as full SDR replacements have reverted to hybrid models. The tools work for research, drafting, and scheduling. Humans still handle relationship-building and judgment.

**For ACT:** Cold outbound AI agents are wrong on every dimension. ACT's LCAA methodology (Listen → Curiosity → Action → Art) is fundamentally relationship-first. The brand risk of AI-generated cold outreach from a social enterprise is significant. Skip this entire category.

### Relevance AI — Australian-Built Agent Platform

- **Sydney-based**, understands local market
- No-code multi-agent workflows
- 9,000+ integrations
- SOC 2 Type II compliant
- Free: 200 actions/mo. Pro: $29/mo. Team: $349/mo.
- Could build custom grant research agents, partner prep agents, meeting briefing agents

**Why this matters:** Relevance AI is essentially what ACT's 110+ scripts do, but as a managed platform. The question is control vs. maintenance burden.

---

## Part 4: Meeting Intelligence

| Tool | Free Tier | Paid | Key Feature | ACT Fit |
|------|-----------|------|-------------|---------|
| **Fathom** | Unlimited recordings, 5 AI summaries/mo | $19/mo | Zapier integration | **HIGH** |
| **tl;dv** | Unlimited meetings, basic summaries | $18/user/mo | Native Notion integration | **HIGH** |
| Fireflies | Limited | $18+/user/mo | 50+ integrations | Medium |
| Read.ai | 5 meetings/mo | $19.75/user/mo | Personal knowledge graph | Medium |

**Recommendation:** Start with **Fathom** (free, unlimited recordings). Push meeting summaries to Supabase via Zapier → feeds existing `run-meeting-intelligence.mjs` and Notion Workers `query_meeting_notes` tool.

---

## Part 5: Grant Discovery & Writing

| Tool | Focus | Cost | ACT Fit |
|------|-------|------|---------|
| Instrumentl | US grant discovery, 22K+ RFPs | $299-499/mo | Low (US-centric) |
| Fundsprout | US grant workflow | TBD | Low (US-centric) |
| **FundRobin** | UK/global grant writing, compliance scoring | TBD | **Medium-High** |
| **Grant Assistant** | USAID/UN experienced, privacy-first | TBD | **Medium** |
| Grantable | AI co-editing for proposals | TBD | Medium |

**The Australian gap:** No grant discovery tool has strong Australian coverage. GrantScope is literally building this — ACT's own project fills the market gap.

**For grant writing:** FundRobin's UK/global orientation makes it more relevant than US-only tools. Its 0-100% accuracy scoring on proposals could strengthen ACT's applications.

---

## Part 6: Nonprofit-Specific AI

### Claude for Nonprofits (Anthropic)
- Dedicated program with Benevity (2.4M validated nonprofits) and Blackbaud integrations
- ACT is already deep in Claude infrastructure
- **Action:** Investigate program details — pricing discounts? Dedicated features?

### Industry Signal
- 90% of nonprofits have adopted AI for at least one operational purpose
- 92% feel unprepared
- The gap between adoption and readiness = opportunity
- ACT's Command Center is ahead of where most nonprofits are

---

## Strategic Recommendations

### Tier 1: Do This Week ($0)

| Action | Why | Cost |
|--------|-----|------|
| Check if Xero JAX is enabled | 80-90% auto-reconciliation, already included | $0 |
| Sign up for Fathom free tier | Unlimited meeting capture, Zapier to Supabase | $0 |
| Sign up for Attio free tier | Test as GHL complement, 3 seats | $0 |
| Contact Swanson Reed re: TaxTrex | April 30 AusIndustry deadline in 6 weeks | Phone call |
| Check Claude for Nonprofits program | Already using Claude, may get benefits | Email |

### Tier 2: Try This Month ($50-100/mo)

| Action | Why | Cost |
|--------|-----|------|
| Trial Booke.ai Robotic AI Bookkeeper | Test against our script-based tagging for 1 month | $50/mo |
| Evaluate Numeric free tier | Month-end close checklists and variance analysis | $0 |
| Prototype one Relevance AI agent | Compare with script-based approach | $0-29/mo |

### Tier 3: Strategic Decisions (This Quarter)

| Decision | Options |
|----------|---------|
| **Build vs. Buy bookkeeping automation** | Keep scripts (free, full control) vs. Booke.ai ($50/mo, less maintenance) vs. hybrid (Booke for 80%, scripts for 20%) |
| **CRM strategy** | Stay on GHL vs. migrate to Attio vs. run both |
| **Meeting intelligence** | Fathom vs. tl;dv (Notion integration) vs. keep current approach |
| **R&D claim preparation** | TaxTrex (advisory) vs. build own pipeline (productisable) vs. both |

### Tier 4: The Big Opportunity

**Australian R&D Tax Claim Automation** — no good tooling exists. ACT has the data, the infrastructure, and the motivation. Building an automated R&D evidence pipeline would:

- Save $50-100K in advisory fees across ACT's lifetime
- Be productisable to other Australian tech companies ($10K-30K/claim × thousands of potential customers)
- Be a genuine R&D activity itself (meta!)
- Fill a real market gap that US-only tools can't address

---

## Build vs. Buy Matrix

| Capability | ACT Has Today | Best Commercial Option | Verdict |
|-----------|---------------|----------------------|---------|
| Transaction categorisation | vendor_project_rules scripts | Booke.ai ($50/mo) | **Try Booke.ai**, keep scripts as fallback |
| Bank reconciliation | Manual in Xero | JAX auto-reconciliation | **Enable JAX** — it's free |
| Receipt pipeline | Gmail → Dext → scripts → Xero | Booke.ai (OCR+match+reconcile) | **Test Booke.ai** for end-to-end |
| Collections automation | chase-overdue-invoices.mjs | Nothing better exists | **Keep custom** — we built exactly what we need |
| R&D evidence | Git + Calendar + Xero + Notion (raw) | TaxTrex (proprietary) | **Build own pipeline** — productisable |
| Weekly financial review | Notion Workers + scripts | Numeric (free tier) | **Keep custom** — our Notion Worker is better |
| CRM/Relationships | GHL + custom scripts | Attio (free, API-first) | **Test Attio** alongside GHL |
| Meeting intelligence | run-meeting-intelligence.mjs | Fathom (free) | **Add Fathom** as input layer |
| Grant discovery | GrantScope (our own product) | Nothing in Australia | **Keep building GrantScope** |
| Grant writing | Manual | FundRobin | **Test FundRobin** for next application |

---

## Key Insight

ACT's custom infrastructure is more sophisticated than 95% of organisations this size. The right strategy is NOT "replace everything with SaaS." It's:

1. **Use free/cheap AI tools as input layers** (Fathom for meetings, JAX for reconciliation, Booke.ai for categorisation)
2. **Keep custom scripts for the intelligence layer** (project tagging, R&D allocation, collections, anomaly detection)
3. **Build where there's a market gap** (R&D evidence automation, GrantScope)
4. **Buy where it's commodity** (CRM enrichment, receipt OCR)

The moat is in the intelligence layer — understanding which dollar belongs to which project, which project is R&D eligible, which receipt maximises the tax refund. No off-the-shelf tool does this. Our scripts do.

---

## Sources

### Accounting AI
- [Basis $100M at $1.15B Valuation — Bloomberg](https://www.bloomberg.com/news/articles/2026-02-24/ai-for-accounting-startup-basis-hits-1-15-billion-valuation)
- [Consark Noa Launch — CPA Practice Advisor](https://www.cpapracticeadvisor.com/2026/03/02/consark-unveils-its-noa-suite-of-autonomous-ai-agents-for-finance-operations/179076/)
- [Booke.ai Xero Integration](https://booke.ai/xero)
- [Xero AI Strategy — Accounting Today](https://www.accountingtoday.com/news/xero-aims-to-make-ai-core-to-platform-functionality)
- [Just Ask Xero (JAX)](https://clooudconsulting.com/2025/10/04/ai-capability-in-xero-jax-just-ask-xero/)
- [Xero Auto Bank Reconciliation — Illumin8](https://www.illumin8.com.au/post/xeros-new-auto-bank-reconciliation-feature)
- [Numeric AI Close Automation](https://www.numeric.io/)
- [Swanson Reed — Specialist R&D Tax Advisors](https://www.swansonreed.com.au/)
- [R&D Tax Incentive April 2026 Deadline — Moore Australia](https://www.moore-australia.com.au/news/maximising-the-rd-tax-incentive-what-tech-startups-and-scaleups-need-to-do-before-the-30-april-2026-deadline/)
- [Radium Capital — R&D Finance](https://radiumcapital.com.au/)

### Business Development AI
- [Attio CRM Review 2026](https://hackceleration.com/attio-review/)
- [Relevance AI](https://relevanceai.com/)
- [Clay Pricing 2026](https://www.warmly.ai/p/blog/clay-pricing)
- [Fathom AI Overview](https://www.fathom.ai/overview)
- [tl;dv](https://tldv.io/)
- [Claude for Nonprofits](https://www.anthropic.com/news/claude-for-nonprofits)
- [FundRobin Grant Writing Tools](https://www.fundrobin.com/articles/how-to-guide/ai-tools-for-nonprofits/best-ai-grant-writing-tools-nonprofits/)
- [AI Tools for Nonprofits 2026](https://bloomerang.com/blog/ai-tools-for-nonprofits/)

---

## Part 6: AI Dev Tools & Agent Infrastructure

### Coding Agents: What's Actually Working

| Tool | SWE-bench | Users | Best For |
|------|-----------|-------|----------|
| **Claude Code** | 80.9% (highest) | — | Complex multi-file changes, large codebases |
| **Cursor** | — | 360K paying | Flow-state feature work, quick edits |
| **Devin** | — | — | Fully autonomous, well-scoped tasks |
| **Windsurf** | — | — | 5 parallel agents, good IDE |

**Claude Code Agent Teams (experimental):** Multiple Claude instances work in parallel on shared codebases with peer-to-peer messaging. Each agent gets its own 1M token context. A team of 16 agents wrote a 100,000-line Rust C compiler over ~2,000 sessions.

**Real productivity data:**
- TELUS: 13,000+ custom AI solutions, shipping 30% faster, 500K+ hours saved
- CRED (fintech): Doubled execution speed with Claude Code
- One enterprise: Completed a 4-8 month project in 2 weeks

### Agent Orchestration: The Framework Landscape

| Framework | Language | Production Users | ACT Fit |
|-----------|----------|-----------------|---------|
| **Mastra** | TypeScript | Replit, PayPal, Adobe, Docker | **HIGHEST** — TS-native, MCP support, 150K weekly downloads |
| **Vercel AI SDK v6** | TypeScript | Vercel ecosystem | **HIGH** — already in our stack, agent abstractions |
| **Anthropic Agent SDK** | TS/Python | Claude Code internally | **HIGH** — same building blocks as Claude Code |
| LangGraph | Python | Klarna, Uber, LinkedIn | Low — adds Python to TS mono-repo |
| CrewAI | Python | PwC, IBM | Low — same Python issue |

**Mastra** is the standout for ACT:
- From the Gatsby team, Apache 2.0, $13M seed from YC + Paul Graham
- 150K weekly downloads — third-fastest-growing JS framework ever
- Model routing across 40+ providers, workflow persistence, MCP integration
- Could replace our PM2 cron + script approach with proper workflow orchestration

**Vercel AI SDK v6** upgrades:
- `ToolLoopAgent` — handles LLM → tool execution → iteration automatically
- Human-in-the-loop approval for sensitive tools
- AI Gateway — unified access to hundreds of models, $5/month free credit

### MCP: It's the Standard Now

8M+ server downloads (from 100K in Nov 2024). 5,800+ servers. Microsoft, Google, OpenAI, Amazon on steering committee.

**MCP servers directly relevant to ACT:**

| Server | Source | Impact |
|--------|--------|--------|
| **Xero Official** | XeroAPI/xero-mcp-server | Agents query financial data directly. Could replace some xero-node scripts |
| **Notion Official** | makenotion/notion-mcp-server | Simpler than Notion Workers for agent tools |
| **Supabase** | Official | Already using — foundation of /db-check |

**2026 MCP roadmap:** Streamable HTTP transport (remote MCP servers, not just local), stateful sessions, server discovery.

### Cost Optimization: The 60-80% Savings Playbook

**Claude pricing (March 2026):**

| Model | Input/MTok | Output/MTok | Cache Read |
|-------|-----------|-------------|------------|
| Haiku 4.5 | $1 | $5 | $0.10 |
| Sonnet 4.5 | $3 | $15 | $0.30 |
| Opus 4.5/4.6 | $5 | $25 | $0.50 |

**Strategy 1: Model routing (40-60% savings)**
70/20/10 Haiku/Sonnet/Opus split. Most of our 110+ scripts do classification/tagging/extraction — Haiku handles this fine.

| Task | Model |
|------|-------|
| Script exploration, file reading, pattern matching | Haiku |
| Feature implementation, refactoring, code gen | Sonnet |
| Architecture decisions, complex multi-file plans | Opus |
| Classification, tagging, simple extraction | Haiku |

**Strategy 2: Prompt caching (up to 90% savings on cached tokens)**
Cache read tokens are 90% cheaper. Scripts sharing common system prompts should cache the prefix.

**Strategy 3: Batch API (50% savings)**
Nightly cron scripts (finance engine, receipt matching, contact enrichment) don't need real-time responses. Batch API = 50% discount, processed within 24 hours.

**Strategy 4: Create a shared `lib/model-router.mjs`**
Select model based on task complexity. Audit which scripts use Sonnet/Opus unnecessarily.

### AI-Native Infrastructure: We're Already on the Default Stack

The 2026 consensus AI startup stack is: Next.js + Supabase (pgvector) + Vercel + Claude/OpenAI. That's exactly what ACT runs.

**Supabase AI features to leverage:**
- pgvector hybrid search (BM25 keyword + vector similarity) — best practice for RAG
- Already using for knowledge base embeddings
- Skip Pinecone/Weaviate — Postgres does it all

---

## Part 7: AI for Impact, Storytelling & Community

### Impact Measurement Platforms

| Platform | AI Capabilities | AU Fit | Cost | ACT Fit |
|----------|----------------|--------|------|---------|
| **Sopact Sense** | AI-native, agentic workflows, mixed-methods | Good | Unlimited users | **HIGH** |
| **Socialsuite** | Framework templates (ASX-listed, AU-founded) | Best | Mid-range | **HIGH** |
| **Makerble** | CRM + impact + storytelling | Moderate | Free tier | Medium |
| **UpMetrics** | Advanced Analytics, cohort model | Moderate | Tiered | Medium |

**Sopact Sense** assigns persistent unique IDs to stakeholders and auto-links all data (surveys, documents, interviews). Eliminates 80% of data cleanup. Write plain-English instructions for reports and AI generates designer-quality output combining charts, quotes, and insights.

**Socialsuite** is Australian-founded (ASX-listed as SOC) with built-in evidence-based frameworks (IRIS+, SDGs). Closest to ACNC compliance.

### AI for Storytelling: Te Hiku Media Sets the Standard

**Te Hiku Media (Aotearoa)** — the gold standard model:
- Built automatic speech recognition for te reo Maori under community data sovereignty
- Created the **Kaitiakitanga License** — "like open source but with affirmative action"
- License prohibits surveillance, tracking, mining data, anything inconsistent with data sovereignty
- Available on GitHub for adaptation: `github.com/TeHikuMedia/Kaitiakitanga-License`
- Already adopted by a government department and a social enterprise

**UWA Closed-System Community AI (March 2026):**
- Australian researchers developing closed-system AI governed by the community
- Using AI (including Claude) to decipher handwriting in old field notebooks, cross-reference genealogies
- Key warning: "general-purpose AI has NO understanding of cultural protocols, restricted knowledge governed by gender, age, or ceremonial authority"
- NOT replacing oral tradition — giving communities a way to interact with heritage through dialogue

**Pipikwan Pehtakwan / "wasikan kisewatisiwin" (AI With Heart):**
- MIT Solve 2024 winner — AI that detects anti-Indigenous bias in written materials
- Prompts users to consult Indigenous people rather than guessing
- Could integrate into ACT's content review pipeline

### Community Engagement: Beyond Chatbots

| Platform | Method | Scale | Open Source | ACT Fit |
|----------|--------|-------|------------|---------|
| **Pol.is** | ML consensus clustering | 1,000s-10,000s | Yes | **HIGH** |
| **deliberation.io** | Socratic AI dialogue | 100s-1,000s | Yes | **HIGH** |
| **Loomio** | Async decision-making | 10s-100s | Yes | Medium |
| **All Our Ideas** | Pairwise voting | 1,000s | Yes | Medium |

**Pol.is** — used by Bowling Green, KY with nearly 8,000 residents. Finds what people AGREE on, not just what divides them. Self-hostable for data sovereignty.

**deliberation.io** — Stanford + MIT. Washington DC was first city deployment (July 2025). Participants showed more willingness to compromise and felt more respected.

### IoT for Goods on Country

Predictive maintenance AI can detect mechanical stress 3-6 weeks before failure, reduce breakdowns by 70%, cut maintenance costs 25%. For the washing machine fleet:
- IoT sensors monitor vibration, temperature, cycle frequency
- AI anomaly detection flags declining performance
- Auto-generated impact reports from telemetry: washes completed, communities served, uptime %
- This directly feeds R&D evidence for ACT-GD

### Indigenous Data Sovereignty Frameworks (CRITICAL for ACT)

| Framework | Origin | Key Principle |
|-----------|--------|--------------|
| **CARE Principles** | International | Collective Benefit, Authority to Control, Responsibility, Ethics |
| **Maiam nayri Wingara** | Australia | Aboriginal and Torres Strait Islander data sovereignty collective (2017) |
| **OCAP** | Canada | Ownership, Control, Access, Possession |
| **Kaitiakitanga License** | Aotearoa | Open source + affirmative action for Indigenous data |
| **DAIS Model** | Academic (2026) | Right of communities to REFUSE AI adoption |

**Australian Government Framework for Governance of Indigenous Data (2023)** — guides all APS agencies. ACT Foundation should align with this for credibility with government funders.

**Critical warnings:**
- General-purpose AI has NO understanding of cultural protocols
- No concept of restricted knowledge governed by gender, age, or ceremonial authority
- Without ethical engagement, AI amplifies deficit-focused statistical narratives
- Every AI touchpoint needs a community governance layer

### Recommendation: ACT Data Sovereignty Charter

Create a living document co-authored with community partners that:
1. Explicitly references CARE Principles + Maiam nayri Wingara
2. Adapts the Kaitiakitanga License for Australian First Nations context
3. Establishes governance for every AI system ACT builds
4. Includes the right to refuse AI where communities choose
5. Aligns with Australian Government's NIAA framework

---

## Master Action List (All Parts)

### This Week ($0)

| # | Action | Domain |
|---|--------|--------|
| 1 | Check if Xero JAX is enabled on our plan | Finance |
| 2 | Sign up for Fathom free tier (meeting intelligence) | BD |
| 3 | Sign up for Attio free tier (CRM, 3 seats) | BD |
| 4 | Call Swanson Reed re: TaxTrex (April 30 deadline) | Finance/R&D |
| 5 | Check Claude for Nonprofits program | Platform |
| 6 | Audit model usage across scripts — which use Opus/Sonnet unnecessarily? | Infra |
| 7 | Add Xero MCP server to Claude Code config | Infra |

### This Month ($50-100)

| # | Action | Domain |
|---|--------|--------|
| 8 | Trial Booke.ai ($50/mo) against our script-based tagging | Finance |
| 9 | Create `lib/model-router.mjs` — route 70% to Haiku | Infra |
| 10 | Switch nightly cron scripts to Batch API (50% savings) | Infra |
| 11 | Prototype one Relevance AI agent | BD |
| 12 | Evaluate Mastra for agent orchestration | Infra |
| 13 | Fork Kaitiakitanga License, begin adapting for AU context | Impact |

### This Quarter

| # | Action | Domain |
|---|--------|--------|
| 14 | Build vs Buy decision: Booke.ai vs custom scripts | Finance |
| 15 | CRM strategy: GHL vs Attio vs both | BD |
| 16 | R&D evidence pipeline: build automated git→calendar→Xero→docs flow | Finance/R&D |
| 17 | Trial Sopact Sense or Socialsuite across 2-3 projects | Impact |
| 18 | Deploy Pol.is for next community consultation (self-hosted) | Community |
| 19 | Draft ACT Data Sovereignty Charter with community partners | Governance |
| 20 | Add AI anomaly detection to Goods on Country fleet telemetry | IoT |
| 21 | Upgrade to Vercel AI SDK v6 for dashboard agents | Infra |

---

### Dev Tools & Infrastructure Sources
- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams)
- [Anthropic: Building a C Compiler with Agent Teams](https://www.anthropic.com/engineering/building-c-compiler)
- [Mastra: TypeScript AI Framework](https://mastra.ai/)
- [Vercel AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6)
- [MCP 2026 Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [Xero Official MCP Server](https://github.com/XeroAPI/xero-mcp-server)
- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
- [Claude API Pricing 2026](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### Impact & Community Sources
- [Te Hiku Media Kaitiakitanga License](https://tehiku.nz/te-hiku-tech/te-hiku-dev-korero/25141/data-sovereignty-and-the-kaitiakitanga-license)
- [UWA: AI for First Nations Oral Knowledge (March 2026)](https://www.uwa.edu.au/news/article/2026/march/how-ai-has-powerful-uses-for-first-nations-oral-cultural-knowledge)
- [MIT Solve: wasikan kisewatisiwin](https://solve.mit.edu/solutions/90270)
- [Pol.is — Computational Democracy](https://compdemocracy.org/polis/)
- [deliberation.io — Stanford/MIT](https://deliberation.io)
- [Sopact Impact Measurement](https://www.sopact.com/)
- [Socialsuite Impact Reporting](https://www.socialsuitehq.com/)
- [CARE Principles for Indigenous Data Governance](https://datascience.codata.org/articles/dsj-2020-043)
- [Maiam nayri Wingara Principles](https://www.maiamnayriwingara.org/mnw-principles)
- [NIAA Framework for Governance of Indigenous Data](https://www.niaa.gov.au/sites/default/files/documents/2024-05/framework-governance-indigenous-data.pdf)
- [Reply IoT: Predictive Maintenance for Washing Machines](https://www.reply.com/en/iot/predictive-maintenance-for-washing-machines)
