---
date: 2026-01-12T07:30:00Z
session_name: act-living-intelligence
branch: main
status: active
---

# Work Stream: act-living-intelligence

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-02-03T10:00:00Z
**Goal:** Agent chat + dashboard health + infrastructure hardening
**Branch:** main
**Test:** `curl http://localhost:3001/api/health` - check Command Center API

### Now
[->] Agent chat implemented with tool-use loop. Dashboard audited (23 pages, 96 APIs, ~60 tables). Knowledge pipeline automated. Data freshness monitoring added. 3 legacy tables marked for cleanup.

### This Session (2026-02-03)
- [x] **Agent Chat with Tool Use** — Implemented Anthropic SDK tool-use loop for Command Center
  - Created `apps/command-center/src/lib/agent-system-prompt.ts` — ACT context
  - Created `apps/command-center/src/lib/agent-tools.ts` — 3 tools (query_supabase, get_daily_briefing, get_financial_summary)
  - Rewrote `apps/command-center/src/app/api/agent/chat/route.ts` — Haiku default, max 5 tool rounds, cost tracking
  - Updated `apps/command-center/src/components/agent-chat.tsx` — per-message cost/model/latency display
  - Cost estimate: <$1/week with Haiku
- [x] **Dashboard Audit** — Mapped 23 pages, 96 API endpoints, ~60 tables across 40 migrations
  - HEALTHY: Today, Pipeline, Agent Chat, System, Compendium, People, Finance, Knowledge, Wiki
  - FUNCTIONAL: Calendar, Goals, Reports, Intelligence, Ecosystem, Business
  - QUESTIONABLE: Some pages depend on stale/empty data sources
- [x] **Legacy Table Cleanup** — Created migration to drop 3 unused tables
  - `supabase/migrations/20260203000000_drop_legacy_tables.sql`
  - Drops: `entities`, `entity_mappings`, `contact_review_decisions` (all confirmed zero dependencies)
  - Backs up to `_backup_*` tables first (safe to drop after 30 days)
- [x] **Knowledge Pipeline Automation** — Created orchestrator script
  - `scripts/knowledge-pipeline.mjs` — 4-step pipeline: embed check → align → consolidate → graph
  - Uses existing KnowledgeAligner, MemoryLifecycle, KnowledgeGraph
  - Logs runs to api_usage for monitoring
  - Needs scheduling (daily 8am AEST after embed-knowledge)
- [x] **Data Freshness Monitor** — Created staleness detection
  - `scripts/data-freshness-monitor.mjs` — checks 9 data sources + embedding completeness + pipeline health
  - `apps/command-center/src/app/api/health/data-freshness/route.ts` — API endpoint for dashboard
  - Thresholds: warn/critical per source (e.g. communications: 24h/72h, GHL: 48h/168h)
  - Exit code 1 on critical — usable for CI/alerting

### Previous Sessions (Collapsed)
```
2026-01-31: Business foundation docs (7 docs), entity structure, AKT constitution, ABR data
2026-01-26: V1 stability verified, production lock, founder interview, V2 roadmap
2026-01-21: EL v2 integration, dashboard fixes, architecture alignment
2026-01-20: Project bot, notifications, project codes, ALMA integration
2026-01-17: Gap analysis, compendium pages, RAG chat, vignettes
2026-01-12: Living intelligence architecture, art reflection, gap analysis tools
```

### Entity Structure (CRITICAL — 31 Jan 2026)
```
4 ENTITIES:
1. Sole Trader (ABN 21 591 780 066) — WINDING DOWN
   - Nic Marchesi, trading as "A Curious Tractor"
   - GST registered, current operating entity
   - Everything migrates to new Pty Ltd

2. A Kind Tractor LTD (ABN 73 669 029 341, ACN 669 029 341) — DORMANT
   - NFP Public Company Limited by Guarantee
   - ACNC registered charity (Dec 2023)
   - NOT GST registered, NOT DGR entitled
   - Directors: Nic, Ben, Jessica Adams
   - Constitution: Dec 2023, max 30 members, $10 guarantee
   - Parked — may activate DGR later

3. New ACT Pty Ltd — TO CREATE (PRIORITY)
   - Main operating entity for everything
   - Leases: Harvest (from philanthropist), Farm (from Nic)
   - Revenue: Innovation Studio, JusticeHub, Harvest, Goods
   - R&D Tax Incentive eligible (43.5% offset)
   - All employment through here

4. Family Trust — TO CREATE
   - Tax-efficient payments: Ben, wife, children
   - Trust as Pty Ltd shareholder (dividends → distributions)
   - Must be legitimate work at market rates (ATO scrutiny)

PHYSICAL SITES:
- The Harvest: leased from philanthropist, make profitable
- The Farm: leased from Nic, R&D + manufacturing + gardens

REVENUE STREAMS:
- Innovation Studio (contracts/consulting)
- JusticeHub (digital product + help others earn)
- The Harvest (venue, workshops, retail, events)
- Goods marketplace (social enterprise)
- Grants (via AKT or Pty Ltd)

R&D TRACKING:
- Empathy Ledger (storytelling + impact — internal tool, maybe product later)
- JusticeHub (digital justice platform)
- Goods (marketplace tech)
- World Tour 2026 (field testing EL + JH)
- Farm R&D (manufacturing, gardens, workshops)
- ALMA measurement + LCAA framework + Agentic system
```

