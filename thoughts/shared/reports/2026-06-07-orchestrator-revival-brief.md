# GrantScope Orchestrator Revival — Go/No-Go Brief

**Date:** 2026-06-07
**Author:** Claude (read-only assessment; zero writes to grantscope repo or DB)
**Scope:** Whether/how to revive the contract-alert path in `scripts/agent-orchestrator.mjs`. NOTHING was revived. DB queried read-only via `exec_sql` RPC (not row-capped).
**Concurrent session warning:** Another Claude session is actively working in `/Users/benknight/Code/grantscope` (recent commits through `f6ab9f9` lighthouse/buyer-wedge). This brief made no grantscope writes. Re-verify counts before acting — they can move under the other session.

---

## TL;DR

The premise needs correcting. **The orchestrator is NOT globally dead** — 54 schedules are enabled+auto_create and most ran within the last 24h (latest `last_run_at` = 2026-06-07T08:00). Something is executing the queue today. What IS dead is the **contract-alert path specifically**: `procurement_alerts` frozen at 53,222 rows since 14 Mar, `contract-alert-checker` has exactly **one** lifetime run (13 Mar) and **no row in `agent_schedules`** — so the scheduler never fires it on its own.

The feared "3-month backlog burst" and "outbox sends" are **both effectively nil for the contract-alert path**: the single surviving watch matches only **5 contracts total**, and `procurement_notification_outbox` is **empty and in-app-only** (no email/webhook path exists for it). The real external-send risk lives in a *different* table — `grant_notification_outbox` has **771 stale queued emails** (14 Apr–15 May) that any `deliver-grant-notifications` run would attempt to send.

---

## Current state

| Fact | Value | Confidence |
|---|---|---|
| Orchestrator broadly running? | Yes — 54 enabled+auto_create schedules, latest `last_run_at` 2026-06-07T08:00 | **Verified** (agent_schedules) |
| `contract-alert-checker` in agent_schedules? | **No row** — never scheduled | **Verified** (0 rows) |
| `contract-alert-checker` lifetime runs | 1, last `started_at` 2026-03-13T23:45 | **Verified** (agent_runs) |
| `donor-contract-crossover` lifetime runs | 11, last 2026-04-24 | **Verified** (agent_runs) |
| `procurement_alerts` total | 53,222, max `created_at` 2026-03-14T01:15 (frozen) | **Verified** |
| Enabled procurement watches | 1 (of 1 total), `last_run_at` = **NULL** | **Verified** |
| Watched shortlist items (all w/ ABN) | 3 | **Verified** |
| `procurement_notification_outbox` rows | **0** (empty) | **Verified** |
| `grant_notification_outbox` queued | **771**, queued 2026-04-14 → 2026-05-15, **0 in last 7d** | **Verified** |

### How the orchestrator determines work (burst mechanism)

Two layers, both **watermark-based but self-deduping** — confirmed by reading `agent-orchestrator.mjs`:

1. **Scheduler** (`runScheduler`, every 5 min): for each `agent_schedules` row that is `enabled AND auto_create_task`, if `now - last_run_at >= interval_hours`, it creates **one** `agent_tasks` row — but only if no pending/running task already exists for that agent (lines 276-282). So a 3-month gap produces **one task per agent, once**, not a per-interval replay. No multi-fire backlog at the orchestrator level.

2. **Per-agent watermark** is where any real burst lives. `contract-alert-checker` (`check-contract-alerts.mjs:65`):
   `const sinceDate = watch.last_run_at || '2020-01-01T00:00:00Z'`.
   The single enabled watch has `last_run_at = NULL` → it would scan austender_contracts **since 2020** (everything), not "since 14 Mar". This NULL-watermark fan-out is exactly how the 53,222 historical alerts were generated. **But** the current watch population is tiny (3 ABNs), so the actual replay is small now (see blast radius).

---

## Restart blast radius (real counts)

### A. Contract-alert path (the thing being revived)

