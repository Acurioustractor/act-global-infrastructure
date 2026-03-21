# Notion Database Audit & Intelligent Agent Plan

## Database Inventory — Complete Map

### The Hub: Projects DB
**URL:** `notion.so/177ebcf981cf80dd9514f1ec32f3314c`
**Collection:** `0786139b-85d6-4699-b2bc-5b2effd52457`

Everything connects back here. This is the spine of the org.

| Property | Type | Notes |
|----------|------|-------|
| Name | title | Project name |
| Status | select | Active, Ideation, Sunsetting, Transferred, Internal, Archived |
| Project Type | select | Core Project, Client Work, Partnership, Ideation, Internal, Event, Art |
| Theme | multi_select | Youth Justice, Indigenous Sovereignty, Health & Wellbeing, Economic Freedom, Storytelling, Art & Culture, Technology |
| Revenue Actual | number (AUD) | From Xero |
| Revenue Potential | number (AUD) | Pipeline value |
| Project Lead | person | |
| Next Milestone Date | date | |
| URL | url | Dashboard link |
| **Relations** | | |
| Actions | relation → Actions DB | Linked tasks |
| Meetings | relation → Meetings DB | Meeting records |
| Decisions | relation → Decisions DB | Decision log |
| Organisations | relation → Organisations DB | Partner orgs |
| Opportunities | relation → Opportunities DB | |
| Artifacts | relation → Artifacts DB | |
| Conversations | relation → Conversations DB | |
| Places | relation → Places DB | Geographic location |
| Related Goals | relation → Goals DB | |
| Related Projects | self-relation | Cross-project links |

**Views:** Active, All, Gallery, Field Overview, KANBAN, Resources, Pipeline, Locations (chart)

---

### Core Action Databases

#### 1. Actions DB
**URL:** `notion.so/177ebcf981cf8023af6edff974284218`
**Collection:** `84bfbf62-1f77-4d4f-9050-ee4b2ed7163d`

| Property | Type | Values |
|----------|------|--------|
| Action Item | title | |
| Status | status | Not started → Please water → In progress → Done |
| Due Date | date | |
| Assigned to | person | |
| Projects | relation → Projects | |
| Theme | multi_select | Youth Justice, Health and wellbeing, Indigenous, Global community, Economic Freedom, Storytelling, Operations, Art, Technology, Innovation, Family |
| Type | select | Conversation, Roadmap, BK Daily Reflection, Story, Swarm, Retro, Advisory Group, ACT Planning, NM Daily Reflections, Grant |
| Location | select | Palm Island, BCV Farm, Brisbane, etc. (18 locations) |
| Place | select | Bank, Lab, Knowledge, Seedling, Seed (ACT metaphors) |
| AI summary | text | |
| Supabase ID | text | Bi-directional sync |
| Flights Booked | checkbox | |

**Views:** This Week Board, Today, Overdue, Calendar, All, Please Water
**Templates:** Conversation, New task, BK Daily Reflection

#### 2. Meetings DB
**URL:** `notion.so/305ebcf981cf81d280e6fc6ad3617daa`
**Collection:** `305ebcf9-81cf-81ae-aa2a-000bf34af0ff`

| Property | Type | Values |
|----------|------|--------|
| Name | title | |
| Date | date | |
| Type | select | external, internal, workshop, standup, board |
| Status | select | Scheduled, Completed, Cancelled, Notes Pending |
| Attendees | text | Internal attendees |
| External Attendees | relation → People Directory | |
| Project | relation → Projects | |
| Action Items | relation → Actions | |
| AI summary | text | |
| Follow-up Required | checkbox | |
| Supabase ID | text | |
| Due Date | date | |
| Assigned to | person | |

**Views:** Default table, Meetings Calendar

#### 3. Decisions DB
**URL:** `notion.so/305ebcf981cf81b59c0fe16b51db96bf`
**Collection:** `305ebcf9-81cf-8181-b223-000b871d2ca4`

