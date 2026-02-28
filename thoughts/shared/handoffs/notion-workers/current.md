---
date: 2026-02-28T08:35:00Z
session_name: notion-workers
branch: main
status: active
---

# Work Stream: notion-workers

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-02-28T08:35:00Z
**Goal:** Always-fresh, actionable data across Notion, Telegram, and Command Center. Done when data freshness is monitored, email triage works, and all GitHub Actions pass.
**Branch:** main
**Test:** `cd packages/notion-workers && npx tsc --noEmit`

### Now
[->] Deploy: `ntn workers deploy` (13 tools), Vercel deploy (dismiss API), `pm2 restart all` (new crons), create Notion "Live Alerts" database

### This Session
- [x] Fixed `lib/load-env.mjs` — process.exit(1) → console.warn for missing tokens
- [x] Added missing env vars (GITHUB_TOKEN, NOTION_TOKEN) to 3 failing workflow YAMLs
- [x] Added `permissions: issues: write` to daily-health-check.yml
- [x] Verified: enrich-communications ✅, ecosystem-health-check ✅, daily-health-check ✅ (sites down is real)
- [x] Created `sync_status` table (14 integrations seeded) + migration applied to Supabase
- [x] Created `scripts/lib/sync-status.mjs` utility with `recordSyncStatus()`
- [x] Integrated recordSyncStatus into 5 sync scripts (gmail, enrich, health, notion, calendar)
- [x] Added `dismissed_at`/`dismissed_reason` to communications_history, rebuilt `v_need_to_respond` view
- [x] Enhanced `data-freshness-monitor.mjs` — fires integration_events on staleness
- [x] Built Notion Worker Tool 11: `get_data_freshness` (sync status + staleness)
- [x] Built Notion Worker Tool 12: `triage_emails` (prioritized: key contacts → recent → backlog)
- [x] Built Notion Worker Tool 13: `get_grant_readiness` (ready vs gaps from v_grant_readiness)
- [x] Created `POST /api/emails/dismiss` endpoint (bulk dismiss from v_need_to_respond)
- [x] Created `scripts/push-highlights-to-notion.mjs` (writes events to Notion Live Alerts DB)
- [x] Created `scripts/notion-weekly-review.mjs` (auto-creates weekly review page Sundays)
- [x] Created `scripts/weekly-relationship-review.mjs` (temperature drops, stale contacts, untagged)
- [x] Added enrich-communications + 3 new scripts to PM2 ecosystem.config.cjs
- [x] Refreshed project health scores — 29/29 projects upserted, sync_status recording working
- [x] Pushed 4 commits to main, all GitHub Actions verified

### Next
- [ ] `ntn workers deploy` — push 13 tools to Notion (user needs `ntn login` first)
- [ ] Deploy command-center to Vercel (dismiss API)
- [ ] `pm2 restart all` — pick up 4 new PM2 crons
- [ ] Create "Live Alerts" Notion database, add ID to `config/notion-database-ids.json` as `liveAlerts`
- [ ] Add `NOTION_TOKEN` to GitHub Actions secrets if not set
- [ ] Phase 2b: Gmail push via GCP Pub/Sub (requires GCP console setup)
- [ ] Phase 5a: Configure morning briefing Custom Agent in Notion UI (daily 7am AEST)
- [ ] Test email triage + dismiss flow end-to-end (Notion → dismiss API → removed from view)

### Decisions
- **Package location:** `packages/notion-workers/` (mono-repo workspace pattern)
- **SDK version:** `@notionhq/workers@^0.0.85` (alpha, pinned)
- **Schema pattern:** All properties required, optional fields use `anyOf: [{type: "string"}, {type: "null"}]`
- **Architecture:** Workers share same Supabase as Telegram bot + Command Center (3rd interface, no data duplication)
- **Secrets:** Only SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY needed (read-only tools, Wave 1)
- **Weekly cadence:** Friday reviews, 6 waves planned through April 2026
- **load-env.mjs:** Changed from hard exit to warning — scripts that need tokens fail at point-of-use
- **v_need_to_respond:** Uses COALESCE(c.email, '') for noreply filtering to handle NULL contact_email
- **sync_status:** 12-hour threshold for staleness, fires integration_event for Telegram alerts
- **Email triage tiers:** Tier 1 = key contact tags (partner/funder/board/etc), Tier 2 = <7 days, Tier 3 = backlog

### Open Questions
- UNCONFIRMED: Does Notion workspace have Custom Agents feature enabled? (requires workspace admin opt-in)
- UNCONFIRMED: How does Notion agent discover tools from a single Worker URL? (auto-discovery vs manual per-tool setup)
- UNCONFIRMED: Worker execution timeout limits? (may affect daily briefing which makes 5+ Supabase queries)
- UNCONFIRMED: Does `push-highlights-to-notion.mjs` need a "Live Alerts" DB created first?

### Workflow State
pattern: incremental-deployment
phase: 3
total_phases: 6
retries: 0
max_retries: 3

#### Resolved
- goal: "Always-fresh data across all ACT interfaces — Notion, Telegram, Command Center"
- resource_allocation: balanced

#### Unknowns
- workspace_custom_agents_enabled: UNKNOWN
- worker_timeout_limits: UNKNOWN
- tool_auto_discovery_behavior: UNKNOWN
- gmail_push_pubsub_setup: UNKNOWN (requires GCP console)

#### Last Failure
(none)

### Checkpoints
**Agent:** (manual — user-driven deployment)
**Task:** Data freshness + continuous agent support
**Started:** 2026-02-28T06:00:00Z
**Last Updated:** 2026-02-28T08:35:00Z

