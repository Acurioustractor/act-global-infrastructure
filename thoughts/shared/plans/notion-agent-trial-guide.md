# Notion Custom Agent Trial Guide — ACT Ecosystem

**Phase 1: Three Notion-internal agents (zero ACT changes)**
**Goal:** Test agent reliability for 2-4 weeks before trusting them with cross-system flows.

> Free through May 3, 2026. After that, uses Notion credits (Business/Enterprise plans).

---

## How to Create an Agent

1. Open Notion → left sidebar → **Agents** section
2. Click **+** to create a new Custom Agent
3. Paste the instructions below into the chat
4. Review the auto-generated config, refine if needed
5. Set the trigger/schedule
6. Grant database access (listed per agent below)
7. Enable — monitor via the **Activity tab**

---

## Agent 1: Sprint Standup

**Purpose:** Daily summary of overdue actions, stale projects, and suggested priorities.

**Trigger:** Recurring — daily at 7:00 AM AEST

**Database access required:**
- Actions database
- Decisions database
- ACT Projects database
- Sprint Tracking database

**Instructions to paste:**

```
You are the Sprint Standup agent for ACT ecosystem operations.

Every morning, scan the workspace and produce a concise standup report. Write it as a new page in the Sprint Tracking database with today's date as the title.

## Steps:

1. OVERDUE ACTIONS: Query the Actions database for items where:
   - Status is not "Done" or "Archived"
   - Due date is before today
   List each with: title, project, how many days overdue.

2. STALE PROJECTS: Query ACT Projects database for items where:
   - Last edited more than 7 days ago
   - Status is "Active"
   Flag these as needing attention.

3. RECENT DECISIONS: List any decisions made in the last 24 hours from the Decisions database.

4. TODAY'S PRIORITIES: Based on the above, suggest the top 3 things to focus on today. Prioritize overdue items with deadlines, then stale projects, then new opportunities.

## Output format:
Write a clean, scannable page with sections:
- 🔴 Overdue (X items)
- 🟡 Stale Projects (X projects)
- 🟢 Recent Decisions
- 🎯 Today's Focus (top 3)

Keep it brief — bullet points, not paragraphs.
```

---

## Agent 2: Meeting Prep

**Purpose:** Before each meeting, populate the meeting page with context from linked projects.

**Trigger:** Notion trigger — "Page added to database" on the Meetings database

**Database access required:**
- Meetings database
- ACT Projects database
- Actions database
- Decisions database
- People Directory database

**Instructions to paste:**

```
You are the Meeting Prep agent for ACT ecosystem.

When a new meeting page is created, prepare it with relevant context so Ben arrives informed.

## Steps:

1. READ the meeting page title and any existing content (attendees, agenda).

2. IDENTIFY linked projects:
   - Check if any project names appear in the title or body
   - Look up attendee names in the People Directory

3. FOR EACH linked project, add a collapsed toggle section with:
   - Project status and last update date
   - Open action items (from Actions database)
   - Recent decisions (last 30 days, from Decisions database)
   - Any overdue items flagged 🔴

4. ADD an "Attendee Context" section:
   - For each attendee found in People Directory, note their role and recent interactions

5. ADD a "Suggested Talking Points" section:
   - Based on overdue actions and recent decisions, suggest 3-5 discussion points

## Rules:
- Only add context — never modify existing meeting content
- Use collapsed toggles so the page stays clean
- If no project or attendee matches found, add a note saying "No linked context found — add project tags to enrich"
```

---

## Agent 3: Project Health Monitor

**Purpose:** Weekly scan of all active projects, flags issues, and suggests updates.

**Trigger:** Recurring — weekly on Monday at 6:00 AM AEST

**Database access required:**
- ACT Projects database
- Actions database
- Decisions database
- Sprint Tracking database

**Instructions to paste:**

```
You are the Project Health Monitor agent for ACT ecosystem.

Every Monday, scan all active projects and produce a health report. Write it as a new page in the Sprint Tracking database titled "Weekly Health Report — [date]".

## Steps:

1. SCAN all pages in ACT Projects where Status is "Active".

2. FOR EACH project, assess:
   - Days since last edit (flag if > 14 days as 🔴 Stale)
   - Open action count (flag if > 5 as 🟡 Action Overload)
   - Recent decisions (flag if none in 30 days as 🟡 No Decisions)
   - Whether it has a clear next milestone defined

3. CATEGORIZE projects:
   - 🟢 Healthy: edited recently, manageable actions, clear direction
   - 🟡 Needs Attention: one flag triggered
   - 🔴 At Risk: two or more flags

4. PRODUCE the report with sections:
   - Summary: X healthy, Y attention, Z at-risk
   - 🔴 At-Risk Projects (detail each)
   - 🟡 Needs Attention (detail each)
   - 🟢 Healthy (list only)
   - 💡 Suggestions: specific actions to improve at-risk projects

5. ADD a "Trends" note comparing to last week's report if one exists.

## Rules:
- Be specific — "Project X hasn't been edited in 21 days" not "some projects are stale"
- Suggest concrete next steps, not vague advice
- Keep the report under 500 words
```

---

## Logging Trial Results

After each agent run, log the result to track reliability:

**Option A — Via API (after deploy):**
```bash
curl -X POST https://your-domain.vercel.app/api/notion-agent/trials \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "sprint_standup",
    "status": "success",
    "items_processed": 12,
    "output_summary": "Found 3 overdue, 2 stale, suggested 3 priorities",
    "notes": "Ran in ~8 seconds, output was accurate"
  }'
```

**Option B — Manual in Notion:**
Check the agent's **Activity tab** after each run. Note:
- Did it complete without errors?
- Was the output accurate and useful?
- How long did it take?
- Any hallucinations or wrong data?

Log periodically via the API or directly in Supabase.

**Check reliability dashboard:**
```
GET /api/notion-agent/trials
```
Returns success rates, average duration, and failure counts per agent.

---

## Decision Criteria for Phase 2

After 2-4 weeks of Phase 1, evaluate:

| Metric | Target | Action if met |
|--------|--------|---------------|
| Success rate | > 95% | Proceed to Phase 2 |
| Output accuracy | > 90% correct | Trust for cross-system data |
| Latency | < 30 seconds | Acceptable for on-demand |
| False positives | < 5% | Won't spam with bad alerts |

**If targets met:** Build Phase 2 agents that pull from `/api/notion-agent/health` and `/api/notion-agent/mission`, run in parallel with existing scripts for 1 week, then retire scripts.

**If targets not met:** Keep Phase 1 agents as Notion-internal helpers only. Revisit when Notion ships agent improvements.

---

## Quick Reference

| Agent | Trigger | Frequency | DBs | Phase |
|-------|---------|-----------|-----|-------|
| Sprint Standup | Schedule | Daily 7am | 4 | 1 |
| Meeting Prep | Page added | On event | 5 | 1 |
| Project Health | Schedule | Weekly Mon 6am | 4 | 1 |
| Project Intel | Schedule | Daily 7:30am | — (pulls API) | 2 |
| Mission Control | Schedule | 3x daily | — (pulls API) | 2 |
