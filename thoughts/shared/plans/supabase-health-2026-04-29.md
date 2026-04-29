# Supabase health — strain reduction plan
**Project:** Shared ACT/GS — `tednluwflfhxyucgwigh`
**Date:** 2026-04-29
**Status:** Draft, awaiting Ben's approval before any DROP/VACUUM FULL

---

## Database snapshot
| Metric | Value |
|---|---|
| Total size | **22 GB** |
| Public tables | 609 |
| Public indexes | 2,529 |
| RLS policies | 557 |
| Materialized views | 84 |
| Connections (active / idle / idle-in-tx) | 2 / 25 / 0 |

**Connection state is healthy** — strain is not from concurrency. It's from data shape.

---

## Root cause: where the strain comes from

1. **~3 GB of vector embedding indexes that have never been scanned** — `idx_gs_entities_embedding` (2,646 MB, 0 scans), `idx_grants_embedding` (242 MB), `idx_foundations_embedding` (179 MB). Likely from an embedding-search experiment that was never wired up or migrated elsewhere. Every INSERT/UPDATE on those tables still has to maintain them.
2. **~3 GB of empty tables** still hold storage. Top: `asic_companies` 921 MB, `privacy_audit_log` 348 MB, `asic_name_lookup` 318 MB, `mv_director_network` 244 MB, `person_roles` 235 MB, `state_tenders` 174 MB, `civic_intelligence_chunks` 148 MB, `knowledge_chunks` 139 MB, `nz_charities` 117 MB. Many never autovacuumed.
3. **`austender_contracts` is 786% dead** — 4,314 live rows, 33,905 dead rows, never autovacuumed. Sequential scans wade through ~8× more pages than needed.
4. **`abr_registry` has stale stats** — pg_stat_user_tables says 0 rows, but the PK got 66,385 scans and `idx_abr_entity_name` got 753. ANALYZE has never run. The planner is operating on broken statistics for a 6.6 GB table.
5. **`gs_relationships` has overlapping covering indexes** — `idx_gs_rel_source_type_amt` (204 MB, 1.4M scans) + `idx_gs_rel_source_type` (39 MB, 1.8M scans) + `idx_gs_rel_source` (32 MB, 293k scans) all share the same prefix. Could consolidate to one composite + drop two.
6. **A normalization query on `abr_registry` runs 29s mean** — `LOWER(REPLACE(REPLACE(...)))` on entity_name. No functional index. 39 calls = 19 minutes of CPU on this one query.
7. **Matview refresh storm** — `mv_donor_contract_crossref` 5min, `mv_funding_by_lga` 2min, `mv_entity_power_index` 6.5min. 84 matviews total, many empty or stale.

---

## Top expensive queries (pg_stat_statements)

| % of DB time | Query | Calls | Mean ms |
|---|---|---|---|
| 29.3% | PostgREST per-request `set_config(...)` | 13.7 M | 0.6 |
| 5.4% | `UPDATE gs_relationships SET source_url = …` (one-off backfill) | 113 | 13,002 |
| 4.2% | `SELECT … FROM abr_registry WHERE LOWER(REPLACE(...))` | 39 | 29,461 |
| 2.4% | One-off `CREATE INDEX CONCURRENTLY` | 3 | 216,952 |
| 2.3% | `REFRESH MV mv_donor_contract_crossref` | 2 | 311,772 |
| 2.2% | `REFRESH MV CONCURRENTLY v_austender_top_charities` | 2 | 299,724 |
| 2.2% | `REFRESH MV mv_funding_by_lga` | 5 | 118,205 |

The 29.3% PostgREST overhead can't drop unless overall request volume drops — but the rest can.

---

## Phase 1 — Reversible quick wins (run first, no schema change)

Each of these is safe and reversible. Do them tonight.

```sql
-- 1.1 Refresh stats on tables that have NEVER been analyzed (planner is flying blind)
ANALYZE public.abr_registry;             -- 6.6 GB, says 0 rows but isn't
ANALYZE public.asic_companies;
ANALYZE public.austender_contracts;       -- critical, 786% dead
ANALYZE public.acnc_ais;
ANALYZE public.privacy_audit_log;
ANALYZE public.asic_name_lookup;
ANALYZE public.person_roles;
ANALYZE public.state_tenders;

-- 1.2 Reclaim space + reset stats on the 786%-dead table
VACUUM (ANALYZE, VERBOSE) public.austender_contracts;
-- if dead pct stays high after VACUUM, follow with VACUUM FULL (acquires AccessExclusiveLock):
-- VACUUM (FULL, ANALYZE) public.austender_contracts;

-- 1.3 Catch-up vacuum on the lagging tables
VACUUM (ANALYZE) public.gs_relationships;     -- last vac 2026-04-09, 13.7% dead
VACUUM (ANALYZE) public.acnc_ais;             -- 15.1% dead, never autovac
VACUUM (ANALYZE) public.communications_history;  -- 14.1% dead, never autovac
VACUUM (ANALYZE) public.source_frontier;      -- 15.3% dead
```