### Previous Sessions (Collapsed)
```
2026-01-26: V1 stability verified, production lock, founder interview, V2 roadmap
2026-01-21: EL v2 integration, dashboard fixes, architecture alignment
2026-01-20: Project bot, notifications, project codes, ALMA integration
2026-01-17: Gap analysis, compendium pages, RAG chat, vignettes
2026-01-12: Living intelligence architecture, art reflection, gap analysis tools
```

### Next
**TECH: Schedule New Scripts**
- [ ] Add `knowledge-pipeline.mjs` to PM2/GitHub Actions (daily 8am AEST)
- [ ] Add `data-freshness-monitor.mjs` to PM2/GitHub Actions (every 6h)
- [ ] Apply migration `20260203000000_drop_legacy_tables.sql` to production
- [ ] Wire data-freshness API into System page on dashboard
- [ ] Test agent chat on deployed Vercel instance

**PRIORITY 1: Create Pty Ltd**
- [ ] Choose company name
- [ ] Engage accountant for Pty Ltd + Trust setup
- [ ] Register with ASIC ($576) → ABN → GST
- [ ] Open bank account, set up Xero
- [ ] Insurance ($20M public liability for Harvest)

**PRIORITY 2: Family Trust Setup**
- [ ] Accountant advises on structure
- [ ] Draft trust deed, appoint trustee
- [ ] Define family member roles + pay rates

**PRIORITY 3: Migrate Operations**
- [ ] Transfer subscriptions, contracts, IP to Pty Ltd
- [ ] New Harvest lease in Pty Ltd name
- [ ] Farm lease: Nic → Pty Ltd

**PRIORITY 4: R&D Documentation**
- [ ] Engage R&D tax consultant
- [ ] Start activity logs for EL, JH, Goods, World Tour, Farm
- [ ] Register with AusIndustry after first FY

**PRIORITY 5: Asset Register (Ben to fill in)**
- [ ] Inventory containers, structures, vehicles, equipment
- [ ] Document all subscription costs
- [ ] List domains, insurance policies with costs

