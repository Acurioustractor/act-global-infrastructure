---
title: Unified content calendar — cadence engine + Notion view
slug: 2026-05-28-unified-content-calendar
status: proposed
created: 2026-05-28
plan_trailer: unified-content-calendar
related:
  - act-communication-pipeline-2026-05-23-locked   # Q5 cadence/threshold spec
  - 2026-05-28-partner-brand-newsletter-drafters
---

# Unified content calendar — cadence engine + Notion view

## Goal

Backlog item 3 of the comms operating system. Sit a scheduling **engine** + a
Notion **view** on top of the four newsletter drafters, implementing the locked
plan's **Q5**: per-audience cadence + candidate threshold, skip if under.

Decisions (Ben, 2026-05-28): **engine + view** · **newsletters only** (4
audiences, no social) · **Notion home**.

Stop criteria: engine prints a correct per-audience schedule from live data; the
Notion "Comms Content Calendar" DB exists + holds the 4 audience rows; daily cron
entry added; plan committed. **Out of scope:** social posts, auto-firing
per-recipient editions, storyteller drafter (not built).

## Context (verified 2026-05-28)

- Q5 cadence/thresholds: **funder** quarterly/min-3 · **partner** monthly/min-2 ·
  **brand** fortnightly/min-3 · **storyteller** event/min-1. Skip under threshold,
  manual override.
- Notion DB-id registry: `config/notion-database-ids.json` (keys `newsletterCandidates`,
  `newsletterDrafts`, `planningCalendar`). Sync scripts use `@notionhq/client` +
  `NOTION_MIRROR_TOKEN`, DB id from the registry.
- `planningCalendar` is a general life/work events calendar (Meeting/Deadline/
  Travel) — wrong grain, NOT reused.
- The Comms hub page already names "comms calendar" as Notion's job but no calendar
  DB exists yet → this is additive (complements Candidates DB + Drafts DB).
- PM2 crons in `ecosystem.config.cjs` (newsletter chain at 7:30/7:35 + 30-min/10-min
  loops). New entry slots after them.
- `newsletter_drafts` has `sent_at`, `audience`, `status`; candidate audience
  tagging via `audiences` / `auto_audiences` (proven in the drafter build).

## Files

### New — config
1. `config/comms-cadence.json` — per-audience `{label, cadence, intervalDays,
   minCandidates, mode (per-recipient|per-audience|event), drafter, private}`.

### New — engine
2. `scripts/comms-calendar.mjs`:
   - For each audience: `lastSent` = max(sent_at) sent edition; `nextDue` =
     lastSent + intervalDays (or due-now if never sent; null for event-triggered);
     `candidatesReady` = count `status='include'` candidates for the audience since
     lastSent; `status` = Ready / Under threshold / Not due yet / Event-triggered;
     `recommendedAction` = the drafter command (brand: per-audience period slug;
     per-recipient: command template) or "Skip — N/min".
   - Default run: print a table report (read-only).
   - `--sync-notion`: upsert the 4 audience rows into the Comms Content Calendar DB
     (match by Audience title).
   - `--run-brand` (off by default): if brand is due AND ready, exec the brand
     drafter for the current fortnight slug. Per-recipient stays manual (no
     auto-fire of N editions).
   - Reuses the shared lib where useful; otherwise small direct count queries.

### Modified — config
3. `config/notion-database-ids.json` — add `commsContentCalendar: "<new-db-id>"`.
4. `ecosystem.config.cjs` — add `comms-content-calendar` cron
   (`scripts/comms-calendar.mjs --sync-notion`, `40 7 * * *`, after candidates-to-notion).

### Notion (Tier 2 — additive, flagged for go-ahead)
5. Create DB **"Comms Content Calendar"** under the Comms & CRM Operating System
   hub (`36debcf9-81cf-81c4-8f67-fbe0484c2986`). Props: Audience (title), Next due
   (date — calendar key), Cadence (select), Mode (select), Last sent (date),
   Candidates ready (number), Threshold (number), Status (select), Recommended
   action (text), Drafter (text). Calendar view on Next due + table view.
6. (Optional) tick backlog item 3 done on the "Newsletter + social audience system"
   page.

## Verification
- `node scripts/comms-calendar.mjs` → report matches live data (e.g. brand never
  sent → due now, 0/3 ready → Under threshold; funder → due, etc.).
- After DB create: `node scripts/comms-calendar.mjs --sync-notion` → 4 rows; verify
  via notion-fetch.
- `node -e` cron-config sanity (ecosystem.config.cjs parses).

## Tiers / safety
- Tier 1: config + script + ecosystem edit + local commit on
  `wip/newsletter-drafters-2026-05-28` (same branch, continues the comms work).
- Tier 2 (flag first): create Notion DB, sync rows, Notion backlog tick, PM2 reload.
- No auto-send, no per-recipient auto-fire, no LLM spend in the default path.

## Decision log
- engine + view + newsletters-only + Notion home (Ben, 2026-05-28).
- Calendar = one row per audience (next due, recomputed), not speculative
  forward-projected editions — honest + low-churn.