**Expected outcome:** planner stats current, austender_contracts down from 883 MB to ~120 MB, ~1.5 GB reclaimed total.

---

## Phase 2 — Drop unused indexes (~4 GB reclaim)

All of these have **0 scans** since stats were reset, are not unique, and are not PKs. Each is reversible (CREATE statements preserved in plan). Run during a low-traffic window.

### Tier A — embedding indexes (UPDATED — most are WIRED UP, do NOT bulk-drop)

After codebase audit, the embeddings ARE used by grantscope's frontend:
- `apps/web/src/app/api/search/universal/route.ts` calls `search_grants_semantic`, `search_entities_semantic`, `search_foundations_semantic`
- `apps/web/src/app/api/chat/route.ts` + `apps/web/src/app/grants/[id]/page.tsx` call `search_grants_semantic`
- `apps/web/src/app/api/profile/matches/route.ts` + ACT command-center call `match_grants_for_org`

The 0-scan reading is misleading — `pg_stat_database.stats_reset` is **NULL** (stats never reset), so the counters are real… but the routes simply haven't been hit in this window. **Civicscope frontend is currently dormant.**

Embedding population status:
- `gs_entities`: 135,994 / 591,790 (23% — incomplete backfill)
- `grant_opportunities`: 31,234 / 32,018 (97.5% — close to complete)
- `foundations`: 10,775 / 10,918 (98.7% — complete)
- `civic_intelligence_chunks` & `knowledge_chunks`: 0 rows — embedding indexes are genuinely orphaned

**Revised plan:**
```sql
-- Drop the orphaned embedding indexes only (empty tables):
DROP INDEX CONCURRENTLY public.idx_civic_chunks_embedding;      --  70 MB (table empty)
DROP INDEX CONCURRENTLY public.idx_knowledge_chunks_embedding;  --  59 MB (table empty)

-- KEEP for now (wired into civicscope RPCs, just dormant traffic):
-- idx_gs_entities_embedding    (2,646 MB)
-- idx_grants_embedding         (  242 MB)
-- idx_grants_matchable_embedding (170 MB)
-- idx_foundations_embedding    (  179 MB)
```

**Decision still open for Ben:** civicscope is the dormant traffic. Two paths:
- **(a) Revive civicscope** — finish the gs_entities backfill (still only 23%) and keep the indexes. They'll start earning their keep.
- **(b) Mothball civicscope** — drop the four large embedding indexes (~3.2 GB reclaim) AND keep the column data + RPCs. If you ever turn the site back on, recreating the index is `CREATE INDEX CONCURRENTLY` — slow on a 591k-row table but recoverable.
- **(c) Now**: drop only the 2 orphan-table indexes (130 MB) and decide a/b later.

### Tier B — abr_registry indexes the data layer doesn't use (~930 MB)
```sql
DROP INDEX CONCURRENTLY public.idx_abr_status;            -- 226 MB
DROP INDEX CONCURRENTLY public.idx_abr_state;             -- 215 MB
DROP INDEX CONCURRENTLY public.idx_abr_entity_type_code;  -- 193 MB
DROP INDEX CONCURRENTLY public.idx_abr_acn;               -- 157 MB
DROP INDEX CONCURRENTLY public.idx_abr_postcode;          -- 139 MB
```
The PK and `idx_abr_entity_name` ARE used (66k + 753 scans) — keep those.

