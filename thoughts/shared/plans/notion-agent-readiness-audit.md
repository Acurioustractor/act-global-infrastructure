# Notion Agent Readiness Audit

## Summary

Before building 10 Notion agents, we audited all 7 core databases and their Supabase sync layer. **3 critical blockers** would cause agents to fail immediately. This report documents what's healthy, what's broken, and what to fix before building.

---

## Database Health Matrix

| Database | Notion Records | Supabase Synced | Freshness | Agent-Ready? |
|----------|---------------|-----------------|-----------|--------------|
| **Projects** | ~80 | 80 (but status unmapped) | Today | Partial |
| **Actions** | 80+ (has_more) | Not synced directly | N/A | Notion-only |
| **Meetings** | 25+ recent | Not synced directly | Active (Mar 20) | Notion-only |
| **Decisions** | ~0 in Notion | 5 (stale, Aug 2025) | DEAD | NO |
| **Knowledge Hub** | Large dataset | 12 records only | Partial | NO |
| **Planning Calendar** | ~85 events | Not synced (calendar_events = Google) | Active | Notion-only |
| **People** | Large (81K+ data) | 0 records | NEVER SYNCED | NO |

## Contact Data Landscape

| Source | Records | Notes |
|--------|---------|-------|
| GHL (CRM) | 4,555 | Primary contact store |
| Xero | 1,416 | Financial contacts |
| Notion People | Large | Rich relationship data, NOT synced to Supabase |
| Notion Organisations | 74 | Synced, current |
| Gmail Contacts | 7 | Barely used |

---

## 3 Critical Blockers

### 1. Decisions Database is Dead
- **Notion**: Search returns 0 results
- **Supabase**: 5 records, all from Aug 7-8 2025 (7 months stale)
- **Records look auto-generated**: "Hire 2 Additional AI Developers", "Implement Advanced Analytics Dashboard" — not real decisions
- **Impact**: Decision Tracker agent would be completely useless
- **Fix required**: Populate with real decisions OR remove this agent from the plan

### 2. People Database Not Synced to Supabase
- **Notion**: Large, active database with rich data (email, mobile, role, tags, relationship dates, LinkedIn, notes)
- **Supabase `notion_people`**: **0 records**
- **Impact**: `lookup_contact` Worker tool queries Supabase, so it can't find Notion People data. People Navigator agent would fail.
- **Fix required**: Add People sync to `sync-notion-to-supabase.mjs` OR build a Worker tool that queries Notion directly

### 3. Knowledge Hub Barely Synced
- **Notion**: Hundreds of entries (Knowledge, Documents, Grants, Tools, Contacts, Notes)
- **Supabase `knowledge_sources`**: Only 12 records
- **Impact**: `search_knowledge_graph` Worker tool works on embeddings in Supabase — if Knowledge Hub isn't synced, the agent misses 95%+ of organisational knowledge
- **Fix required**: Sync Knowledge Hub entries to Supabase with embeddings

---

## 4 Partial Issues

### 4. Project Status Not Mapped
- 80 `notion_projects` records exist in Supabase with `type` populated for all
- BUT `status` field = empty for all 80 (0 mapped)
- Notion has rich status values: "Active", "Ideation", "Sunsetting", "Transferred", "Internal", "Archived"
- **Impact**: Project Pulse agent can't filter by status through Worker tools
- **Fix**: Update sync script to map status field

### 5. Actions/Meetings/Calendar Not in Supabase
- These databases live only in Notion (no Supabase sync)
- Worker tools can't query them
- Agents MUST access them via Notion database access (built-in), not Worker tools
- **Impact**: Action Wrangler, Meeting Intelligence, Morning Brief must rely on Notion native access, not our custom workers
- **Risk level**: Low — Notion agents CAN read databases directly. Workers just add intelligence layer.

### 6. Meeting Naming Inconsistency
- Some meetings have descriptive names: "Snow Goods", "ARDS conversation", "Standard Ledger"
- Others are auto-generated timestamps: "@Last Friday 9:02 AM (GMT+9:30)", "@February 18, 2026 2:01 PM (GMT+10)"
- About 50% have good names, 50% are timestamps
- **Impact**: Agents searching meetings by topic will miss auto-named ones
- **Risk level**: Medium — AI summaries compensate (when populated)

### 7. Knowledge Hub Data Quality
- Some entries have empty Names
- Some entries lack Resource Type classification
- Tags inconsistently applied
- **Impact**: Knowledge Scout agent may return low-quality results
- **Risk level**: Medium — a one-time cleanup pass would help

---

## What Each Agent Needs to Succeed

### Tier 1: Ready Now (data is healthy)
| Agent | Why Ready | Data Sources |
|-------|-----------|-------------|
| **Morning Brief** | Actions + Calendar well-populated in Notion, invoices in Supabase | Notion: Actions, Calendar. Worker: `get_daily_review`, `get_outstanding_invoices` |
| **Action Wrangler** | Actions database active with 80+ records, good status tracking | Notion: Actions. Worker: `get_daily_review` |
| **Finance Advisor** | Xero data fully synced, 1,416 contacts, invoices current | Worker: `get_financial_summary`, `get_outstanding_invoices` |

