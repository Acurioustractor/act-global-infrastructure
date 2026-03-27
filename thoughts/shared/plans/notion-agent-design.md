# Notion Custom Agents Design — ACT Operating System

## Database Map (Verified Schemas)

| Database | Collection ID | Key Properties | Relations |
|----------|--------------|----------------|-----------|
| **Projects** | `0786139b-...` | Name, Status, Project Type, Theme, Revenue Actual/Potential, Next Milestone Date | Actions, Meetings, Decisions, Organisations, Opportunities, Goals, Places |
| **Actions** | `84bfbf62-...` | Action Item, Status (Not started/Please water/In progress/Done), Due Date, Type, Location, Theme, Place | Projects, Assigned to |
| **Meetings** | `305ebcf9-...-aa2a` | Name, Date, Status, Type (external/internal/workshop/standup/board), Follow-up Required, AI summary | Project, Action Items, External Attendees |
| **Decisions** | `305ebcf9-...-b223` | Name, Date, Status (proposed/under review/decided/active/superseded/reversed), Priority, Rationale | Project |
| **Knowledge Hub** | `a94a4038-...` | Name, Resource Type (Tool/Contact/Document/Knowledge/Grant/Note), Tag, Notes, AI summary | Projects |
| **Planning Calendar** | `31eebcf9-...-9db0` | Event, Date, Type (Meeting/Deadline/Milestone/Travel/Personal/Reminder), Status, Notes | Project, Owner |
| **People** | `44139ffe-...` | Name, Email, Mobile, Role, Status, Tag, LinkedIn, Notes, First/Last Contact | Organisation, Opportunities, Conversations, Places |

### Supporting databases (linked via relations)
- **Organisations** (`9ce23468-...`) — linked from People and Projects
- **Opportunities** (`234ebcf9-...-b5a1`) — linked from People and Projects
- **Conversations** (`25debcf9-...-a6c0`) — linked from People and Projects
- **Places** (`25debcf9-...-9d47`) — linked from People and Projects
- **Goals** (`2aeebcf9-...`) — linked from Projects
- **External Attendees** (`305ebcf9-...-941e`) — linked from Meetings

### Operating Model (from Master Dashboard)
1. **Projects** = portfolio backbone, primary source of truth
2. **Actions** = execution commitments owned by people
3. **Meetings** = coordination moments generating actions and decisions
4. **Decisions** = durable record of what was agreed and why
5. **Knowledge Hub** = evergreen context, resources, documents
6. **Planning Calendar** = time commitments, milestones, deadlines
7. **Content Hub** = communications output

**Design principle:** Projects as the trunk of the tree. Everything branches from it.

---

## Existing Worker Tools (7 curated, deployed)

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `lookup_contact` | "Who is X?" | Supabase contacts + comms |
| `get_daily_review` | "What needs attention?" | Actions, calendar, signals |
| `get_project_intelligence` | "How is project X?" | Project health, financials |
| `get_financial_summary` | "How are finances?" | Xero via Supabase |
| `get_grants_summary` | "What grants?" | Grant pipeline |
| `search_knowledge_graph` | "What do we know about X?" | Knowledge embeddings |
| `get_outstanding_invoices` | "Who owes us?" | Xero invoices |

---

## 10 Custom Agents

### 1. Morning Brief
**Purpose:** Start-of-day situational awareness
**Trigger question:** "What needs my attention today?"

**Behaviour:**
- Surface overdue Actions (Status = "Please water" or past Due Date)
- Today's Planning Calendar events + Meetings
- Outstanding invoices approaching terms
- Projects with upcoming milestones (next 7 days)
- Any Decisions still "under review" or "proposed"

**Worker tools used:** `get_daily_review`, `get_outstanding_invoices`
**Notion databases accessed:** Actions, Planning Calendar, Meetings
**System prompt addition:** "Prioritise by urgency. Lead with what's overdue, then what's due today, then what's coming. Flag financial items with dollar amounts. Keep it to one screen."

---

### 2. Project Pulse
**Purpose:** Deep-dive into any project's health
**Trigger question:** "How is [project] going?" / "Give me a project update"

**Behaviour:**
- Project status, type, theme, lead
- Open actions count + overdue count for this project
- Recent meetings linked to this project
- Active decisions for this project
- Revenue actual vs potential
- Next milestone date
- Related knowledge articles

**Worker tools used:** `get_project_intelligence`, `get_financial_summary`
**Notion databases accessed:** Projects, Actions, Meetings, Decisions
**System prompt addition:** "When no project is specified, show portfolio overview — all Active projects with their key metrics. Use the ACT project metaphor: Seeds (ideation), Seedlings (early), Active (growing), Sunsetting (winding down)."

---

### 3. People Navigator
**Purpose:** Relationship context before meetings or outreach
**Trigger question:** "Tell me about [person]" / "Who from [organisation] should I contact?"

**Behaviour:**
- Contact details (email, mobile, LinkedIn)
- Role, organisation, tags
- First/last contact dates + relationship temperature
- Linked opportunities and conversations
- Recent meeting history involving this person
- Relevant knowledge hub entries

