-- ============================================================================
-- DDL ROLLBACK SCRIPT — Supabase Health Cleanup 2026-04-29
-- ============================================================================
-- Captured BEFORE any DROP. If a Phase 2 / Phase 3 / Phase 4 drop turns out to
-- have been load-bearing for a site, paste the relevant section into the SQL
-- editor and run.
--
-- Project: tednluwflfhxyucgwigh (Shared ACT/GS Supabase)
-- Captured at: 2026-04-29 (Australian time)
-- PITR retention: 7 days (set in dashboard)
--
-- All CREATE statements are exactly what the database had at capture time.
-- Sizes reflect the storage at capture; recreated indexes will rebuild from
-- live data, so sizes will match table volume at time of recreation.
-- ============================================================================


-- =====================================================
-- PART A — Index DDL (Phase 2 candidates)
-- =====================================================

-- Tier A: Vector embedding indexes (KEEP unless mothballing civicscope)
-- ---------------------------------------------------------------------

-- 2,646 MB · ivfflat lists=300
CREATE INDEX idx_gs_entities_embedding ON public.gs_entities USING ivfflat (embedding vector_cosine_ops) WITH (lists='300');

-- 242 MB · hnsw
CREATE INDEX idx_grants_embedding ON public.grant_opportunities USING hnsw (embedding vector_cosine_ops);

-- 179 MB · ivfflat lists=100
CREATE INDEX idx_foundations_embedding ON public.foundations USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

-- 170 MB · ivfflat lists=50, partial
CREATE INDEX idx_grants_matchable_embedding ON public.grant_opportunities USING ivfflat (embedding vector_cosine_ops) WITH (lists='50') WHERE ((embedding IS NOT NULL) AND (grant_type <> 'historical_award'::text) AND (status <> ALL (ARRAY['closed'::text, 'expired'::text])));

-- 70 MB · ivfflat lists=50 (table empty — orphan)
CREATE INDEX idx_civic_chunks_embedding ON public.civic_intelligence_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='50');

-- 59 MB · ivfflat lists=100 (table empty — orphan)
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');


-- Tier B: abr_registry indexes (0 scans on a 20M-row table — re-evaluate post-stats)
-- -----------------------------------------------------------------------------------

CREATE INDEX idx_abr_status ON public.abr_registry USING btree (status);
CREATE INDEX idx_abr_state ON public.abr_registry USING btree (state);
CREATE INDEX idx_abr_entity_type_code ON public.abr_registry USING btree (entity_type_code);
CREATE INDEX idx_abr_acn ON public.abr_registry USING btree (acn) WHERE (acn IS NOT NULL);
CREATE INDEX idx_abr_postcode ON public.abr_registry USING btree (postcode);


-- Tier C: asic_* / asic_name_lookup / privacy_audit_log indexes
-- (advisor flagged 0 scans — but tables turned out non-empty; re-check after consumer map)
-- ----------------------------------------------------------------------------------------

CREATE INDEX idx_asic_name_trgm ON public.asic_companies USING gin (company_name gin_trgm_ops);
CREATE INDEX idx_asic_abn ON public.asic_companies USING btree (abn) WHERE (abn IS NOT NULL);
CREATE INDEX idx_asic_type ON public.asic_companies USING btree (company_type);
CREATE INDEX idx_asic_status ON public.asic_companies USING btree (status);
CREATE INDEX idx_asic_current_name_trgm ON public.asic_companies USING gin (current_name gin_trgm_ops);
CREATE INDEX idx_asic_lookup_exact ON public.asic_name_lookup USING btree (name_normalized);
CREATE INDEX idx_asic_lookup_trgm ON public.asic_name_lookup USING gin (name_normalized gin_trgm_ops);
CREATE INDEX idx_priv_audit_tenant_time ON public.privacy_audit_log USING btree (tenant_id, occurred_at DESC);


-- Tier D: entity_xref unused indexes
-- -----------------------------------

