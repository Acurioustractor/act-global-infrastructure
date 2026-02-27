---
date: 2026-02-13T12:00:00Z
session_name: act-living-intelligence
branch: main
status: active
---

# Work Stream: act-living-intelligence

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-02-27T02:00:00Z
**Goal:** ACT ecosystem operations — bot, dashboard, integrations, financial automation, grants pipeline, event-driven architecture
**Branch:** main

### Current State
- Telegram bot v2: 22 tools (17 read + 5 write), multi-provider TTS, proactive notifications. Deployed on Vercel.
- Dashboard: apps/command-center (Next.js), 23+ pages, alignment page with financial columns
- Gmail sync: 4 mailboxes (benjamin/nicholas/hi/accounts @act.place), daily reconciliation (push handles real-time)
- **Canonical projects table**: 26 projects in DB, `v_project_alignment` view, project-loader.mjs
- **Vendor rules in DB**: `vendor_project_rules` table (45 rules, 7 clean categories)
- **Financial automation**: `v_project_financials` view, `/api/projects/financials` route
- **Auto-tagging cron**: 4 PM2 jobs (transactions, emails, GHL, health) running daily
- **3 agent tools**: get_project_financials, get_untagged_summary, trigger_auto_tag
- **Smart Sprint Board**: `sprint_suggestions` table, 5-signal generator, daily cron (reduced from 3x)
- **Grants Pipeline**: enrichment, auto-create applications for fit>=70, triage statuses, GHL auto-advance, deadline extraction
- **Event-Driven Architecture (NEW)**:
  - `integration_events` INSERT trigger → pg_net POST → `/api/events/react` → Telegram push
  - 6 reaction rules: key contact email, invoice paid, grant deadline, new GHL opportunity, overdue action, engagement drop
  - Rate limiting per rule+entity with configurable cooldowns
  - Telegram InlineKeyboard action buttons with full callback handlers
  - `app_config` table for runtime settings (webhook URL, secrets)
  - `SUPABASE_WEBHOOK_SECRET` auth on reactor endpoint
  - pg_cron retry every 15min for missed reactions + daily cleanup
- **Gmail Push (ready, needs GCP setup)**: webhook receiver, History API incremental sync, watch renewal script
- **Cron Consolidation**: gmail-sync 6h→daily, data-freshness 6h→daily, insights 30min→2h, grant deadlines 6h→daily, sprint suggestions 3x→daily

### Pending Tech
- [ ] **GCP Pub/Sub setup for Gmail push**: create topic, push subscription → `/api/webhooks/gmail`, run `renew-gmail-watch.mjs`
- [ ] **Add Vercel env vars**: `GMAIL_PUBSUB_TOPIC` (format: `projects/<id>/topics/<name>`)
- [ ] Test voice messages end-to-end on production
- [ ] Test receipt photo capture on production
- [ ] Wire data-freshness API into System dashboard page
- [ ] Configure Xero tracking categories (Project + Cost Type) — manual step in Xero UI
- [ ] Configure Dext supplier rules to match new categories — manual step in Dext UI
- [ ] Fix gov.au enrichment: 8 grants blocked by 403/404 — may need manual URL updates
- [ ] Vercel deploy needs `env -u VERCEL_PROJECT_ID` workaround (conflicting env vars)

### Pending Business
- [ ] Create ACT Pty Ltd (choose name, engage accountant, ASIC $576 → ABN → GST)
- [ ] Family Trust setup (accountant advises structure)
- [ ] Migrate operations from sole trader to Pty Ltd
- [ ] R&D documentation (engage consultant, start activity logs)
- [ ] Asset register (inventory containers, structures, vehicles, equipment, subscriptions)

### Decisions
- ENTITY: AKT LTD dormant/parked, new Pty Ltd is operating company, family trust for tax
- AGENT: Raw SDK with tool_use loop (not Agent SDK), Haiku for cost (<$1/week)
- GOOGLE AUTH: Service account + domain-wide delegation, JWT signing
- WRITE ACTIONS: Confirmation flow — user must reply yes/send to execute
- VENDOR RULES: Single source of truth in `vendor_project_rules` DB table (not hardcoded)
- CATEGORIES: 7 clean Xero-friendly cost types: Software & Subscriptions, Travel, Operations, Materials & Supplies, Bank Fees, Meals & Entertainment, Income
- XERO TRACKING: 2-dimension system — Project (26 options) + Cost Type (7 categories)
- TAGGING AUDIT: `project_code_source` field tracks how each tag was assigned (vendor_rule, manual, keyword_match, tracking_match, auto-fy26-review)
- EVENT ARCHITECTURE: pg_net trigger (not Supabase Dashboard webhook) → Vercel endpoint, config in `app_config` table
- REACTOR DESIGN: Rule-based evaluation with priority ordering, rate limiting per rule+entity, no message queues
- CRON STRATEGY: Event-driven for real-time, crons reduced to daily reconciliation safety nets

