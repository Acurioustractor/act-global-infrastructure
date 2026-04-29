#!/usr/bin/env node
/**
 * Supabase shared-DB health check.
 *
 * Runs a quick read on the things that signal "is the DB feeling well":
 *  - size + table/index/policy counts
 *  - top tables by size, dead-tuple ratio, last autovacuum
 *  - active vs idle connections, idle-in-transaction
 *  - top time-consuming queries (pg_stat_statements)
 *  - civicscope-critical row counts as a sanity check
 *  - advisor lint counts via Supabase MCP (skipped here — run via /db-health skill)
 *
 * Usage:
 *   node scripts/db-health.mjs
 *
 * Env: SUPABASE_DB_URL  (postgres connection string for the shared DB)
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('Set SUPABASE_DB_URL=postgres://... in env');
  process.exit(1);
}

const c = new pg.Client({ connectionString: url });
await c.connect();

async function q(label, sql) {
  const r = await c.query(sql);
  console.log(`\n## ${label}`);
  console.table(r.rows);
}

console.log('# Supabase shared-DB health\n# ' + new Date().toISOString());

await q('Footprint', `
  SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size,
    (SELECT count(*) FROM pg_stat_user_tables WHERE schemaname='public') AS tables,
    (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes,
    (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
    (SELECT count(*) FROM pg_matviews WHERE schemaname='public') AS matviews
`);

await q('Connections', `
  SELECT state, count(*) AS conns,
    count(*) FILTER (WHERE state='idle in transaction') AS idle_in_tx,
    max(EXTRACT(EPOCH FROM (now() - state_change)))::int AS oldest_secs
  FROM pg_stat_activity
  WHERE datname = current_database()
  GROUP BY state ORDER BY conns DESC
`);

await q('Top 10 tables — health snapshot', `
  SELECT relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS size,
    n_live_tup AS rows,
    CASE WHEN n_live_tup>0 THEN round(100.0*n_dead_tup/n_live_tup,1) END AS dead_pct,
    last_autovacuum::date AS last_autovac,
    last_analyze::date AS last_analyze
  FROM pg_stat_user_tables
  WHERE schemaname='public'
  ORDER BY pg_total_relation_size(relid) DESC LIMIT 10
`);

await q('Tables behind on autovacuum (>14d, >100 dead)', `
  SELECT relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS size,
    n_dead_tup AS dead, n_live_tup AS live,
    last_autovacuum::date AS last_autovac
  FROM pg_stat_user_tables
  WHERE schemaname='public' AND n_dead_tup > 100
    AND (last_autovacuum IS NULL OR last_autovacuum < now() - interval '14 days')
  ORDER BY n_dead_tup DESC LIMIT 10
`);

await q('PITR / WAL archiving', `
  SELECT
    archived_count, failed_count,
    last_archived_time::timestamp AS last_archived,
    EXTRACT(EPOCH FROM (now() - last_archived_time))::int AS secs_since,
    round(100.0*failed_count/NULLIF(archived_count+failed_count,0), 4) AS fail_rate_pct
  FROM pg_stat_archiver
`);

await q('Top 10 queries by total time', `
  SELECT round(total_exec_time::numeric, 0) AS total_ms,
    calls,
    round(mean_exec_time::numeric, 1) AS mean_ms,
    round((100*total_exec_time/sum(total_exec_time) OVER ())::numeric, 1) AS pct_total,
    left(regexp_replace(query, '\\s+', ' ', 'g'), 100) AS query
  FROM pg_stat_statements
  WHERE dbid = (SELECT oid FROM pg_database WHERE datname=current_database())
    AND query NOT ILIKE '%pg_stat_statements%' AND query NOT ILIKE '%pg_catalog%'
  ORDER BY total_exec_time DESC LIMIT 10
`);

await q('Civicscope critical row counts (sanity)', `
  SELECT
    (SELECT count(*) FROM gs_entities) AS gs_entities,
    (SELECT count(*) FROM grant_opportunities) AS grants,
    (SELECT count(*) FROM foundations) AS foundations,
    (SELECT count(*) FROM asic_companies) AS asic_companies,
    (SELECT count(*) FROM austender_contracts) AS austender,
    (SELECT count(*) FROM political_donations) AS donations,
    (SELECT count(*) FROM acnc_charities) AS acnc_charities
`);

await q('RLS / sensitive-column lock-down audit', `
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_on,
    (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=c.relname) AS policies
  FROM pg_class c
  WHERE c.relnamespace='public'::regnamespace
    AND c.relname IN ('gmail_auth_tokens','bank_statement_lines','xero_contacts',
                      'profiles','blog_posts','page_views','quotes','story_reactions')
  ORDER BY c.relname
`);

await c.end();
console.log('\n# done');
