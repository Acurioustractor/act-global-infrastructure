---
date: 2026-01-12T07:30:00Z
session_name: act-living-intelligence
branch: main
status: active
---

# Work Stream: act-living-intelligence

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-01-26T05:15:00Z
**Goal:** V1 STABILITY VERIFIED - ecosystem ready for production lock
**Branch:** main
**Test:** `curl http://localhost:3456/api/health` - check Command Center API

### ✅ COMPLETED: V1 Stability Verification (2026-01-26)
```
VERIFICATION RESULTS:
- act-global-infrastructure: 100% ready
- act-intelligence-platform: 74% (test debt accepted)
- act-regenerative-studio: 88% (Gmail OAuth config needed)

ACTIONS TAKEN:
- [x] GHL sync refreshed (861 contacts, 8 pipelines, 46 opportunities)
- [x] All 5 core integrations verified connected
- [x] Financial data flowing ($47K net, $156K receivable)
- [x] 13 agents registered, 37 proposals pending
- [x] 8,468 communications tracked
- [x] Created V1_STABILITY_VERIFICATION.md

TECHNICAL DEBT ACCEPTED:
- <5% test coverage (infra exists, add incrementally)
- API version sprawl v1/v2/v3 (works, consolidate later)
- No admin middleware (add before public admin routes)
```

### ✅ COMPLETED: Empathy Ledger v2 Integration
```
Location: /Users/benknight/Code/empathy-ledger-v2

STRATEGIC IMPORTANCE:
- Core to ACT mission: storytellers OWN their data
- Measures impact through community storytelling
- NEW database replacing old EL - don't use old storyteller data

COMPLETED:
- [x] Explored EL v2 database schema (scout report: empathy-ledger-ghl-sync-schema.md)
- [x] Created sync script: EL v2 storytellers → GHL (sync-storytellers-to-ghl.mjs)
- [x] Created link script: EL v2 → ghl_contacts (link-storytellers-to-contacts.mjs)
- [x] Added storyteller fields to ghl_contacts table (migration applied)
- [x] Built StorytellerWidget component in Intelligence Platform

KEY DISCOVERY: EL v2 already has ghl_contact_sync table built for bidirectional sync!
```

### System Architecture (CRITICAL)
```
┌─────────────────────────────────────────────────────────────────┐
│                    ACT AGENTIC SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRODUCTION (NAS 24/7)              DEV (Mac localhost)         │
│  ┌─────────────────────┐           ┌──────────────────────────┐ │
│  │ ClawdBot Docker     │           │ Command Center (3456)    │ │
│  │ └─ Telegram bot     │           │ └─ api-server.mjs        │ │
│  │ └─ Signal API       │           │ └─ 32+ endpoints         │ │
│  │ └─ Agent services   │           │                          │ │
│  └─────────┬───────────┘           │ Intelligence (3999)      │ │
│            │                       │ └─ React dashboard       │ │
│            │                       │ └─ 7 tabs                │ │
│            │                       └───────────┬──────────────┘ │
│            │                                   │                │
│            └───────────────┬───────────────────┘                │
│                            ▼                                    │
│              ┌─────────────────────────┐                        │
│              │      SUPABASE           │                        │
│              │  (Shared Data Layer)    │                        │
│              │  └─ agent_task_queue    │                        │
│              │  └─ agent_proposals     │                        │
│              │  └─ agents (11)         │                        │
│              │  └─ ghl_contacts (859)  │                        │
│              └─────────────────────────┘                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  AGENTS (11 registered):                                        │
│  Domain: Ralph, Scout, Scribe, Ledger, Cultivator, Shepherd,   │
│          Oracle, Herald                                         │
│  Support: Dispatcher, Reviewer, Chronicler                      │
├─────────────────────────────────────────────────────────────────┤
│  SINGLE SOURCE OF TRUTH: act-global-infrastructure              │
│  └─ 110+ scripts, 13 migrations, ClawdBot Docker (8 services)   │
│  └─ Agentic workflow: proposals → approval → execution          │
└─────────────────────────────────────────────────────────────────┘
```

