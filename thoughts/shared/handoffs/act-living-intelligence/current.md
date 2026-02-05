---
date: 2026-02-05T10:00:00Z
session_name: act-living-intelligence
branch: main
status: active
---

# Work Stream: act-living-intelligence

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-02-05T10:00:00Z
**Goal:** ACT ecosystem operations — bot, dashboard, integrations, business setup
**Branch:** main

### Current State
- Telegram bot v2: 19 tools (14 read + 5 write), multi-provider TTS, proactive notifications, email/calendar/reminders/receipts/writing drafts. Deployed on Vercel.
- Dashboard: apps/command-center (Next.js), 23 pages, LCAA project view working
- Gmail sync: 4 mailboxes (benjamin/nicholas/hi/accounts @act.place), auto-cron every 6h
- Contact auto-creation: fixed and working (32+ contacts per sync)
- Writing drafts: Telegram → GitHub API → Obsidian vault (auto-pull every 60s)

### Pending Tech
- [ ] Test voice messages end-to-end on production
- [ ] Test receipt photo capture on production
- [ ] Wire data-freshness API into System dashboard page

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
- CLOUDFLARED: Use `--config /dev/null` for quick tunnels (existing config.yml has catch-all 404)

### Entity Structure
```
1. Sole Trader (ABN 21 591 780 066) — WINDING DOWN
2. A Kind Tractor LTD (ABN 73 669 029 341) — DORMANT (NFP charity)
3. New ACT Pty Ltd — TO CREATE (main operating entity)
4. Family Trust — TO CREATE (tax-efficient payments)
```

### Open Questions
- Pty Ltd company name?
- Who is accountant for setup?
- Trust structure — shareholder vs management company?
- Jessica Adams still active AKT director?

### Key Files
| File | Purpose |
|------|---------|
| `apps/command-center/src/lib/telegram/bot.ts` | Telegram bot (grammY) |
| `apps/command-center/src/lib/agent-tools.ts` | 19 agent tools |
| `apps/command-center/src/lib/agent-system-prompt.ts` | Bot system prompt |
| `apps/command-center/src/lib/telegram/notifications.ts` | Proactive notifications |
| `apps/command-center/src/lib/telegram/voice.ts` | Voice pipeline |
| `scripts/sync-gmail-to-supabase.mjs` | Gmail sync (4 mailboxes) |
| `scripts/lib/contact-intelligence.mjs` | Contact auto-creation |
| `ecosystem.config.cjs` | PM2 cron config (12 scripts) |
| `.github/workflows/telegram-notifications.yml` | Daily briefing + reminders cron |

### Cron Schedule (PM2)
```
agent-learning:     daily 2am AEST
storyteller-sync:   daily 4:30am AEST
storyteller-link:   daily 4:45am AEST
imessage-sync:      every 15 min
notion-sync:        every 5 min
embed-imessages:    daily 5am AEST
meeting-sync:       daily 5:30am AEST
detect-episodes:    daily 6am AEST
daily-briefing:     daily 7am AEST
knowledge-pipeline: daily 8am AEST
data-freshness:     every 6 hours
gmail-sync:         every 6 hours (4 mailboxes)
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