- **Max alerts created on first run:** **5** — austender_contracts matching the 3 watched ABNs with a NULL watermark (since-2020 scan). **Verified** (`SELECT count(*) FROM austender_contracts WHERE supplier_abn IN (watched 3 ABNs)` = 5).
- **procurement_notification_outbox rows created:** **≤5, in-app only.** The checker inserts with `delivery_mode:'in_app', status:'queued'` (lines 140-153). **No code path sends/emails/webhooks `procurement_notification_outbox`** — grep across `apps/` + `scripts/` shows it is only INSERTed by check-contract-alerts and READ by in-app UI (`/api/alerts/*`, home/watchlist pages). **Verified.** External-send blast radius of the contract path = **zero**.
- **Likely-actually-zero caveat:** the script reads `i.entity_abn` (line 75) but the live column is `supplier_abn`. `entity_abn` **does not exist** on `procurement_shortlist_items` (verified — query errored on it). As written, the checker may match 0 / throw before inserting. **Inferred** (schema drift confirmed; runtime behavior not executed). Either way the contract path is safe-small.
- 53,222 historical alerts are **not** at risk of re-creation — that volume came from a watch population that no longer exists (1 watch / 3 items remain). **Verified** (current watch counts).

### B. Grant-notification path (the actual external-send risk — NOT the contract path)

- **771 queued emails** in `grant_notification_outbox`, aged 14 Apr–15 May, **none in the last 7 days** → the send path has not drained since mid-May. **Verified.**
- These ARE emailable: `deliver-grant-notifications.mjs` and `/api/tracker/automation/deliver-notifications` read `grant_notification_outbox status='queued'` and call Gmail `sendEmail`, batches of 50, `MAX_ATTEMPTS=5`. **Verified** (code read).
- `deliver-grant-notifications` is a registered agent (registry line 917) but has **no agent_schedules row** (verified — not in the enabled+auto_create list, not in the targeted lookup). `send-grant-alert-digests` IS scheduled (last run 2026-06-04) and is a separate digest sender. **Whether starting/leaving the orchestrator up will drain the 771 depends on whether anything inserts a `deliver-grant-notifications` task or hits the cron route** — Unverified which external trigger drives it.
- **Dry-run / disable flags available:** `deliver-grant-notifications.mjs` supports `--dry-run` (line 27); the cron route requires `Authorization: Bearer <CRON_SECRET|API_SECRET_KEY>`. The contract checker supports `--apply` (dry-run by default) but the **registry hardcodes `--apply`** (registry line 1023). **Verified.**

---

## Revival options (commands written, NOT executed)

> All commands run from `/Users/benknight/Code/grantscope`. Pre-req: another session is live in this repo — coordinate first, and re-run the verification queries below before any write.

### Option 1 — Schedule the contract checker behind a fresh watermark (recommended)
Stops the NULL-watermark since-2020 scan by stamping the watch to "now", so the first real run only sees genuinely new contracts. Contract path is in-app-only, so no email risk either way; this is mostly hygiene + correctness (and dodges the 5/53k re-alert noise).

```bash
# 0. RE-VERIFY before acting (read-only)
node scripts/gsql.mjs "SELECT id,last_run_at,enabled FROM procurement_shortlist_watches WHERE enabled"
node scripts/gsql.mjs "SELECT count(*) FROM procurement_notification_outbox"

# 1. FIX THE SCHEMA BUG FIRST (entity_abn -> supplier_abn in check-contract-alerts.mjs:75,96)
#    Without this the checker matches nothing. (code edit — belongs to the active session)

# 2. Advance the watch watermark to now (gate the since-2020 replay)
node scripts/gsql.mjs --file /tmp/advance.sql
#    where /tmp/advance.sql (DML -> goes via psql, needs DATABASE_PASSWORD):
#    UPDATE procurement_shortlist_watches SET last_run_at = now() WHERE enabled;

# 3. Register the schedule (idempotent ON CONFLICT) — DML via psql
node scripts/gsql.mjs --file /tmp/sched.sql
#    INSERT INTO agent_schedules (agent_id, interval_hours, enabled, auto_create_task, priority, params)
#    VALUES ('contract-alert-checker', 24, true, true, 1, '{}'::jsonb)
#    ON CONFLICT (agent_id) DO UPDATE SET enabled=true, auto_create_task=true, last_run_at=now();

# 4. Smoke test once, forward-only (the orchestrator/pm2 actions are the active session's to run)
node --env-file=.env scripts/check-contract-alerts.mjs   # dry-run (no --apply)
```

