# Table & RPC Consumer Map — Shared Supabase (tednluwflfhxyucgwigh)
Generated: 2026-04-29 (auto-built via Python scan)

## Methodology
Scanned 6 codebases for `.from('<x>')`, `/rest/v1/<x>`, raw SQL (FROM/JOIN/INSERT/UPDATE),
and `.rpc('<x>')`. Skipped: node_modules, .next, archive, worktrees, dist, build, .venv, .git.
Files scanned: ts, tsx, mjs, js, py, sql.

## Repos scanned
- **command-center**: ✓ scanned (/Users/benknight/Code/act-global-infrastructure/apps/command-center)
- **website**: ✓ scanned (/Users/benknight/Code/act-global-infrastructure/apps/website)
- **scripts**: ✓ scanned (/Users/benknight/Code/act-global-infrastructure/scripts)
- **grantscope**: ✓ scanned (/Users/benknight/Code/grantscope)
- **JusticeHub**: ✓ scanned (/Users/benknight/Code/JusticeHub)
- **EL v2**: ✓ scanned (/Users/benknight/Code/empathy-ledger-v2)

## Cleanup-candidate tables — consumer matrix
| Table | command-center | website | scripts | grantscope | JusticeHub | EL v2 | Verdict |
|---|---|---|---|---|---|---|---|
| gs_entities | ✓ (2) | ✗ | ✓ (2) | ✓ (323) | ✓ (26) | ✓ (16) | multi-owner (5) |
| grant_opportunities | ✓ (21) | ✗ | ✓ (12) | ✓ (83) | ✓ (1) | ✗ | multi-owner (4) |
| foundations | ✓ (4) | ✗ | ✓ (2) | ✓ (122) | ✓ (4) | ✓ (2) | multi-owner (5) |
| gs_relationships | ✓ (1) | ✗ | ✗ | ✓ (119) | ✓ (8) | ✓ (10) | multi-owner (4) |
| abr_registry | ✗ | ✗ | ✗ | ✓ (25) | ✗ | ✗ | single owner → grantscope |
| asic_companies | ✗ | ✗ | ✗ | ✓ (10) | ✗ | ✗ | single owner → grantscope |
| asic_name_lookup | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| acnc_ais | ✗ | ✗ | ✗ | ✓ (28) | ✓ (2) | ✓ (8) | multi-owner (3) |
| acnc_charities | ✓ (1) | ✗ | ✗ | ✓ (56) | ✓ (24) | ✓ (1) | multi-owner (4) |
| entity_xref | ✗ | ✗ | ✗ | ✓ (2) | ✗ | ✗ | single owner → grantscope |
| austender_contracts | ✗ | ✗ | ✗ | ✓ (89) | ✓ (1) | ✓ (1) | multi-owner (3) |
| state_tenders | ✗ | ✗ | ✗ | ✓ (5) | ✓ (11) | ✗ | multi-owner (2) |
| political_donations | ✗ | ✗ | ✗ | ✓ (58) | ✓ (3) | ✓ (1) | multi-owner (3) |
| justice_funding | ✗ | ✗ | ✗ | ✓ (103) | ✓ (113) | ✗ | multi-owner (2) |
| mv_director_network | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| mv_entity_power_index | ✗ | ✗ | ✗ | ✓ (32) | ✗ | ✗ | single owner → grantscope |
| mv_person_influence | ✗ | ✗ | ✗ | ✓ (4) | ✗ | ✗ | single owner → grantscope |
| mv_person_directory | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| mv_person_entity_crosswalk | ✗ | ✗ | ✗ | ✓ (2) | ✗ | ✗ | single owner → grantscope |
| mv_person_entity_network | ✗ | ✗ | ✗ | ✓ (4) | ✗ | ✗ | single owner → grantscope |
| mv_trustee_grantee_chain | ✗ | ✗ | ✗ | ✓ (5) | ✗ | ✗ | single owner → grantscope |
| mv_donation_contract_timing | ✗ | ✗ | ✗ | ✓ (3) | ✗ | ✗ | single owner → grantscope |
| mv_charity_network | ✗ | ✗ | ✗ | ✓ (1) | ✗ | ✗ | single owner → grantscope |
| mv_charity_rankings | ✗ | ✗ | ✗ | ✓ (2) | ✗ | ✗ | single owner → grantscope |
| mv_board_interlocks | ✗ | ✗ | ✗ | ✓ (8) | ✗ | ✗ | single owner → grantscope |
| mv_funding_outcomes_summary | ✗ | ✗ | ✗ | ✓ (1) | ✗ | ✗ | single owner → grantscope |
| mv_person_board_seats | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| civic_intelligence_chunks | ✗ | ✗ | ✗ | ✗ | ✓ (1) | ✗ | single owner → JusticeHub |
| knowledge_chunks | ✓ (1) | ✗ | ✓ (14) | ✓ (3) | ✗ | ✓ (5) | multi-owner (4) |
| nz_charities | ✗ | ✗ | ✗ | ✓ (3) | ✗ | ✗ | single owner → grantscope |
| nz_gets_contracts | ✗ | ✗ | ✗ | ✓ (2) | ✗ | ✗ | single owner → grantscope |
| ndis_registered_providers | ✗ | ✗ | ✗ | ✓ (16) | ✗ | ✗ | single owner → grantscope |
| ndis_utilisation | ✗ | ✗ | ✗ | ✓ (7) | ✗ | ✗ | single owner → grantscope |
| ndis_participants | ✗ | ✗ | ✗ | ✓ (4) | ✗ | ✓ (1) | multi-owner (2) |
| dss_payment_demographics | ✗ | ✗ | ✗ | ✓ (5) | ✗ | ✗ | single owner → grantscope |
| crime_stats_lga | ✗ | ✗ | ✗ | ✓ (9) | ✓ (1) | ✓ (3) | multi-owner (3) |
| privacy_audit_log | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| person_roles | ✗ | ✗ | ✗ | ✓ (54) | ✓ (10) | ✓ (3) | multi-owner (3) |
| bookkeeping_transactions | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| ato_tax_transparency | ✗ | ✗ | ✗ | ✓ (18) | ✗ | ✗ | single owner → grantscope |
| research_grants | ✗ | ✗ | ✗ | ✓ (6) | ✗ | ✗ | single owner → grantscope |
| acnc_programs | ✗ | ✗ | ✗ | ✓ (1) | ✗ | ✗ | single owner → grantscope |
| procurement_alerts | ✗ | ✗ | ✗ | ✓ (10) | ✗ | ✗ | single owner → grantscope |
| campaign_alignment_entities | ✗ | ✗ | ✗ | ✗ | ✓ (29) | ✗ | single owner → JusticeHub |
| linkedin_imports | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| opportunities_unified | ✓ (15) | ✗ | ✓ (6) | ✗ | ✗ | ✗ | multi-owner (2) |
| notion_projects | ✓ (3) | ✗ | ✓ (4) | ✗ | ✗ | ✗ | multi-owner (2) |
| wiki_pages | ✗ | ✓ (6) | ✗ | ✓ (1) | ✗ | ✗ | multi-owner (2) |
| media_items | ✗ | ✓ (1) | ✗ | ✗ | ✓ (2) | ✓ (2) | multi-owner (3) |
| email_financial_documents | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **ORPHAN — no consumers found** |
| person_identity_map | ✗ | ✗ | ✓ (1) | ✓ (8) | ✓ (6) | ✗ | multi-owner (3) |
| services | ✗ | ✗ | ✓ (1) | ✗ | ✓ (98) | ✓ (39) | multi-owner (3) |