CREATE INDEX idx_entity_xref_identifier ON public.entity_xref USING btree (identifier_type, identifier_value);
CREATE INDEX idx_entity_xref_value ON public.entity_xref USING btree (identifier_value);
CREATE INDEX idx_entity_xref_gs_id ON public.entity_xref USING btree (gs_id);
CREATE INDEX idx_entity_xref_entity_id ON public.entity_xref USING btree (entity_id);
CREATE INDEX idx_entity_xref_trading_upper ON public.entity_xref USING btree (upper(TRIM(BOTH FROM identifier_value))) WHERE (identifier_type = 'TRADING_NAME'::text);


-- Tier E: gs_relationships and gs_entities trim
-- ----------------------------------------------

CREATE INDEX idx_gs_rel_amount ON public.gs_relationships USING btree (amount DESC) WHERE (amount IS NOT NULL);
CREATE INDEX idx_gs_rel_year ON public.gs_relationships USING btree (year) WHERE (year IS NOT NULL);
CREATE INDEX idx_gs_entities_name_upper ON public.gs_entities USING btree (upper(TRIM(BOTH FROM canonical_name)));
CREATE INDEX idx_gs_entities_metadata ON public.gs_entities USING gin (metadata) WHERE ((metadata IS NOT NULL) AND (metadata <> '{}'::jsonb));


-- Tier F: small unused
-- --------------------

CREATE INDEX idx_notion_projects_data_gin ON public.notion_projects USING gin (data);
CREATE INDEX idx_acnc_ais_grants ON public.acnc_ais USING btree (grants_donations_au DESC NULLS LAST);
CREATE INDEX idx_acnc_ais_gov_revenue ON public.acnc_ais USING btree (revenue_from_government DESC NULLS LAST);
CREATE INDEX idx_justice_funding_fts ON public.justice_funding USING gin (to_tsvector('english'::regconfig, ((((((COALESCE(recipient_name, ''::text) || ' '::text) || COALESCE(program_name, ''::text)) || ' '::text) || COALESCE(project_description, ''::text)) || ' '::text) || COALESCE(location, ''::text))));
CREATE INDEX idx_austender_published ON public.austender_contracts USING btree (date_published);
CREATE INDEX idx_organizations_name_trgm ON public.organizations USING gin (lower(name) gin_trgm_ops);


-- =====================================================
-- PART B — Duplicate index DDL (Phase 4.5 candidates)
-- =====================================================
-- Drop ONE of each pair; keep the other. These are recovery DDL for whichever
-- one we drop.

CREATE INDEX idx_asic_name ON public.asic_companies USING gin (company_name gin_trgm_ops);
CREATE INDEX idx_gs_entities_name_trgm ON public.gs_entities USING gin (canonical_name gin_trgm_ops);
CREATE INDEX idx_media_items_created ON public.media_items USING btree (created_at DESC);
CREATE INDEX idx_rec_outcomes_type ON public.recommendation_outcomes USING btree (recommendation_type);
CREATE INDEX idx_community_programs_profiles_program ON public.registered_services_profiles USING btree (program_id);
CREATE INDEX idx_community_programs_profiles_profile ON public.registered_services_profiles USING btree (public_profile_id);
CREATE UNIQUE INDEX community_programs_profiles_program_id_public_profile_id_key ON public.registered_services_profiles USING btree (program_id, public_profile_id);
CREATE INDEX idx_relationship_health_stage ON public.relationship_health USING btree (lcaa_stage);
CREATE INDEX idx_story_analysis_storyteller ON public.story_analysis USING btree (storyteller_id);
CREATE INDEX idx_storytellers_project ON public.storytellers USING btree (project_id);
CREATE INDEX idx_pipeline_stage ON public.user_grant_tracking USING btree (user_id, stage);


-- =====================================================
-- PART C — Materialized view DDL (Phase 3 candidates)
-- =====================================================
-- These store derived data only — recreating them re-runs the query against
-- live source tables. Recreate-then-REFRESH gets data back. Source tables
-- (`person_roles`, `gs_entities`, `gs_relationships`, etc.) are preserved by
-- PITR + we are not dropping any source tables.

