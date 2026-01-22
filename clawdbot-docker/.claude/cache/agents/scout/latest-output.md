# ACT Agent Ecosystem - Strategic Capabilities Map
Generated: 2026-01-22

## Executive Summary

The ACT agent ecosystem consists of **3 deployment layers**:
1. **ClawdBot Docker Agents** (7 agents) - Domain specialists running on NAS/VPS
2. **Local Script Agents** (4 agents) - Executing agents that DO things (relationships, projects, contacts)
3. **Supabase Infrastructure** - Unified task queue + agentic workflow system

**Key Finding**: There's a clear division between "thinking agents" (ClawdBot) and "executing agents" (local scripts). ClawdBot agents draft/research/analyze. Local agents actually send messages, update CRM, schedule tasks.

---

## Layer 1: ClawdBot Docker Agents (NAS/VPS)
**Location**: `clawdbot-docker/services/agent-executor.mjs`

These are **Level 2 supervised agents** - they propose/draft/analyze, but don't execute without approval.

| Agent ID | Domain | Capabilities | Input | Output | Best For |
|----------|--------|--------------|-------|--------|----------|
| **scout** | Research | Australian regulatory context (ATO, ASIC, AusIndustry), grant research, policy analysis | Research request | Structured findings with sources + recommendations | "Research R&DTI eligibility", "Find Queensland grants" |
| **scribe** | Content | Drafts documents, emails, blog posts, newsletters. Uses ACT brand voice | Content brief | Full draft with [PLACEHOLDER] tags | "Draft LinkedIn post about JusticeHub", "Write grant narrative" |
| **ledger** | Finance | Australian tax calculations (R&DTI 43.5%, company tax 25%), budget estimates, financial modeling | Financial task | Calculations with workings + assumptions | "Calculate R&D tax offset", "Budget Phase 1 costs" |
| **cultivator** | Relationships | Warm/cold outreach templates, relationship health analysis, follow-up suggestions | Contact context | Personalized message draft | "Draft reconnection email for foundation manager" |
| **shepherd** | Projects | Status tracking, blocker identification, stakeholder updates | Project ID | Status report + next actions | "Check JusticeHub blockers", "Update stakeholder on delays" |
| **oracle** | Knowledge | Q&A from knowledge base, institutional memory, project history | Question | Answer with knowledge sources | "What do we know about PICC?", "Explain our justice model" |
| **herald** | Communications | Announcements, digests, broadcasts. Channel-specific tone (LinkedIn/X/email/internal) | Announcement topic | Channel-specific message drafts | "Announce new partnership", "Create weekly digest" |

**Trigger Method**: 
- CLI: `node clawdbot-docker/services/agent-dispatcher.mjs "your request"`
- API: POST to `/api/agents/dispatch` with `{message, source, context}`
- Discord: Message in agent channel gets auto-dispatched

**Architecture**:
- **agent-dispatcher.mjs**: Routes requests → correct agent using LLM intent analysis
- **agent-executor.mjs**: Executes assigned tasks, logs to Supabase
- **agent-heartbeat.mjs**: Keeps agents alive, monitors queue

**Skills Available**:
- `/search` - Hybrid semantic search across contacts/projects/stories
- `/draft [channel]` - Generate content in ACT brand voice
- Brand voice loaded from `config/brand.md`

**Status**: ✅ VERIFIED - All 7 agents implemented in agent-executor.mjs (lines 56-336)

---

## Layer 2: Local Script Agents (Mac/CLI)
**Location**: `scripts/*-agent.mjs`

These are **Level 2/3 executing agents** - they can actually DO things (send messages, update CRM).

### 2.1 Cultivator Agent (Relationship Outreach)
**File**: `scripts/cultivator-agent.mjs`

**What it does**:
1. Finds cold contacts (low relationship health, 30+ days silence)
2. Pulls full context (comms history, voice notes, tags)
3. Generates personalized outreach via LLM
4. **PROPOSES** outreach for approval
5. On approval: **ACTUALLY SENDS** via Signal/Email
6. Logs interaction, schedules follow-up