## RPCs — consumer matrix
| RPC | command-center | website | scripts | grantscope | JusticeHub | EL v2 |
|---|---|---|---|---|---|---|
| search_entities_semantic | ✗ | ✗ | ✗ | ✓ (1) | ✗ | ✗ |
| search_grants_semantic | ✗ | ✗ | ✗ | ✓ (10) | ✗ | ✗ |
| search_foundations_semantic | ✗ | ✗ | ✗ | ✓ (1) | ✗ | ✗ |
| match_grants_for_org | ✓ (2) | ✗ | ✗ | ✓ (3) | ✗ | ✗ |

## Detailed call sites — tables
### gs_entities
- `command-center`: `src/app/api/grantscope/intelligence/route.ts`
- `command-center`: `src/app/api/grantscope/entities/route.ts`
- `scripts`: `backfill-abn-from-acnc-fuzzy.mjs`
- `scripts`: `backfill-abn-from-oric.mjs`
- `grantscope`: `migrations/mv_entity_total_funding.sql`
- `grantscope`: `supabase/migrations/20260331_charity_rankings.sql`
- `grantscope`: `supabase/migrations/20260315_govt_entity_resolver.sql`
- `grantscope`: `supabase/migrations/20260429_youth_justice_report_cache.sql`
- `grantscope`: `supabase/migrations/20260429_fast_entity_prefix_search.sql`
- `grantscope`: ... and 318 more
- `JusticeHub`: `org-audit.mjs`
- `JusticeHub`: `supabase/migrations/20260311000001_gs_entity_bridge.sql`
- `JusticeHub`: `scripts/data-audit.mjs`
- `JusticeHub`: `scripts/discover-justice-funders.mjs`
- `JusticeHub`: `scripts/audit-final.mjs`
- `JusticeHub`: ... and 21 more
- `EL v2`: `scripts/compute-board-power.mjs`
- `EL v2`: `scripts/compute-charity-rankings.mjs`
- `EL v2`: `scripts/sync-civicgraph-org.mjs`
- `EL v2`: `src/app/api/organizations/[id]/contacts/import-board/route.ts`
- `EL v2`: `src/app/api/organizations/[id]/funding/route.ts`
- `EL v2`: ... and 11 more

