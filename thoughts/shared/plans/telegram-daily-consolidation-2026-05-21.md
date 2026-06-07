---
title: Telegram daily-push consolidation — QW4 proposal
status: proposal — awaiting Ben decision
date: 2026-05-21
audience: Ben
purpose: Reduce daily Telegram noise from 3 messages to 1. The 4-surface model promises one daily push at 8am; reality has 3.
---

# TL;DR

Three scripts currently post to Telegram each morning:

| Time | Script | What it posts |
|---|---|---|
| **07:30** | `telegram-daily-focus.mjs` | Phone-first daily focus push — drift signals, stuck opps, overdue invoices, today's actions |
| **08:00** | `daily-money-briefing.mjs` | Full briefing — wins + pipeline + overdue + actions |
| **08:15** | `money-command-digest.mjs --telegram` | Snapshot of `/finance/command` — coverage, drift, 90d incoming, lifetime |

Plus the **Notion** pushes that don't go to Telegram but still happen:
- 07:00 `daily-briefing.mjs` (Notion only — fine)
- 08:11 `act-now-sync` (Notion + HTML to command.act.place — fine)
- 08:13 `daily-pulse-sync` (Notion top-of-Money-Framework — fine)

The Telegram side is the noisy one.

# Recommendation — pick one of three options

## Option A — Keep telegram-daily-focus only (Recommended)
**Why:** It's the phone-first one with action items. The other two are wider digests that you can read in Notion later in the day if needed.

**Action:**
1. Comment out the `daily-money-briefing` PM2 entry (8:00)
2. Remove `--telegram` arg from `money-command-digest` PM2 entry (it still runs the snapshot, just doesn't push)

```js
// ecosystem.config.cjs — proposed change
{
  name: 'daily-money-briefing',
  script: 'scripts/daily-money-briefing.mjs',
  // 2026-05-21 QW4: commented out — overlapping content with telegram-daily-focus at 7:30
  // cron_restart: '0 8 * * *',
  autorestart: false,  // makes pm2 ignore this entry
},
{
  name: 'money-command-digest',
  script: 'scripts/money-command-digest.mjs',
  args: '',  // was '--telegram'; QW4 keeps the snapshot, drops the push
  cron_restart: '15 8 * * *',
},
```

PM2 reload: `pm2 reload ecosystem.config.cjs`

## Option B — Keep daily-money-briefing only
**Why:** It's the most comprehensive single push and is closer to what the CLAUDE.md 4-surface model describes ("Daily 8am briefing").

**Action:**
1. Comment out `telegram-daily-focus` (7:30)
2. Remove `--telegram` from `money-command-digest`

## Option C — Merge into one new push at 8:00
**Why:** If the existing scripts each have content the others don't, write one consolidated `telegram-morning-push.mjs` that calls into each as a module and produces a single message.

**Action:** ~1 hour of work to factor out the formatters from each script and chain them. Cleaner long-term but more effort than A or B.

# What I'd do
Option A. The 7:30 phone-first focus is the highest-signal of the three for action-taking. The other two are nice-to-have wider context that lives in Notion + command-center where you can scroll when you want.

# Why I didn't auto-apply
Changing PM2 cron entries is Tier 2 (shared-state, reversible but visible). Stopping a 7-day-a-week Telegram push silently risks you missing the signal. Pick an option and:
```
git add ecosystem.config.cjs
git commit -m "QW4: consolidate Telegram daily push to telegram-daily-focus only"
pm2 reload ecosystem.config.cjs
pm2 save
```