**Worker tools used:** `lookup_contact`
**Notion databases accessed:** People, Organisations
**System prompt addition:** "Lead with the human, not the data point. Show relationship context: when we last connected, what we discussed, what opportunities are live. For First Nations contacts, note cultural protocols. Never reduce people to pipeline stages."

---

### 4. Action Wrangler
**Purpose:** Execution accountability and task management
**Trigger question:** "What's overdue?" / "What actions does Ben have?" / "Show me all Please Water items"

**Behaviour:**
- Filter actions by Status, Assigned to, Project, Due Date
- Highlight "Please water" items (need intervention)
- Show completion rate trends
- Suggest grouping by project or theme
- Surface actions without due dates (unscheduled work)

**Worker tools used:** `get_daily_review`
**Notion databases accessed:** Actions
**System prompt addition:** "Be direct about what's stuck. 'Please water' is ACT's way of saying 'this needs help' — treat it with urgency but without blame. Group by project for context. Always show the person responsible."

---

### 5. Meeting Intelligence
**Purpose:** Pre-meeting prep and post-meeting follow-up
**Trigger question:** "Prepare me for my meeting with [person/about project]" / "What came out of the last [project] meeting?"

**Behaviour:**
- Pre-meeting: attendee profiles, project context, open decisions, relevant knowledge
- Post-meeting: surface action items marked "Follow-up Required", summarise decisions made
- Show meeting history for recurring series
- Link to AI summaries from past meetings
- Surface any planning calendar items related to this meeting's project

**Worker tools used:** `lookup_contact`, `get_project_intelligence`
**Notion databases accessed:** Meetings, People, Actions, Decisions
**System prompt addition:** "For external meetings, always pull attendee context from People. For internal meetings (standup/board), focus on action throughput. For workshops, emphasise knowledge captured. Always ask: what decisions need to be made in this meeting?"

---

### 6. Decision Tracker
**Purpose:** Institutional memory for decisions
**Trigger question:** "What did we decide about [topic]?" / "What decisions are still open?"

**Behaviour:**
- Search decisions by keyword, project, date range, status
- Show full rationale for decided items
- Surface "proposed" and "under review" decisions needing resolution
- Show superseded/reversed decisions with context (why did it change?)
- Link to the meeting where a decision was made

**Worker tools used:** None (Notion-native data only)
**Notion databases accessed:** Decisions, Projects
**System prompt addition:** "Decisions are institutional memory. When someone asks 'why did we do X?', find the decision and its rationale. When multiple decisions contradict, flag it. When a decision is old (>6 months) and still 'active', suggest a review."

---

### 7. Knowledge Scout
**Purpose:** Find and surface organisational knowledge
**Trigger question:** "What do we know about [topic]?" / "Find resources on [subject]"

**Behaviour:**
- Search Knowledge Hub by name, tag, resource type
- Cross-reference with project context
- Surface related people (tagged as Contact type)
- Show AI summaries where available
- Distinguish between types: Tools, Documents, Knowledge, Grants, Notes

**Worker tools used:** `search_knowledge_graph`
**Notion databases accessed:** Knowledge Hub
**System prompt addition:** "Knowledge Hub is ACT's second brain. Surface the most relevant items first. For research queries, show both internal knowledge AND suggest what we might be missing. For grant-related queries, include GrantScope data."

---

### 8. Finance Advisor
**Purpose:** Financial awareness and cash position
**Trigger question:** "How much cash do we have?" / "What invoices are outstanding?" / "How is project X spending?"

**Behaviour:**
- Cash position and burn rate
- Outstanding invoices (receivable and payable)
- Project-level P&L from Xero
- Revenue actual vs potential across portfolio
- BAS quarter awareness, R&D offset calculations
- Receipt coverage for R&D-eligible projects
- Flag: cash runway < 3 months, overdue receivables, missing receipts on R&D projects

**Worker tools used:** `get_financial_summary`, `get_outstanding_invoices`
**Notion databases accessed:** Projects (Revenue fields)
**System prompt addition:** "Think like a CFO who understands the mission. Every dollar serves community. Quantify everything — never say 'significant' without a number. Calculate: GST = amount/11, R&D offset = amount x 0.435. Flag risks proactively."

---

### 9. Grant Navigator
**Purpose:** Grant pipeline visibility and opportunity tracking
**Trigger question:** "What grants are available for [project]?" / "What's our grants pipeline?"

**Behaviour:**
- Active grant opportunities from GrantScope
- Pipeline status and confidence levels
- Deadline alerts for upcoming grant rounds
- Match grants to ACT projects by theme
- Show grant-related knowledge hub entries
- Link to relevant people/organisations in the funder space

**Worker tools used:** `get_grants_summary`, `search_knowledge_graph`
**Notion databases accessed:** Knowledge Hub (Grant type), Opportunities
**System prompt addition:** "Grant work is relationship work. Always show the human connection — who at the foundation do we know? What's our history with this funder? For First Nations-focused grants, note cultural alignment requirements."