### grant_opportunities
- `command-center`: `src/app/api/ecosystem/pulse/route.ts`
- `command-center`: `src/app/api/pipeline/search/route.ts`
- `command-center`: `src/app/api/opportunities/route.ts`
- `command-center`: `src/app/api/opportunities/update/route.ts`
- `command-center`: `src/app/api/grants/metrics/route.ts`
- `command-center`: ... and 16 more
- `scripts`: `generate-sprint-suggestions.mjs`
- `scripts`: `backfill-grant-actions-content.mjs`
- `scripts`: `generate-daily-priorities.mjs`
- `scripts`: `weekly-digest.mjs`
- `scripts`: `sync-opportunities-to-unified-pipeline.mjs`
- `scripts`: ... and 7 more
- `grantscope`: `supabase/migrations/20260305_link_grants_to_foundations.sql`
- `grantscope`: `supabase/migrations/20260311_grant_learning.sql`
- `grantscope`: `supabase/migrations/20260308_donor_entity_matching.sql`
- `grantscope`: `supabase/migrations/20260313_backfill_data_linkage.sql`
- `grantscope`: `supabase/migrations/20260309_fast_freshness.sql`
- `grantscope`: ... and 78 more
- `JusticeHub`: `src/app/api/grants/discover/route.ts`

### foundations
- `command-center`: `src/app/api/pipeline/search/route.ts`
- `command-center`: `src/app/api/grantscope/intelligence/route.ts`
- `command-center`: `src/app/api/grantscope/foundations/search/route.ts`
- `command-center`: `src/app/api/grantscope/entities/route.ts`
- `scripts`: `enrich-dgr-status.mjs`
- `scripts`: `import-ato-dgr-register.mjs`
- `grantscope`: `supabase/migrations/20260305_link_grants_to_foundations.sql`
- `grantscope`: `supabase/migrations/20260429_youth_justice_report_cache.sql`
- `grantscope`: `supabase/migrations/20260308_donor_entity_matching.sql`
- `grantscope`: `supabase/migrations/20260313_backfill_data_linkage.sql`
- `grantscope`: `supabase/migrations/20260314_entity_foundation_embeddings.sql`
- `grantscope`: ... and 117 more
- `JusticeHub`: `supabase/migrations/20260309000003_campaign_alignment_engine.sql`
- `JusticeHub`: `src/app/funders/page.tsx`
- `JusticeHub`: `src/app/api/foundations/youth-justice/route.ts`
- `JusticeHub`: `src/lib/ai/alma-tools.ts`
- `EL v2`: `src/lib/server/civicgraph-bootstrap.ts`
- `EL v2`: `src/lib/civicgraph/impact-evidence.ts`

### gs_relationships
- `command-center`: `src/app/api/grantscope/entities/route.ts`
- `grantscope`: `migrations/mv_entity_total_funding.sql`
- `grantscope`: `supabase/migrations/20260331_charity_rankings.sql`
- `grantscope`: `supabase/migrations/20260308_place_funding_views.sql`
- `grantscope`: `supabase/migrations/20260310_lga_mapping.sql`
- `grantscope`: `supabase/migrations/20260316_entity_dossier_scale.sql`
- `grantscope`: ... and 114 more
- `JusticeHub`: `scripts/data-audit.mjs`
- `JusticeHub`: `scripts/sync-gs-programs.mjs`
- `JusticeHub`: `scripts/comprehensive-audit.mjs`
- `JusticeHub`: `src/app/api/analysis/power-map/route.ts`
- `JusticeHub`: `src/app/api/intelligence/network/route.ts`
- `JusticeHub`: ... and 3 more
- `EL v2`: `scripts/compute-board-power.mjs`
- `EL v2`: `scripts/compute-charity-rankings.mjs`
- `EL v2`: `scripts/sync-civicgraph-org.mjs`
- `EL v2`: `src/app/api/organizations/[id]/funders/route.ts`
- `EL v2`: `src/app/api/intelligence/charity-rank/route.ts`
- `EL v2`: ... and 5 more

### abr_registry
- `grantscope`: `supabase/migrations/20260315_fuzzy_abn_backfill.sql`
- `grantscope`: `supabase/migrations/20260315_abr_enrichment.sql`
- `grantscope`: `supabase/migrations/20260315_abr_enrichment_p2.sql`
- `grantscope`: `scripts/enrich-fuzzy-abn-match.mjs`
- `grantscope`: `scripts/watch-schema-health.mjs`
- `grantscope`: ... and 20 more

