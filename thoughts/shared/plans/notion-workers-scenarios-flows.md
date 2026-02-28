# Notion Workers — Scenarios & Flows

## Context

Before deploying Notion Workers, we need to visualise how they'll actually be used day-to-day. Ben's current workflow is voice-first via Telegram and cron-driven briefings. Notion Workers add a third interface — inline in the workspace where project management already happens. The question isn't "can we build it" (we already have), it's "how does it change the workflow?"

---

## Scenario 1: Morning Briefing Inside a Daily Page

### Current Flow (Telegram)
```
Ben wakes up
  → Opens Telegram
  → Voice: "Give me my briefing"
  → Bot calls get_daily_briefing tool
  → Returns text wall in Telegram chat
  → Ben reads, mentally maps items to Notion projects
  → Switches to Notion to update project pages
  → Context lost between apps
```

### New Flow (Notion Worker)
```
Ben opens Notion daily page (e.g. "2026-03-04 — Tuesday")
  → Types in Notion agent: "What's my briefing today?"
  → Notion agent calls get_daily_briefing Worker
  → Briefing appears INLINE on the daily page:
      OVERDUE ACTIONS (3):
        - [ACT-EL] Follow up with Brodie re: film schedule (5d overdue)
        - [ACT-PICC] Submit budget revision (2d overdue)
        ...
      RELATIONSHIP ALERTS (2):
        - Sarah Chen (temp: 34/100, trend: falling)
        ...
  → Ben reads, then asks follow-up IN THE SAME CONTEXT:
      "Tell me more about the Brodie situation"
  → Agent calls lookup_contact Worker
  → Returns relationship card with signals, recent comms
  → Ben drags key info into the daily page as action items
  → Everything stays in one place
```

### What Changes
- **No app switching.** Briefing lives where the work lives.
- **Follow-up chains.** Notion agent keeps context across tool calls — "tell me more about X" works naturally.
- **Inline capture.** Ben can turn briefing items into Notion tasks/blocks without copy-pasting from Telegram.

---

## Scenario 2: Grant Review During Project Planning

### Current Flow
```
Ben is in Notion, reviewing the Empathy Ledger project page
  → Wonders: "Are there any grants closing soon for this?"
  → Opens Telegram
  → Types: "Check grant deadlines for ACT-EL"
  → Bot returns deadline info
  → Ben manually copies relevant bits back to Notion
  → Or: runs `node scripts/check-grant-deadlines.mjs` in terminal
  → Reads terminal output, context-switches back to Notion
```

### New Flow (Notion Worker)
```
Ben is in Notion, reviewing the Empathy Ledger project page
  → In the same page, asks agent: "What grants are closing for Empathy Ledger?"
  → Agent calls check_grant_deadlines with project_code: "ACT-EL"
  → Response appears inline:
      [SOON] ILA First Nations Digital Storytelling Grant
        Provider: Indigenous Land & Sea Corporation
        Deadline: 2026-03-11 (7 days)
        Amount: $85,000
        Progress: 60% (3/5 milestones)
        OVERDUE milestones: Budget narrative
  → Ben asks: "What about our overall project health?"
  → Agent calls get_project_health with project_code: "ACT-EL"
  → Gets activity scores, grant pipeline value
  → Ben updates the project page status right there
```

### What Changes
- **Zero context switch.** The question arises in Notion and is answered in Notion.
- **Project-scoped.** The agent naturally filters to the project being viewed.
- **Actionable inline.** Grant info turns into Notion to-dos without leaving the page.

---

## Scenario 3: Pre-Meeting Contact Prep

### Current Flow
```
Ben has a meeting with Sarah Chen in 30 minutes
  → Opens Telegram
  → "Tell me about Sarah Chen"
  → Bot returns contact card
  → Ben reads in Telegram, tries to remember key points
  → Opens Notion meeting page, manually writes prep notes
  → Meeting starts, Ben references Telegram chat for details
```

### New Flow (Notion Worker)
```
Ben creates meeting page in Notion: "Meeting — Sarah Chen — Mar 4"
  → Asks agent: "Prep me for this meeting. Who is Sarah Chen?"
  → Agent calls lookup_contact Worker with query: "Sarah Chen"
  → Returns inline:
      Sarah Chen
        Email: sarah@culturalarts.org.au
        Company: Cultural Arts Foundation
        Status: warm
        Projects: ACT-EL, ACT-PICC
        Temperature: 67/100 (stable)
        Signals: email=72, calendar=45, financial=80, pipeline=65
        Recent emails (30d): 8
        Last contact: 2026-02-20
  → Ben asks: "What's our financial relationship?"
  → Agent calls get_financial_summary with project_code: null
      (or could be scoped to shared projects)
  → All prep is ON the meeting page
  → During/after meeting, Ben takes notes on the same page
  → Complete record: prep + notes + follow-ups, all in one place
```

### What Changes
- **Meeting prep becomes a 30-second agent query** instead of multi-app research.
- **Prep + notes coexist.** No separate doc for background research.
- **Relationship signals visible at point of use** — temperature, trends, risk flags inform the conversation.