### Production Deployment
- **NAS (24/7)**: ClawdBot Docker on Synology/QNAP
  - Telegram: @ACTFarmhand_bot
  - Signal: via signal-cli-rest-api
  - Deployment: `clawdbot-docker/NAS-DEPLOYMENT.md`
- **Scripts**: Run from act-global-infrastructure via cron or manual
- **Data**: All flows through Supabase (shared between all components)

### How to Launch
```bash
# 1. Start Command Center API (from act-global-infrastructure)
cd packages/act-dashboard && node api-server.mjs

# 2. Start Intelligence Platform (from act-intelligence-platform)
cd apps/frontend && npm run dev

# 3. Access dashboards
open http://localhost:3999/?tab=intelligence  # Main dashboard
open http://localhost:3456                     # Command Center
```

### Now
[->] V2 ROADMAP CREATED - Ready for architecture decision (mono-repo vs multi-repo)

### Founder Interview Complete (2026-01-26)
```
KEY INSIGHTS:
- Ralph is most critical agent (orchestration)
- LCAA V2 = ALMA measurement everywhere
- Relationship scoring: depth + recency + alignment
- EL business model: community asset + trust builder
- Daily ritual: review proposals + check relationships
- Approval flow: weekly sweep

CRITICAL FEEDBACK:
- Claude Code broke backend during review (NEED SAFEGUARDS)
- System clunky, needs to be slick
- Wants system to learn from mistakes/outcomes
- Data not fresh enough (needs real-time)
- Rebuild priority #1: Integration layer

ARCHITECTURE REQUEST:
- Founder wants critical analysis: should 3 repos merge into 1?
- Recommendation: YES - mono-repo with workspace structure

V2 PRIORITIES:
1. Mono-repo consolidation
2. Rebuild integration layer (real-time)
3. Learning system (outcomes, corrections)
4. UX overhaul (single dashboard)
5. New integrations (Email AI, Social, PM, Xero deeper)
6. ALMA scoring everywhere
```

### This Session (2026-01-26 Morning)
- [x] **V1 STABILITY VERIFICATION COMPLETE**
- [x] Verified Command Center API health (port 3456)
- [x] Ran GHL sync (861 contacts, 8 pipelines, 46 opportunities)
- [x] Verified all 5 core integrations connected
- [x] Confirmed 13 agents registered, 37 proposals pending
- [x] Created docs/V1_STABILITY_VERIFICATION.md
- [x] **V1 PRODUCTION LOCK**
- [x] Configured Gmail OAuth in regenerative-studio
- [x] Created v1.0.0 tags (all 3 repos)
- [x] Pushed tags to GitHub
- [x] Created Supabase backup (schema + snapshot)
- [x] Added 3 GitHub Actions workflows
- [x] Triggered scheduled-syncs workflow
- [x] **FOUNDER INTERVIEW COMPLETE**
- [x] Captured 12 strategic insights
- [x] Identified V2 priorities (integration layer, learning system, UX)
- [x] Created docs/V2_ROADMAP.md
- [x] Recommended mono-repo architecture

### This Session (2026-01-21 Late Evening)
- [x] **Explored EL v2 schema** - full scout report with ALMA + GHL sync tables
- [x] **Created sync-storytellers-to-ghl.mjs** - syncs EL v2 storytellers to GHL contacts
- [x] **Created link-storytellers-to-contacts.mjs** - updates ghl_contacts with stories_count
- [x] **Migration: add_storyteller_fields_to_ghl_contacts** - added stories_count, is_storyteller, is_elder, empathy_ledger_id
- [x] **Built StorytellerWidget** - shows EL v2 storytellers in People tab sidebar