### asic_companies
- `grantscope`: `supabase/migrations/20260315_abr_enrichment.sql`
- `grantscope`: `supabase/migrations/20260315_abr_enrichment_p2.sql`
- `grantscope`: `supabase/migrations/20260309_fast_freshness.sql`
- `grantscope`: `scripts/import-lobbying-register.mjs`
- `grantscope`: `scripts/import-aec-donations.mjs`
- `grantscope`: ... and 5 more

### acnc_ais
- `grantscope`: `supabase/migrations/20260331_charity_rankings.sql`
- `grantscope`: `supabase/migrations/20260303_charity_sector_snapshot.sql`
- `grantscope`: `supabase/migrations/20260303_acnc_charities.sql`
- `grantscope`: `supabase/migrations/20260228_acnc_ais_data.sql`
- `grantscope`: `scripts/import-acnc-financials.mjs`
- `grantscope`: ... and 23 more
- `JusticeHub`: `src/app/api/justice-funding/route.ts`
- `JusticeHub`: `src/app/api/admin/data-health/route.ts`
- `EL v2`: `scripts/compute-charity-rankings.mjs`
- `EL v2`: `scripts/sync-civicgraph-org.mjs`
- `EL v2`: `src/app/api/intelligence/charity-rank/route.ts`
- `EL v2`: `src/app/api/organisations/[id]/funding-network/route.ts`
- `EL v2`: `src/lib/civicgraph/outcome-score.ts`
- `EL v2`: ... and 3 more

### acnc_charities
- `command-center`: `src/app/api/grantscope/entities/route.ts`
- `grantscope`: `supabase/migrations/20260306_social_enterprises.sql`
- `grantscope`: `supabase/migrations/20260303_charity_sector_snapshot.sql`
- `grantscope`: `supabase/migrations/20260304_charity_detail_view.sql`
- `grantscope`: `supabase/migrations/20260303_acnc_charities.sql`
- `grantscope`: `supabase/migrations/20260307_oric_corporations.sql`
- `grantscope`: ... and 51 more
- `JusticeHub`: `org-audit.mjs`
- `JusticeHub`: `org-audit-part2.mjs`
- `JusticeHub`: `supabase/migrations/20260309000003_campaign_alignment_engine.sql`
- `JusticeHub`: `scripts/data-audit.mjs`
- `JusticeHub`: `scripts/scrape-supplier-outcomes.mjs`
- `JusticeHub`: ... and 19 more
- `EL v2`: `src/lib/civicgraph/client.ts`

### entity_xref
- `grantscope`: `scripts/refresh-entity-xref.mjs`
- `grantscope`: `scripts/migrations/fix-act-company-entity-20260427.sql`

### austender_contracts
- `grantscope`: `migrations/mv_entity_total_funding.sql`
- `grantscope`: `supabase/migrations/20260315_govt_entity_resolver.sql`
- `grantscope`: `supabase/migrations/20260429_youth_justice_report_cache.sql`
- `grantscope`: `supabase/migrations/20260314_crossover_alerts_bulk.sql`
- `grantscope`: `supabase/migrations/20260314_revolving_door_views.sql`
- `grantscope`: ... and 84 more
- `JusticeHub`: `src/app/api/justice-funding/route.ts`
- `EL v2`: `src/lib/civicgraph/impact-evidence.ts`

### state_tenders
- `grantscope`: `scripts/sync-tracker-evidence.mjs`
- `grantscope`: `scripts/sql/backfill-state-tenders-abn.sql`
- `grantscope`: `apps/web/src/app/reports/state-procurement/page.tsx`
- `grantscope`: `apps/web/src/app/reports/youth-justice/qld/crime-prevention-schools/page.tsx`
- `grantscope`: `apps/web/src/app/reports/youth-justice/qld/tracker/page.tsx`
- `JusticeHub`: `org-audit-part2.mjs`
- `JusticeHub`: `scripts/data-audit.mjs`
- `JusticeHub`: `scripts/link-tenders-to-orgs.mjs`
- `JusticeHub`: `scripts/fix-source-urls.mjs`
- `JusticeHub`: `scripts/scrape-state-tenders.mjs`
- `JusticeHub`: ... and 6 more

### political_donations
- `grantscope`: `migrations/mv_entity_total_funding.sql`
- `grantscope`: `supabase/migrations/20260314_crossover_alerts_bulk.sql`
- `grantscope`: `supabase/migrations/20260314_revolving_door_views.sql`
- `grantscope`: `supabase/migrations/20260308_donor_entity_matching.sql`
- `grantscope`: `supabase/migrations/20260314_fuzzy_donation_abns.sql`
- `grantscope`: ... and 53 more
- `JusticeHub`: `supabase/migrations/20260309000001_power_page_donations_dedup.sql`
- `JusticeHub`: `scripts/discover-opposition-entities.mjs`
- `JusticeHub`: `src/app/api/analysis/report/route.ts`
- `EL v2`: `src/lib/civicgraph/impact-evidence.ts`

