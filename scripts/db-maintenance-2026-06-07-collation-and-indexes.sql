-- ═══════════════════════════════════════════════════════════════════════════
-- DB MAINTENANCE v2 — collation-mismatch remediation + person_roles index
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
-- DESIGN (the v2 logic gate):
--     amcheck ALL public text btrees (tolerant — failures recorded, not fatal)
--       ├─ 0 failures → indexes consistent with new collation
--       │               → REFRESH COLLATION VERSION directly. No rebuild needed.
--       └─ N failures → REINDEX CONCURRENTLY exactly those N
--                       → REFRESH is SKIPPED this run; RE-RUN the script:
--                         second pass re-checks (now clean) and refreshes.
--
-- HOW TO RUN (session-mode pooler 5432 — CONCURRENTLY needs a real session;
-- NOT the 6543 transaction pooler; direct db.<ref> host is dead):
--
--   PGPASSWORD="$DATABASE_PASSWORD" psql \
--     -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 \
--     -U postgres.tednluwflfhxyucgwigh -d postgres \
--     -f scripts/db-maintenance-2026-06-07-collation-and-indexes.sql
--
--   (no ON_ERROR_STOP: amcheck failures are handled in-script; a REINDEX
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

-- ── Phase 2 · Candidate set: ALL public btree indexes touching text columns ─
\echo '=== Phase 2: candidate indexes ==='
-- amcheck cannot be created by the postgres role on Supabase (superuser-only):
-- enable it in the dashboard first (Database -> Extensions -> search 'amcheck').
-- HARD GUARD: if bt_index_check is missing, ABORT before any check or rebuild —
-- on 2026-06-07 the missing function marked all 1,191 indexes 'FAILED' and the
-- script headed into a full-database REINDEX (killed in time, no debris).
DO $guard$ BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS amcheck;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'CREATE EXTENSION amcheck denied for this role (expected on Supabase)';
  END;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'bt_index_check') THEN
    RAISE EXCEPTION 'amcheck unavailable. Enable it: Supabase dashboard -> Database -> Extensions -> amcheck. ABORTING (nothing checked, nothing rebuilt).';
  END IF;
END $guard$;

DROP TABLE IF EXISTS pg_temp.collation_check_results;
CREATE TEMP TABLE collation_check_results (
  index_name text PRIMARY KEY,
  table_name text,
  status     text,   -- 'ok' | 'FAILED'
  detail     text
);

INSERT INTO collation_check_results (index_name, table_name, status)
SELECT DISTINCT i.indexrelid::regclass::text, tc.relname, 'pending'
FROM pg_index i
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_class tc ON tc.oid = i.indrelid
JOIN pg_namespace n ON n.oid = tc.relnamespace
JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ANY (i.indkey)
JOIN pg_type t ON t.oid = a.atttypid
WHERE n.nspname = 'public'
  AND ic.relam = (SELECT oid FROM pg_am WHERE amname = 'btree')
  AND i.indisvalid
  AND t.typname IN ('text','varchar','bpchar','citext');

SELECT count(*) AS text_btree_indexes_to_check FROM collation_check_results;

-- ── Phase 3 · amcheck every candidate (tolerant — failures recorded) ────────
\echo '=== Phase 3: amcheck (this is the long read-only part) ==='
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT index_name FROM collation_check_results LOOP
    BEGIN
      PERFORM bt_index_check(r.index_name::regclass);
      UPDATE collation_check_results SET status = 'ok' WHERE index_name = r.index_name;
    EXCEPTION
      WHEN undefined_function THEN
        RAISE;  -- the CHECKER is broken, not the index — abort the whole run
      WHEN OTHERS THEN
        UPDATE collation_check_results
          SET status = 'FAILED', detail = SQLERRM
          WHERE index_name = r.index_name;
        RAISE WARNING 'amcheck FAILED: % — %', r.index_name, SQLERRM;
    END;
  END LOOP;
END $$;

SELECT status, count(*) FROM collation_check_results GROUP BY 1;
SELECT index_name, table_name, left(detail, 120) AS detail
FROM collation_check_results WHERE status = 'FAILED' ORDER BY 2, 1;

-- ── Phase 4 · Rebuild ONLY the failures (autocommit, outside txn) ───────────
\echo '=== Phase 4: REINDEX CONCURRENTLY failed indexes (no-op when clean) ==='
-- CIRCUIT BREAKER: mass failure means a systemic checker problem, not mass
-- corruption. Never generate a full-database rebuild from a broken precondition.
DO $breaker$
DECLARE f int;
BEGIN
  SELECT count(*) INTO f FROM collation_check_results WHERE status = 'FAILED';
  IF f > 50 THEN
    RAISE EXCEPTION 'circuit breaker: % indexes flagged FAILED (>50). Investigate the checker before any rebuild.', f;
  END IF;
END $breaker$;
SELECT format('REINDEX INDEX CONCURRENTLY %s;', index_name)
FROM collation_check_results WHERE status = 'FAILED'
\gexec

-- ── Phase 5 · Refresh collation version ONLY if everything checked ok ───────
-- (If Phase 4 rebuilt anything, refresh is deliberately withheld: RE-RUN the
--  script — the second pass re-checks the rebuilt indexes and refreshes.)
\echo '=== Phase 5: conditional REFRESH COLLATION VERSION ==='
SELECT 'ALTER DATABASE postgres REFRESH COLLATION VERSION;'
WHERE NOT EXISTS (SELECT 1 FROM collation_check_results WHERE status = 'FAILED')
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
SELECT status, count(*) FROM collation_check_results GROUP BY 1;
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM collation_check_results WHERE status = 'FAILED')
  THEN 'REBUILDS RAN — collation version NOT refreshed. RE-RUN this script for the clean second pass.'
  ELSE 'All clean — collation version refreshed. Done in one pass.'
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