### Decisions
- ENTITY: AKT LTD dormant/parked — DGR deferred
- ENTITY: New Pty Ltd is the operating company for everything
- ENTITY: Family trust for tax-efficient payments
- HARVEST: Leased from philanthropist, goal is profitability
- FARM: Leased from Nic to Pty Ltd (arm's length for ATO)
- EMPATHY LEDGER: Internal tool now, maybe product later
- JUSTICEHUB: Core digital product, revenue potential
- R&D: Track across EL, JH, Goods, World Tour, Farm
- WORLD TOUR 2026: Field testing EL + JH, R&D claimable
- INNOVATION STUDIO: Contract work for revenue
- SHIFT: From batch analysis to continuous review rhythms
- PHILOSOPHY: This IS ACT - bringing people into our world through reflection
- AGENTIC: Tiered autonomy (Level 1=manual, Level 2=supervised, Level 3=autonomous)
- AGENT CHAT: Raw SDK with tool_use loop, NOT full Agent SDK (Vercel timeout compat)
- AGENT MODEL: Haiku default for cost (<$1/week), upgrade to Sonnet later if needed
- LEGACY TABLES: entities, entity_mappings, contact_review_decisions → SAFE TO DROP (zero deps)
- KNOWLEDGE PIPELINE: 4-step orchestrator (embed→align→consolidate→graph) replaces fragile chain
- MONITORING: Data freshness monitor checks 9 sources + pipeline health + embedding completeness

### Open Questions
- PENDING: Pty Ltd company name?
- PENDING: Who is accountant for setup?
- PENDING: Trust structure — shareholder vs management company?
- PENDING: Jessica Adams still active AKT director?
- PENDING: Which entity currently holds bank account, Harvest lease?
- PENDING: Ben's wife name and role for employment?
- RESOLVED: Review cadence = weekly + on-change ✓
- RESOLVED: Architecture = mono-repo ✓

### Workflow State
pattern: business-foundation
phase: 1
total_phases: 5
retries: 0
max_retries: 3

#### Resolved
- goal: "Set up Pty Ltd + Family Trust, migrate from sole trader, document everything"
- resource_allocation: balanced
- entity_structure: "4 entities (sole trader winding down, AKT dormant, new Pty Ltd, family trust)"
- documents_created: 7 (legal, governance, finance, privacy, guides)
- pm2_cron: "already implemented (8 scripts)"
- xero_webhook: "already implemented (route + handler + migration)"

#### Unknowns
- pty_ltd_name: UNKNOWN
- accountant: UNKNOWN
- trust_structure: UNKNOWN
- current_entity_for_operations: UNKNOWN (sole trader or AKT?)

#### Last Failure
(none)

### Checkpoints
**Agent:** main session
**Task:** Infrastructure hardening + agent chat
**Started:** 2026-02-03T08:00:00Z
**Last Updated:** 2026-02-03T10:00:00Z

#### Phase Status
- Phase 1 (Business Documents): ✓ COMPLETE (7 documents created — 2026-01-31)
- Phase 2 (Agent Chat): ✓ COMPLETE (tool-use loop, 3 tools, cost tracking)
- Phase 3 (Dashboard Audit): ✓ COMPLETE (23 pages, 96 APIs, ~60 tables mapped)
- Phase 4 (Infrastructure Fixes): ✓ COMPLETE (legacy cleanup + pipeline + monitor)
- Phase 5 (Scheduling): ○ PENDING (add scripts to PM2/GitHub Actions)
- Phase 6 (Pty Ltd Registration): ○ PENDING (requires accountant + decisions)

#### Validation State
```json
{
  "agent_chat": {
    "api_route": "apps/command-center/src/app/api/agent/chat/route.ts",
    "tools": "apps/command-center/src/lib/agent-tools.ts (3 tools)",
    "system_prompt": "apps/command-center/src/lib/agent-system-prompt.ts",
    "component": "apps/command-center/src/components/agent-chat.tsx (updated)",
    "model": "claude-3-5-haiku-20241022",
    "typescript_check": "✓ passed"
  },
  "infrastructure_fixes": {
    "legacy_migration": "supabase/migrations/20260203000000_drop_legacy_tables.sql",
    "knowledge_pipeline": "scripts/knowledge-pipeline.mjs (4 steps)",
    "data_freshness_script": "scripts/data-freshness-monitor.mjs",
    "data_freshness_api": "apps/command-center/src/app/api/health/data-freshness/route.ts"
  },
  "dashboard_audit": {
    "pages": 23,
    "api_endpoints": 96,
    "tables": "~60 across 40 migrations",
    "healthy": ["today", "pipeline", "agent", "system", "compendium", "people", "finance"],
    "questionable": "some pages depend on stale/empty data sources"
  }
}
```

#### Resume Context
- Agent chat is implemented and TypeScript-clean — test at `/agent` Chat tab
- Knowledge pipeline and data freshness monitor created but NOT YET SCHEDULED
- Legacy table migration created but NOT YET APPLIED to production
- Business docs from Jan 31 still current — waiting for Ben's Pty Ltd decisions
- Entity structure doc remains master reference: docs/legal/entity-structure.md

---

## Context

### The Problem

Current approach requires:
- 4+ hour batch processes
- $7.50+ per run
- Manual triggering
- Infrequent updates

This doesn't match ACT's nature as a **living, breathing organism**.

### The Vision

Three ongoing processes that run continuously:

#### 1. Story & Evidence Gap Analysis
**Purpose:** Know what we have, what we're missing, what needs attention

- Review all EL storytellers and stories
- Map to projects and vignettes
- Identify projects WITHOUT storyteller coverage
- Flag gaps in impact measurement
- Actively pursue stories in gap areas

**Cadence:** Continuous background process with weekly summary

#### 2. Knowledge Completeness Review
**Purpose:** Ensure compendium reflects full ACT knowledge

- Compare EL stories against vignettes
- Review storyteller thematics
- Understand gaps in vignettes and knowledge
- Suggest new vignettes needed
- Track what's pending Elder review

**Cadence:** On-change (when EL updates) + weekly digest

#### 3. Art Reflection Process
**Purpose:** Document and reflect on ACT's creative output

- Identify what art we're putting out
- Write reflection on WHY each piece exists
- Document WHERE it came from
- Articulate HOW it reflects our commentary on the world
- This IS ACT - this is how we bring people into our world

**Cadence:** Each time art is created or shared

### Architecture Principles

1. **Lightweight over heavy** - Small, frequent analysis beats big batch jobs
2. **Continuous over periodic** - Always-on awareness, not quarterly reviews
3. **Reflective over mechanical** - Art requires human reflection, not just AI summary
4. **Gap-focused** - Actively seek what's missing, not just catalog what exists

### Technical Approach

Use `act-personal-ai` models for:
- Story analysis (lightweight, per-story)
- Gap detection (compare EL to compendium)
- Thematic clustering (storyteller patterns)

Create review agents that:
- Run on schedule or on-change
- Produce human-readable reports
- Suggest actions, don't just summarize
- Feed into Notion or dashboard

### Key Files

| File | Purpose |
|------|---------|
| `/Users/benknight/act-personal-ai/` | ACT AI model infrastructure |
| `/Users/benknight/Code/empathy-ledger-v2/` | Story and storyteller data |
| `/Users/benknight/Code/act-regenerative-studio/compendium/` | Knowledge wiki |
| `/Users/benknight/act-global-infrastructure/` | Infrastructure orchestration |

### Next Steps

1. **Explore act-personal-ai** - What agents exist? What can they do?
2. **Design gap analysis agent** - Stories → Projects → Vignettes mapping
3. **Design art reflection workflow** - Capture the "why" behind creative work
4. **Create review rhythms** - Schedule or trigger-based execution
5. **Build reporting** - Notion integration or dashboard

---

## Tools Ready to Use

### 1. Gap Analysis
```bash
cd /Users/benknight/act-personal-ai && node services/gap-analysis.mjs
```
Shows: 328 stories, 239 storytellers, 70 projects, 26 vignettes, 6 art opportunities

### 2. Art Reflection CLI
```bash
cd /Users/benknight/act-personal-ai && node scripts/reflect-on-art.mjs --list
cd /Users/benknight/act-personal-ai && node scripts/reflect-on-art.mjs --vignette <file>
cd /Users/benknight/act-personal-ai && node scripts/reflect-on-art.mjs  # interactive
```
The 5 Questions: WHAT, WHY, WHERE, HOW, INVITATION

### 3. Page Review
```bash
cd /Users/benknight/act-personal-ai && node services/page-review.mjs <file>
```
Scores content for ACT Voice alignment (86/100 for Building Empathy Ledger)

### 4. Compendium Review (NEW)
```bash
cd /Users/benknight/act-personal-ai && node services/compendium-review.mjs
cd /Users/benknight/act-personal-ai && node services/compendium-review.mjs --project "Oonchiumpa"
```
Full audit of all 38 projects: detailed pages, vignettes, EL stories, media coverage

### 5. Fill Gaps Workflow (NEW)
```bash
cd /Users/benknight/act-personal-ai && node scripts/fill-gaps.mjs --list
cd /Users/benknight/act-personal-ai && node scripts/fill-gaps.mjs --project "Empathy Ledger"
cd /Users/benknight/act-personal-ai && node scripts/fill-gaps.mjs --blog "LCAA Methodology"
```
Interactive workflow for creating project pages and blog posts from templates

### 6. Knowledge Export for LLM (NEW)
```bash
cd /Users/benknight/act-personal-ai && node scripts/export-knowledge.mjs --format qa --output act-qa.json
cd /Users/benknight/act-personal-ai && node scripts/export-knowledge.mjs --format rag --output act-rag.json
```
Exports: 98 QA pairs, RAG chunks, search index - for fine-tuning or retrieval

---

## The Vision: ACT as Philosophical Movement

See: [ACT_AS_MOVEMENT.md](./ACT_AS_MOVEMENT.md)

**Every project should have a Project Reflection Space:**
1. **A Way to Express as Art** - Videos, photos, writing, music
2. **A Way for Community to Add Voice** - Storyteller reflections, dinner conversations, workshop insights
3. **A Way to See Impact** - ALMA signals, evidence, links to communities

**The ACT story is crafted by community through:**
- Monthly dinners where people help craft the community story
- Workshops where participants become co-authors
- The Harvest markets where groups seek connection
- Connection points where people find each other

**Inspiration sources:**
- Great artists and cultural movements
- Stories from very long ago - truth-telling traditions
- New technologies like ALMA for liberation, not extraction

**The progression:**
Normal → ACT's normal → Witta's normal → World's normal → Outside of limitation

---

## Related Handoffs

- [compendium-vignettes](../compendium-vignettes/current.md) - Vignettes sync infrastructure (COMPLETE)
- [ACT_AS_MOVEMENT.md](./ACT_AS_MOVEMENT.md) - Vision document for ACT as philosophical movement