### justice_funding
- `grantscope`: `migrations/mv_entity_total_funding.sql`
- `grantscope`: `supabase/migrations/20260429_youth_justice_report_cache.sql`
- `grantscope`: `supabase/migrations/20260316_topic_tags.sql`
- `grantscope`: `supabase/migrations/20260314_youth_justice_unified.sql`
- `grantscope`: `supabase/migrations/20260309_fast_freshness.sql`
- `grantscope`: ... and 98 more
- `JusticeHub`: `org-audit.mjs`
- `JusticeHub`: `supabase/migrations/20260309000001_power_page_donations_dedup.sql`
- `JusticeHub`: `supabase/migrations/20260311000001_gs_entity_bridge.sql`
- `JusticeHub`: `supabase/migrations/20260316100001_fix_power_concentration_filter.sql`
- `JusticeHub`: `supabase/migrations/20260308000001_justice_funding.sql`
- `JusticeHub`: ... and 108 more

### mv_entity_power_index
- `grantscope`: `scripts/scrape-opencorporates-officers.mjs`
- `grantscope`: `scripts/watch-funding-anomalies.mjs`
- `grantscope`: `scripts/watch-board-changes.mjs`
- `grantscope`: `scripts/migrations/recreate-cascaded-mvs.sql`
- `grantscope`: `scripts/migrations/recreate-remaining-mvs.sql`
- `grantscope`: ... and 27 more

### mv_person_influence
- `grantscope`: `apps/web/src/app/person/[name]/page.tsx`
- `grantscope`: `apps/web/src/app/api/data/person/route.ts`
- `grantscope`: `apps/web/src/app/reports/multicultural-sector/page.tsx`
- `grantscope`: `apps/web/src/app/reports/multicultural-sector/fecca-eccv/page.tsx`

### mv_person_entity_crosswalk
- `grantscope`: `scripts/migrations/foundation-intelligence-expansion.sql`
- `grantscope`: `apps/web/src/lib/services/org-dashboard-service.ts`

### mv_person_entity_network
- `grantscope`: `scripts/migrations/recreate-cascaded-mvs.sql`
- `grantscope`: `scripts/migrations/create-person-entity-crossmatch.sql`
- `grantscope`: `apps/web/src/app/person/[name]/page.tsx`
- `grantscope`: `apps/web/src/app/api/data/person/route.ts`

### mv_trustee_grantee_chain
- `grantscope`: `scripts/migrations/recreate-cascaded-mvs.sql`
- `grantscope`: `scripts/migrations/recreate-remaining-mvs.sql`
- `grantscope`: `scripts/migrations/foundation-scoring.sql`
- `grantscope`: `apps/web/src/app/foundation/[abn]/page.tsx`
- `grantscope`: `apps/web/src/app/reports/philanthropy/page.tsx`

### mv_donation_contract_timing
- `grantscope`: `supabase/migrations/20260314_timing_summary_function.sql`
- `grantscope`: `supabase/migrations/20260314_temporal_donation_contracts.sql`
- `grantscope`: `apps/web/src/app/reports/timing/page.tsx`

### mv_charity_network
- `grantscope`: `supabase/migrations/20260331_charity_rankings.sql`

### mv_charity_rankings
- `grantscope`: `apps/web/src/app/entity/[gsId]/page.tsx`
- `grantscope`: `apps/web/src/app/api/data/rankings/route.ts`

### mv_board_interlocks
- `grantscope`: `scripts/watch-funding-anomalies.mjs`
- `grantscope`: `scripts/kb-civicgraph-tool.mjs`
- `grantscope`: `scripts/migrations/create-board-interlocks.sql`
- `grantscope`: `apps/web/src/app/api/data/graph/route.ts`
- `grantscope`: `apps/web/src/app/api/data/who-runs-australia/route.ts`
- `grantscope`: ... and 3 more

### mv_funding_outcomes_summary
- `grantscope`: `apps/web/src/app/api/outcomes/portfolio/route.ts`

### civic_intelligence_chunks
- `JusticeHub`: `scripts/build-civic-embeddings.mjs`

### knowledge_chunks
- `command-center`: `src/app/api/knowledge/stats/route.ts`
- `scripts`: `setup-knowledge-tables.mjs`
- `scripts`: `reembed-knowledge.mjs`
- `scripts`: `embed-imessages.mjs`
- `scripts`: `error-monitor.mjs`
- `scripts`: `knowledge-pipeline.mjs`
- `scripts`: ... and 9 more
- `grantscope`: `supabase/migrations/20260311_org_knowledge_scoping.sql`
- `grantscope`: `scripts/process-justicehub-knowledge.mjs`
- `grantscope`: `apps/web/src/app/api/profile/enrich/route.ts`
- `EL v2`: `production_schema_20260111.sql`
- `EL v2`: `supabase/migrations/20260111000000_baseline_from_production.sql`
- `EL v2`: `supabase/migrations/.archive/pre-baseline-2026-01-11/20260102000002_knowledge_base_schema.sql`
- `EL v2`: `scripts/process-knowledge-base.ts`
- `EL v2`: `src/lib/services/knowledge-base-service.ts`

