-- ═══════════════════════════════════════════════════════════════════════════
-- DB MAINTENANCE v4 — collation-mismatch remediation + person_roles index
-- Drafted 2026-06-07; self-review caught 4 flaws in v1 (halt-before-fix,
-- refresh-after-partial-rebuild hole, missing statement_timeout=0, non-covering
-- index). DO NOT run until Ben gives the word; quiet window only.
--
-- WHY:
--  1. Collation 153.120 (db) vs 153.121 (OS) after a Supabase platform patch.
--     Text btrees are physically ordered by collation; if ordering changed,
--     lookups MISS ROWS SILENTLY. Patch bumps rarely change order — so VERIFY
--     first (amcheck, read-only), and only rebuild what actually fails.
--  2. PostgREST timeouts on person_roles(company_name, cessation_date IS NULL)
--     interlock lookups → covering partial index.
--
-- DESIGN (v4 — amcheck is NOT available on hosted Supabase):
--     canary check: index-scan order vs forced-sort order on UNIQUE text
--     columns of the hot tables (unique = no tie-order false positives).
--       ├─ canaries agree → collation order unchanged → hot tables rebuilt
--       │   anyway (bounded certainty) → REFRESH COLLATION VERSION. Done.
--       └─ canary MISMATCH → order really changed → hot tables rebuilt,
--           refresh WITHHELD, full 1,191-index window must be scheduled.
--
-- HOW TO RUN (session-mode pooler 5432 — CONCURRENTLY needs a real session;
-- NOT the 6543 transaction pooler; direct db.<ref> host is dead):
--
--   PGPASSWORD="$DATABASE_PASSWORD" psql \
--     -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 \
--     -U postgres.tednluwflfhxyucgwigh -d postgres \
--     -f scripts/db-maintenance-2026-06-07-collation-and-indexes.sql
--
--   (ON_ERROR_STOP is ON: per-index tolerance lives inside the check loop; a REINDEX
--    failure leaves an INVALID _ccnew index — cleanup query in Phase 9.)
--
-- DURATION: amcheck reads every text btree once (index only, not heap) —
-- expect minutes; dominated by austender_contracts/state_tenders. Rebuilds
-- only happen on actual failures.
-- ═══════════════════════════════════════════════════════════════════════════

\timing on
\set ON_ERROR_STOP on

-- ── Phase 0 · Session safety ────────────────────────────────────────────────
\echo '=== Phase 0: session settings ==='
SET statement_timeout = 0;            -- role default would kill long REINDEX mid-flight
SET lock_timeout = '5min';            -- don't queue forever behind a stuck lock
SET maintenance_work_mem = '256MB';   -- faster index builds, modest footprint

-- ── Phase 1 · Preflight (read-only) ─────────────────────────────────────────
\echo '=== Phase 1: preflight ==='
SELECT datname, datcollversion FROM pg_database WHERE datname = 'postgres';
SELECT count(*) AS active_connections FROM pg_stat_activity;
SELECT indexname FROM pg_indexes WHERE tablename = 'person_roles';  -- confirm partial idx absent

-- ── Phase 2 · Canary set: unique single-column text indexes on hot tables ──
-- amcheck is NOT available on hosted Supabase (not in the extension catalogue,
-- superuser-only to create — verified 2026-06-07). Canary check instead:
-- an index scan returns STORED order; a forced sort returns CURRENT-collation
-- order. Equality on UNIQUE columns (no tie-order false positives) = the
-- collation order did not change. Same property bt_index_check verifies.
\echo '=== Phase 2: canary selection ==='
DROP TABLE IF EXISTS pg_temp.collation_canaries;
CREATE TEMP TABLE collation_canaries (
  tbl text, col text, idx text, status text DEFAULT 'pending', detail text
);

INSERT INTO collation_canaries (tbl, col, idx)
SELECT DISTINCT ON (tc.relname)
  tc.relname, a.attname, i.indexrelid::regclass::text
FROM pg_index i
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_class tc ON tc.oid = i.indrelid
JOIN pg_namespace n ON n.oid = tc.relnamespace
JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = i.indkey[0]
JOIN pg_type t ON t.oid = a.atttypid
WHERE n.nspname = 'public'
  AND tc.relname IN ('person_roles','foundations','grant_opportunities','xero_transactions',
                     'xero_invoices','ghl_contacts','communications_history',
                     'person_identity_map','austender_contracts','state_tenders')
  AND i.indisunique AND i.indnatts = 1 AND i.indisvalid
  AND t.typname IN ('text','varchar','bpchar','citext')
ORDER BY tc.relname, pg_relation_size(i.indexrelid) DESC;

SELECT * FROM collation_canaries;