**Capabilities**:
- Contact discovery from `relationship_health` table
- LLM message generation (OpenAI/Anthropic)
- Signal sending (via Signal CLI)
- Email sending
- GHL contact updates
- Follow-up scheduling

**Commands**:
```bash
node scripts/cultivator-agent.mjs run              # Find + propose (default: 5 contacts)
node scripts/cultivator-agent.mjs pending          # Show approval queue
node scripts/cultivator-agent.mjs approve <id>     # Approve + SEND
node scripts/cultivator-agent.mjs execute          # Execute all approved
node scripts/cultivator-agent.mjs test             # Dry run
```

**Best For**: "Reconnect with 5 coldest contacts", "Follow up on grant meeting attendees"

**Status**: ✅ VERIFIED - Full implementation with proposal/approval/execution workflow

---

### 2.2 Relationship Alert Agent
**File**: `scripts/relationship-alert-agent.mjs`

**What it does**:
1. Analyzes relationship health scores
2. Proposes outreach actions
3. Waits for human approval
4. Executes approved outreach (currently simulated)

**Capabilities**:
- Relationship scoring (based on days since contact)
- Priority determination (urgent/high/normal)
- Proposal creation with reasoning
- Action execution (logs to audit trail)

**Commands**:
```bash
node scripts/relationship-alert-agent.mjs analyze   # Analyze + propose
node scripts/relationship-alert-agent.mjs execute   # Execute approved
node scripts/relationship-alert-agent.mjs status    # Show stats
```

**Best For**: Weekly relationship health checks, automated outreach triggers

**Status**: ✅ VERIFIED - Implements agentic workflow pattern

---

### 2.3 Project Intelligence Agent
**File**: `scripts/project-intelligence-agent.mjs`

**What it does**:
1. Gathers context for project/cluster (contacts, comms, voice notes)
2. Identifies gaps (missing contacts, stale relationships, missing tags)
3. Proposes specific actions (outreach, tag fixes, meetings)
4. Creates actionable task proposals

**Project Clusters** (groups of related projects):
- `palm-island` - PICC projects (ACT-PI, ACT-PS, ACT-SS, ACT-UA)
- `justice` - Youth justice (JusticeHub, Bimberi, etc)
- `indigenous` - First Nations projects
- `storytelling` - Empathy Ledger, etc

**Gap Detection**:
- No contacts tagged for project
- Contacts missing email/phone
- Stale relationships (30+ days)
- Missing voice notes
- Incorrect tagging

**Commands**:
```bash
node scripts/project-intelligence-agent.mjs analyze palm-island   # Analyze cluster
node scripts/project-intelligence-agent.mjs analyze ACT-PI        # Single project
node scripts/project-intelligence-agent.mjs pending               # Show proposals
node scripts/project-intelligence-agent.mjs approve <id>          # Approve
node scripts/project-intelligence-agent.mjs clusters              # List clusters
```

**Best For**: "Analyze PICC project health", "Find gaps in justice projects"

**Status**: ✅ VERIFIED - Full cluster analysis + gap detection

---

### 2.4 Agentic PM (TasklyAI-style)
**File**: `scripts/agentic-pm.mjs`

**What it does**:
1. **Goal decomposition**: Give high-level goal → get actionable tasks
2. **Dual assignment**: Tasks assigned to agent AND/OR human
3. **Agent execution**: Research/draft/calculate agents work autonomously
4. **Chat interface**: Direct agents with natural language

**Agent Modes**:
- `agent` - AI does it autonomously
- `human` - Requires human action
- `dual` - AI drafts, human reviews
- `review` - Human reviews AI output

**Built-in Execution Agents**:
- **researchAgent** - Finds info, Australian focus
- **draftAgent** - Creates docs/templates
- **calculateAgent** - Financial projections
- **generalAgent** - Misc tasks
- **chatAgent** - Natural language PM interface

**Commands**:
```bash
node scripts/agentic-pm.mjs create "Build Phase 1 foundation for ACT Pty Ltd"
node scripts/agentic-pm.mjs board [project-id]        # View kanban
node scripts/agentic-pm.mjs work <project-id>         # Agents work
node scripts/agentic-pm.mjs chat <project-id> "msg"   # Chat with PM
node scripts/agentic-pm.mjs review <task-id> approve  # Review work
```