### nz_charities
- `grantscope`: `scripts/import-nz-charities.mjs`
- `grantscope`: `scripts/dedup-entities.mjs`
- `grantscope`: `scripts/sql/dedup-null-abn-pairs.sql`

### nz_gets_contracts
- `grantscope`: `scripts/dedup-entities.mjs`
- `grantscope`: `scripts/sql/dedup-null-abn-pairs.sql`

### ndis_registered_providers
- `grantscope`: `supabase/migrations/20260312_ndis_registered_provider_layer.sql`
- `grantscope`: `scripts/ingest-ndis-entities.mjs`
- `grantscope`: `scripts/ingest-ndis-providers.mjs`
- `grantscope`: `scripts/import-ndis-provider-register.mjs`
- `grantscope`: `scripts/repair-ndis-provider-register.mjs`
- `grantscope`: ... and 11 more

### ndis_utilisation
- `grantscope`: `scripts/migrations/recreate-cascaded-mvs.sql`
- `grantscope`: `scripts/migrations/recreate-remaining-mvs.sql`
- `grantscope`: `scripts/migrations/optimize-power-index.sql`
- `grantscope`: `scripts/migrations/fix-mv-disability-lga-names.sql`
- `grantscope`: `scripts/migrations/connect-ndis-cross-system.sql`
- `grantscope`: ... and 2 more

### ndis_participants
- `grantscope`: `supabase/migrations/20260314_ndis_participants.sql`
- `grantscope`: `scripts/import-ndis-participants.mjs`
- `grantscope`: `scripts/migrations/ingest-ndis-providers.sql`
- `grantscope`: `apps/web/src/app/reports/ndis/page.tsx`
- `EL v2`: `src/lib/civicgraph/deep-intelligence.ts`

### dss_payment_demographics
- `grantscope`: `supabase/migrations/20260429_youth_justice_report_cache.sql`
- `grantscope`: `scripts/backfill-lga-edu-welfare.sql`
- `grantscope`: `scripts/ingest-dss-payments.mjs`
- `grantscope`: `apps/web/src/lib/services/place-data-service.ts`
- `grantscope`: `apps/web/src/lib/services/report-service.ts`

### crime_stats_lga
- `grantscope`: `scripts/seed-prf-place-bundles.mjs`
- `grantscope`: `scripts/import-bocsar-crime.mjs`
- `grantscope`: `scripts/ingest-crime-act.mjs`
- `grantscope`: `scripts/ingest-crime-sa.mjs`
- `grantscope`: `scripts/ingest-crime-qld.mjs`
- `grantscope`: ... and 4 more
- `JusticeHub`: `scripts/populate-lga-cross-system.mjs`
- `EL v2`: `src/lib/civicgraph/outcome-score.ts`
- `EL v2`: `src/lib/civicgraph/deep-intelligence.ts`
- `EL v2`: `src/lib/civicgraph/evidence-pack.ts`

### person_roles
- `grantscope`: `supabase/migrations/20260331_charity_rankings.sql`
- `grantscope`: `supabase/migrations/20260310_director_network.sql`
- `grantscope`: `supabase/migrations/20260314_revolving_door_views.sql`
- `grantscope`: `scripts/extract-foundation-trustees.mjs`
- `grantscope`: `scripts/scrape-opencorporates-officers.mjs`
- `grantscope`: ... and 49 more
- `JusticeHub`: `scripts/data-audit.mjs`
- `JusticeHub`: `scripts/data-audit-part2.mjs`
- `JusticeHub`: `scripts/enrich-from-apis.mjs`
- `JusticeHub`: `scripts/comprehensive-audit.mjs`
- `JusticeHub`: `src/app/intelligence/qld-dyjvs/org/[slug]/page.tsx`
- `JusticeHub`: ... and 5 more
- `EL v2`: `src/app/api/organizations/[id]/contacts/import-board/route.ts`
- `EL v2`: `src/lib/server/civicgraph-bootstrap.ts`
- `EL v2`: `src/lib/civicgraph/intelligence.ts`

### ato_tax_transparency
- `grantscope`: `supabase/migrations/20260307_cross_reference_views.sql`
- `grantscope`: `supabase/migrations/20260309_fast_freshness.sql`
- `grantscope`: `scripts/sync-ato-tax-transparency.mjs`
- `grantscope`: `scripts/build-entity-graph.mjs`
- `grantscope`: `scripts/link-ato-entities.mjs`
- `grantscope`: ... and 13 more