### Tier 2: Ready After Minor Fixes
| Agent | Blocker | Fix |
|-------|---------|-----|
| **Project Pulse** | Status not mapped in Supabase | Fix sync script status mapping |
| **Meeting Intelligence** | Meeting names inconsistent | Low impact — AI summaries compensate |
| **Grant Navigator** | Depends on Knowledge Hub sync for grant entries | Sync Knowledge Hub → Supabase |
| **Weekly Review** | Aggregates from multiple sources | Works if underlying agents work |

### Tier 3: Blocked Until Fixed
| Agent | Blocker | Fix Required |
|-------|---------|-------------|
| **People Navigator** | 0 records in Supabase | Sync People DB → Supabase |
| **Knowledge Scout** | 12/hundreds of records synced | Full Knowledge Hub sync with embeddings |
| **Decision Tracker** | Database empty / stale | Either populate decisions or cut this agent |

---

## Access Requirements for Agents

### What Agents Need Beyond Notion Database Access

| Capability | Which Agents | How to Provide |
|------------|-------------|----------------|
| **Email context** | People Navigator, Morning Brief | `lookup_contact` Worker already pulls from `contact_communications` — but needs People sync first |
| **Web search** | Grant Navigator, Knowledge Scout | Notion AI has built-in web access. No additional setup needed. |
| **Financial data** | Finance Advisor, Project Pulse, Weekly Review | Already available via `get_financial_summary` and `get_outstanding_invoices` Workers |
| **Calendar** | Morning Brief | Notion reads Planning Calendar directly. Google Calendar in Supabase (2,071 events). |
| **Write-back** | None initially | Start read-only. Consider write agents later after trust is established. |

### Agent Output — How to Review What They Do

Notion agents don't create persistent output by default. To make their work reviewable:

1. **Agent Database** (already exists — `319ebcf9-81cf-8023-89eb-fc450c5b224c`): Could store agent run logs, responses, accuracy scores
2. **Weekly Review as Notion page**: Have the Weekly Review agent write its summary as a Knowledge Hub entry (auto-dated, tagged "Weekly Review")
3. **Morning Brief to Planning Calendar**: Could create a daily "Brief Delivered" event with key flags
4. **Agent trial tracking**: `notion_agent_trials` table exists in Supabase — use for monitoring

### Automation Schedules

| Agent | Schedule | Why |
|-------|----------|-----|
| **Morning Brief** | On-demand (user asks) | Too variable for auto-schedule |
| **Weekly Review** | Friday 4pm auto-run | Ritual timing, generates referenceable output |
| **Project Pulse** | On-demand | Deep-dive tool, not background |
| **Action Wrangler** | On-demand | Reactive tool |
| **Finance Advisor** | On-demand + BAS quarter alerts | Auto-alert 14 days before BAS deadline |
| **Grant Navigator** | On-demand + deadline alerts | Auto-alert 7 days before grant deadlines |

---

## Recommended Fix Sequence

### Phase 0: Data Fixes (Do Before ANY Agent Building)

1. **Sync People → Supabase** — Add to `sync-notion-to-supabase.mjs`
   - Map: name, email, mobile, role, status, tags, organisation, notes, first/last contact
   - Est: 2-3 hours

2. **Sync Knowledge Hub → Supabase** — Extend knowledge sync
   - Map: name, resource_type, tags, notes, AI summary, project links
   - Generate embeddings for semantic search
   - Est: 3-4 hours

3. **Fix Project Status Mapping** — Quick fix in sync script
   - Map Notion status values to Supabase status column
   - Est: 30 minutes

4. **Decide on Decisions** — Ben to decide:
   - Option A: Start using Decisions database actively (populate with real decisions)
   - Option B: Cut Decision Tracker agent, fold decision awareness into other agents
   - Option C: Auto-populate from meeting AI summaries that mention decisions

### Phase 1: Build Tier 1 Agents (3 agents, ~1 hour)
- Morning Brief, Action Wrangler, Finance Advisor
- These have healthy data NOW

### Phase 2: Build Tier 2 Agents After Fixes (4 agents, ~1.5 hours)
- Project Pulse, Meeting Intelligence, Grant Navigator, Weekly Review
- After Phase 0 fixes are applied

### Phase 3: Build Tier 3 Agents (2-3 agents, ~1 hour)
- People Navigator, Knowledge Scout, Decision Tracker (if data populated)
- After People + Knowledge syncs are verified

---

## Existing Sync Infrastructure

| Sync | Script | Schedule | Status |
|------|--------|----------|--------|
| Notion → Supabase | `sync-notion-to-supabase.mjs` | Every 6h | Running but missing People, Knowledge, Calendar |
| Xero → Supabase | `sync-xero-to-supabase.mjs` | Every 6h | Healthy |
| Gmail → Supabase | `sync-gmail-to-supabase.mjs` | Manual | Working but limited |
| Google Calendar → Supabase | (via API) | Auto | 2,071 events, current |
| Contact signals | `compute-contact-signals.mjs` | Daily | Running |
| Project health | `compute-project-health.mjs` | Every 6h | Running |

### What `sync-notion-to-supabase.mjs` Currently Syncs
- Projects → `notion_projects` (80 records, status unmapped)
- Organisations → `notion_organizations` (74 records)
- Opportunities → `notion_opportunities` (43 records)
- **Missing**: People, Knowledge Hub, Actions, Meetings, Decisions, Planning Calendar
