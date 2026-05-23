---
title: Bot tools — LLM adapter compatibility audit
date: 2026-05-23
status: audit complete, spot-test pending
context: Phase 4d Test (a) passed on MiniMax-M2.7 via query_supabase + Xero reads. This audit categorises the remaining 45 tools by integration, risk class, and provider compatibility.
related_plans:
  - thoughts/shared/plans/minimax-full-migration-2026-05-22.md
related_handoffs:
  - thoughts/shared/handoffs/money-state-of-play/current.md
---

# Bot tools — LLM adapter compatibility audit

## Summary

- **46 unique tool definitions** in `apps/command-center/src/lib/tool-definitions.ts` (1332 lines).
- **All schemas are simple JSON Schema** — primitive types (string, number, boolean), one enum here and there, no `oneOf` / `allOf` / `$ref`. Gemini's `stripUnsupportedJsonSchemaFields` handles the few fields it rejects.
- **Test (a) proved** Supabase + Xero read tools work end-to-end on MiniMax-M2.7. No reason to expect compatibility issues with the other read tools.
- **The risk surface is the 14 write tools** — Gmail draft, Calendar create, Notion add, save_writing_draft, etc. Each needs spot-testing before relying on it under cheap-tier (Gemini Flash Lite) inference.

## Risk classification (per `~/.claude/rules/workflow.md` action tiers)

| Tier | Description | Tools |
|---|---|---|
| 1 — local-only | Reads + state-internal mutations | 32 read tools (see below) + transition_idea_stage, snooze_idea (idea board only) |
| 2 — shared-state, reversible | Writes that other humans see, undoable | add_meeting_to_notion, add_action_item, add_decision, save_planning_doc, save_writing_draft, move_writing, create_calendar_event, save_daily_reflection, save_dream, add_idea, add_receipt, set_reminder, trigger_auto_tag |
| 3 — hard-to-reverse | External writes that land in someone else's inbox | draft_email (technically only a draft, but visible in Gmail web) |

## By integration backend

### Supabase reads (any LLM safe)
- `query_supabase` — raw SELECT SQL. Risk: malformed SQL = bad output, no DB damage (SELECT-only enforced server-side).
- `search_contacts`, `get_contact_details`, `get_contacts_needing_attention`, `get_deal_risks`
- `search_knowledge`, `search_past_reflections`, `search_dreams`, `search_emails`
- `get_daily_briefing`, `get_project_360`, `get_meeting_prep`
- `get_grant_opportunities`, `get_grant_pipeline`, `get_grant_readiness`, `search_grants_for_project`
- `get_revenue_scoreboard`, `get_cashflow_forecast`, `get_upcoming_deadlines`, `get_project_financials`
- `get_untagged_summary`, `get_receipt_pipeline_status`
- `find_receipt`, `get_xero_transactions` (read-through to xero_* tables)
- `get_goods_intelligence`
- `review_planning_period`, `moon_cycle_review`

→ **Provider: any.** Test (a) confirmed Xero/Supabase reads work on MiniMax. Gemini Flash Lite spec'd for the same shape.

### Google Calendar
- `get_calendar_events` (read) — any LLM safe
- `create_calendar_event` (write) — **needs spot-test**. Args: title, date (YYYY-MM-DD), start_time (HH:MM 24h), duration, attendees (array of names/emails), location. Date+time parsing is the failure mode; Gemini's strict date schema should help.

### Gmail
- `search_emails` (read via Supabase email mirror) — any LLM safe
- `draft_email` (write — creates Gmail draft) — **needs spot-test**. Args: recipient (name or email — resolves via contacts table), subject, body. Highest visibility tool — drafts land in Ben's Gmail web UI.

### Notion (4 capture pages — Money Sync, Action Items, Decisions, Meeting Notes)
- `add_meeting_to_notion` — writes to Meeting Notes DB. Args: title, date, attendees, notes, decisions, action_items. Complex shape — multi-field.
- `add_action_item` — writes to Action Items DB. Args: title, owner, due_date, project_code, source.
- `add_decision` — writes to Decisions Log DB. Args: title, rationale, impact, project_code, date.
- `save_planning_doc` — writes planning doc to disk + Notion. Args: title, content, planning_period.

→ **Spot-test each.** Notion writes don't auto-sync back — once written, can be edited in Notion UI.

### Filesystem writes (via GitHub Contents API)
- `save_daily_reflection` — writes to `thoughts/writing/reflections/`
- `save_writing_draft` — writes to `thoughts/writing/drafts/`
- `save_dream` — writes to `thoughts/writing/dreams/`
- `move_writing` — moves an existing file across drafts/published/archive
- `save_planning_doc` (also covered above)

→ **Low blast radius** — files are gitignored OR go into thoughts/ which is tracked. Easy to revert via git.