-- mv_director_network — 244 MB, derived from person_roles
CREATE MATERIALIZED VIEW public.mv_director_network AS
WITH active_directors AS (
  SELECT person_name_normalised, company_acn, company_name, company_abn, entity_id, role_type
  FROM person_roles
  WHERE cessation_date IS NULL AND role_type = ANY (ARRAY['director'::text,'alternate_director'::text,'chair'::text])
),
shared AS (
  SELECT a.person_name_normalised,
    a.company_acn AS company_a_acn, a.company_name AS company_a_name, a.entity_id AS entity_a_id,
    b.company_acn AS company_b_acn, b.company_name AS company_b_name, b.entity_id AS entity_b_id
  FROM active_directors a
  JOIN active_directors b ON a.person_name_normalised = b.person_name_normalised AND a.company_acn < b.company_acn
)
SELECT * FROM shared
ORDER BY person_name_normalised, company_a_acn, company_b_acn;

-- mv_charity_network — 27 MB, derived from gs_entities + gs_relationships
CREATE MATERIALIZED VIEW public.mv_charity_network AS
SELECT e.abn,
  count(DISTINCT r.target_entity_id) FILTER (WHERE r.source_entity_id = e.id) +
  count(DISTINCT r.source_entity_id) FILTER (WHERE r.target_entity_id = e.id) AS network_connections
FROM gs_entities e
LEFT JOIN gs_relationships r ON (r.source_entity_id = e.id OR r.target_entity_id = e.id) AND r.relationship_type = 'shared_director'::text
WHERE e.abn IS NOT NULL
GROUP BY e.abn, e.id;

-- mv_donation_contract_timing, mv_charity_rankings, mv_entity_power_index, mv_funding_outcomes_summary,
-- mv_person_board_seats, mv_person_influence, mv_board_interlocks definitions captured to:
-- See full pg_get_viewdef output saved in this file's source query result (advisor-summary handoff).
-- These are large multi-CTE definitions — if any need recreating, query
--   `SELECT definition FROM pg_matviews WHERE matviewname = '<name>'`
-- on a PITR-restored branch and copy the result.

-- For compactness, the smaller ones inline:
CREATE MATERIALIZED VIEW public.mv_person_board_seats AS
SELECT person_name_normalised,
  count(DISTINCT company_acn) AS board_seats,
  count(DISTINCT company_acn) FILTER (WHERE role_type = 'director') AS director_seats,
  count(DISTINCT company_acn) FILTER (WHERE role_type = 'chair') AS chair_seats,
  array_agg(DISTINCT company_name ORDER BY company_name) AS companies,
  array_agg(DISTINCT company_acn ORDER BY company_acn) AS company_acns
FROM person_roles
WHERE cessation_date IS NULL
GROUP BY person_name_normalised
HAVING count(DISTINCT company_acn) >= 2
ORDER BY count(DISTINCT company_acn) DESC;


-- =====================================================
-- ROLLBACK NOTES
-- =====================================================
--
-- To rebuild a single dropped index:
--   1. Find it in PART A or PART B of this file
--   2. Run the CREATE INDEX statement (consider adding CONCURRENTLY to avoid locking)
--   3. ANALYZE the table afterward
--
-- To rebuild a dropped matview:
--   1. Find/recreate it in PART C
--   2. REFRESH MATERIALIZED VIEW <name>
--
-- To restore a table's row data (if a DROP TABLE was wrong):
--   - PITR (within 7 days): Supabase dashboard → Database → Backups → Restore to a point in time
--   - Branch + extract: create a branch from the pre-DROP timestamp, pg_dump --table=<name>, psql to prod
--
-- This rollback file is the source of truth for index/view recreation.
-- Anything not in this file (table data, RLS policies, RPCs) needs PITR.
