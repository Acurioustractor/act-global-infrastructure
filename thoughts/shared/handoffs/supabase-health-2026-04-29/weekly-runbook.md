# Supabase shared-DB — weekly health runbook
**Project:** `tednluwflfhxyucgwigh` (shared ACT/grantscope/JusticeHub)
**PITR window:** 7 days (active as of 2026-04-29, scheduled to turn off once health is confirmed stable)
**Owner:** Ben

---

## Why this runbook exists

In one session we made 13 migrations (orphan drops, RLS lock-downs, autovacuum tuning, auth.uid() rewrites, function search_path pinning, extension move). Everything is reversible while PITR is on. Once we've confirmed for ~2 weeks that nothing is silently broken, PITR can come off.

This runbook is the **manual process** to confirm that — 10 minutes a week, four checks, one note logged.

---

## Weekly check (10 minutes, every Monday)

### 1. Civicscope smoke test (1 minute)

```bash
node scripts/civicscope-smoketest.mjs
```

**Pass = 6/6 routes return their expected status code.**

If any route fails:
- Note which route, which status, exact error
- Don't panic — could be a Vercel deploy hiccup unrelated to the DB
- Re-run after 5 minutes
- If still failing, jump to *Escalation* below

### 2. DB health snapshot (2 minutes)

```bash
SUPABASE_DB_URL='postgres://...' node scripts/db-health.mjs
```

(Get the connection string from Supabase dashboard → Settings → Database → Connection string. Pooler URL is fine.)

**What to scan for:**
| Section | What "healthy" looks like |
|---|---|
| Footprint | DB size ≤ 22 GB; tables/indexes/policies/matviews same as last week ± 2 |
| Connections | <5 active, <50 idle, **0 idle-in-tx** |
| Top 10 tables | dead_pct < 30 % on every row |
| Autovacuum-behind | Empty list ideally; max 3 entries OK if dead < 1000 |
| PITR / WAL archiving | `secs_since` < 600 (10 min); `fail_rate_pct` < 0.1 |
| Top 10 queries | Familiar shapes; no single query > 30 % of total time |
| Civicscope counts | gs_entities ≥ 591k, grants ≥ 32k, foundations ≥ 10.9k (numbers should grow, not shrink) |
| RLS audit | All 8 listed tables: `rls_on = true` |

### 3. Advisor lint count (3 minutes)

In Claude Code:
```
mcp__supabase__get_advisors --type performance
mcp__supabase__get_advisors --type security
```

Or via MCP from any Supabase-connected tool. **Compare counts to last week's log entry.** Any uptick in:
- `sensitive_columns_exposed` → urgent — investigate the new exposed table
- `policy_exists_rls_disabled` → urgent — RLS got turned off somewhere
- `extension_in_public` → urgent — a new extension was added unsafely
- `auth_rls_initplan` → moderate — a new policy was written without the `(select auth.uid())` wrapper
- `unused_index` → low — usually means new indexes added that aren't being scanned yet

Anything else: log and move on.

**Baseline (2026-04-29):**
- Performance: 1,830 lints
- Security: 673 lints

### 4. Log the result (3 minutes)

Append a single dated entry to `thoughts/shared/handoffs/db-health-log.md`:

```markdown
## 2026-MM-DD
- Smoke test: 6/6
- DB size: 21 GB; tables 604; indexes 2493
- Connections: 2 active / 25 idle
- Worst dead_pct: 8.2% on austender_contracts
- WAL archiving: 87 secs since last
- Top query share: postgrest set_config 28.9% (normal)
- Advisor: perf 1,815 (-15) / sec 670 (-3)
- Civicscope counts: gs_entities 592,103; grants 32,103
- Notes: nothing of note
```

Takes 1 minute to write, gives you a 12-month record of how the DB is trending.

---

## Turn-off criteria for PITR

Disable PITR when **all four** are true:

1. **Two consecutive weekly checks** show no regressions vs the previous week (i.e. ≥ 14 days of stable runs after the last migration).
2. **No civicscope smoke-test failure** in the prior 14 days.
3. **No advisor ERROR-level finding** that wasn't there at session end (especially `sensitive_columns_exposed`, `policy_exists_rls_disabled`).
4. **You've done at least one substantive task on each major site** (post a blog, run a grantscope search, sync something via Xero, do a finance reconciliation) and they all worked.