### Option 2 — Manual one-shot, no schedule (most conservative)
Leave it unscheduled; run on demand after the schema fix + watermark stamp.

```bash
node scripts/gsql.mjs --file /tmp/advance.sql      # UPDATE ... last_run_at = now()
node --env-file=.env scripts/check-contract-alerts.mjs           # dry-run first
node --env-file=.env scripts/check-contract-alerts.mjs --apply   # then live (≤5 in-app alerts)
```

### Option 3 — Quarantine the grant-email backlog BEFORE any broad orchestrator activity (do this regardless)
The 771 stale `grant_notification_outbox` rows are the only real external-send exposure. Decide send-vs-cancel **before** any path that could trigger `deliver-grant-notifications`.

```bash
# Inspect recipients/age
node scripts/gsql.mjs "SELECT status,count(*),min(queued_at),max(queued_at) FROM grant_notification_outbox WHERE status='queued' GROUP BY status"
# To NEUTRALISE the stale burst (cancel, don't send) — DML via psql, Ben's call:
#   UPDATE grant_notification_outbox SET status='cancelled', last_error='stale backlog quarantined 2026-06-07'
#   WHERE status='queued' AND queued_at < now() - interval '14 days';
# OR drain intentionally in dry-run first:
node --env-file=.env scripts/deliver-grant-notifications.mjs --dry-run
```

---

## Recommendation

**Option 1 + Option 3 together.** The contract-alert revival itself is **low risk / go**: in-app-only, ≤5 alerts, zero emails, and currently no-ops on a schema bug anyway. Before flipping it on: (a) fix `entity_abn`→`supplier_abn`, (b) stamp the watch `last_run_at=now()` to kill the since-2020 NULL-watermark scan, (c) then schedule at 24h.

The thing that genuinely warrants a Ben go/no-go is **not** the contract path — it's the **771 stale queued grant emails**. Quarantine or intentionally-drain those (Option 3) **before** any broader orchestrator work, since a `deliver-grant-notifications` trigger would email a month-old backlog in one burst. That decision involves an external send (Gmail) → Tier 3, explicit verb required, day-shift, human-in-loop. Do not auto-drain.

---

## Reproducibility (queries used, all read-only via `node scripts/gsql.mjs`)

```sql
-- live schedules
SELECT agent_id,enabled,auto_create_task,interval_hours,last_run_at FROM agent_schedules WHERE enabled AND auto_create_task;
SELECT * FROM agent_schedules WHERE agent_id IN ('contract-alert-checker','donor-contract-crossover','deliver-grant-notifications');
-- run history / alert volume
SELECT count(*),max(started_at) FROM agent_runs WHERE agent_id='contract-alert-checker';
SELECT count(*),max(created_at) FROM procurement_alerts;
-- watch + match size
SELECT count(*) FROM procurement_shortlist_watches WHERE enabled;
SELECT count(*) FROM austender_contracts WHERE supplier_abn IN
  (SELECT supplier_abn FROM procurement_shortlist_items i JOIN procurement_shortlist_watches w ON w.shortlist_id=i.shortlist_id WHERE w.enabled AND supplier_abn IS NOT NULL);
-- outbox blast radius
SELECT status,count(*) FROM procurement_notification_outbox GROUP BY status;   -- (0 rows)
SELECT status,count(*) FROM grant_notification_outbox GROUP BY status;          -- queued=771
SELECT min(queued_at),max(queued_at) FROM grant_notification_outbox WHERE status='queued';
```

**Gaps / unverified:** (1) what process is actually executing the live schedule today — PM2 entry was reportedly un-`save`d on 14 Mar, yet schedules ran 2026-06-07; not resolved (didn't run `pm2`/touch grantscope). (2) Which external trigger, if any, drives `deliver-grant-notifications` (cron route vs manual task insert). (3) Whether `check-contract-alerts.mjs` matches 0 or 5 at runtime given the `entity_abn` bug — inferred from schema, not executed.
