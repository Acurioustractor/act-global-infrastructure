-- Drop two redundant arbitrary-SQL helper functions, consolidating on exec_sql(query text).
--
-- After the 2026-06-03 -> 06-06 advisor sweep revoked service_role EXECUTE on all three sibling
-- arbitrary-SQL functions (exec_sql restored in 20260616000000), an audit found:
--   * exec(sql text)              -- UNGUARDED arbitrary EXECUTE, 0 call sites anywhere. Dead + dangerous.
--   * execute_sql(sql_query text) -- SELECT-guarded, redundant with exec_sql. Its only two callers
--       (ACT apps/command-center subscriptions/discover route; GrantScope classify-acnc-social-
--       enterprises.mjs) both pass param `query` (mismatched vs `sql_query`), so the RPC always
--       errored and both already fell back. Refactored onto exec_sql(query text) in the same change.
--
-- No DB-internal dependents (pg_depend clean). exec_sql remains the single canonical helper
-- (138+ ACT + 364+ GrantScope call sites). Removes redundant arbitrary-SQL attack surface.
DROP FUNCTION IF EXISTS public.execute_sql(text);
DROP FUNCTION IF EXISTS public.exec(text);