Earliest possible date: **2026-05-13** (2 weeks after session). Realistic: **2026-05-20** to give one extra cycle of confidence.

### How to turn it off
1. Supabase dashboard → Settings → Database → Backups → Point in Time Recovery
2. Click the slider to disable
3. Confirm the popup
4. **Before doing this, take one last `pg_dump`** for cold storage:
   ```bash
   pg_dump "$SUPABASE_DB_URL" --schema=public --format=custom --jobs=4 \
     -f ~/act-db-snapshot-pre-pitr-off-2026-MM-DD.dump
   ```
   That single file is your "if everything goes wrong six months from now" insurance.

---

## When to escalate (red flags)

If the weekly check shows **any** of these, don't disable PITR — investigate first:

- `idle_in_tx > 0` and `oldest_secs > 300` → there's a leaked transaction holding locks. Look at `pg_stat_activity` for the offender.
- A table jumps to `dead_pct > 100 %` between checks → autovacuum stalled. Run `VACUUM (ANALYZE) <table>` manually and find why autovacuum didn't fire.
- Civicscope smoke test fails on `/api/data/health` → the heavy aggregation queries are broken. Check Vercel logs for the deployment AND `mcp__supabase__get_logs` for the timestamp.
- `WAL archiving secs_since > 3600` (1 hour) → archiving is broken. PITR isn't actually rolling forward. Don't make any DDL changes until this is fixed.
- A new `sensitive_columns_exposed` ERROR appears → someone added a column to a public-API table containing tokens/account-numbers/etc. Lock it down.
- DB size grows > 5 GB in a week with no obvious ingestion run → unintended data growth. Find the table that grew via `db-health.mjs` "Top 10 tables".

---

## Quick reference — files & commands

```
scripts/db-health.mjs                          # DB-side weekly snapshot
scripts/civicscope-smoketest.mjs               # site-side smoke test
thoughts/shared/handoffs/db-health-log.md      # weekly log entries
thoughts/shared/handoffs/supabase-health-2026-04-29/
  ├── ddl-rollback.sql                         # CREATE statements for everything we dropped
  ├── advisor-summary.md                       # session-start advisor triage
  ├── table-consumers.md                       # which sites use which tables
  └── weekly-runbook.md                        # this file
thoughts/shared/plans/supabase-health-2026-04-29.md  # session plan (history)
```

```bash
# Civicscope live test (any week)
node scripts/civicscope-smoketest.mjs

# DB health snapshot
SUPABASE_DB_URL='postgres://...pooler...' node scripts/db-health.mjs

# Manual ANALYZE if stats look off on one table
psql "$SUPABASE_DB_URL" -c "ANALYZE public.<table>"

# Manual VACUUM if dead_pct climbs
psql "$SUPABASE_DB_URL" -c "VACUUM (ANALYZE) public.<table>"

# Restore from PITR (emergency only — Supabase dashboard)
# Settings → Database → Backups → "Restore to a point in time"
```

---

## What was done in the founding session

For context when reviewing this runbook in 6 months:

- **3 ERROR-level data leaks** closed (gmail tokens, bank accounts, supplier accounts)
- **5 RLS-policy-orphan ERRORs** closed (blog_posts, page_views, profiles, quotes, story_reactions)
- **All 324 mutable function search_paths** pinned
- **3 extensions** moved out of `public` (pg_trgm, vector, fuzzystrmatch)
- **215 `auth.uid()` calls** wrapped in `(select auth.uid())` across 143 policies
- **56 redundant service_role policies** dropped
- **5 orphan tables/matviews** + **36 unused indexes** removed
- **16 heavy tables** tuned for autovacuum
- **12 tables ANALYZE'd** (planner stats fixed for 30+ M phantom-zero rows)
- **Civicscope row counts unchanged** throughout: 591k entities, 32k grants, 10.9k foundations, 2.17M asic, 798k austender

Lint reductions: PERF 2,574 → 1,830 (↓744); SEC 1,011 → 673 (↓338).
