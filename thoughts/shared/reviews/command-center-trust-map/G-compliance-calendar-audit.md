# G — Compliance Calendar (P3) audit

**Date:** 2026-05-27 · **Verdict:** well-architected and accurate, but **operationally dead** — production serves a 9-day-stale snapshot with frozen countdowns, the crons are stopped, and there's no path for fresh snapshots to reach Vercel.

> Correction to the blueprint: P3 was called "greenfield." It is NOT — it's ~80% built. The earlier
> trust-map flagged `compliance_items` (dead) / `compliance_ack` (empty), but the real system is
> **file-based**, not those tables.

## Architecture (what exists, and it's good)
```
wiki/finance/compliance-calendar.md (frontmatter: 10 fixed obligations)
  + ghl_opportunities.acquittal_due_date (dynamic grant acquittals)
        │  scripts/build-compliance-calendar.mjs  (PM2 cron 'compliance-snapshot', 7am)
        ▼
  thoughts/shared/data/compliance-calendar/YYYY-MM-DD.json  (snapshot: obligations + severity + counters)
        │
        ├─ /api/finance/compliance-calendar  → /finance/command "AT RISK TODAY" pane
        ├─ scripts/compliance-alerts.mjs       (PM2 cron 'compliance-alerts', 7:30am — Telegram T-30/7/1)
        └─ scripts/sync-compliance-calendar-to-notion.mjs (PM2 cron 'compliance-notion-sync', 7:45am)
```
The **obligations are accurate**: BAS Q3 (filed) / Q4 last-sole-trader / Q1-Q2 Pty; **R&D FY25-26 with the correct window** (earliest 2026-07-01, due 2027-04-30, $200K — NOT the false Apr-2026 that was in /company); ATO returns (sole-trader + Pty stub); ASIC annual review (2027-04-24); ACNC AIS A Kind Tractor (2026-12-31); sole-trader→Pty cutover (2026-06-30). Lead-times, severity scoring, status lifecycle all documented.

## Gaps (why it's not working)
| # | Gap | Evidence | Fix |
|---|---|---|---|
| 1 | **Crons stopped** | `compliance-snapshot` / `-alerts` / `-notion-sync` all PM2 status=stopped, 0 uptime since ~2026-05-18 | `pm2 restart` the three + `pm2 save`; confirm they survive |
| 2 | **No deploy path for snapshots** | build script only `writeFileSync`s; 05-18→05-25 snapshots untracked (`??`); last committed = 2026-05-18; **production serves generatedAt 2026-05-17T21:00Z** | add commit+push to the build cron (like `act-now-sync`), OR make the API recompute live (see #3) |
| 3 | **Countdowns frozen at build time** | `days_until_due` baked into snapshot → prod shows cutover "44 days" when it's really 34 | API recomputes `days_until_due`/`severity`/`at_risk` from each obligation's `due_date` at request time — makes countdowns correct regardless of snapshot age (the robust fix; decouples correctness from cron freshness) |
| 4 | **Grant acquittals empty** | `ghl_opportunities.acquittal_due_date` unpopulated → dynamic half = 0 items | process gap: capture acquittal due-dates in GHL when grants are won |
| 5 | **Not on the front door** | calendar only on `/finance/command`; `/company` has no obligations view | optionally surface "next 3 obligations" on `/company` |

## Recommended fix order
1. **API recompute (#3)** — small, makes every countdown correct today even with a stale snapshot. Highest value/effort.
2. **Restart crons + add commit-push (#1, #2)** — regenerates snapshots, re-fires alerts, gets fresh data to prod.
3. **GHL acquittal capture (#4)** + **/company surfacing (#5)** — follow-ups.

Net: P3 doesn't need building — it needs **re-lighting** (same pattern as the bank-balance feed), plus making the API time-aware so it can't silently freeze again.