---

### 10. Weekly Review
**Purpose:** End-of-week synthesis for team alignment
**Trigger question:** "Generate this week's summary" / "What happened this week?"

**Behaviour:**
- Actions completed this week (celebrate wins)
- Actions still open/overdue (accountability)
- Meetings held + key outcomes
- Decisions made or advanced
- New knowledge captured
- Planning calendar: what's coming next week
- Financial movements (invoices sent/paid)
- Project health changes

**Worker tools used:** `get_daily_review`, `get_project_intelligence`, `get_financial_summary`
**Notion databases accessed:** All 7 core databases
**System prompt addition:** "The weekly review is a ritual, not a report. Lead with wins and progress. Acknowledge what's stuck without blame. Frame next week in terms of the most important decisions and conversations. End with: 'What's the one thing that would make next week great?'"

---

## Sync Infrastructure

The agents READ live data. Keeping Notion databases current requires automated syncs:

### Already Running (PM2 / GitHub Actions)
| Sync | Script | Schedule | Direction |
|------|--------|----------|-----------|
| Xero → Supabase | `sync-xero-to-supabase.mjs` | Every 6h | Xero → Supabase |
| Notion → Supabase | `sync-notion-to-supabase.mjs` | Every 6h | Notion → Supabase |
| Gmail → Supabase | `sync-gmail-to-supabase.mjs` | Manual/webhook | Gmail → Supabase |
| Meetings → Supabase | `sync-notion-meetings.mjs` | Daily | Notion → Supabase |
| Contact signals | `compute-contact-signals.mjs` | Daily | Supabase → Supabase |
| Project health | `compute-project-health.mjs` | Every 6h | Supabase → Supabase |

### Recommended New Syncs
| Sync | Purpose | Schedule |
|------|---------|----------|
| **Actions summary → Notion** | Push weekly action completion stats as a Knowledge Hub entry | Weekly (Fri 5pm) |
| **Financial snapshot → Notion** | Push weekly cash position + project P&L as Knowledge Hub entry | Weekly (Fri 4pm) |
| **Calendar sync** | Two-way between Google Calendar and Planning Calendar | Real-time via webhook |

### NOT Recommended
- Do NOT sync Supabase data back INTO Notion databases en masse — Notion is the source of truth for operational data (actions, meetings, decisions). Supabase is the analytics/intelligence layer.
- Do NOT auto-create Actions from email — too noisy. Keep action creation human-initiated.

---

## Implementation Steps

### Phase 1: Create the 10 agents in Notion (30 min manual)
For each agent:
1. Notion sidebar → Agents → + New agent
2. Set name, description, and system prompt from above
3. Connect Worker tools (Settings → Tools and access → ACT Workers)
4. Grant access to relevant databases

### Phase 2: Test each agent with 3 example questions (1 hour)
Run through the trigger questions listed above. Verify:
- Worker tools return data (not timeout)
- Notion database access works
- Responses match the system prompt personality
- No hallucination of data

### Phase 3: Refine system prompts based on testing (ongoing)
- Tune prompt length (shorter = faster, longer = more personality)
- Add few-shot examples if agents miss nuance
- Adjust tool selection if agents call wrong tools

### Phase 4: Set up recommended syncs (separate session)
- Build `scripts/sync-weekly-to-notion.mjs` for Actions + Finance summaries
- Add to PM2 cron configuration

---

## Agent-to-Database Access Matrix

| Agent | Projects | Actions | Meetings | Decisions | Knowledge | Calendar | People | Worker Tools |
|-------|----------|---------|----------|-----------|-----------|----------|--------|-------------|
| Morning Brief | read | read | read | read | - | read | - | daily_review, invoices |
| Project Pulse | read | read | read | read | read | - | - | project_intel, financial |
| People Navigator | read | - | read | - | read | - | read | lookup_contact |
| Action Wrangler | read | read | - | - | - | - | - | daily_review |
| Meeting Intelligence | read | read | read | read | read | - | read | lookup_contact, project_intel |
| Decision Tracker | read | - | - | read | - | - | - | - |
| Knowledge Scout | read | - | - | - | read | - | - | search_knowledge |
| Finance Advisor | read | - | - | - | - | - | - | financial, invoices |
| Grant Navigator | read | - | - | - | read | - | - | grants, search_knowledge |
| Weekly Review | read | read | read | read | read | read | - | daily_review, project_intel, financial |

---

## Design Principles

1. **Projects as trunk** — every agent relates back to the project tree
2. **Read-heavy, write-light** — agents inform decisions, humans make them
3. **Personality over data** — raw data is already in Notion; agents add interpretation and prioritisation
4. **Cultural awareness** — People Navigator and Grant Navigator carry community partnership ethics
5. **No duplication** — agents reference one source of truth, not parallel copies
6. **Worker tools for external data** — Notion databases for operational data, Worker tools for Xero/Gmail/GrantScope
7. **7 tools maximum** — Notion AI routes better with fewer, well-described tools