-- ── Phase 3 · Canary comparison: stored order vs current-collation order ────
\echo '=== Phase 3: canary order comparison ==='
DO $canary$
DECLARE r record; h_idx text; h_sort text;
BEGIN
  FOR r IN SELECT tbl, col FROM collation_canaries LOOP
    BEGIN
      -- stored (index) order
      PERFORM set_config('enable_seqscan', 'off', true);
      PERFORM set_config('enable_bitmapscan', 'off', true);
      EXECUTE format(
        'SELECT md5(array_agg(v)::text) FROM (SELECT %I AS v FROM %I WHERE %I IS NOT NULL ORDER BY %I) q',
        r.col, r.tbl, r.col, r.col) INTO h_idx;
      -- current-collation (sort) order
      PERFORM set_config('enable_seqscan', 'on', true);
      PERFORM set_config('enable_bitmapscan', 'on', true);
      PERFORM set_config('enable_indexscan', 'off', true);
      PERFORM set_config('enable_indexonlyscan', 'off', true);
      EXECUTE format(
        'SELECT md5(array_agg(v)::text) FROM (SELECT %I AS v FROM %I WHERE %I IS NOT NULL ORDER BY %I) q',
        r.col, r.tbl, r.col, r.col) INTO h_sort;
      PERFORM set_config('enable_indexscan', 'on', true);
      PERFORM set_config('enable_indexonlyscan', 'on', true);
      IF h_idx = h_sort THEN
        UPDATE collation_canaries SET status = 'ok' WHERE tbl = r.tbl AND col = r.col;
      ELSE
        UPDATE collation_canaries SET status = 'MISMATCH',
          detail = format('index-order %s != sort-order %s', h_idx, h_sort)
          WHERE tbl = r.tbl AND col = r.col;
        RAISE WARNING 'canary MISMATCH on %.% — collation order CHANGED', r.tbl, r.col;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE collation_canaries SET status = 'ERROR', detail = SQLERRM
        WHERE tbl = r.tbl AND col = r.col;
      RAISE WARNING 'canary ERROR on %.%: %', r.tbl, r.col, SQLERRM;
    END;
  END LOOP;
END $canary$;

SELECT status, count(*) FROM collation_canaries GROUP BY 1;
SELECT * FROM collation_canaries WHERE status <> 'ok';

-- ── Phase 4 · REINDEX hot-table text indexes (bounded certainty) ────────────
-- Regardless of canary outcome: the money/CRM tables get rebuilt under the new
-- collation. Bounded set (~hot tables only), CONCURRENTLY, autocommit.
\echo '=== Phase 4: REINDEX CONCURRENTLY hot-table text indexes ==='
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
  AND i.indisvalid
  AND t.typname IN ('text','varchar','bpchar','citext')
\gexec

-- ── Phase 5 · Refresh collation version ONLY if everything checked ok ───────
-- Refresh ONLY if every canary agreed (order unchanged): hot tables are
-- rebuilt regardless, cold tables are then provably fine. A canary MISMATCH
-- means order really changed -> withhold refresh, schedule the full 1,191.
\echo '=== Phase 5: conditional REFRESH COLLATION VERSION ==='
SELECT 'ALTER DATABASE postgres REFRESH COLLATION VERSION;'
WHERE NOT EXISTS (SELECT 1 FROM collation_canaries WHERE status IN ('MISMATCH','ERROR'))
\gexec

SELECT datname, datcollversion FROM pg_database WHERE datname = 'postgres';

-- ── Phase 6 · person_roles covering partial index ───────────────────────────
-- Matches the timing-out interlock lookup exactly; INCLUDE makes it index-only.
\echo '=== Phase 6: person_roles covering partial index ==='
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_person_roles_company_active
  ON public.person_roles (company_name) INCLUDE (person_name)
  WHERE cessation_date IS NULL;
ANALYZE public.person_roles;

-- ── Phase 7 · Verify ────────────────────────────────────────────────────────
\echo '=== Phase 7: verify ==='
SELECT indexname FROM pg_indexes
WHERE tablename = 'person_roles' AND indexname = 'idx_person_roles_company_active';

EXPLAIN (COSTS OFF)
SELECT person_name FROM public.person_roles
WHERE cessation_date IS NULL AND company_name = 'EXAMPLE PTY LTD';
-- expect: Index Only Scan using idx_person_roles_company_active

-- ── Phase 8 · Summary for the runbook ───────────────────────────────────────
\echo '=== Phase 8: summary ==='
SELECT status, count(*) FROM collation_canaries GROUP BY 1;
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM collation_canaries WHERE status IN ('MISMATCH','ERROR'))
  THEN 'CANARY MISMATCH/ERROR — refresh withheld. Hot tables rebuilt; schedule a full-database reindex window, then refresh manually.'
  ELSE 'Canaries clean — hot tables rebuilt, collation version refreshed. Done.'
END AS outcome;

-- ── Phase 9 · Debris check (should be zero rows) ────────────────────────────
-- A failed CONCURRENTLY leaves an INVALID index suffixed _ccnew. If present:
--   DROP INDEX CONCURRENTLY <name>;  then re-run.
SELECT c.relname AS invalid_index
FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
WHERE NOT i.indisvalid;

\echo '=== DONE ==='

-- FOLLOW-UP (outside this script):
--  * The looping caller of person_roles-by-company (grantscope side) should
--    pass count:'none' — the exact-count CTE doubles every scan for nothing.
--  * Non-default collations (if any in pg_collation with version drift) would
--    need ALTER COLLATION ... REFRESH VERSION — not flagged in current logs.
