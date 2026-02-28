# Notion 3.3 Custom Agents — ACT Alignment Strategy

**Date**: 26 February 2026
**Context**: Notion 3.3 launched Custom Agents on Feb 24, 2026. This document maps where Notion agents overlap with ACT infrastructure and where ACT adds unique value.

---

## Notion 3.3 Custom Agents — What They Do

- **Autonomous 24/7 agents** — describe in natural language, set trigger/schedule, they work
- **Sources**: Notion databases, Slack, Mail, Calendar, + MCP (Linear, Figma, HubSpot, Asana)
- **Triggers**: Schedule (daily/weekly/monthly), Slack events, Notion DB changes, email, manual/@mention
- **Capabilities**: Create/update hundreds of pages, bulk property updates, Q&A from workspace knowledge, status reports, task triage
- **Models**: GPT-5.2, Claude Opus 4.5, Gemini 3
- **Governance**: Full audit log, reversible changes, admin controls, team permissions
- **Pricing**: Free through May 3, 2026 → credit-based ($10/1,000 credits, Business/Enterprise only)
- **21,000+ agents** created by early testers; Notion runs 2,800 internally

### Key Limitations

1. **No live external data** — static Notion copy only, can't query Xero/GHL/Gmail in real-time
2. **No multi-step cross-system workflows** — content automation inside Notion, not orchestration
3. **No customer-facing use** — not for customer service, IT support, sales
4. **No programmatic triggering** — can't invoke a Custom Agent via external API/webhook
5. **No code execution** — natural language/content space only
6. **Throttling** — fair-use limits, no published caps
7. **MCP surface limited** — can't delete databases, limited API subset

---

## ACT's Current Notion Integration (~9,547 lines)

### Inbound (Notion → Supabase)

| Script | Frequency | Purpose |
|--------|-----------|---------|
| `sync-notion-to-supabase.mjs` | Every 5 min | Projects → `project_knowledge` (notion_sync) |
| `sync-notion-meetings.mjs` | Daily 5:30am | Meetings → `project_knowledge` (meeting), attendee matching, embeddings |
| `sync-notion-dates-to-calendar.mjs` | Every 6 hours | Notion dates → Google Calendar events |

### Outbound (Supabase → Notion)

| Script | Frequency | Purpose |
|--------|-----------|---------|
| `sync-project-intelligence-to-notion.mjs` | Daily 7:30am | Per-project intelligence sections (meetings, actions, decisions, pipeline, people) |
| `sync-actions-decisions-to-notion.mjs` | Every 15 min | Push to dedicated actions + decisions databases |
| `sync-mission-control-to-notion.mjs` | 3x daily | Cross-system dashboard (alerts, health, pipeline, finances) |
| `sync-finance-to-notion.mjs` | Daily 8:30am | Cashflow, invoices, pipeline, subscriptions |
| `sync-knowledge-to-notion.mjs` | Daily 8am | Knowledge pipeline output |

### Bidirectional

| Script | Frequency | Purpose |
|--------|-----------|---------|
| `poll-notion-checkboxes.mjs` | Every 15 min | Checkbox completion → updates Supabase `action_required`/`decision_status` |

### Dashboard / Bot

| Component | Purpose |
|-----------|---------|
| `/api/projects/notion/route.ts` | Fetch `notion_projects` table |
| `add_meeting_to_notion` (agent tool) | Telegram bot creates meetings in Notion + Supabase |

Config: `config/notion-database-ids.json` — **27 Notion database IDs** including actProjects, actions, decisions, meetings, missionControl, financeOverview, sprintTracking, githubIssues, deployments, yearlyGoals, sixMonthPhases, subscriptionTracking, contentHub, mukurtuNodeMap, and more.

---

## Strategic Alignment: What to Keep, What to Retire, What to Build

### Let Notion Agents Handle (retire ACT scripts)

| Current ACT Script | Notion Agent Replacement | Why |
|--------------------|-------------------------|-----|
| `notion-intelligence-hub.mjs` | Status update agent | Agent can summarise from Notion data natively |
| `poll-notion-checkboxes.mjs` | Native DB change triggers | Agents react to DB changes, no polling needed |
| Daily briefing → Notion push | Standup agent | Notion agents built for this exact use case |
| Push-based summaries to Notion pages | Pull-on-demand via agent | Agents query when asked, not push on schedule |

### Keep in ACT (Notion agents CAN'T do this)