### Key Files
| File | Purpose |
|------|---------|
| `apps/command-center/src/lib/agent-tools.ts` | 22 agent tools (incl. 3 financial) |
| `apps/command-center/src/app/projects/alignment/page.tsx` | Alignment dashboard with financial columns |
| `apps/command-center/src/app/api/projects/financials/route.ts` | Per-project financial API |
| `scripts/tag-transactions-by-vendor.mjs` | 3-tier auto-tagger (vendor → tracking → keyword) |
| `scripts/auto-tag-fy26-transactions.mjs` | FY26 transaction review |
| `scripts/lib/project-loader.mjs` | Loads projects from DB (replaces JSON) |
| `supabase/migrations/20260214200000_vendor_rules_and_financials.sql` | Vendor rules + financials view |
| `supabase/migrations/20260214100000_canonical_projects_table.sql` | 26 canonical projects |
| `ecosystem.config.cjs` | PM2 cron config (28 scripts) |
| `supabase/migrations/20260224_sprint_suggestions.sql` | Sprint suggestions table + source tracking |
| `scripts/generate-sprint-suggestions.mjs` | 5-signal suggestion generator (grants, actions, emails, calendar, insights) |
| `scripts/enrich-grant-opportunities.mjs` | Grant enrichment + auto-create applications |
| `scripts/sync-grants-ghl.mjs` | GHL two-way sync with auto-advance stages |
| `apps/command-center/src/app/api/sprint/route.ts` | Sprint API with suggestions accept/dismiss |
| `apps/command-center/src/app/sprint/page.tsx` | Sprint board with suggestions panel |
| `supabase/migrations/20260224_grant_enrichment.sql` | Grant enrichment columns (eligibility, assessment, timeline, readiness) |
| `apps/command-center/src/app/api/webhooks/gmail/route.ts` | Gmail Pub/Sub push receiver |
| `apps/command-center/src/lib/webhooks/gmail-push.ts` | Gmail History API incremental sync |
| `apps/command-center/src/app/api/events/react/route.ts` | Event reactor endpoint (Supabase trigger target) |
| `apps/command-center/src/lib/events/reactor.ts` | Event evaluation engine with rate limiting |
| `apps/command-center/src/lib/events/rules.ts` | 6 reaction rules |
| `apps/command-center/src/lib/telegram/reactor-callbacks.ts` | Inline button callback handlers |
| `scripts/renew-gmail-watch.mjs` | Daily Gmail watch renewal (7-day expiry) |
| `supabase/migrations/20260227_gmail_push_and_event_reactor.sql` | gmail_sync_state, event_reactions, notification_rate_limits, app_config |

### Cron Schedule (PM2) — Updated
```
agent-learning:       daily 2am AEST
gmail-watch-renew:    daily 3am AEST              ← NEW
gmail-sync:           daily 4am AEST              ← REDUCED (was 6h, push handles real-time)
storyteller-sync:     daily 4:30am AEST
storyteller-link:     daily 4:45am AEST
imessage-sync:        every 15 min
notion-sync:          every 5 min
embed-imessages:      daily 5am AEST
meeting-sync:         daily 5:30am AEST
detect-episodes:      daily 6am AEST
data-freshness:       daily 6am AEST              ← REDUCED (was 6h)
daily-briefing:       daily 7am AEST
enrich-grants:        daily 7am AEST
check-grant-deadlines: daily 7am AEST             ← REDUCED (was 6h, reactor handles alerts)
sprint-suggestions:   daily 7am AEST              ← REDUCED (was 3x daily, reactor handles urgent)
notion-intelligence:  daily 7:30am AEST
knowledge-pipeline:   daily 8am AEST
finance-sync:         daily 8:30am AEST
goods-auto-tagger:    daily 9am AEST
auto-tag-transactions: daily 9:30am AEST
auto-align-ghl:       daily 10am AEST
engagement-status:    daily 11am AEST
auto-tag-emails:      every 6h+15min
generate-insights:    every 2h                     ← REDUCED (was 30min)
calendar-sync:        every 6h
ghl-sync:             every 6h
project-health:       every 6h
contact-reconcile:    every 6h+30min
mission-control:      3x daily (6am/12pm/6pm)
notion-checkbox-poll: every 15 min
actions-decisions:    every 15 min
```

### Supabase pg_cron Jobs (NEW)
```
retry-missed-reactions:   every 15 min  (re-fires events with no reaction)
cleanup-pg-net-responses: daily 3am UTC (prune old HTTP logs)
cleanup-rate-limits:      daily 3am UTC (prune stale rate limit entries)
```

---

## Completed Phases (Reference)

| Phase | Date | Summary |
|-------|------|---------|
| Business Docs | 2026-01-31 | 7 documents (legal, governance, finance, privacy) |
| Agent Chat | 2026-02-03 | Tool-use loop, 3→9 tools, cost tracking |
| Dashboard Audit | 2026-02-03 | 23 pages, 96 APIs, ~60 tables mapped |
| Infrastructure | 2026-02-03 | Legacy cleanup, knowledge pipeline, data freshness monitor |
| Bot v1 | 2026-02-04 | grammY + STT/TTS + 9 tools |
| Bot v2 | 2026-02-04 | 16→19 tools, multi-TTS, notifications, email, calendar, receipts, reminders, writing drafts |
| Scheduling | 2026-02-04 | telegram-notifications.yml (daily + every 5 min) |
| Gmail Sync | 2026-02-05 | 4 mailboxes, contact auto-creation fixed, cron scheduled |
| Workflow Improvements | 2026-02-05 | CLAUDE.md rules, /deploy skill, /dev skill, Vercel MCP, ghl_contacts fix |
| Project Alignment | 2026-02-13 | Canonical projects table (26), project-loader.mjs, alignment API + dashboard, 40+ script migrations |
| Financial Automation | 2026-02-13 | vendor_project_rules DB (45 rules), v_project_financials view, 4 auto-tagging crons, 3 agent tools, category consolidation (7 types), project_code_source audit trail |
| Event-Driven Daily Driver | 2026-02-27 | Gmail push webhook + History API sync, event reactor with 6 rules + rate limiting, Telegram inline buttons with callback handlers, pg_net trigger from integration_events, app_config table, SUPABASE_WEBHOOK_SECRET auth, pg_cron retry/cleanup, cron consolidation (reduced 5 scripts to lower frequencies) |