### This Session (2026-01-21 Evening)
- [x] **FIX: useCommandCenter hook** - API returns `relationships` not `contacts`
- [x] **FIX: Health stats mapping** - API returns `hot`/`warm`/`cool` not `hot_count`/`warm_count`/`cool_count`
- [x] **FIX: Storyteller inference** - Now checks tags for "storytelling", "empathy", "elder", "indigenous"
- [x] **FIX: Contact limits** - Increased from 500 → 2000 in PeopleTab
- [x] **FIX: Contacts page limit** - Increased from 500 → 1000
- [x] Ran contact enrichment cycle (5/5 steps passed)
- [x] Tagged 16 GHL contacts as "storytelling" (matched from old EL data)
- [x] Reviewed Marge Simpson workflow repo - decided ACT's system is already more sophisticated
- [x] **IDENTIFIED: Old EL data is stale** - need to use EL v2 at /Users/benknight/Code/empathy-ledger-v2

### This Session (2026-01-21 Afternoon)
- [x] **ARCHITECTURE ALIGNMENT** - documented two-dashboard system clearly
- [x] Discovered Intelligence Platform connects to Command Center API at port 3456
- [x] Started Command Center API server (verified health check working)
- [x] Created comprehensive scout audit of entire agentic system
- [x] Established single source of truth: act-global-infrastructure
- [x] Updated handoff with architecture diagram and launch commands
- [x] Verified Intelligence Platform ↔ Command Center connection (all APIs working)
- [x] Created 3 sprint tasks in Supabase (integration, proposals, relationship health)
- [x] Fixed /api/relationships/health endpoint (was using wrong column names)
- [x] Verified data flow: 859 contacts (20 hot, 124 warm, 715 cool)
- [x] 20 pending agent proposals ready for review

### This Session (2026-01-21 Morning)
- [x] Implemented 9 Layers of Agentic Infrastructure improvements (67% → 80%)
- [x] Created agentic workflow database schema (agent_actions, agent_proposals, autonomous_executions)
- [x] Built AgenticWorkflow class with tiered autonomy (Level 1/2/3)
- [x] Created proposal/approval/execution workflow (`scripts/lib/agentic-workflow.mjs`)
- [x] Built relationship-alert-agent as example agentic script
- [x] Applied 13 database migrations to Supabase
- [x] Entity resolution: 847 contacts → canonical entities, 1,704 identifiers
- [x] Unified search working across contacts, communications, projects
- [x] ACT Command Center dashboard prototype at packages/act-dashboard/
- [x] Infrastructure health score: 80% (72/90)

### Previous Session (2026-01-20)
- [x] Built ACT Studio Project Bot (`scripts/act-studio-bot.mjs`) - 43 projects, 11 categories
- [x] Created project notification system (`scripts/project-notifications.mjs`) - Discord alerts
- [x] Created project updates tracker (`scripts/project-updates.mjs`) - milestone tracking
- [x] Updated Discord notify to work as module (`scripts/discord-notify.mjs`)
- [x] Created project_updates table in Supabase
- [x] Reviewed all 78 Notion projects (`scripts/list-notion-projects.mjs`)
- [x] Full contact-project mapping: JusticeHub (723), Goods (123), First Nations (9)
- [x] Built unified project codes (`config/project-codes.json`) - 38 codes across all systems
- [x] Built ACT Project Manager (`scripts/act-project-manager.mjs`) - comprehensive agent
- [x] Ralph relationship-project matching: 407 confirmed, 9 suggested matches
- [x] ALMA impact measurement integration per project
- [x] Empathy Ledger stories linked via LCAA framework
- [x] Moon cycle strategy with phase-appropriate todos
- [x] LCAA art/storytelling integration (Listen, Connect, Act, Amplify)