| Capability | Why Notion Can't | ACT's Role |
|------------|-----------------|------------|
| **Cross-system orchestration** (Xero → Supabase → GHL → Gmail → Notion) | Agents only work inside Notion + limited MCP | ACT is the orchestration layer |
| **Real-time financial data** (Xero sync, transaction tagging, project financials) | No live external data | ACT owns finance pipeline |
| **Gmail sync + email intelligence** (4 mailboxes, domain-wide delegation) | Notion Mail is basic | ACT owns email intelligence |
| **GHL CRM operations** (pipeline stages, contact sync, enrichment) | No GHL integration | ACT owns CRM layer |
| **Grant enrichment pipeline** (web scraping, fit scoring, auto-applications) | Can't browse web or score | ACT owns grants intelligence |
| **Telegram bot + voice** (TTS, 22 agent tools, write actions) | No Telegram integration | ACT owns conversational interface |
| **Sprint suggestions** (5-signal cross-system generator) | Can't aggregate across systems | ACT owns cross-system intelligence |
| **Cultural protocol / data sovereignty** (tiered access, Mukurtu) | No cultural framework | ACT owns for PICC/community |

### Build New: ACT as MCP Provider TO Notion Agents

**The paradigm shift**: Instead of ACT pushing data to Notion pages, ACT becomes an MCP server that Notion Custom Agents call.

```
Before:  ACT cron scripts → push → Notion pages (scheduled, stale)
After:   Notion Agent → calls ACT MCP → gets live data (on-demand, fresh)
```

**Example flows:**

```
Notion Agent: "What's our cash position?"
→ Calls act-mcp/financials → queries v_cashflow_summary → returns live answer

Notion Agent: "What grants are due this week?"
→ Calls act-mcp/grants → queries grant_opportunities → returns deadlines + actions

Notion Agent: "Show untagged transactions this month"
→ Calls act-mcp/transactions → queries v_untagged_summary → returns list

Notion Agent: "What emails need follow-up?"
→ Calls act-mcp/emails → queries emails table → returns actionable list
```

### ACT MCP Server — Proposed Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `get_financials` | Cash position, P&L, project spend | `v_cashflow_summary`, `v_project_financials` |
| `get_grants` | Grant pipeline, deadlines, fit scores | `grant_opportunities`, `grant_applications` |
| `get_transactions` | Untagged transactions, recent spend | `xero_transactions`, `v_untagged_summary` |
| `get_emails` | Recent emails, follow-ups needed | `emails` table |
| `get_contacts` | Contact lookup, relationship context | `ghl_contacts` |
| `get_projects` | Project health, alignment scores | `projects`, `v_project_alignment` |
| `get_sprint` | Current sprint items, suggestions | `sprint_suggestions` |
| `get_calendar` | Upcoming events, conflicts | `calendar_events` |
| `search_knowledge` | Semantic search across all knowledge | `project_knowledge` |

---

## Implementation Phases

### Phase 1: Explore Notion Custom Agents (This Week)
- [ ] Create 2-3 test agents during free period (status reports, Q&A, task triage)
- [ ] Test MCP connector capabilities (what external tools work)
- [ ] Document what agents do well vs poorly for ACT's use cases
- [ ] Identify which push scripts can be retired

### Phase 2: Build ACT MCP Server (March 2026)
- [ ] Design MCP server spec (tools, auth, rate limits)
- [ ] Build as Vercel Edge Function or standalone server
- [ ] Expose 5-6 core data tools (financials, grants, projects, contacts, emails)
- [ ] Register as MCP connector in Notion workspace
- [ ] Test with Custom Agent calling ACT MCP tools

### Phase 3: Retire Push Scripts (April 2026)
- [ ] Retire `notion-intelligence-hub.mjs` (replaced by Notion agent + ACT MCP)
- [ ] Retire `poll-notion-checkboxes.mjs` (replaced by native DB triggers)
- [ ] Simplify `sync-actions-decisions-to-notion.mjs` (may still need for bidirectional)
- [ ] Keep `sync-notion-to-supabase.mjs` (Notion → Supabase direction still needed)
- [ ] Keep all cross-system crons (Gmail, Xero, GHL, calendar, grants)

### Phase 4: Client Offering — ACT Innovation Studio MCP Layer
- For clients like PICC: ACT builds the MCP server that makes their Notion workspace intelligent with their own data
- PICC's Notion gets agents that can answer: "How many clients did Healing Service see this month?" → ACT MCP → live data
- This is the PICC product spec (STORY/MEMORY/CAPTURE/DIRECTION) implemented via Notion + ACT MCP

---

## Key Insight

**Notion agents are the UI layer. ACT is the data/orchestration layer.**

Notion handles: content creation, task management, team collaboration, status reports, Q&A
ACT handles: real-time data from 10+ external systems, cross-system workflows, cultural protocols, intelligence generation

The two are complementary, not competitive. ACT's value increases with Notion agents because agents need good data to work with — and ACT provides that data via MCP.

---

## Sources

- [Notion 3.3: Custom Agents (Feb 24, 2026)](https://www.notion.com/releases/2026-02-24)
- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
- [MCP Connections for Custom Agents](https://www.notion.com/help/mcp-connections-for-custom-agents)
- [Custom Agents Help Center](https://www.notion.com/help/custom-agent)
- [Notion MCP Supported Tools](https://developers.notion.com/docs/mcp-supported-tools)