### Xero (read-only via tools)
- `get_xero_transactions`, `get_cashflow_forecast`, `get_project_financials` — all reads. No `add_xero_*` or `void_xero_*` tools — Xero writes only happen via scripts/, never via bot.

### Idea board (Supabase-only)
- `add_idea`, `transition_idea_stage`, `snooze_idea` — local mutations, easy to undo.

### Other
- `add_receipt` — adds to expense register (Supabase). Internal-only, low risk.
- `set_reminder` — schedules a future bot message. Recurrence enum: daily/weekday/weekly. Low risk (silent if it fires wrong).
- `trigger_auto_tag` — kicks off a background tagging job. Idempotent.

## Per-provider compatibility notes

### Anthropic (default)
Native shape. Zero risk. Use this as the fallback if any tool misbehaves elsewhere.

### MiniMax-M2.7 (regular)
- **Proven**: `query_supabase` + Xero reads via Test (a) — clean tool_use call with correct args.
- **Verbose content**: MiniMax often includes reasoning preamble in `content` before the tool call. The agent loop discards text blocks when `stop_reason: tool_use`, so this doesn't break flow, but logging may show verbose intermediate text.
- **JSON schema fidelity**: accepts Anthropic-format `input_schema` directly. No schema stripping needed.
- **Risk**: tools with date-string args (`create_calendar_event` `start_time` HH:MM) — verify MiniMax doesn't add timezone suffix.

### Gemini Flash Lite (cheap-tier when `LLM_CHEAP_PROVIDER=gemini`)
- **Proven**: tool_use call + tool_result follow-up via spike (`/tmp/spike-gemini-adapter.ts` Test 2 + 3).
- **Schema stripping**: adapter drops `additionalProperties`, `$schema`, `default` (Gemini rejects). All 46 tool schemas use only standard fields — no `additionalProperties: false` patterns observed, so stripping should be a no-op.
- **Concise output**: dramatically less verbose than MiniMax (7 tokens vs 120 for "2+2=4"). Good for bot UX.
- **tool_use_id**: Gemini doesn't carry IDs — adapter maps via tool name. Parallel-same-tool calls would collide; bot doesn't do this.
- **Risk**: `query_supabase` with complex SQL — Gemini may produce simpler/wrong SQL than MiniMax for the same prompt. Test specifically.

## Recommended deployment

**Phase 1 (today)**: Keep `LLM_PROVIDER=minimax` only. Bot uses MiniMax for everything (proven by Test (a)).

**Phase 2 (when ready)**: Set `LLM_CHEAP_PROVIDER=gemini` in Vercel. Haiku-tier (most bot traffic) → Gemini Flash Lite, Sonnet-tier (escalations + compound queries) → MiniMax. Run the 5-tool gate again to verify both backends.

**Phase 3 (when verified)**: Lower the escalation threshold so more queries route to Sonnet (which is much smarter on MiniMax for non-trivial reasoning). Cost stays low because Sonnet usage is rare and Gemini covers the volume.

## Spot-test priorities (in order)

1. **draft_email** — highest visibility. Test from Telegram: "Draft an email to nicholas@act.place subject 'minimax test' body 'this is a test'". Verify the draft appears correctly in Gmail web.
2. **create_calendar_event** — date/time parsing edge case. Test: "Schedule a 15-min event tomorrow 9am called Test". Verify the event appears in Google Calendar at the right time.
3. **add_meeting_to_notion** — most complex write schema. Test: "Capture meeting with Nic today about MiniMax migration, decision: use Gemini for cheap tier".
4. **add_action_item** — second-most-complex write. Test: "Add action: Ben to test all 19 bot tools, due Friday".
5. **query_supabase** with non-trivial SQL — proxy for general bot intelligence. Test: "How many invoices are overdue more than 30 days, grouped by project?".
6. **add_decision** — adjacent risk to add_action_item.
7. **save_writing_draft** — exercises GitHub Contents API write.

If 1-5 pass on the planned LLM_CHEAP_PROVIDER=gemini config, the other 30+ read tools are safe by inference (they have simpler schemas + no side effects).

## Outstanding follow-ups

- [ ] Spot-test 1-5 above from Telegram (Ben's hands-on)
- [ ] Add `LLM_CHEAP_PROVIDER=gemini` to Vercel production once verified
- [ ] Re-run grade-voice + 3 grader rubrics under Gemini Flash Lite to compare against MiniMax (mid-tier graders use Sonnet route, but voice grader uses cheap-tier — interesting to compare)
- [ ] Document Gemini fallback chain: `Gemini → MiniMax-M2.7 → Anthropic` (currently the adapter does single-provider; fallback wrapper lives in `scripts/lib/llm-client.mjs` only)