### Tier C — empty-table indexes (~480 MB)
```sql
DROP INDEX CONCURRENTLY public.idx_priv_audit_tenant_time;     -- 134 MB, table empty
DROP INDEX CONCURRENTLY public.idx_asic_name_trgm;             -- 150 MB, table empty
DROP INDEX CONCURRENTLY public.idx_asic_abn;                   --  78 MB, table empty
DROP INDEX CONCURRENTLY public.idx_asic_lookup_exact;          --  75 MB, table empty
DROP INDEX CONCURRENTLY public.idx_asic_lookup_trgm;           --  73 MB, table empty
DROP INDEX CONCURRENTLY public.idx_entity_xref_identifier;     --  74 MB, table has 1 row
DROP INDEX CONCURRENTLY public.idx_entity_xref_value;          --  64 MB
DROP INDEX CONCURRENTLY public.idx_entity_xref_gs_id;          --  44 MB
DROP INDEX CONCURRENTLY public.idx_entity_xref_entity_id;      --  33 MB
DROP INDEX CONCURRENTLY public.idx_entity_xref_trading_upper;  --  10 MB
```
These will be auto-removed if we DROP the empty tables in Phase 3 — only run this set if we keep the tables.

### Tier D — gs_relationships overlap (~70 MB)
```sql
-- These 0-scan amounts/years can go:
DROP INDEX CONCURRENTLY public.idx_gs_rel_amount;  -- 53 MB
DROP INDEX CONCURRENTLY public.idx_gs_rel_year;    -- 15 MB
```

### Tier E — small but unused
```sql
DROP INDEX CONCURRENTLY public.idx_gs_entities_name_upper;  -- 42 MB
DROP INDEX CONCURRENTLY public.idx_gs_entities_metadata;    -- 21 MB
DROP INDEX CONCURRENTLY public.idx_notion_projects_data_gin;-- 53 MB
DROP INDEX CONCURRENTLY public.idx_acnc_ais_grants;         -- 12 MB
DROP INDEX CONCURRENTLY public.idx_acnc_ais_gov_revenue;    -- 11 MB
DROP INDEX CONCURRENTLY public.idx_justice_funding_fts;     -- 26 MB
DROP INDEX CONCURRENTLY public.idx_austender_published;     -- 23 MB
DROP INDEX CONCURRENTLY public.idx_organizations_name_trgm; -- 22 MB
```

**Phase 2 total reclaim: ~4 GB** (mostly from index file size + WAL no longer maintaining them on writes).

---

## Phase 3 — Drop or archive truly-empty tables (REVISED after ANALYZE)

**🔴 CRITICAL CORRECTION:** the original "empty table" list was a lie told by stale stats. After ANALYZE most of those tables have millions of rows. Real picture from fresh stats:

| Table | Original "rows" reading | Actual rows | Decision |
|---|---:|---:|---|
| `abr_registry` | 0 | **20,008,920** | KEEP (active reference data) |
| `asic_companies` | 0 | 2,167,481 | KEEP (reference data) |
| `asic_name_lookup` | 0 | 2,149,868 | KEEP (lookup helper for asic_companies) |
| `privacy_audit_log` | 0 | 1,278,440 | review — audit data, may be retention candidate |
| `austender_contracts` | 4,314 | 799,647 | KEEP (heavily used) |
| `person_roles` | 0 | 339,698 | KEEP |
| `state_tenders` | 0 | 199,694 | KEEP (procurement data) |

**Lesson:** never trust `n_live_tup = 0` on a table with `last_analyze IS NULL`. The stats are simply absent.

### 3.1 Tables that may STILL be genuinely empty (need re-check after ANALYZE)

The remaining candidates from the original list either weren't analyzed yet or were in fact empty. Re-check before any DROP:

```sql
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
WHERE schemaname='public'
  AND relname IN ('mv_director_network','civic_intelligence_chunks','knowledge_chunks','nz_charities',
    'mv_entity_power_index','mv_person_influence','ndis_registered_providers','research_grants',
    'mv_donation_contract_timing','acnc_programs','procurement_alerts','mv_board_interlocks',
    'dss_payment_demographics','campaign_alignment_entities','bookkeeping_transactions',
    'mv_charity_network','ato_tax_transparency','ndis_utilisation','mv_charity_rankings',
    'linkedin_imports','entity_xref')
ORDER BY pg_total_relation_size(relid) DESC;
```

For matviews with rows: these store stale snapshots. Either `REFRESH MATERIALIZED VIEW CONCURRENTLY <name>` to keep them fresh, or DROP them if nothing reads them anymore (cross-reference advisor section "materialized_view_in_api" — 84 of these are exposed via PostgREST).

### 3.2 Updated reclaim from Phase 3

The ~3 GB original estimate was based on a wrong assumption. Real Phase 3 reclaim is probably **closer to 0.5–1.5 GB**, depending on which matviews are actually unused.

