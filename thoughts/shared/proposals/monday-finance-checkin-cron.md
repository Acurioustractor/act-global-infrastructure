# Proposal — Monday "finance check-in" nudge (Tier-2, propose before installing)

**Status:** PROPOSED — not installed. Adding a cron is a Tier-2 shared-state change;
this documents the wiring for Ben to approve. No PM2/crontab was touched.

## What it does
Every Monday, one Telegram push that IS the prompt to spend 30–45 min on the
weekly finance check-in (`wiki/finance/weekly-finance-checkin.md`). It reports the
three things the pass needs, so opening it is a decision not an investigation:
1. **Card:** unreconciled Visa lines + $ (from `recon-status.mjs`).
2. **Receipts:** live-quarter coverage % (from `bas-completeness.mjs`) + Gmail/Dext review backlog.
3. **Deadline:** nearest `pending` obligation from `compliance-calendar.md`.

It re-classifies nothing — reads the same live sources the cockpit does (single
source of truth). Silent-if-nothing gate: if 0 unreconciled AND coverage ≥ target
AND no obligation inside a lead-time window, it doesn't push.

## Where it slots in
The Monday-morning chain already runs (see `wiki/finance/cron-overview.md`):
`weekly-project-pulse` 5:30 → `ghl-cleanup` 6:00 → `grant-seed` 6:30 →
`weekly-reconciliation` 8:00 → `money-framework-sync` 9:10.

Add **after `weekly-reconciliation` (Mon 8:00)** so the mirror is fresh:

```
# ecosystem.config.cjs — new PM2 entry (cron_restart)
{
  name: 'weekly-finance-checkin',
  script: 'scripts/weekly-finance-checkin.mjs',   // NEW — thin aggregator, see below
  cron_restart: '5 8 * * 1',                       // Mon 08:05 AEST
  autorestart: false,
}
```

## The script (thin aggregator — to build, ~40 lines)
`scripts/weekly-finance-checkin.mjs` composes existing engines, emits nothing new:
```
recon   = require reconcile status  (scripts/recon-status.mjs engine)
cover   = bas-completeness for the current quarter
backlog = COUNT receipt_emails WHERE status IN ('review','captured') AND xero linked IS NULL
next    = nearest pending row from compliance-calendar.md (build-compliance-calendar.mjs)
push 5-line Telegram digest linking to wiki/finance/weekly-finance-checkin.md
  (silent-if-nothing gate as above)
```
Reuses `weekly-card-reconcile.mjs --json` for the card block if preferred.

## Guards
- `--telegram` only (it's an alert, not a snapshot) per cron principles.
- Silent-if-nothing gate (don't nag on a clean week).
- Reads live sources; never writes.

## Decision for Ben
Approve → I build `weekly-finance-checkin.mjs` + wire the PM2 entry + `pm2 save`.
Until then the cadence runs manually — the doc is the ritual; this just makes the
Monday nudge automatic.