### Previous Session (2026-01-17)
- [x] Fixed Intelligence Platform warnings (storytellers.project_id, HUGGINGFACE_API_KEY)
- [x] Updated Notion token in Bitwarden and .env files
- [x] Ran gap analysis successfully: 70 projects, 328 stories, 239 storytellers, 26 vignettes
- [x] Generated 34 new project pages in compendium (3% → 84% coverage)
- [x] Projects now documented: Empathy Ledger, JusticeHub, The Harvest, Goods, June's Patch, BG Fit, Contained, Diagrama, MMEIC Justice, ACT Monthly Dinners, Gold Phone, The Confessional, Custodian Economy, Designing for Obsolescence, Mounty Yarns, Fishers Oysters, Smart Connect, ANAT SPECTRA 2025, Mingaminga Rangers, Regional Arts Fellowship, 10x10 Retreat, DadLab25, Black Cockatoo Valley, Project Her-Self, Smart HCP Uplift, Travelling Women's Car, Cars and Microcontrollers, Fairfax PLACE Tech, NFP Leaders Interviews, ACT Bali Retreat, Uncle Allan Palm Island Art, and more
- [x] Confirmed 26 vignettes already synced to compendium (across 5 categories)
- [x] Expanded QA pairs from 98 → 232 pairs (exceeds 200+ target)
- [x] Created weekly-gap-analysis.yml GitHub workflow (runs Mondays 4pm AEST)
- [x] Exported knowledge to act-qa-232.json for LLM training
- [x] Built RAG chat UI at /ask with glassmorphic design
- [x] Added /api/v1/knowledge/qa endpoint to serve QA pairs
- [x] Chat UI includes: suggested questions, recent history, source attribution
- [x] Created story-collection-tracker.md for 60 projects needing stories
- [x] Added 5 new Community Voice vignettes (27-31) from high-priority EL stories
- [x] Updated vignettes index to 31 total stories across 6 categories

### Previous Session (2026-01-12)
- [x] Completed compendium vignettes sync infrastructure (6 stories synced)
- [x] Identified the problem: 4-hour/$7.50 batch processes are not sustainable
- [x] Captured vision: ongoing review processes, not one-time analysis
- [x] Explored act-personal-ai capabilities (50+ services, ACT Voice model available)
- [x] Designed full architecture document (ACT_LIVING_INTELLIGENCE_ARCHITECTURE.md)
- [x] Created gap-analysis-agent.md specification
- [x] Created art-reflection-agent.md specification
- [x] Built page-review.mjs service (working, tested on vignettes)
- [x] Built gap-analysis.mjs service (connects EL + Notion + vignettes)
- [x] Built reflect-on-art.mjs CLI (interactive 5 questions)
- [x] First gap analysis run: 328 stories, 239 storytellers, 70 projects, 26 vignettes
- [x] Identified 6 art opportunities ready NOW
- [x] Captured ACT_AS_MOVEMENT.md vision document
- [x] Defined Project Reflection Spaces concept (Art + Community Voices + Impact)
- [x] Built compendium-review.mjs service (full project audit with media mapping)
- [x] Built fill-gaps.mjs CLI (generate project pages and blog outlines)
- [x] Built export-knowledge.mjs (98 QA pairs, RAG chunks, search index)
- [x] Reviewed studio frontend: 38 projects in TS data with LCAA fields
- [x] Reviewed EL v2: Content Hub API, ALMA v2.0, 60+ API routes
- [x] Reviewed act-personal-ai: ACT Voice models (88/100 and 96/100)
- [x] Created ACT_UNIFIED_KNOWLEDGE_ARCHITECTURE.md - full system design

### Next
**PRIORITY: Empathy Ledger v2 Integration**
- [ ] Explore EL v2 database schema (`/Users/benknight/Code/empathy-ledger-v2`)
- [ ] Create sync script: EL v2 storytellers → GHL contacts (tag + stories_count)
- [ ] Build storyteller dashboard widget showing real EL v2 data
- [ ] Set up daily sync job for EL v2 ↔ Command Center