### research_grants
- `grantscope`: `scripts/import-nhmrc-grants.mjs`
- `grantscope`: `scripts/import-arc-grants.mjs`
- `grantscope`: `scripts/dedup-entities.mjs`
- `grantscope`: `scripts/link-research-grants-entities.mjs`
- `grantscope`: `scripts/sql/dedup-null-abn-pairs.sql`
- `grantscope`: ... and 1 more

### acnc_programs
- `grantscope`: `scripts/ingest-acnc-ais.mjs`

### procurement_alerts
- `grantscope`: `supabase/migrations/20260314_crossover_alerts_bulk.sql`
- `grantscope`: `scripts/check-contract-alerts.mjs`
- `grantscope`: `scripts/check-donor-contract-crossover.mjs`
- `grantscope`: `apps/web/.next.stale.1773291590/server/chunks/[root-of-the-server]__0b51c00f._.js`
- `grantscope`: `apps/web/.next.stale.1773285879/server/chunks/[root-of-the-server]__0b51c00f._.js`
- `grantscope`: ... and 5 more

### campaign_alignment_entities
- `JusticeHub`: `scripts/scrape-linkedin-engagement.mjs`
- `JusticeHub`: `scripts/discover-opposition-entities.mjs`
- `JusticeHub`: `scripts/score-engagement-passion.mjs`
- `JusticeHub`: `scripts/discover-justice-funders.mjs`
- `JusticeHub`: `scripts/audit-final.mjs`
- `JusticeHub`: ... and 24 more

### opportunities_unified
- `command-center`: `src/app/api/pipeline/unified/route.ts`
- `command-center`: `src/app/api/intelligence/route.ts`
- `command-center`: `src/app/api/briefing/morning/route.ts`
- `command-center`: `src/app/api/finance/pipeline-update/route.ts`
- `command-center`: `src/app/api/finance/revenue-reality/route.ts`
- `command-center`: ... and 10 more
- `scripts`: `generate-daily-priorities.mjs`
- `scripts`: `sync-opportunities-to-unified-pipeline.mjs`
- `scripts`: `populate-funding-pipeline.mjs`
- `scripts`: `align-pipeline-projects.mjs`
- `scripts`: `retag-legacy-project-codes.mjs`
- `scripts`: ... and 1 more

### notion_projects
- `command-center`: `src/app/api/project-codes/route.ts`
- `command-center`: `src/app/api/projects/notion/route.ts`
- `command-center`: `src/app/api/search/route.ts`
- `scripts`: `list-notion-projects.mjs`
- `scripts`: `analyze-projects.mjs`
- `scripts`: `generate-program-summaries.mjs`
- `scripts`: `weekly-review.mjs`

### wiki_pages
- `website`: `src/app/admin/wiki-scanner/page.tsx`
- `website`: `src/app/admin/queue/page.tsx`
- `website`: `src/app/wiki/page.tsx`
- `website`: `src/app/wiki/new/page.tsx`
- `website`: `src/app/wiki/[slug]/page.tsx`
- `website`: ... and 1 more
- `grantscope`: `scripts/process-justicehub-knowledge.mjs`

### media_items
- `website`: `src/lib/media/client.ts`
- `JusticeHub`: `scripts/migrate-oonchiumpa-photos.mjs`
- `JusticeHub`: `src/app/api/org-hub/[orgId]/media/route.ts`
- `EL v2`: `production_schema_20260111.sql`
- `EL v2`: `supabase/migrations/20260111000000_baseline_from_production.sql`

### person_identity_map
- `scripts`: `consolidate-contacts.mjs`
- `grantscope`: `scripts/link-contacts-to-people.mjs`
- `grantscope`: `scripts/sync-contact-tags.mjs`
- `grantscope`: `scripts/backfill-ghl-civicgraph-links.mjs`
- `grantscope`: `apps/web/src/app/api/org/[orgProfileId]/contacts/sync-ghl/route.ts`
- `grantscope`: `apps/web/src/app/api/org/[orgProfileId]/contacts/link-notion/route.ts`
- `grantscope`: ... and 3 more
- `JusticeHub`: `scripts/audit-final.mjs`
- `JusticeHub`: `scripts/enrich-org-boards.mjs`
- `JusticeHub`: `scripts/run-campaign-scoring.mjs`
- `JusticeHub`: `scripts/audit-database.mjs`
- `JusticeHub`: `src/app/api/admin/campaign-alignment/score/route.ts`
- `JusticeHub`: ... and 1 more