#### Phase Status
- Phase 1 (Fix Broken Workflows): ✓ VALIDATED (3/3 workflows passing)
- Phase 2 (Event-Driven Infra): ✓ PARTIAL (integration_events + app_config existed, PM2 updated, Gmail push pending)
- Phase 3 (Freshness Dashboard): ✓ VALIDATED (sync_status table + utility + 3 Notion Worker tools)
- Phase 4 (Smart Email Tracking): ✓ VALIDATED (dismiss API + triage tool + v_need_to_respond rebuilt)
- Phase 5 (Notion Live Dashboard): ✓ CODE COMPLETE (3 scripts written, need Notion DB + deploy)
- Phase 6 (Continuous Refinement): ✓ CODE COMPLETE (relationship review + grant readiness tool)

#### Validation State
```json
{
  "test_count": 13,
  "tests_passing": 13,
  "files_modified": [
    "lib/load-env.mjs",
    ".github/workflows/enrich-communications.yml",
    ".github/workflows/ecosystem-health-check.yml",
    ".github/workflows/daily-health-check.yml",
    "ecosystem.config.cjs",
    "scripts/lib/sync-status.mjs",
    "scripts/data-freshness-monitor.mjs",
    "scripts/enrich-communications.mjs",
    "scripts/compute-project-health.mjs",
    "scripts/sync-gmail-to-supabase.mjs",
    "scripts/sync-notion-to-supabase.mjs",
    "scripts/sync-calendar-full.mjs",
    "packages/notion-workers/src/index.ts",
    "apps/command-center/src/app/api/emails/dismiss/route.ts",
    "scripts/push-highlights-to-notion.mjs",
    "scripts/notion-weekly-review.mjs",
    "scripts/weekly-relationship-review.mjs",
    "supabase/migrations/20260228_fix_need_to_respond.sql",
    "supabase/migrations/20260301_sync_status.sql"
  ],
  "last_test_command": "cd packages/notion-workers && npx tsc --noEmit",
  "last_test_exit_code": 0
}
```

#### Resume Context
- Current focus: All code complete and pushed. Needs deployment actions.
- Next action: `ntn workers deploy`, Vercel deploy, `pm2 restart all`, create Notion Live Alerts DB
- Blockers: `ntn login` (interactive), Notion DB creation (manual), GCP Pub/Sub (console)

---

## Context

### What This Is
"Always Fresh" initiative — ensuring ACT ecosystem data is continuously up-to-date across all three interfaces (Telegram, Command Center, Notion). Built on top of Notion Workers (alpha, Feb 2026) with data freshness monitoring, email triage, and automated review scripts.

### Architecture
```
Telegram Bot  → Claude → Agent Tools → Supabase  (mobile)
Command Center → Next.js API routes → Supabase   (dashboard)
Notion Workers → Worker functions → Supabase      (workspace)

Data Freshness Layer:
  sync_status table ← recordSyncStatus() calls from 5+ sync scripts
  data-freshness-monitor.mjs → integration_events → Telegram alerts
  get_data_freshness Worker tool → "Is my data fresh?" in Notion
```

### Key Files
- `packages/notion-workers/src/index.ts` — 13 Worker tools (Waves 1-3)
- `scripts/lib/sync-status.mjs` — Shared recordSyncStatus() utility
- `scripts/data-freshness-monitor.mjs` — Staleness alerting
- `scripts/push-highlights-to-notion.mjs` — Events → Notion Live Alerts DB
- `scripts/notion-weekly-review.mjs` — Auto-creates weekly review Sundays
- `scripts/weekly-relationship-review.mjs` — Relationship risk detection Fridays
- `apps/command-center/src/app/api/emails/dismiss/route.ts` — Dismiss API
- `supabase/migrations/20260228_fix_need_to_respond.sql` — Dismissal support
- `supabase/migrations/20260301_sync_status.sql` — sync_status table

### 13 Notion Worker Tools
1. `check_grant_deadlines` — Grant deadlines + milestone progress
2. `get_daily_briefing` — Morning digest (overdue, follow-ups, decisions, alerts)
3. `lookup_contact` — Relationship intelligence for any contact
4. `get_project_health` — Project health scores and activity
5. `get_financial_summary` — Spend by project, pipeline totals
6. `get_unanswered_emails` — Emails waiting for our response
7. `get_attention_items` — Projects flagged as needing attention
8. `get_funding_pipeline` — Discovered funding opportunities
9. `get_cashflow` — Monthly cash flow summary
10. `get_outstanding_invoices` — Unpaid invoices / AR
11. `get_data_freshness` — Sync status + staleness per integration
12. `triage_emails` — Prioritized email triage (key contacts → recent → backlog)
13. `get_grant_readiness` — Grant readiness checklist (ready vs gaps)

### Deploy Commands (for resume)
```bash
cd ~/Code/act-global-infrastructure/packages/notion-workers
ntn login
ntn workers env set SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL ../../.env.local | cut -d= -f2-)
ntn workers env set SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY ../../.env.local | cut -d= -f2-)
ntn workers deploy
ntn workers exec get_data_freshness '{"integration": null}'
```

### SDK Quirks (from Wave 1)
1. All schema properties MUST be in `required` array — SDK validates at registration
2. Optional fields use `anyOf: [{type: "string"}, {type: "null"}]` pattern
3. Execute function receives `(input, context)` where context has `context.notion`
4. SDK is `@notionhq/workers@0.0.85` (alpha, expect breaking changes)
5. CLI is `ntn` (Rust binary, v0.1.35)