| Property | Type | Values |
|----------|------|--------|
| Name | title | |
| Status | select | active, superseded, reversed, under review, decided, proposed |
| Date | date | |
| Priority | select | high, normal, low |
| Rationale | text | |
| Project | relation → Projects | |
| Supabase ID | text | |

#### 4. People Directory
**URL:** `notion.so/305ebcf981cf818c8a38fc7a6475d8a9`
**Collection:** `305ebcf9-81cf-81cb-941e-000b2e75c63a`

| Property | Type | Values |
|----------|------|--------|
| Name | title | |
| Email | email | |
| Phone | phone | |
| Organization | text | |
| Engagement | select | active, warm, cold, alumni, new, lead |
| Tags | multi_select | 38 tags (justicehub, goods, partner, funder, indigenous, etc.) |
| Partnership Thread | multi_select | World Tour, ILA Grant, Mukurtu, JusticeHub, Harvest |
| Tour Stop | select | Alice Springs, Darwin, Sydney, South Africa, etc. |
| Storyteller | checkbox | |
| GHL ID | text | GoHighLevel CRM link |
| Projects | relation → Projects | |
| Projects 2 | multi_select | justicehub, the-harvest (legacy?) |
| First Contact | date | |
| Last Contact | date | |

#### 5. Mission Control OS
**URL:** `notion.so/3db68c5f91f247dbbcc2c721992b904e`
**Collection:** `9fc880f2-7e58-4d3d-bb62-40407fcd4126`

Multi-source database also includes Projects and Planning Calendar views.

| Property | Type | Values |
|----------|------|--------|
| Title | title | |
| Type | select | Alert, Focus, Action, Project, Metric, Link |
| Priority | select | Critical, High, Medium, Low |
| Status | status | Queued → In progress / Watching → Done |
| Due | date | |
| Owner | person (limit 1) | |
| Health | number | Score |
| Value | number (AUD) | Dollar value |
| Domain | multi_select | Ops, Finance, Projects, Partnerships, Farm, Content, Systems |
| Summary | text | |
| Active | checkbox | |

**Dashboard view** with: Active items count, By type (donut), Status mix (donut), Urgent queue, Projects board, This week table, All items table

#### 6. Planning Calendar
**Collection:** `31eebcf9-81cf-80d2-9db0-000bdff22af3`
(Inside Mission Control database)

| Property | Type | Values |
|----------|------|--------|
| Event | title | |
| Date | date | |
| Type | select | Meeting, Deadline, Project milestone, Travel, Personal, Reminder |
| Status | select | Tentative, Confirmed, Done, Cancelled |
| Owner | person | |
| Notes | text | |

---

### Pipeline Databases

#### 7. Pipeline (Revenue CRM)
**URL:** `notion.so/320ebcf981cf8086a9c9e85bc429b68e`
**Collection:** `320ebcf9-81cf-80b1-b1d9-000bb0f67f9e`

| Property | Type | Values |
|----------|------|--------|
| Name | title | |
| Stage | status | Lead → Qualified → Proposal → Chasing → Closed Won / Closed Lost |
| Value | number ($) | |
| Type | select | Invoice, Grant, Contract, Sponsorship, Campaign, Donation, Fee-for-service |
| Probability | select | 90%+ Certain, 70% Likely, 50% Possible, 30% Speculative, 10% Moonshot |
| Source | select | Xero Invoice, Grant Pipeline, New Opportunity, Repeat Client |
| Project | select | All 10 ACT projects |
| Expected Close Date | date | |
| Owner | person | |
| Notes | text | |

**Views:** By Stage (board), Calendar, Invoiced (board), All Items (table)

#### 8. Grant Pipeline Tracker
**URL:** `notion.so/2784ae1361ba4bbfbb6210c42c0553ee`
**Collection:** `3179e5da-b77c-4618-ad9a-55ac0798485d`
(Inside Agent Database page)