### services
- `scripts`: `alma_unification_migration.sql`
- `JusticeHub`: `docs/sql-scripts/setup-youth-services.sql`
- `JusticeHub`: `supabase/seed.sql`
- `JusticeHub`: `supabase/safe-import.sql`
- `JusticeHub`: `supabase/import-justice-reinvestment-sites.sql`
- `JusticeHub`: `supabase/generated-import.sql`
- `JusticeHub`: ... and 93 more
- `EL v2`: `supabase/migrations/20260408235121_phase3_g5_25a_storyteller_services_view.sql`
- `EL v2`: `supabase/migrations/20260330183852_story_services_table_and_policies.sql`
- `EL v2`: `supabase/migrations/20260409020026_phase3_g5_25b_storyteller_services_manage.sql`
- `EL v2`: `supabase/migrations/20260408231804_phase3_g3_11_story_services.sql`
- `EL v2`: `supabase/migrations/20260409020025_phase3_g5_25a_storyteller_services_view.sql`
- `EL v2`: ... and 34 more

## Detailed call sites — RPCs
### search_entities_semantic
- `grantscope`: `apps/web/src/app/api/search/universal/route.ts`

### search_grants_semantic
- `grantscope`: `scripts/act-harvest-match.mjs`
- `grantscope`: `scripts/act-match.mjs`
- `grantscope`: `packages/grant-engine/src/embeddings.ts`
- `grantscope`: `apps/web/.next.stale.1773291590/server/chunks/ssr/[root-of-the-server]__8f431c93._.js`
- `grantscope`: `apps/web/.next.stale.1773285879/server/app/grants/[id]/page.js`
- `grantscope`: `apps/web/.next.stale.1773285879/server/chunks/ssr/[root-of-the-server]__079c7b32._.js`
- `grantscope`: `apps/web/.next.stale.1773305720/server/chunks/ssr/[root-of-the-server]__8f431c93._.js`
- `grantscope`: `apps/web/src/app/grants/[id]/page.tsx`
- `grantscope`: `apps/web/src/app/api/chat/route.ts`
- `grantscope`: `apps/web/src/app/api/search/universal/route.ts`

### search_foundations_semantic
- `grantscope`: `apps/web/src/app/api/search/universal/route.ts`

### match_grants_for_org
- `command-center`: `src/app/api/finance/grant-matches/route.ts`
- `command-center`: `src/lib/tools/actions.ts`
- `grantscope`: `scripts/act-harvest-match.mjs`
- `grantscope`: `scripts/act-match.mjs`
- `grantscope`: `apps/web/src/app/api/profile/matches/route.ts`

## Truly orphaned (no consumers found anywhere)
- `asic_name_lookup` — searched all 6 codebases, no callers
- `mv_director_network` — searched all 6 codebases, no callers
- `mv_person_directory` — searched all 6 codebases, no callers
- `mv_person_board_seats` — searched all 6 codebases, no callers
- `privacy_audit_log` — searched all 6 codebases, no callers
- `bookkeeping_transactions` — searched all 6 codebases, no callers
- `linkedin_imports` — searched all 6 codebases, no callers
- `email_financial_documents` — searched all 6 codebases, no callers

## Single-owner candidates (good for schema move)
### Owned by `grantscope`
- `abr_registry`
- `asic_companies`
- `entity_xref`
- `mv_entity_power_index`
- `mv_person_influence`
- `mv_person_entity_crosswalk`
- `mv_person_entity_network`
- `mv_trustee_grantee_chain`
- `mv_donation_contract_timing`
- `mv_charity_network`
- `mv_charity_rankings`
- `mv_board_interlocks`
- `mv_funding_outcomes_summary`
- `nz_charities`
- `nz_gets_contracts`
- `ndis_registered_providers`
- `ndis_utilisation`
- `dss_payment_demographics`
- `ato_tax_transparency`
- `research_grants`
- `acnc_programs`
- `procurement_alerts`

### Owned by `JusticeHub`
- `civic_intelligence_chunks`
- `campaign_alignment_entities`

## Multi-owner (need stable contract before refactoring)
- `gs_entities` → command-center, scripts, grantscope, JusticeHub, EL v2
- `grant_opportunities` → command-center, scripts, grantscope, JusticeHub
- `foundations` → command-center, scripts, grantscope, JusticeHub, EL v2
- `gs_relationships` → command-center, grantscope, JusticeHub, EL v2
- `acnc_ais` → grantscope, JusticeHub, EL v2
- `acnc_charities` → command-center, grantscope, JusticeHub, EL v2
- `austender_contracts` → grantscope, JusticeHub, EL v2
- `state_tenders` → grantscope, JusticeHub
- `political_donations` → grantscope, JusticeHub, EL v2
- `justice_funding` → grantscope, JusticeHub
- `knowledge_chunks` → command-center, scripts, grantscope, EL v2
- `ndis_participants` → grantscope, EL v2
- `crime_stats_lga` → grantscope, JusticeHub, EL v2
- `person_roles` → grantscope, JusticeHub, EL v2
- `opportunities_unified` → command-center, scripts
- `notion_projects` → command-center, scripts
- `wiki_pages` → website, grantscope
- `media_items` → website, JusticeHub, EL v2
- `person_identity_map` → scripts, grantscope, JusticeHub
- `services` → scripts, JusticeHub, EL v2