The big space win moves to Phase 2 (unused indexes) and the new Phase 5 (gs_relationships index consolidation).

---

## Phase 4 — RLS / advisor consolidation (now with data)

Advisors returned **2,574 performance + 1,011 security findings** (3,585 total). Full triage at `thoughts/shared/handoffs/supabase-health-2026-04-29/advisor-summary.md`.

### Performance lints (2,574)
| Category | Count |
|---|---:|
| `unused_index` | 1,209 |
| `multiple_permissive_policies` | 978 |
| `auth_rls_initplan` | 212 |
| `unindexed_foreign_keys` | 160 |
| `duplicate_index` | 11 |
| `no_primary_key` | 3 |
| `auth_db_connections_absolute` | 1 |

The **1,209** unused indexes confirm the picture — my Phase 2 list (~25 large ones) is the tip. Tables with the worst index sprawl: `email_financial_documents` (14), `media_items` (13), `wiki_pages` (12), `person_identity_map` (11), `services` (11), `justice_matrix_cases` (9), `research_items` (9). Generate full DROP script straight from advisor JSON.

### Security lints (1,011) — sorted by urgency

**ERROR — fix immediately:**
- **3 sensitive_columns_exposed**: `gmail_auth_tokens.access_token` + `refresh_token` (most urgent), `bank_statement_lines.bank_account`, `xero_contacts.account_number` — all exposed via PostgREST without RLS.
- **5 policy_exists_rls_disabled**: `blog_posts`, `page_views`, `profiles`, `quotes`, `story_reactions` — policies written but RLS off, so policies don't enforce. One ALTER each.
- **260 rls_disabled_in_public**: 260 tables in `public` with no RLS at all.
- **147 security_definer_view**: views run as creator, not caller.

**WARN:**
- 324 `function_search_path_mutable` (49 anon-executable + 49 authenticated-executable — search-path-hijack vector)
- 84 `materialized_view_in_api`
- 74 `rls_policy_always_true`
- 9 `rls_enabled_no_policy`
- 3 `extension_in_public` (`fuzzystrmatch`, `pg_trgm`, `vector` — move to `extensions` schema)
- 3 `public_bucket_allows_listing` (`images`, `media-uploads`, `portraits`)

### 4.1 — RLS InitPlan rewrites (212 policies → 22% knocked out by 11 migrations)

Mechanical: `auth.uid()` → `(select auth.uid())`. Same for `auth.jwt()`, `current_setting()`. The expression then evaluates once per query as an InitPlan instead of per row.

Top tables (one migration each handles the cluster):
```
saved_foundations (6) · saved_grants (5) · funding_application_draft_workspace (4)
funding_discovery_review_workspace (4) · funding_relationship_engagements (4)
alma_conversations (4) · knowledge_sources (4) · bgfit_grants (4)
bgfit_budget_items (4) · bgfit_transactions (4) · bgfit_deadlines (4)
```

### 4.2 — Multiple permissive policies (978 lints, 17 tables tied at the worst)

17 tables each have 28 policy collisions (7 grant roles × 4 actions = same logical rule re-evaluated 7×). Top: BGFit cluster (6 tables), platform_* cluster (3), funder_portfolio* cluster (2), `events`, `coe_key_people`, `org_projects`, `historical_inquiries`, `saved_foundations`, `user_grant_tracking`.

Worst case is **literal duplicates from rename churn**: `events` has both `Service role full access events` AND `Service role full access to events` — same rule, different name. Drop one.

### 4.3 — Patch the sensitive-column ERROR leaks (do this in Phase 1)

```sql
-- gmail_auth_tokens — most urgent
ALTER TABLE public.gmail_auth_tokens ENABLE ROW LEVEL SECURITY;
REVOKE SELECT ON public.gmail_auth_tokens FROM anon, authenticated;
-- (write a service-role-only policy if any non-service code reads it)

-- bank_statement_lines & xero_contacts — same pattern
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
REVOKE SELECT (bank_account) ON public.bank_statement_lines FROM anon, authenticated;

ALTER TABLE public.xero_contacts ENABLE ROW LEVEL SECURITY;
REVOKE SELECT (account_number) ON public.xero_contacts FROM anon, authenticated;
```

### 4.4 — Enable RLS where policies already exist (5 tables, 1 line each)
```sql
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
```

