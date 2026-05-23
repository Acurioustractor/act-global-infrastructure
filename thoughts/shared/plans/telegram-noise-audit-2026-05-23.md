---
title: Dali bot — Telegram noise audit + consolidation plan
date: 2026-05-23
status: 2 immediate wins applied this session; full consolidation pending
plan_slug: telegram-noise-audit-2026-05-23
---

# Dali Telegram noise audit

Ben observation 2026-05-23: "way too many Dali notifications — review all to make it easier and more helpful."

## Sources of push (ranked by noise risk)

### 🔴 Today's direct cause — auto-tag-transactions every 2h
- **Was**: `15 */6 * * *` (4x/day)
- **I changed to**: `15 */2 * * *` (12x/day) — earlier this session
- **Behavior**: alerts every run if any unmatched FY26 vendors exist. SAME alert content every 2h until you add vendor rules.
- **Reverted ✅**: back to `15 */6 * * *` this commit
- **Plus dedup ✅**: alert hashes the sorted vendor list — skips send if identical to last run. Hash file at `/tmp/.tagger-last-alert-hash`.

### 🟡 Daily morning stack (7:30–8:00am AEST)
Three pushes within 30 minutes:

| When | Entry | Fires | Notes |
|---|---|---|---|
| 7:30am | `telegram-daily-focus` | Always (1 msg) | Single focused brief — current keeper |
| 7:30am | `compliance-alerts` | Only on T-30/-7/-1 deadlines | Conditional, but multiple if multiple deadlines align |
| 8:00am | `idea-board-reminders` | If owner has stale ideas | Sends 3 msgs per owner (header + ideas + overflow). Per-owner DM = could be 2-3 owners worth |

**Reality**: on busy days that's 5-8 messages in a 30-min window. That's the morning noise.

### 🟡 Afternoon alert
- 1:00pm: `telegram-money-alerts` — "silent if nothing actionable" per comment. Need to verify it actually no-ops on quiet days.

### 🟢 Weekly cadence (acceptable)
- Mon 8:00am: `weekly-reconciliation` (report)
- Fri 3:15pm: `weekly-narrative` (digest narration)
- Mon 7:55am: `ecosystem-digest` (Notion, not Telegram)
- Mon 8:30am: `notion-weekly-digest` (Notion, not Telegram)

### 🟢 On-demand only (no cron noise)
- `daily-money-briefing` — disabled 2026-05-21 (PM2 entry exists, no `cron_restart`)
- `money-command-digest` — runs but `--telegram` dropped 2026-05-21 (Notion-only now)
- `financial-advisor-agent`, `narrate-weekly-digest`, etc. — only triggered by other scripts

## Why the noise feels bigger now

- **Today's 2h tagger** burst the morning baseline.
- **Bot is also live on MiniMax** since this morning — every `@dali_S_bot` chat message produces a long structured reply, so any back-and-forth with the bot itself adds messages too.
- **No dedup anywhere** — none of the push scripts check "did the same alert fire recently?" before sending.

## Proposed consolidation (for next session)

### Phase A — Quick wins (1-2 hr)

**1. Add dedup helper at `scripts/lib/telegram-dedup.mjs`**
```js
export function alertHash(...parts) { ... }
export function sentRecently(name, hash, ttlHours = 24) { ... }
export function markSent(name, hash) { ... }
```
Stores recent-alert hashes in `/tmp/.tg-dedup/<name>.json`. TTL configurable per alert type.

Wire into:
- `tag-transactions-by-vendor.mjs` ← did this manually today, can refactor
- `compliance-alerts.mjs`
- `idea-board-reminders.mjs`
- `telegram-daily-focus.mjs`
- `telegram-money-alerts.mjs`
- `weekly-reconciliation.mjs`

Each becomes: "skip if identical message sent in last 24h" (or longer per signal).

**2. Quiet hours**
Add to `scripts/lib/telegram.mjs:sendTelegram` a guard: if current AEST time is between 21:00 and 06:30, queue to `/tmp/.tg-queue.jsonl` instead of sending. A 7:00am cron drains the queue (de-duped) into the morning brief.

**3. Combine morning pushes**
One 7:30am push that bundles:
- Daily focus (from telegram-daily-focus)
- Compliance deadlines that match T-30/-7/-1 (from compliance-alerts)
- Top 3 stale ideas per owner (from idea-board-reminders — currently sends per-idea)
- Yesterday's unmatched-vendor count (delta only, not full list)

Net effect: 1 morning message instead of 3-8.

### Phase B — Helpful, not noisy (3-4 hr)

**4. Per-message snooze buttons**
Every push includes inline keyboard:
- `Snooze 24h` — adds hash to dedup table with 24h TTL
- `Snooze 7d`
- `Mute this alert type forever` — adds to `~/.act-tg-mutes.json`

**5. Push budget**
At most N pushes per day (e.g. 4). When budget exceeded, accumulate into a single "summary of held alerts" message at the next allowed window.

**6. Push priority tags**
Each push tagged `priority: urgent | normal | low`. Quiet hours hold normal+low. Mute settings can be per-priority.

**7. Telegram "settings" page**
Bot tool `bot_settings` that lets Ben:
- View all active push sources
- Mute/unmute per source
- Set quiet hours
- Set push budget

## What I did this session (commit incoming)

1. ✅ Reverted `auto-tag-transactions` cron 2h → 6h
2. ✅ Added dedup to the tagger's unmatched-vendor alert (hash-file at /tmp/.tagger-last-alert-hash, skip send if unchanged)
3. ✅ This audit doc

## Open questions for Ben

- Quiet hours bounds — what's your "do not disturb" window? AEST 21:00–06:30?
- Daily push budget — 1, 2, or 3 maximum/day?
- Morning consolidation — combine into one 7:30 message, or keep telegram-daily-focus solo and disable the other two?
- Idea-board reminders — currently sends 3 msgs per owner per day. Cap at 1 weekly digest?
- Compliance alerts — currently fires whenever a deadline matches T-30/-7/-1 (multiple per day possible). Single daily compliance summary instead?