| Property | Type | Values |
|----------|------|--------|
| Grant Name | title | |
| Stage | select | Identified, Researching, Pursuing, Drafting, Submitted, Negotiating, Approved, Lost, Expired |
| Amount | number ($) | |
| Deadline | date | |
| Funder | text | |
| Project | text | Project code |
| Type | select | Grant, Sponsorship, Contract, Fellowship, Prize |
| Readiness Score | number | 0-100 |
| Key Requirements | text | |
| Missing Documents | text | |
| Application URL | url | |
| Last Updated | date | |
| Notes | text | |

---

### Agent Output Databases (in Agent Database page)

| Database | Collection ID | Purpose |
|----------|---------------|---------|
| Weekly Meeting Reviews | `79c241cd-5930-46dc-9365-bd60745c139d` | Agent-generated meeting summaries |
| Financial Reviews | `8e433852-946a-4141-9589-e974ed6ae245` | Agent-generated finance summaries |
| Comms Triage Queue | `2000430d-dfd8-41ea-9207-fb0d7adf449d` | Agent-triaged communications |
| Weekly Project Reports | `8ecd03e8-65c5-4e8c-b6a2-56c0096121a0` | Agent-generated project health |
| Foundation Targets | `5d89d929-29a8-49f8-9292-927b931a5b12` | GrantScope foundation tracking |

---

## Relation Map — What's Connected

```
                    ┌─────────────────┐
                    │   PROJECTS DB   │ ← THE HUB
                    │  (7 core + 7    │
                    │   supporting)   │
                    └───────┬─────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                  │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌──────▼──────┐
    │ Actions   │    │ Meetings  │    │ Decisions   │
    │           │◄───│           │    │             │
    │           │    │           │    │             │
    └───────────┘    └─────┬─────┘    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   People    │
                    │  Directory  │
                    └─────────────┘

    DISCONNECTED:
    ┌─────────────┐  ┌────────────────┐  ┌──────────────┐
    │  Pipeline   │  │ Grant Pipeline │  │Mission Control│
    │  (select    │  │   Tracker      │  │     OS        │
    │   not rel)  │  │ (text not rel) │  │  (no project  │
    │             │  │                │  │   relation)   │
    └─────────────┘  └────────────────┘  └──────────────┘
```

## Issues Found

### Critical: Broken/Missing Relations

1. **Grant Pipeline Tracker → Projects**: `Project` is a TEXT field, not a relation. Should be a relation to Projects DB so grants link to projects properly.

2. **Pipeline → Projects**: `Project` is a SELECT field with hardcoded project names. Should be a relation so pipeline items connect to project pages.

3. **Mission Control OS → Projects**: No project relation at all. Items exist in isolation from the project they relate to.

4. **People Directory → Meetings**: External Attendees relation exists on Meetings but People Directory doesn't have a reverse "Meetings attended" view.

5. **Grant Pipeline Tracker → People Directory**: No relation to contacts/funders. `Funder` is text — should link to People Directory for relationship tracking.

### Data Quality Issues

6. **People Directory**: Has both `Projects` (relation) AND `Projects 2` (multi_select) — redundant. `Projects 2` only has "justicehub" and "the-harvest" — likely legacy.

7. **Meetings**: Has BOTH `Status` (select) and `Status 1` (status) — confusing duplication. `Status` is the one used in playbooks; `Status 1` appears to be the inherited status widget.

8. **Actions**: `Theme` options don't fully match Projects `Theme` options (e.g., Actions has "Indigenous" vs Projects has "Indigenous Sovereignty").

9. **Grant Pipeline Tracker**: No `Supabase ID` field — blocks bi-directional sync with `grant_opportunities` table.

### Missing But Needed

10. **No Receipts database** — receipt tracking is in Supabase (`receipt_pipeline_status`) but has no Notion representation for human review.

11. **No Invoices database** — outstanding invoices live in Xero/Supabase (`xero_invoices`) but no Notion view for chase management.

---

## The Dream: Proactive Notion Agent

### What Exists Today
- 36 Notion Worker tools (all powered by `@act/intel`)
- Agent Playbooks page with 6 structured workflows
- Agent Database page with 5 output databases
- ACT Agent Instructions v2 with scheduling