**Best For**: "Set up ACT Pty Ltd", "Research AusIndustry changes", "Draft CRC-P application"

**Status**: ✅ VERIFIED - Full implementation with chat + kanban board

---

## Layer 3: Supporting Scripts (Tooling)
**Location**: `scripts/`

These aren't agents themselves, but tools agents use:

| Script | Purpose | Used By |
|--------|---------|---------|
| `contact-enrichment-cycle.mjs` | Weekly pipeline: link comms → consolidate → update dates → alerts | Scheduled/Ralph |
| `contact-manager.mjs` | CRUD for contacts, tag management | Cultivator, Project Intelligence |
| `contact-context.mjs` | Pull full contact context (comms + notes + health) | All relationship agents |
| `project-enrichment.mjs` | Enrich project metadata from Notion/GHL | Project Intelligence |
| `relationship-health.mjs` | Calculate relationship scores | Cultivator, Alert Agent |
| `act-project-manager.mjs` | Project lifecycle management | Agentic PM |

**Status**: ✅ VERIFIED - Support infrastructure

---

## Layer 4: Supabase Infrastructure
**Location**: `supabase/migrations/`

### 4.1 Agent Command Center
**Migration**: `20260121300000_agent_command_center.sql`

**Tables**:
- `agents` - Registry of all agents (ClawdBot 7)
- `agent_task_queue` - Unified queue for all agent work
- `channel_messages` - Threading/history for Discord/Signal/WhatsApp
- `agent_performance` - Learning/metrics

**Key Features**:
- **Autonomy levels**: 1 (manual), 2 (supervised), 3 (autonomous)
- **Multi-channel routing**: Discord, Signal, WhatsApp, web, voice, CLI
- **Human review workflow**: queued → working → review → approved → done
- **Dependency tracking**: tasks can block/depend on other tasks

**Status**: ✅ VERIFIED - Central coordination layer

---

### 4.2 Agentic Workflow System
**Migration**: `20260122100000_agentic_workflow.sql`

**Tables**:
- `agent_actions` - Registry of executable actions
- `agent_proposals` - Proposal queue with reasoning + approval

**Action Types** (from `20260121400000_executing_agents.sql`):

| Action | Level | Risk | Reversible | What It Does |
|--------|-------|------|------------|--------------|
| `send_signal` | 2 | medium | ❌ | Send Signal message (requires approval) |
| `send_email` | 2 | medium | ❌ | Send email (requires approval) |
| `send_discord_dm` | 2 | low | ❌ | Discord DM (requires approval) |
| `log_interaction` | 3 | low | ✅ | Log to communications_history (autonomous) |
| `update_contact_lastcontact` | 3 | low | ✅ | Update last_contact_date (autonomous) |
| `schedule_followup` | 3 | low | ✅ | Create follow-up reminder (autonomous) |
| `update_contact` | 2 | medium | ✅ | Update CRM fields (requires approval) |
| `create_task` | 2 | low | ✅ | Create task/todo (requires approval) |

**Workflow**:
1. Agent proposes action with reasoning
2. Human reviews (approve/reject/modify)
3. Agent executes approved action
4. Result logged to audit trail

**Status**: ✅ VERIFIED - Proposal/approval infrastructure in place

---

### 4.3 Agentic Projects
**Migration**: `20260122200000_agentic_projects.sql`

**Tables**:
- `agentic_projects` - Projects managed by agents
- `agentic_tasks` - Task breakdown with assignment modes
- `agentic_chat` - Chat history with project PM agent
- `agentic_work_log` - Execution audit trail

**Status**: ✅ VERIFIED - TasklyAI-style PM infrastructure

---

## Strategic Capabilities Matrix

### Use Case → Agent Mapping

