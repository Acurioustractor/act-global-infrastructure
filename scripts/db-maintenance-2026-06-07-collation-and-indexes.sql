-- ═══════════════════════════════════════════════════════════════════════════
-- DB MAINTENANCE — collation-mismatch remediation + person_roles index
-- Drafted 2026-06-07 (evening, during pooler-exhaustion chill). DO NOT run
-- until Ben gives the word, and NOT during the Monday-morning cron chain.
--
-- WHY (two findings from the 2026-06-07 incident):
--  1. Postgres warns on every connection: collation 153.120 (db) vs 153.121
--     (OS) after a Supabase platform patch. Text btree indexes are physically
--     ordered by collation — if any string ordering changed, lookups can MISS
--     ROWS SILENTLY. Patch-level bumps rarely change order, but the failure
--     class is "silent wrong results", so: verify (amcheck) → reindex hot
--     text indexes → THEN refresh the recorded version. Refreshing first
--     would just paper over real inconsistency.
--  2. PostgREST statement timeouts on
--       SELECT person_name FROM person_roles
--       WHERE cessation_date IS NULL AND company_name = $1
--     (board-interlock lookups, called in a loop, with count=exact).
--     Fix: partial index matching the predicate exactly.
--
-- HOW TO RUN (session-mode pooler port 5432 — CONCURRENTLY needs a real
-- session; do NOT use the 6543 transaction pooler):
--
--   PGPASSWORD="$DATABASE_PASSWORD" psql \
--     -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 \
--     -U postgres.tednluwflfhxyucgwigh -d postgres \
--     -v ON_ERROR_STOP=1 \
--     -f scripts/db-maintenance-2026-06-07-collation-and-indexes.sql
--
-- DURATION: phases 1–2 minutes; phase 3 (reindex) dominated by
-- austender_contracts (~800k rows) and communications_history (~27k) — expect
-- minutes-to-tens-of-minutes total. CONCURRENTLY = no table locks, but it
-- does consume I/O; run in a quiet window.
--
-- IF A REINDEX FAILS: it leaves an INVALID index suffixed _ccnew. Find and
-- drop with:
--   SELECT format('DROP INDEX CONCURRENTLY %I.%I;', n.nspname, c.relname)
--   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   JOIN pg_index i ON i.indexrelid=c.oid
--   WHERE NOT i.indisvalid AND c.relname LIKE '%_ccnew%';
-- then re-run the failed REINDEX.
-- ═══════════════════════════════════════════════════════════════════════════

\timing on
\set ON_ERROR_STOP on

-- ── Phase 0 · Preflight (read-only) ─────────────────────────────────────────
\echo '=== Phase 0: preflight ==='
SELECT datname, datcollversion FROM pg_database WHERE datname = 'postgres';
SELECT count(*) AS active_connections FROM pg_stat_activity;
SELECT relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size, c.reltuples::bigint AS approx_rows
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('person_roles','foundations','grant_opportunities','xero_transactions',
                    'xero_invoices','ghl_contacts','communications_history',
                    'person_identity_map','austender_contracts','state_tenders')
ORDER BY pg_total_relation_size(c.oid) DESC;

-- existing indexes on person_roles (confirm the partial index is actually missing)
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'person_roles';

-- ── Phase 1 · amcheck structure verification of hot text indexes ────────────
\echo '=== Phase 1: amcheck (structure checks, ordering vs CURRENT collation) ==='
CREATE EXTENSION IF NOT EXISTS amcheck;

-- Generate one bt_index_check per btree index that includes a text-ish column
-- on the hot tables. Structure-only (no heapallindexed) — fast, and exactly
-- the check that catches collation-order inconsistency.
SELECT DISTINCT format('SELECT %L AS checking, bt_index_check(%L::regclass);',
                       i.indexrelid::regclass::text, i.indexrelid::regclass::text)
FROM pg_index i
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_class tc ON tc.oid = i.indrelid
JOIN pg_namespace n ON n.oid = tc.relnamespace
JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ANY (i.indkey)
JOIN pg_type t ON t.oid = a.atttypid
WHERE n.nspname = 'public'
  AND tc.relname IN ('person_roles','foundations','grant_opportunities','xero_transactions',
                     'xero_invoices','ghl_contacts','communications_history',
                     'person_identity_map','austender_contracts','state_tenders')
  AND ic.relam = (SELECT oid FROM pg_am WHERE amname = 'btree')
  AND t.typname IN ('text','varchar','bpchar','citext')
\gexec

-- If ANY check above errored, STOP HERE (ON_ERROR_STOP will have halted) —
-- the failed index is collation-inconsistent; phase 2 rebuilds it anyway, but
-- note WHICH failed before continuing.

-- ── Phase 2 · Rebuild hot text indexes under the new collation ──────────────
\echo '=== Phase 2: REINDEX CONCURRENTLY hot text indexes ==='
SELECT DISTINCT format('REINDEX INDEX CONCURRENTLY %s;', i.indexrelid::regclass)
FROM pg_index i
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_class tc ON tc.oid = i.indrelid
JOIN pg_namespace n ON n.oid = tc.relnamespace
JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ANY (i.indkey)
JOIN pg_type t ON t.oid = a.atttypid
WHERE n.nspname = 'public'
  AND tc.relname IN ('person_roles','foundations','grant_opportunities','xero_transactions',
                     'xero_invoices','ghl_contacts','communications_history',
                     'person_identity_map','austender_contracts','state_tenders')
  AND ic.relam = (SELECT oid FROM pg_am WHERE amname = 'btree')
  AND t.typname IN ('text','varchar','bpchar','citext')
\gexec

-- ── Phase 3 · Record the new collation version ──────────────────────────────
-- Only AFTER the rebuilds: this declares "objects are consistent with 153.121".
\echo '=== Phase 3: refresh collation version ==='
ALTER DATABASE postgres REFRESH COLLATION VERSION;
SELECT datname, datcollversion FROM pg_database WHERE datname = 'postgres';

-- ── Phase 4 · person_roles partial index (the interlock-lookup fix) ─────────
\echo '=== Phase 4: person_roles partial index ==='
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_person_roles_company_active
  ON public.person_roles (company_name)
  WHERE cessation_date IS NULL;
ANALYZE public.person_roles;

-- ── Phase 5 · Verify ─────────────────────────────────────────────────────────
\echo '=== Phase 5: verify ==='
SELECT indexname FROM pg_indexes
WHERE tablename = 'person_roles' AND indexname = 'idx_person_roles_company_active';

EXPLAIN (COSTS OFF)
SELECT person_name FROM public.person_roles
WHERE cessation_date IS NULL AND company_name = 'EXAMPLE PTY LTD';
-- expect: Index Scan / Bitmap Index Scan using idx_person_roles_company_active

-- leftover invalid indexes from any failed CONCURRENTLY (should be zero rows)
SELECT c.relname AS invalid_index
FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
WHERE NOT i.indisvalid;

\echo '=== DONE — note durations above for the runbook ==='

-- FOLLOW-UP (not in this script):
--  * The looping caller of person_roles-by-company (grantscope side) should
--    pass count:'none' — exact counts per iteration are pure waste.
--  * If amcheck flagged indexes on tables OUTSIDE the hot list, schedule a
--    second window for a broader REINDEX pass.
