# Agent Tools Audit & Consolidation Plan

## The Problem

**50 Telegram tools. 43 Notion workers. Massive overlap between them.** Haiku can't reason well about 50 tools — it picks wrong ones, returns generic responses, and the user experience is shit.

---

## Telegram Bot: 50 Tools — Honest Assessment

### Finance (13 tools — way too many)

| Tool | What it does | Overlaps with | Verdict |
|------|-------------|---------------|---------|
| `get_financial_summary` | Pipeline + recent tx + receipts + subs | revenue_scoreboard, weekly_finance | **KILL** — scoreboard is better |
| `get_revenue_scoreboard` | Revenue targets, pipeline, receivables, scenarios | financial_summary | **KEEP** — most complete |
| `get_weekly_finance_summary` | Weekly finance digest | financial_summary, scoreboard | **KILL** — scoreboard covers it |
| `get_cashflow_forecast` | Cash flow forecast | financial_summary | **KEEP** — unique forecast angle |
| `get_project_financials` | Project-level spend | project_360 | **KEEP** — specific use case |
| `get_quarterly_review` | Quarterly financials | financial_summary, scoreboard | **KILL** — date-filter scoreboard |
| `get_xero_transactions` | Raw Xero search | query_supabase | **KEEP** — needed for specific lookups |
| `get_pending_receipts` | Pending receipts | receipt_pipeline_status | **KILL** — pipeline is superset |
| `get_receipt_pipeline_status` | Full receipt funnel | pending_receipts | **KEEP** |
| `find_receipt` | Cross-source receipt search | - | **KEEP** — unique |
| `get_untagged_summary` | Untagged transactions | - | **KEEP** |
| `trigger_auto_tag` | Auto-tag transactions | - | **KEEP** — write action |
| `add_receipt` | Log a receipt | - | **KEEP** — write action |

**Kill 4, keep 9.** Merge financial_summary + weekly_finance + quarterly_review into revenue_scoreboard with date params.

### Daily/Status (4 tools — all say the same thing)

| Tool | What it does | Overlaps with | Verdict |
|------|-------------|---------------|---------|
| `get_daily_briefing` | Overdue, follow-ups, alerts, financials, projects | daily_priorities, ecosystem_pulse | **KEEP** — the one briefing |
| `get_daily_priorities` | Prioritized actions for today | daily_briefing | **KILL** — merge into briefing |
| `get_ecosystem_pulse` | Cross-project pulse | daily_briefing | **KILL** — merge into briefing |
| `get_day_context` | Calendar + tasks for context | calendar_events | **KILL** — calendar_events + briefing covers it |

**Kill 3, keep 1.** One briefing tool with a `focus` param (finance/projects/relationships/all).

### Meeting (3 tools that do the same thing)

| Tool | What it does | Overlaps with | Verdict |
|------|-------------|---------------|---------|
| `create_meeting_notes` | Create meeting notes in GitHub | capture_meeting_notes, add_meeting_to_notion | **KILL** |
| `capture_meeting_notes` | Capture notes to GitHub | create_meeting_notes | **KILL** |
| `add_meeting_to_notion` | Add meeting to Notion DB | create_meeting_notes | **KEEP** — rename to `save_meeting_notes`, add `destination` param |

**Kill 2, keep 1.** Single `save_meeting_notes` tool.

### Writing/Reflection (9 tools — niche but user values them)

| Tool | Verdict |
|------|---------|
| `save_daily_reflection` | **KEEP** |
| `search_past_reflections` | **KEEP** |
| `save_writing_draft` | **KEEP** |
| `save_planning_doc` | **KEEP** — could merge with writing_draft |
| `move_writing` | **KEEP** |
| `review_planning_period` | **KEEP** |
| `moon_cycle_review` | **KEEP** — personal to user |
| `save_dream` | **KEEP** |
| `search_dreams` | **KEEP** |

These are personal tools Ben values. Keep all 9.

### Contacts (4 tools — clean, no overlap)
All **KEEP**: `search_contacts`, `get_contact_details`, `get_contacts_needing_attention`, `get_deal_risks`

### Grants (4 tools — clean)
All **KEEP**: `get_grant_opportunities`, `get_grant_pipeline`, `get_grant_readiness`, `draft_grant_response`

### Projects (4 tools — one overlap)

| Tool | Verdict |
|------|---------|
| `get_project_summary` | **KILL** — project_360 is superset |
| `get_project_health` | **KILL** — project_360 is superset |
| `get_project_360` | **KEEP** — the one project tool |
| `get_goods_intelligence` | **KEEP** — Goods-specific |

**Kill 2, keep 2.**

### Other (9 tools — all useful)
All **KEEP**: `query_supabase`, `search_knowledge`, `search_emails`, `get_upcoming_deadlines`, `draft_email`, `create_calendar_event`, `get_calendar_events`, `set_reminder`, `get_meeting_prep`

### Action tools (3 — all useful)
All **KEEP**: `add_action_item`, `add_decision`, write actions

---

## Summary: Telegram Tool Consolidation