| What You Want | Best Agent | Trigger Method | Autonomy |
|---------------|------------|----------------|----------|
| **Research Australian grants** | scout (ClawdBot) | Dispatcher or `/search grants` | Level 2 - needs review |
| **Draft LinkedIn post** | scribe (ClawdBot) | Dispatcher or `/draft linkedin` | Level 2 - needs review |
| **Calculate R&D tax offset** | ledger (ClawdBot) | Dispatcher | Level 2 - needs review |
| **Reconnect with cold contacts** | cultivator (Local) | `cultivator-agent.mjs run` | Level 2 - needs approval to send |
| **Analyze project health** | project-intelligence (Local) | `project-intelligence-agent.mjs analyze palm-island` | Level 2 - proposes actions |
| **Manage complex project** | agentic-pm (Local) | `agentic-pm.mjs create "goal"` | Mixed - agent/dual/human modes |
| **Answer question about ACT** | oracle (ClawdBot) | Dispatcher | Level 3 - autonomous |
| **Weekly relationship alerts** | relationship-alert (Local) | Scheduled cron | Level 2 - needs approval |
| **Announce new partnership** | herald (ClawdBot) | Dispatcher or `/draft announcement` | Level 2 - needs review |

---

## Overlap vs Specialization

### Overlap
- **Cultivator (ClawdBot) vs Cultivator (Local)**:
  - ClawdBot: Drafts relationship messages, suggests actions
  - Local: Actually SENDS messages after approval
  - **Recommendation**: Use Local Cultivator for execution, ClawdBot for one-off drafts

- **Oracle vs Scout**:
  - Oracle: Answers from knowledge base (quick Q&A)
  - Scout: Deep research with sources (comprehensive)
  - **Recommendation**: Oracle for internal questions, Scout for external research

### Specialization
- **Only ClawdBot**: Brand voice content (scribe, herald), finance calculations (ledger)
- **Only Local**: Actual execution (sending messages, updating CRM)
- **Only Agentic PM**: Goal decomposition, task assignment modes

---

## Trigger Methods Summary

| Method | For | Example |
|--------|-----|---------|
| **CLI Direct** | Local agents | `node scripts/cultivator-agent.mjs run` |
| **Dispatcher** | ClawdBot agents | `node services/agent-dispatcher.mjs "research grants"` |
| **Discord Bot** | ClawdBot agents | Message in Discord channel → auto-routes |
| **API** | ClawdBot agents | `POST /api/agents/dispatch` |
| **Scheduled** | Maintenance agents | Cron → contact-enrichment-cycle.mjs |
| **Chat PM** | Agentic PM | `agentic-pm.mjs chat <id> "message"` |

---

## Architecture Patterns

### Pattern 1: Draft → Execute
1. ClawdBot agent drafts (scribe, cultivator, herald)
2. Human reviews in Discord/CLI
3. Local agent executes (sends message, updates CRM)

**Example**: Draft email (scribe) → Approve → Send (cultivator)

### Pattern 2: Propose → Approve → Execute
1. Local agent analyzes (project-intelligence, relationship-alert)
2. Proposes action to `agent_proposals` table
3. Human approves via CLI
4. Agent executes via `action-executor.mjs`

**Example**: Find stale contact → Propose outreach → Approve → Send Signal

### Pattern 3: Autonomous Loop
1. Agent runs on schedule
2. Identifies work (contact-enrichment-cycle)
3. Executes within bounds (Level 3 actions only)
4. Logs for audit

**Example**: Weekly contact consolidation

### Pattern 4: Chat PM
1. Give goal to agentic-pm
2. PM decomposes into tasks
3. Agents execute tasks autonomously
4. Human reviews outputs
5. Chat to redirect/refine

**Example**: "Set up ACT Pty Ltd" → 15 tasks → agents work → human approves

---

## Missing Capabilities (Gaps)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No unified CLI for ClawdBot agents | Hard to test locally | Add `clawdbot-cli.mjs` wrapper |
| Cultivator (ClawdBot) doesn't execute | Redundant with Local Cultivator | Deprecate or merge |
| No voice pipeline integration | Voice notes don't trigger agents | Connect voice-pipeline.mjs to dispatcher |
| No automated proposal approval | All actions need manual approval | Add confidence-based auto-approve for Level 3 |
| Project Intelligence doesn't execute fixes | Just proposes | Add auto-tagging for high-confidence matches |

---

## Recommended Workflows

