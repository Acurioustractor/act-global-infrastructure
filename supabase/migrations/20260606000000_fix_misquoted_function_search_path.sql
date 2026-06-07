-- Fix misquoted function search_path (2026-06-06)
--
-- An external hardening sweep (~2026-06-03, Supabase advisor or claude.ai MCP session —
-- NOT a migration in this repo) set on 318 public functions:
--
--     SET search_path = "public, extensions, pg_catalog"
--
-- The double quotes make the WHOLE list ONE quoted identifier — a single schema literally
-- named "public, extensions, pg_catalog", which does not exist. Effective search path:
-- nothing (pg_catalog only, implicitly). Every trigger/RPC among the 318 that references
-- an unqualified table name has been failing at runtime since.
--
-- First confirmed casualty: the Gmail spine. sync-gmail-to-supabase.mjs inserts into
-- communications_history → AFTER INSERT trigger_update_relationship_health →
-- 'relation "relationship_health" does not exist' → 699/699 rows rejected (2026-06-06 run).
-- Last successful gmail ingest: 2026-06-03. Other at-risk triggers: queue_community_event_sync,
-- classify_alma_topics, update_citation_count, record_rejection_feedback, ALMA search vectors.
--
-- This re-sets the SAME three schemas, correctly unquoted. No function bodies change.
-- The 3 functions with search_path="" (secure_agent_sql hardening) are intentionally left alone.
--
-- Apply via psql (exec_sql RPC does not support DDL):
--   psql "$POOLER_URL" -f supabase/migrations/20260606000000_fix_misquoted_function_search_path.sql
--
-- Verify after:
--   SELECT count(*) FROM pg_proc p, unnest(p.proconfig) cfg
--   WHERE cfg = 'search_path="public, extensions, pg_catalog"';   -- expect 0
--   then re-run: node scripts/sync-gmail-to-supabase.mjs --days 5  -- expect 0 errors

DO $$
DECLARE
  r record;
  fixed int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace,
         unnest(p.proconfig) cfg
    WHERE ns.nspname = 'public'
      AND cfg = 'search_path="public, extensions, pg_catalog"'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_catalog', r.sig);
    fixed := fixed + 1;
  END LOOP;
  RAISE NOTICE 'fixed search_path on % functions', fixed;
END $$;