| Category | Before | After | Killed |
|----------|--------|-------|--------|
| Finance | 13 | 9 | 4 |
| Daily/Status | 4 | 1 | 3 |
| Meeting | 3 | 1 | 2 |
| Projects | 4 | 2 | 2 |
| **Total** | **50** | **39** | **11** |

39 is still a lot. But the remaining tools are genuinely distinct.

---

## Notion Workers: 43 Tools — Assessment

The Notion workers have a different problem: **they aren't broken, they just have a shadow deployment with 0 tools** (missing env vars). The primary worker has 40 tools deployed and working.

But 43 tools is excessive for the Notion Agent. The agent probably can't reason about that many.

### Notion Worker Overlap with Telegram

**22 of 43 Notion tools do the same thing as a Telegram tool**, just formatted differently:

| Notion Worker | Telegram Equivalent |
|---------------|-------------------|
| check_grant_deadlines | get_grant_opportunities |
| get_daily_briefing | get_daily_briefing |
| lookup_contact | search_contacts |
| get_project_health | get_project_360 |
| get_financial_summary | get_financial_summary |
| get_outstanding_invoices | get_xero_transactions |
| get_cashflow | get_cashflow_forecast |
| get_receipt_pipeline | get_receipt_pipeline_status |
| get_reconciliation_status | (no exact match) |
| get_untagged_summary | get_untagged_summary |
| get_overdue_actions | get_daily_briefing |
| ... | ... |

This isn't necessarily wrong — same data, different interface. But the Notion tools should be a **curated subset** of 10-15 high-value tools, not 43 everything-and-the-kitchen-sink.

### Recommended Notion Worker Cull: 43 → 15

**Keep (15 tools):**

1. `get_daily_review` — Morning orchestration (replaces daily_briefing + overdue_actions)
2. `lookup_contact` — Contact search
3. `get_project_intelligence` — Full project view
4. `get_financial_summary` — Quick financials
5. `explain_cashflow` — Cash flow with variance
6. `get_outstanding_invoices` — Receivables
7. `get_receipt_pipeline` — Receipt status
8. `get_missing_receipts_impact` — R&D receipt gaps
9. `get_rd_evidence_strength` — R&D evidence
10. `get_grants_summary` — Grant pipeline
11. `get_grant_requirements` — Grant details
12. `suggest_grants` — Grant matching
13. `get_meeting_context` — Pre-meeting prep
14. `search_knowledge_graph` — Knowledge search
15. `get_weekly_project_pulse` — Weekly overview

**Kill (28 tools):** Everything else — either redundant, too niche, or subsumed by the 15 above.

---

## Separate Telegram Bots — Architecture

User wants separate bots. Here's how:

### Option A: One Bot, Routed Tool Sets (Recommended)
Keep one bot, but dynamically select which 10-15 tools to load based on conversation context:
- Finance conversation → load 9 finance tools only
- Project question → load project + grant tools
- Personal/writing → load reflection + writing tools

**Pros:** Single bot, no user confusion, smarter routing
**Cons:** Requires a router layer (cheap — one Haiku call to classify intent)

### Option B: Multiple Bots
- `@act_finance_bot` — Xero, receipts, invoicing, R&D, cashflow
- `@act_project_bot` — Projects, grants, pipeline, health
- `@act_personal_bot` — Reflections, dreams, writing, planning
- `@act_bot` (main) — Briefing, calendar, contacts, email, router to specialists

**Pros:** Focused tool sets, better responses per domain
**Cons:** User has to remember which bot to use, cross-domain questions need forwarding

### Option C: One Bot, Tool Groups (Simplest)
Keep one bot, but group tools into 5 "modes" and always include a `route_to_mode` meta-tool:
1. **Core** (always loaded, 12 tools): briefing, calendar, contacts, search, email, reminders
2. **Finance** (on demand, 9 tools): scoreboard, cashflow, receipts, xero, tagging
3. **Projects** (on demand, 6 tools): 360, grants, goods, pipeline
4. **Writing** (on demand, 9 tools): reflections, dreams, drafts, planning
5. **Actions** (on demand, 5 tools): meeting notes, action items, decisions, calendar events

Bot starts with Core + route_to_mode. When user asks about finances, Haiku calls `route_to_mode("finance")` and the tool set switches.

**Pros:** Best of both — focused tool sets, single bot, dynamic
**Cons:** Slightly more complex, but proven pattern

---

## Implementation Priority

1. **Kill 11 redundant Telegram tools** — immediate, low risk
2. **Cull Notion workers 43 → 15** — remove or comment out 28 tools
3. **Deploy Notion workers** — fix shadow worker env vars, redeploy
4. **Implement tool grouping (Option C)** — route_to_mode pattern for Telegram

---

## Files to Change

| File | Change |
|------|--------|
| `apps/command-center/src/lib/tool-definitions.ts` | Remove 11 tool definitions |
| `apps/command-center/src/lib/agent-tools.ts` (or split files) | Remove 11 executor functions |
| `packages/notion-workers/src/index.ts` | Comment out 28 tools |
| `apps/command-center/src/lib/telegram/bot.ts` | Add tool grouping logic (Phase 2) |
