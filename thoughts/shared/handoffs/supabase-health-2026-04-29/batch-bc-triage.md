# Batch B + C triage — RLS disabled + SECURITY DEFINER views
**Captured:** 2026-04-30 (Week 0.1)
**Counts:** 250 `rls_disabled_in_public` + 147 `security_definer_view`
**Status:** Triage only — no execution. Each bucket needs an explicit decision before action.

---

## Why this is a triage, not a batch fix

These two lints can't be auto-resolved like unused indexes or duplicated permissive policies. Each table or view needs a per-row judgement:

- **For RLS-disabled tables**: Is this a server-only table (RLS off is fine, service role only)? A reference/lookup table (RLS off + public-read makes sense)? A user/PII table (RLS off is a bug)? A civicscope table (don't touch)?
- **For SECURITY DEFINER views**: Does the view leak data when an unauthorised user queries it? Switching to `security_invoker = true` is usually right but breaks views that depend on creator's privileges.

Order of operations: **decide bucket → migrate by bucket → smoke test between buckets.** Don't do it all at once.

---

## Batch B — 250 `rls_disabled_in_public` tables

### Bucket 1: Civicscope-protected — DO NOT TOUCH (37 tables)

These are explicitly on the never-touch list from `current.md`. RLS off is intentional — civicscope is service-role-only.

```
abr_registry · acnc_ais · acnc_charities · acnc_programs · asic_name_lookup · entity_xref ·
foundations · gs_entities · gs_entity_aliases · gs_relationships · grantconnect_awards ·
political_donations · state_tenders · justice_reinvestment_sites · crime_stats_lga ·
research_grants · canonical_entities · person_entity_links · entity_identifiers ·
entity_merge_log · entity_potential_matches · donor_entity_matches · name_aliases ·
foundation_grantees · foundation_people · foundation_power_profiles · foundation_program_years ·
foundation_programs · foundation_relationship_signals · grant_application_requirements ·
grant_applications · grant_assets · grant_funder_documents · grant_frontier_source_snapshots ·
ndis_active_providers · ndis_compliance_actions · ndis_first_nations · ndis_market_concentration ·
ndis_participants · ndis_participants_lga · ndis_plan_budgets · ndis_providers ·
ndis_registered_providers · ndis_sda · ndis_utilisation · acara_schools · aihw_child_protection ·
agil_locations · sa2_reference · seifa_2021 · postcode_geo · postcode_sa2_concordance ·
nt_communities · vic_grants_awarded · qld_watchhouse_snapshot_rows · qld_watchhouse_snapshots ·
dss_payment_demographics · government_programs · alma_government_programs ·
alma_program_interventions · alma_impact_metrics · alma_media_articles · alma_stories ·
alma_ingestion_jobs · alma_maturation_log · anao_mmr_compliance · anao_mmr_exemptions ·
mmr_unspsc_categories · civic_charter_commitments · civic_consultancy_spending ·
civic_hansard · civic_intelligence_chunks · civic_ministerial_diaries ·
civic_ministerial_statements · civic_rti_disclosures · civic_alerts · civic_digests ·
fellows · cross_system_stats · lga_cross_system_stats
```

**Action:** None. Document as intentional in a future migration note.

---

### Bucket 2: Agent / system infrastructure — SAFE TO DEFER (35 tables)

Server-only tables for agents, cron, telemetry. No human-user access path. Service role only. RLS off is fine but **could** be enabled with a deny-all-non-service-role policy as defense-in-depth.

```
agent_actions · agent_audit_log · agent_proposals · agent_runs · agent_runtime_state ·
agent_schedules · agent_task_queue · agent_tasks · agentic_chat · agentic_projects ·
agentic_tasks · agentic_work_log · agents · ralph_prds · ralph_tasks · llm_usage ·
api_pricing · app_config · pm2_cron_status · pipeline_runs · pipeline_changes ·
processing_jobs · sync_status · sync_event_statistics · profile_sync_log · ghl_sync_log ·
data_sources · data_catalog · data_catalog_snapshots · source_frontier · cross_system_stats ·
mv_refresh_log · webhook_delivery_log · privacy_audit_log · enrichment_candidates
```

**Recommendation:** Leave RLS off. Optional defense-in-depth: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` + a single `CREATE POLICY service_only ON x FOR ALL TO service_role USING (true);`. But service_role bypasses RLS anyway, so this only changes behaviour for non-service-role connections — which shouldn't exist for these tables.

---

### Bucket 3: User-facing data — URGENT review (16 tables)

These have user_id or are likely accessed from frontend. RLS off here is a real exposure.

```
profiles_profiles (blog_posts_profiles)  ← check if frontend reads
calendar_events                          ← contains personal events
ce_users · ce_metrics                    ← contact engagement data
contact_intelligence_insights · contact_cadence_metrics
contact_support_recommendations · contact_votes
gmail_contacts · gmail_messages · gmail_sync_status  ← user mailboxes!
imessage_attachments
notion_actions · notion_calendar · notion_decisions · notion_grants · notion_meetings ·
  notion_opportunities · notion_organizations · notion_projects  ← personal Notion sync
sessions · users
photo_albums · photo_album_photos · photo_album_shares · photo_storyteller_tags · photos
storyteller_media · stories · synced_stories · transcripts · el_storytellers · el_transcripts
event_reactions · daily_reflections · idea_board · memory_episodes
telegram_conversations
project_commentary · project_research · project_intelligence ·
  project_intelligence_snapshots · project_health · project_health_history ·
  project_focus_areas · project_pairings · project_profiles · project_salary_allocations ·
  project_support_graph · project_budgets · project_monthly_financials
revenue_scenarios · revenue_stream_projections
relationship_pipeline · relationship_health (in views) · touchpoints
intelligence_briefings · intelligence_geo_alerts · intelligence_insights · intelligence_refusals
oversight_recommendations · pulse_reports
```

**Recommendation:** For each, check if it's accessed via the anon key from any frontend. If yes — enable RLS + add per-user policy. If no (server-only) — move to Bucket 2.

**Triage script:** `grep -rh "from('<table>')" apps/ scripts/` for each — if results use the **anon** Supabase client, RLS must be enabled.

---

### Bucket 4: Public-readable reference data — defer (10 tables)

Could legitimately be open-read but with explicit RLS-on + public-select policy for clarity.

```
acara_schools (already in B1, ACT Bucket 1 covers it)
sa2_reference · seifa_2021 · postcode_geo · postcode_sa2_concordance (already in B1)
financial_overview_cache · financial_summary  ← review owner
ecosystem_projects · studio_projects
goods_communities · goods_content_library · goods_products · goods_supply_routes
project_alignment (in views)
```

**Recommendation:** Defer until after Bucket 3 is resolved. Then enable RLS with `CREATE POLICY public_read ON x FOR SELECT TO public USING (true);` for true reference data.

---

### Bucket 5: Finance / receipts / Xero — review with finance flow in mind (~30 tables)

Includes data tagged to invoices, R&D claim, BAS reporting. Server-tagged + private.

```
xero_bank_accounts · xero_bank_transactions · xero_bas_tracking · xero_sync_status
bookkeeping_rules · bookkeeping_sync_state · invoice_project_map · invoice_project_overrides
receipt_match_history · receipt_matches · receipt_status
dext_forwarded_emails · dext_receipts · dext_supplier_setup_status
subscription_discovery_events · subscription_history · subscription_patterns · subscriptions ·
  pending_subscriptions
vendor_contact_log · vendor_project_rules
location_project_rules
collections_actions · charity_impact_reports
money_flows · accounting_summary (view)
metrics · outcomes_metrics
```

**Recommendation:** Leave RLS off — server-side only via service role. Same defense-in-depth question as Bucket 2.

---

### Bucket 6: Unclear / one-off — investigate before deciding (~120 tables)

Everything not in B1–B5. Mostly small or domain-specific tables. Each needs `grep -rh "from('<table>')" apps/ scripts/` to determine consumer. Examples: `act_entities`, `goods_asset_lifecycle`, `community_orgs`, `clearinghouse_documents`, `agent_audit_log`, `wiki_articles`, `wiki_search_index`, `studio_projects`, etc.

**Recommendation:** Process this bucket in groups of 10-20 over multiple sessions. Don't try to do all 120 at once.

---

## Batch C — 147 `security_definer_view` views

### The pattern

A SECURITY DEFINER view runs with the creator's permissions, not the caller's. If an anon user queries the view and it joins to a sensitive table, they get rows they shouldn't. Best fix:

```sql
ALTER VIEW public.<view_name> SET (security_invoker = true);
```

This makes the view check the caller's permissions against underlying tables — RLS is enforced.

### Bucket C1: Civicscope-side views — DO NOT TOUCH (~30 views)

```
v_acnc_grant_makers · v_acnc_latest · v_charity_detail · v_charity_explorer ·
v_chain_summary · v_funders_summary · v_funding_outcomes_chain · v_funding_pipeline ·
v_entity_abr · v_entity_funding_mix · v_entity_resolution_stats ·
v_governed_proof_density_summary · v_governed_proof_hot_lane ·
v_indigenous_youth_overrepresentation · v_justice_funding_by_org ·
v_justice_funding_by_program · v_justice_funding_summary · v_justice_spending_summary ·
v_ndis_market_concentration_hotspots · v_ndis_provider_supply_summary ·
v_ndis_registered_provider_graph_match · v_ndis_registered_provider_state_supply ·
v_ndis_registered_provider_status_summary · v_ndis_support_class_supply ·
v_ndis_youth_justice_overlay · v_qld_watchhouse_latest · v_state_ecosystem_summary ·
v_youth_justice_cost_comparison · v_youth_justice_entities ·
v_youth_justice_state_dashboard · v_ctg_youth_justice_progress · v_data_health ·
v_data_quality_scores · v_data_catalog_latest · v_alma_current_impact ·
v_prf_portfolio_outcomes · v_nt_community_buyer_crosswalk · v_nt_community_entity_matches ·
v_nt_community_procurement_summary · justice_funding_clean
```

**Action:** None. Civicscope queries these via service_role — SECURITY DEFINER doesn't add risk in that path.

---

### Bucket C2: ACT internal dashboards — SAFE TO MIGRATE (~80 views)

```
agent_health_dashboard · agent_status · agentic_project_dashboard ·
auto_approval_quality · coordinating_tasks · current_knowledge · delegated_tasks ·
enrichment_ready_contacts · knowledge_review_schedule · knowledge_source_health ·
migration_progress · pending_extractions · pending_proposals ·
v_agent_activity_summary · v_agent_runtime_sweeps · v_agentic_funding_queue ·
v_awaiting_response · v_calendar_events_with_projects · v_data_health ·
v_duplicate_review_queue · v_enriched_opportunities · v_enrichment_review_queue ·
v_facilities_with_partnerships · v_grant_readiness · v_monthly_revenue ·
v_need_to_respond · v_outstanding_invoices · v_pending_receipts ·
v_pending_subscriptions_review · v_pipeline_value · v_project_actions ·
v_project_activity_stream · v_project_alignment · v_project_decisions ·
v_project_financials · v_project_health_summary · v_project_questions ·
v_project_relationships · v_project_strategic_summary · v_project_summary ·
v_projects_needing_attention · v_rd_expenses · v_receipt_pipeline_funnel ·
v_recent_agent_errors · v_recent_communications · v_recent_project_knowledge ·
v_relationship_health · v_subscription_alerts · v_team_capacity ·
v_team_voice_notes · v_top_untagged · v_unified_contacts · v_unmapped_transactions ·
v_voice_notes_cultural_review · v_voice_notes_with_actions ·
vw_alma_intervention_matches · vw_auto_mapped_contacts · vw_engagement_tier_stats ·
vw_exa_queue_summary · vw_exa_usage_summary · vw_high_value_project_matches ·
vw_newsletter_segments · vw_goods_enrichment_candidates ·
vw_justice_enrichment_candidates · wiki_hierarchy ·
xero_financial_health · xero_overdue_receivables · xero_upcoming_payables ·
financial_by_account · financial_monthly_summary ·
subscription_cost_anomalies · subscription_cost_by_account ·
subscription_cost_by_category · subscription_payment_calendar ·
subscription_renewal_alerts · unused_subscriptions ·
v_activity_stream · v_bgfit_budget_vs_actual · v_bgfit_grant_health ·
v_bgfit_pnl · v_bgfit_upcoming_deadlines · v_org_grant_health ·
v_org_upcoming_deadlines · v_cashflow_summary ·
v_contact_360 · v_contact_communication_summary · receipt_weekly_summary ·
unreconciled_financial_documents · missing_receipts · missing_subscriptions ·
task_queue_dashboard · site_latest_health · sync_event_statistics ·
consolidation_progress · accounting_summary · alma_cost_analysis ·
alma_unified_search · community_engagement_overview · community_programs_profiles_v ·
coe_key_people_v · partner_storytellers_v · programs_catalog_v ·
discrimination_aggregations_v · discrimination_sa3_totals_v · public_media_with_collections ·
services_unified · v_cultural_data_access · v_discovery_summary
```

**Recommendation:** Migrate in batches of 20. Pattern is mechanical:

```sql
ALTER VIEW public.<view_name> SET (security_invoker = true);
```

After each batch: smoke test, plus query a sample row through the view to confirm output unchanged.

---

### Bucket C3: Materialised views (separate concern)

Not in C lint per se — matviews don't have `security_invoker` in the same way. The 81 matviews already revoked from anon/authenticated last session.

---

## Suggested next-session order

1. **Pick one Bucket B6 sub-cluster** (e.g. all `notion_*` tables) → consumer-grep → enable RLS or move to deny-all → smoke test.
2. **Bucket C2 in 4 batches of ~20 views** → `ALTER VIEW SET security_invoker = true` → smoke test between each.
3. Re-run advisor — expect SEC count to drop ~80, PERF unchanged.
4. Update this doc to reflect what was processed.

This is **3-4 hour-long sessions** of work. Don't try to ship in one.

---

## What's already at zero (confirmed closed in 2026-04-29 session)

- `sensitive_columns_exposed` — 0 (was 3 ERROR-level)
- `policy_exists_rls_disabled` — 0 (was 5 ERROR-level)
- `extension_in_public` — 0 (was 3 ERROR-level)

No regressions in the 2026-04-30 confirmation snapshot.
