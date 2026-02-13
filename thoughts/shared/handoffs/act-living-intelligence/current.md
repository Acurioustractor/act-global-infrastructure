---
date: 2026-02-13T12:00:00Z
session_name: act-living-intelligence
branch: main
status: active
---

# Work Stream: act-living-intelligence

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-02-13T12:00:00Z
**Goal:** ACT ecosystem operations — bot, dashboard, integrations, financial automation
**Branch:** main

### Current State
- Telegram bot v2: 22 tools (17 read + 5 write), multi-provider TTS, proactive notifications. Deployed on Vercel.
- Dashboard: apps/command-center (Next.js), 23+ pages, alignment page with financial columns
- Gmail sync: 4 mailboxes (benjamin/nicholas/hi/accounts @act.place), auto-cron every 6h
- **Canonical projects table**: 26 projects in DB, `v_project_alignment` view, project-loader.mjs
- **Vendor rules in DB**: `vendor_project_rules` table (45 rules, 7 clean categories)
- **Financial automation**: `v_project_financials` view, `/api/projects/financials` route
- **Auto-tagging cron**: 4 new PM2 jobs (transactions, emails, GHL, health) running daily
- **3 new agent tools**: get_project_financials, get_untagged_summary, trigger_auto_tag

### Pending Tech
- [ ] Test voice messages end-to-end on production
- [ ] Test receipt photo capture on production
- [ ] Wire data-freshness API into System dashboard page
- [ ] Configure Xero tracking categories (Project + Cost Type) — manual step in Xero UI
- [ ] Configure Dext supplier rules to match new categories — manual step in Dext UI

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
| `ecosystem.config.cjs` | PM2 cron config (26 scripts) |

### Cron Schedule (PM2) — Updated
```
agent-learning:       daily 2am AEST
storyteller-sync:     daily 4:30am AEST
storyteller-link:     daily 4:45am AEST
imessage-sync:        every 15 min
notion-sync:          every 5 min
embed-imessages:      daily 5am AEST
meeting-sync:         daily 5:30am AEST
detect-episodes:      daily 6am AEST
daily-briefing:       daily 7am AEST
notion-intelligence:  daily 7:30am AEST
knowledge-pipeline:   daily 8am AEST
finance-sync:         daily 8:30am AEST
goods-auto-tagger:    daily 9am AEST
auto-tag-transactions: daily 9:30am AEST  ← NEW
auto-tag-emails:      every 6h+15min      ← NEW
auto-align-ghl:       daily 10am AEST     ← NEW
project-health:       every 6 hours        ← NEW
data-freshness:       every 6 hours
gmail-sync:           every 6 hours
calendar-sync:        every 12 hours
ghl-sync:             every 6 hours
mission-control:      3x daily (6am/12pm/6pm)
generate-insights:    every 30 min
notion-checkbox-poll: every 15 min
actions-decisions:    every 15 min
contact-reconcile:    every 6h+30min
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