### 1. Weekly Relationship Cultivation
```bash
# Monday morning
node scripts/contact-enrichment-cycle.mjs         # Update all contact data
node scripts/relationship-alert-agent.mjs analyze # Find issues
node scripts/cultivator-agent.mjs run 5           # Propose 5 outreach
# Review in Discord
node scripts/cultivator-agent.mjs approve <id>    # Approve best ones
```

### 2. Project Health Check
```bash
# Analyze specific cluster
node scripts/project-intelligence-agent.mjs analyze palm-island
node scripts/project-intelligence-agent.mjs pending
node scripts/project-intelligence-agent.mjs approve <id>
```

### 3. Grant Application Sprint
```bash
# Create project
node scripts/agentic-pm.mjs create "Draft CRC-P grant for Empathy Ledger"
# Let agents research + draft
node scripts/agentic-pm.mjs work <project-id>
# Review outputs
node scripts/agentic-pm.mjs board <project-id>
# Refine via chat
node scripts/agentic-pm.mjs chat <project-id> "Add section on Indigenous partnerships"
```

### 4. Daily Intelligence Brief
```bash
# Use ClawdBot dispatcher
node clawdbot-docker/services/agent-dispatcher.mjs "Generate morning brief: relationship alerts, project status, grant deadlines"
# Herald compiles, posts to Discord
```

---

## Integration Points

| System | Integration | Status |
|--------|-------------|--------|
| **GoHighLevel** | Contact sync, tagging | ✅ Active |
| **Supabase** | Central database | ✅ Active |
| **Discord** | ClawdBot notifications + approvals | ✅ Active |
| **Signal** | Outreach sending (Local Cultivator) | ✅ Active |
| **Notion** | Project metadata sync | ⚠️ Partial |
| **Voice Notes** | Transcript → context | ⚠️ Manual |
| **Email** | Outreach sending | ⚠️ Needs SendGrid |

---

## Next Steps

### Short-term (This Week)
1. Test Local Cultivator end-to-end (run → approve → send)
2. Connect voice-pipeline to dispatcher for auto-routing
3. Create unified CLI for ClawdBot testing

### Medium-term (This Month)
1. Set up weekly cron for contact-enrichment + relationship-alerts
2. Add confidence-based auto-approve for Level 3 actions
3. Build Discord approval buttons for proposals
4. Integrate email sending via SendGrid

### Long-term (This Quarter)
1. Build agent performance dashboard
2. Add learning loop (failed proposals → improve prompts)
3. Create agent skill registry (agents can call each other)
4. Implement multi-agent collaboration (scout → scribe → herald pipeline)

---

## Key Files Reference

### ClawdBot Docker
- `services/agent-executor.mjs` - 7 agents (scout, scribe, ledger, cultivator, shepherd, oracle, herald)
- `services/agent-dispatcher.mjs` - Intent routing
- `services/agent-heartbeat.mjs` - Keep-alive
- `config/brand.md` - ACT brand voice

### Local Agents
- `scripts/cultivator-agent.mjs` - Relationship outreach (SENDS messages)
- `scripts/relationship-alert-agent.mjs` - Health monitoring
- `scripts/project-intelligence-agent.mjs` - Project gap analysis
- `scripts/agentic-pm.mjs` - Goal decomposition + task agents

### Infrastructure
- `scripts/lib/agentic-workflow.mjs` - Proposal/approval lib
- `scripts/lib/action-executor.mjs` - Executes approved actions
- `supabase/migrations/20260121300000_agent_command_center.sql` - Task queue
- `supabase/migrations/20260122100000_agentic_workflow.sql` - Proposal system

---

## Conclusion

The ACT agent ecosystem has:
- ✅ **7 ClawdBot agents** for drafting/research/analysis
- ✅ **4 Local executing agents** for actual CRM updates + outreach
- ✅ **Unified task queue** in Supabase for coordination
- ✅ **Proposal/approval workflow** for human-in-loop
- ✅ **3-level autonomy system** for bounded execution

**Strategic insight**: ClawdBot = thinkers, Local = doers. Use ClawdBot for one-off drafts and research. Use Local agents for scheduled automation and actual execution.

The missing piece is connecting them better - voice notes should trigger dispatcher, proposals need Discord approval buttons, and agents should be able to call each other (scout → scribe → herald pipeline).