**Data Quality Workflows**
- [ ] Create `/enrich` skill - runs contact-enrichment-cycle.mjs daily
- [ ] Create `/sync-storytellers` skill - matches EL v2 → GHL
- [ ] Add stories_count field population from EL v2

**Previous (Completed)**
- [x] Generate pages for 35 undocumented projects ✓
- [x] Build RAG chat UI at act.place/ask ✓
- [x] Set up weekly cron for gap reports ✓

### Decisions
- SHIFT: From batch analysis to continuous review rhythms
- APPROACH: Use act-personal-ai models for lightweight ongoing analysis
- PHILOSOPHY: This IS ACT - bringing people into our world through reflection
- TECH: JavaScript services (not Python) to match existing infrastructure
- CADENCE: Weekly gap reports + on-change triggers
- ART: Manual trigger initially, human reflection captured by agent prompts
- VISION: ACT as philosophical movement, not organization
- AGENTIC: Tiered autonomy (Level 1=manual, Level 2=supervised, Level 3=autonomous)
- BOUNDED: Agents execute within defined limits, escalate when uncertain
- HUMAN-IN-LOOP: All medium/high risk actions require explicit approval

### Open Questions
- RESOLVED: Review cadence = weekly + on-change ✓
- RESOLVED: Art reflection format = 5 questions template ✓
- RESOLVED: Gap priorities = 6 art-ready vignettes identified ✓
- PENDING: Project Reflection Space implementation approach?

### Workflow State
pattern: design-first
phase: 3
total_phases: 4
retries: 0
max_retries: 3

#### Resolved
- goal: "Build living intelligence that continuously reviews and enriches ACT knowledge"
- resource_allocation: conservative (avoid expensive batch processes)
- vignettes_infrastructure: complete (6 synced, 20 pending)
- review_cadence: "weekly + on-change"
- art_reflection_format: "5 questions: WHAT, WHY, WHERE, HOW, INVITATION"

#### Unknowns
- gap_priority: UNKNOWN (needs first gap analysis run)

#### Last Failure
(none)

### Checkpoints
**Agent:** main session
**Task:** Design ACT Living Intelligence
**Started:** 2026-01-12T07:30:00Z
**Last Updated:** 2026-01-12T07:42:00Z

#### Phase Status
- Phase 1 (Vision Capture): ✓ VALIDATED
- Phase 2 (Architecture Design): ✓ VALIDATED
- Phase 3 (Lightweight Agents): ✓ VALIDATED
- Phase 4 (Review Rhythms): ✓ COMPLETE

#### Validation State
```json
{
  "compendium_vignettes": "complete (31 vignettes in 6 categories)",
  "el_v2_integration": "PENDING - priority for next phase",
  "el_v2_location": "/Users/benknight/Code/empathy-ledger-v2",
  "old_el_data": "STALE - do not use old storyteller tables",
  "act_personal_ai": "integrated",
  "living_intelligence": "ALL PHASES COMPLETE",
  "dashboard_fixes": {
    "useCommandCenter_hook": "FIXED (relationships vs contacts)",
    "health_stats_mapping": "FIXED (hot/warm/cool field names)",
    "storyteller_inference": "FIXED (now uses tags)",
    "contact_limits": "FIXED (500 → 2000)"
  },
  "contact_enrichment": "ran successfully (5/5 steps)",
  "storytellers_tagged": "16 GHL contacts (from old data - needs refresh from EL v2)",
  "ghl_contacts": 859,
  "relationship_health": { "hot": 7, "warm": 112, "cool": 740 },
  "intelligence_platform": "working (all hooks fixed)",
  "command_center_api": "working (port 3456)"
}
```

#### Resume Context
- Current focus: Empathy Ledger v2 integration
- Dashboard: All hooks fixed, data flowing correctly
- Priority: Sync EL v2 storytellers → GHL contacts with stories_count
- Strategic: Storyteller data ownership is core to ACT mission
- Blockers: (none - EL v2 is ready at /Users/benknight/Code/empathy-ledger-v2)

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
