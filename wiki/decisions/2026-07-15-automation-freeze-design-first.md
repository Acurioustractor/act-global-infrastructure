# Automation freeze: design first, crons second

**Date:** 2026-07-15
**Status:** Accepted (Ben, from the road: "hold on them so we get this right first, from a brand and system and overview first, then add in the cron and automations")
**Context docs:** `thoughts/shared/plans/cron-fleet-revival-2026-07-15.md`, `thoughts/shared/analysis/field-desk-infra-alignment-2026-07-15.md`, `docs/architecture/field-desk-map.md`

## The decision

Cron and automation expansion is frozen. No new PM2 registrations, no batch B or C revival, no new scheduled agents, until the brand, system, and overview layer is agreed between Ben and Nic. Automations then return one at a time, each earning its place.

## Why

The 2026-07-15 audits proved the failure mode. The fleet lost 131 of ~150 crons for 16 days and nothing noticed. gmail-sync fetched 1,449 messages, wrote zero, printed "[OK] Sync complete!" and exited 0. The freshness canary reported "stale 0 days" from a file written a month earlier. Discord alerting had been dead for weeks on an env naming inversion. The pattern: automation grew faster than the design that could tell whether it was working.

## What keeps running (the frozen baseline, ~42 processes)

The set registered as of today, which now has monitoring rails under it:
- The daily human surfaces: field-surfaces, daily-briefing, telegram-queue-drain, monday-card and the previously registered core.
- The spine: gmail-sync, calendar-sync, and the relationship derivation wave revived at Ben's word today.
- The watchers: pm2-status-sync, data-freshness (now checks job failures, not just table staleness), verify-ghl-mirror.
- The previously registered money core: xero-sync, xero-bank-balances, receipt-acquittal-daily.

Everything else in `ecosystem.config.cjs` (~110 entries) stays unregistered. The revival plan's batches B and C are ON HOLD.

## The bar an automation must clear to return ("earn your cron")

1. **A named human surface.** Someone reads its output on a surface they open anyway (morning read, cockpit, Telegram, Notion page). No orphan reports.
2. **Manual first.** It runs by hand through at least two real cycles before it gets a schedule. The tracer bullet proves the path.
3. **It records sync_status** on success AND failure.
4. **Total failure crashes loudly.** Fetched-N-wrote-zero exits non-zero. Never "[OK]" on a dead write path.
5. **It has a freshness threshold** in data-freshness-monitor, or an explicit note why not.
6. **It's on the field-desk map** with an area (Today/Listen/Curiosity/Action/Money/Sources) and a layer (ingest/mirror/derive/surface/guard).
7. **It fails toward a human**, via Telegram, not toward silence.

## Sequence

1. Brand and system overview agreed (Ben + Nic) — the draft to react to: `thoughts/shared/strategy/the-system-overview-2026-07-15.md`.
2. The overview names which surfaces matter daily and weekly.
3. Automations return one at a time, newest earning the bar above, starting with whatever feeds the named surfaces.

## Revisit

When the overview is agreed, or if a frozen automation blocks a live commitment (a funder deadline, BAS, payroll), in which case it can be run MANUALLY without unfreezing the schedule.