### 4.5 — Drop the 11 duplicate indexes
- `asic_companies`: drop `idx_asic_name` (keep `idx_asic_name_trgm`)
- `gs_entities`: drop `idx_gs_entities_name_trgm` (keep canonical_trgm)
- `media_items`: drop `idx_media_items_created` (keep `_created_at`)
- `recommendation_outcomes`: drop `idx_rec_outcomes_type` (keep `idx_recommendation_type`)
- `registered_services_profiles`: 3 duplicates from rename churn
- `relationship_health`: drop `idx_relationship_health_stage` (keep `_lcaa_stage`)
- `story_analysis`: drop `idx_story_analysis_storyteller` (keep `_id`)
- `storytellers`: drop `idx_storytellers_project` (keep `_id`)
- `user_grant_tracking`: drop `idx_pipeline_stage` (keep `_user`)

### 4.6 — Add covering indexes for hot unindexed FKs (Goods + grants pipelines)
```sql
-- procurement_shortlists has 8 unindexed FKs — Goods join hot-spot
CREATE INDEX CONCURRENTLY ix_proc_shortlist_owner ON public.procurement_shortlists(owner_user_id);
CREATE INDEX CONCURRENTLY ix_proc_shortlist_requested ON public.procurement_shortlists(requested_by);
-- ...etc, one per FK. Use partial WHERE col IS NOT NULL if mostly null.
-- Then: funding_relationship_engagements (5), wiki_pages (5), procurement_notification_outbox (4)
```

### 4.7 — Move extensions out of public
```sql
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION fuzzystrmatch SET SCHEMA extensions;
ALTER EXTENSION pg_trgm       SET SCHEMA extensions;
ALTER EXTENSION vector        SET SCHEMA extensions;
-- Then audit search_path on functions that reference these unqualified.
```

### 4.8 — Mass-fix `search_path` on the 324 functions
Add `SET search_path = public, pg_catalog` to each definition. The 49 anon-executable + 49 authenticated-executable SECURITY DEFINER overlap is the meaningful subset — script the ALTER FUNCTION generation from the advisor JSON.

---

## Phase 5 — Targeted query fixes (after dust settles)

5.1 **Add a functional index on the abr_registry vendor-name normalization** that's costing 19 minutes:
```sql
CREATE INDEX CONCURRENTLY idx_abr_normalized_name
  ON public.abr_registry (
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(entity_name,' ',''),'.',''),',',''),'&',''),'-',''))
  ) WHERE status = 'active' AND abn IS NOT NULL;
```
Or — better — store the normalized form as a generated column and index that. Decide after we see whether the query is still hot post-cleanup.

5.2 **Consolidate gs_relationships duplicate indexes.** The (source, type) prefix appears in 4 indexes. Drop the redundant ones and rely on the most-covering composite.

5.3 **Audit matview refresh schedule.** Several matviews refresh frequently and take 2-7 minutes each. Worth checking which are wired into pg_cron and whether they're actually consumed.

---

## Execution order
1. Get Ben's approval on the **Tier A vector indexes** (biggest single win, only risk = breaking a feature we don't see).
2. Run all of **Phase 1** (vacuum/analyze) — safe, no approval needed.
3. Run **Phase 2 Tiers A → B → D → E** (Tier C only if we keep the empty tables).
4. Walk the **Phase 3 table list** with Ben one-by-one, mark drop/keep, then DROP.
5. Fold Phase 4 advisor findings in once subagent returns.
6. Phase 5 query optimization once we can re-measure top queries with clean stats.

---

## Reclaim estimate
| Phase | Path A (keep civicscope live) | Path B (mothball civicscope) |
|---|---|---|
| 1 — Vacuum | ~1.5 GB | ~1.5 GB |
| 2 — Unused indexes (kept embeddings) | ~1 GB | — |
| 2 — Unused indexes (+ all 4 embeddings) | — | ~4.2 GB |
| 3 — Empty tables (if all approved) | ~3 GB | ~3 GB |
| 4 — Drop 1,209 advisor-flagged unused indexes (estimated 0.5–1 GB more) | ~0.7 GB | ~0.7 GB |
| **Total** | **~6.2 GB / 22 GB ≈ 28% reduction** | **~9.4 GB / 22 GB ≈ 43% reduction** |

Plus, regardless of path: faster INSERTs/UPDATEs (less index maintenance), better query plans (current stats), faster matview refreshes (smaller working set), lower disk I/O on every cache miss, and the RLS InitPlan/MPP fixes drop per-row overhead on every authenticated query.
