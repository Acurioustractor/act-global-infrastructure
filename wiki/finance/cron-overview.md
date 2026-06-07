# ACT Cron Overview — money + relationship + grants

Generated as part of the 2026-05-16 money audit (Pass D5). The earlier analysis suggested 3+ weekly digests overlapped — closer reading confirms each cron serves a distinct concern. No cron archived in this pass.

## Daily

| Time AEST | Cron name | Script | Concern |
|---|---|---|---|
| 7:00 | `daily-briefing` | `daily-briefing.mjs` | General daily briefing (calendar, meetings, all-system) |
| 8:00 | `daily-money-briefing` | `daily-money-briefing.mjs` | Money focus: wins + pipeline + overdue + actions |
| 8:15 | **`money-command-digest`** | `money-command-digest.mjs` | **NEW 2026-05-16 — coverage % deltas, drift queue top-5, 90d incoming, lifetime totals, Telegram** |
| 8:18 | `daily-pulse-sync` | `sync-daily-pulse-to-notion.mjs` | Notion "📡 Today's Pulse" panel refresh |
| 13:00 | `telegram-money-alerts` | `telegram-money-alerts.mjs` | Afternoon alert (silent if nothing actionable) |

## Weekly

| Day · Time | Cron name | Script | Concern |
|---|---|---|---|
| Mon 5:30 | `weekly-project-pulse` | `weekly-project-pulse.mjs` | Per-project open-actions pulse to Notion |
| Mon 6:00 | `ghl-cleanup-auto` | `cleanup-stale-ghl-opps.mjs` | Auto-archive past-deadline grants + stale ACT Events invites |
| Mon 6:30 | `grant-seed-weekly` | `seed-ghl-grants.mjs --count 5` | Seed top-5 fresh ACT-fit grants into GHL |
| Mon 8:00 | `weekly-reconciliation` | `weekly-reconciliation.mjs` | Reconciliation report + R&D pack grading + Telegram |
| Mon 9:10 | `money-framework-sync` | `sync-money-framework-to-notion.mjs` | Refresh ACT Money Framework Notion panels |
| Fri 15:00 | `weekly-money-digest` | `weekly-money-digest.mjs` | "Friday Money Digest" Notion page (week wins vs last) |
| Fri 18:00 | `weekly-relationship-review` | `weekly-relationship-review.mjs --verbose` | Relationship risk integration_events |
| Sun 18:00 | `weekly-digest` | `weekly-digest.mjs` | Comprehensive weekly retrospective (all systems) |

## Audit observations (no action this pass)

1. **Mon morning has 5 sequential crons** between 5:30 and 9:10. Each is distinct (per-project pulse, GHL cleanup, grant seed, reconciliation, Notion framework). If any fails it can cascade — consider linking them into one `monday-morning-chain.mjs` wrapper down the line.
2. **Friday afternoon has 2 weekly crons** at 15:00 and 18:00. `weekly-money-digest` is the canonical Friday digest; `weekly-relationship-review` is alert-only (silent unless red). Distinct, keep both.
3. **8:00-8:18 daily** has 4 money-touching crons in a 20-minute window. Distinct concerns but could be chained for atomicity.
4. **`weekly-digest` (Sunday 6pm)** is the only system-wide retrospective. Useful for Monday-morning prep, but currently outputs to where? Worth checking it actually lands somewhere read.

## Cron principles

- One script per cron entry (no multiplexing)
- Crons that push to Notion run AFTER the syncs that update Supabase
- Crons that send Telegram check a "silent-if-nothing" gate
- New crons must include `--telegram` only when they're meant to alert (not snapshot)

## Cleanup queries

Reversibility of recent backfills (committed 2026-05-16):

```sql
-- Revert D1 funder_context_snapshot updates
-- (Updates are non-destructive: NULL → value. To revert specific rows manually if needed.)

-- Revert D2 won decisions backfill
DELETE FROM act_grant_recommendation_decisions
  WHERE notes LIKE 'Backfilled from xero_invoices%';
DELETE FROM alma_funding_opportunities
  WHERE name LIKE '%— won historical (xero%';

-- Revert D3 funders.json stubs (file edit)
-- Open wiki/narrative/funders.json and remove any keys with "needs_writeup": true
```
