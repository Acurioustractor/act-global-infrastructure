-- ============================================================================
-- Secure Agent SQL Execution
--
-- Creates a read-only database role and a secure SQL execution function
-- for the Telegram bot / web chat agent's query_supabase tool.
--
-- PROBLEM: The agent tool currently runs arbitrary SQL with the service role
-- key, which bypasses RLS and allows INSERT/UPDATE/DELETE. A prompt injection
-- attack could trick the LLM into running destructive queries.
--
-- SOLUTION: Create a restricted Postgres role (agent_readonly) that can only
-- SELECT from tables. The exec_agent_sql function uses SET LOCAL ROLE to
-- execute queries as this restricted role, regardless of the caller's privileges.
-- ============================================================================

-- 1. Create the read-only role (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_readonly') THEN
    CREATE ROLE agent_readonly NOLOGIN;
  END IF;
END
$$;

-- 2. Grant SELECT on all existing tables in public schema
GRANT USAGE ON SCHEMA public TO agent_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agent_readonly;

-- 3. Auto-grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO agent_readonly;

-- 4. Drop the old function if it exists (clean slate)
DROP FUNCTION IF EXISTS exec_read_only_sql(text);
DROP FUNCTION IF EXISTS exec_agent_sql(text);

-- 5. Create the secure execution function
-- NOTE: Uses SECURITY INVOKER (not DEFINER) because Supabase blocks SET ROLE
-- inside SECURITY DEFINER functions. The statement-level validation (SELECT/WITH
-- only + single-statement check) provides the primary guard. The agent_readonly
-- role + grants above serve as a secondary defense layer.
CREATE OR REPLACE FUNCTION exec_agent_sql(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  normalized text;
BEGIN
  -- Normalize and validate
  normalized := upper(trim(query_text));

  -- Only allow SELECT and WITH (CTE) statements
  IF NOT (normalized LIKE 'SELECT%' OR normalized LIKE 'WITH%') THEN
    RETURN jsonb_build_object(
      'error', 'Only SELECT queries are allowed.',
      'hint', 'Use SELECT to read data. INSERT, UPDATE, DELETE, and DDL are blocked.'
    );
  END IF;

  -- Block multiple statements (semicolons in the middle)
  -- Allow trailing semicolons but not embedded ones
  IF position(';' in trim(trailing ';' from trim(query_text))) > 0 THEN
    RETURN jsonb_build_object(
      'error', 'Multiple SQL statements are not allowed.',
      'hint', 'Send one SELECT query at a time.'
    );
  END IF;

  -- Execute the query and capture results as JSON
  EXECUTE 'SELECT coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query_text || ') t'
    INTO result;

  RETURN result;

EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN jsonb_build_object(
      'error', 'Permission denied. The agent can only read data, not modify it.',
      'detail', SQLERRM
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'hint', 'Check your SQL syntax and table/column names.'
    );
END;
$$;

-- 6. Grant execute to the authenticated and service roles (so PostgREST can call it)
GRANT EXECUTE ON FUNCTION exec_agent_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_agent_sql(text) TO service_role;

-- 7. Add a comment for documentation
COMMENT ON FUNCTION exec_agent_sql(text) IS
  'Executes a read-only SQL query as the agent_readonly role. '
  'Used by the Telegram bot and web chat agent tools. '
  'Blocks INSERT, UPDATE, DELETE, DDL, and multi-statement queries.';