### What's Missing for the Dream

#### 1. Database Fixes — COMPLETED 2026-03-14
- [x] Added `Project Link` RELATION to Grant Pipeline Tracker → Projects DB
- [x] Added `Supabase ID` TEXT to Grant Pipeline Tracker
- [x] Added `Funder Contact` RELATION to Grant Pipeline Tracker → People Directory
- [x] Added `Project Link` RELATION to Pipeline (Revenue CRM) → Projects DB
- [x] Added `Project` RELATION to Mission Control OS → Projects DB
- [x] Removed `Projects 2` from People Directory (legacy multi_select)
- [x] Harmonized Theme values: Actions now matches Projects (`Indigenous` → `Indigenous Sovereignty`, `Health and wellbeing` → `Health & Wellbeing`, `Art` → `Art & Culture`)
- [x] Renamed `Status 1` → `Task Status` on Meetings DB for clarity

**Note:** Old text/select `Project` fields kept on Grant Pipeline Tracker and Pipeline for reference. New `Project Link` relation fields are the proper connections. Migrate existing entries to use relations, then optionally remove old fields.

#### 2. New Notion Worker Tools Needed
The @act/intel functions already exist. These just need Worker tool wrappers:

| Tool | @act/intel function | What it does for the user |
|------|---------------------|---------------------------|
| `daily_inbox_review` | Multiple | Review what changed in Notion today, route to right DBs |
| `start_meeting` | `searchContacts` + `fetchProjectSummary` | Pre-load meeting context (project health, contact history, open actions) |
| `end_meeting` | Write actions | Create meeting record, extract actions, link to project |
| `weekly_notion_cleanup` | Multiple | Find orphaned items, stale actions, missing relations |
| `suggest_grants` | `fetchGrantReadiness` + GrantScope | Match projects to grants proactively |
| `sync_xero_to_pipeline` | `fetchOutstandingInvoices` | Keep Pipeline DB in sync with Xero invoices |

#### 3. Proactive Agent Schedule
```
DAILY (8am AEST):
  1. Triage new emails → create Actions or update People Directory
  2. Check grant deadlines → flag in Actions + Grant Pipeline
  3. Surface overdue invoices → create chase Actions
  4. Review what was added to Notion yesterday → ensure correct DBs

MONDAY (8am):
  5. Weekly Command Reset (Playbook 5 — already documented)
  6. Generate Weekly Meeting Review
  7. Update Mission Control OS metrics

WEDNESDAY (8am):
  8. Relationship pulse check → update People Directory
  9. Project health review → flag attention items

FRIDAY (5pm):
  10. Weekly financial review → create Financial Review
  11. Sprint board cleanup
```

#### 4. The "Put Things in the Right Place" Intelligence
The agent needs a routing table — when content appears in Notion, it knows where it belongs:

| Content Signal | Route To | How |
|---------------|----------|-----|
| Text mentions a person | People Directory | Check if exists, create/update |
| Text mentions a project code | Projects DB | Link via relation |
| Text contains "decide" or "agreed" | Decisions DB | Create entry |
| Text contains "TODO" or "action" | Actions DB | Create entry |
| Text contains a date | Planning Calendar | Create if deadline/milestone |
| Text mentions money/grant | Pipeline or Grant Tracker | Route by context |
| Text mentions meeting | Meetings DB | Create/update |

---

## Recommended Execution Order

### Phase 1: Fix the Foundation (database relations)
Clean up the broken/missing relations so the agent can create properly linked items.

### Phase 2: Supabase Sync Enhancement
Add Supabase IDs to Grant Pipeline Tracker. Build bi-directional sync so changes in either direction propagate.

### Phase 3: New Worker Tools
Build the 6 new Notion Worker tools using existing @act/intel functions.

### Phase 4: Proactive Scheduling
Set up the daily/weekly agent schedule via GitHub Actions cron.

### Phase 5: Content Routing Intelligence
Build the "put things in the right place" classifier that routes content to correct databases.