---

## Scenario 4: Weekly Financial Review

### Current Flow
```
Friday afternoon — Ben reviews finances
  → Opens Command Center dashboard (port 3001)
  → Checks financial overview page
  → Switches to Xero for untagged transactions
  → Runs `node scripts/auto-tag-fy26-transactions.mjs`
  → Goes back to Notion to update project budgets
```

### New Flow (Notion Worker)
```
Ben opens Notion "Weekly Review — W10 2026" page
  → "What's our financial summary for the last month?"
  → Agent calls get_financial_summary with months: 1
  → Returns inline:
      SPEND BY PROJECT (1mo):
        ACT-EL: $4,200 spent, $0 income (12 txns)
        ACT-PICC: $1,800 spent, $0 income (6 txns)
        ACT-HQ: $3,100 spent, $500 income (18 txns)
      UNTAGGED: 7 transactions ($890)
      GRANT PIPELINE: $185,000 across 3 active applications
  → "How healthy are our projects?"
  → Agent calls get_project_health with project_code: null
  → Gets activity scores across all projects
  → Ben writes review notes right on the page
  → Tags action items for next week
```

### What Changes
- **Single-surface review.** Financial data + project health + notes all on one Notion page.
- **No dashboard needed** for summary-level questions (Command Center still better for deep charts/tables).
- **Review artifact is persistent.** The Notion page becomes the record of the weekly review.

---

## Scenario 5: Multi-Tool Chain — "Morning Routine"

### The Power Scenario (Wave 5)
```
Ben opens Notion, types: "Run my morning routine"

Agent orchestrates multiple Workers:

  1. get_daily_briefing → surfaces 3 overdue + 2 upcoming
  2. check_grant_deadlines → ILA grant closing in 3 days
  3. lookup_contact → top relationship alert (Sarah, falling temp)
  4. get_financial_summary → 7 untagged transactions

Agent synthesises:
  "Good morning. Here's your focus for today:

   URGENT: ILA grant closes in 3 days — budget narrative milestone is overdue.
   Action: Finalise budget narrative today.

   RELATIONSHIP: Sarah Chen's temperature dropped to 34/100.
   Last contact was 14 days ago. She's linked to Empathy Ledger and PICC.
   Action: Send a check-in email.

   FINANCES: 7 untagged transactions ($890) — may want to tag before Friday review.

   FOLLOW-UPS DUE THIS WEEK:
   - [ACT-HV] Workshop venue confirmation (due Wed)
   - [ACT-EL] Film crew availability check (due Thu)"

→ Ben turns each item into a Notion checkbox
→ Works through the day, checking them off
→ Everything tracked on the daily page
```

---

## Flow Diagram: Data Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (single source of truth)     │
│                                                          │
│  project_knowledge  ghl_contacts  grant_applications     │
│  communications     relationship_health  xero_txns       │
│  ghl_opportunities  calendar_events  api_usage           │
└──────────┬──────────────┬──────────────┬────────────────┘
           │              │              │
    ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
    │  TELEGRAM   │ │ COMMAND  │ │   NOTION   │
    │    BOT      │ │  CENTER  │ │  WORKERS   │
    │             │ │          │ │            │
    │ Voice-first │ │Dashboard │ │ Inline in  │
    │ Mobile      │ │ Charts   │ │ workspace  │
    │ Quick Q&A   │ │ Tables   │ │ Context-   │
    │ Write ops   │ │ Bulk ops │ │ aware      │
    │ Receipts    │ │ Admin    │ │ Follow-up  │
    │             │ │          │ │ chains     │
    └─────────────┘ └──────────┘ └────────────┘
         ▲               ▲             ▲
         │               │             │
      Mobile          Desktop       Workspace
      On-the-go       Deep work     Planning
```

## When to Use What

| Situation | Best Interface | Why |
|-----------|---------------|-----|
| Walking, quick question | Telegram (voice) | Hands-free, mobile |
| Deep financial analysis | Command Center | Charts, tables, bulk ops |
| Morning briefing | **Notion Worker** | Stays on daily page, follow-up chains |
| Pre-meeting prep | **Notion Worker** | Prep + notes on same page |
| Project review | **Notion Worker** | Inline data alongside project docs |
| Send an email | Telegram | Has write tools + confirmation flow |
| Receipt capture | Telegram | Photo → OCR pipeline |
| Tag transactions | Command Center | Bulk UI, better for lists |
| "Who needs follow-up?" | Either | Telegram for quick, Notion for action |

---

## Verification

After deployment, test each scenario manually:
1. Open a Notion daily page → ask "What's my briefing?" → verify response quality
2. Open a project page → ask "Any grants closing for [project]?" → verify filtering works
3. Ask "Tell me about [known contact]" → verify relationship data appears
4. Ask "What's our spend this month?" → verify financial data
5. Chain: briefing → "tell me more about [alert item]" → verify agent chains tools

If any tool returns empty/error, check:
- Secrets set correctly (`ntn workers env set`)
- Supabase tables exist and have data
- Worker deployed (`ntn workers deploy`)
