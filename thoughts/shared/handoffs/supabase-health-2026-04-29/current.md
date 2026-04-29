# Supabase health cleanup — current handoff
**Updated:** 2026-04-30 (Week 0.3 — Bucket C2 + B6 notion sweep)
**DB:** `tednluwflfhxyucgwigh` (shared ACT/grantscope/JusticeHub)
**Branch:** cockpit-refresh-2026-04-26 / migrations applied via Supabase MCP (all reversible via PITR)
**PITR:** ON, 7-day window, scheduled to turn off ≥ 2026-05-13 once stable

## Start here next session
1. **Read the weekly runbook** — `weekly-runbook.md` (this folder)
2. **Read the log** — `../db-health-log.md` for prior weekly entries
3. **Run the smoke test** — `node scripts/civicscope-smoketest.mjs` (expect 6/6)
4. **Run db-health** — `SUPABASE_DB_URL='...' node scripts/db-health.mjs`
5. **Compare advisor counts** to baseline (perf 1,830 / sec 673)

## What this session did (2026-04-29 → 30)
13 migrations applied. Lint reductions: PERF 2,574 → 1,830 (↓744), SEC 1,011 → 673 (↓338). DB shrunk 22 → 21 GB. Civicscope counts unchanged throughout.

### Week 0.3 (2026-04-30 evening) — security-only sweep
5 migrations applied. SEC 592 → 485 (↓107 — `security_definer_view` 147→40, `rls_disabled_in_public` 250→242). PERF unchanged (1,677). Smoke test 6/6 after every migration. No application code touched.
- Bucket C2 closed: 107 ACT-side views flipped to `security_invoker = true` in 4 batches of 25/25/25/32. The 40 remaining `security_definer_view` lints are all civicscope C1 (intentionally untouched).
- Bucket B6 cluster 1 closed: 8 `notion_*` tables (notion_actions, _calendar, _decisions, _grants, _meetings, _opportunities, _organizations, _projects) flipped to RLS-on with zero policies. Verified all consumers use service-role client — service role bypasses RLS, so the API routes/scripts continue to read normally; anon/authenticated paths are now denied.

### Week 0.6 (2026-04-30 night, late) — B6 long tail
1 migration. **50 more tables** locked down (goods, community_orgs, integration_events 14k rows, wiki_*, tracker_*, ghl_pipelines/tags, services, scraped_services, knowledge_*, media_*, sprint_*, contact_*_links, etc). ERROR-level SEC 170 → **120**. `rls_disabled_in_public` 130 → 80.
- Per-table grep verified zero frontend or anon-key consumers across all 50.
- Smoke 6/6. Service-role reads verified at scale.

### Week 0.5 (2026-04-30 night) — agent_proposals fix + B3 user-facing
2 migrations + 1 app refactor. **50 more tables** locked down. ERROR-level SEC 220 → 170 (↓50). `rls_disabled_in_public` 180 → 130.
- **App refactor**: `apps/command-center/src/components/agent-approvals.tsx` switched from direct `supabaseClient` (anon-key) to `fetch('/api/agent/proposals')` (server-side, service-role). Real exposure closed.
- **B3 batch**: 49 user-facing tables (users, sessions, synced_stories, calendar_events, ce_*, contact_*, photos & photo_albums, project_*, intelligence_*, revenue_*, relationship_pipeline, touchpoints, daily_reflections, idea_board, memory_episodes, telegram_conversations, imessage_attachments, el_*, stories, storyteller_media, transcripts, oversight_recommendations, pulse_reports). Per-table consumer-grep verified zero frontend or anon-key callers; all access via API routes/scripts.
- 121 tables locked down across this 2-day session (8 notion + 3 gmail + 14 agent + 27 finance + 18 infra + 1 agent_proposals + 49 B3 + previously committed cleanups).

### Week 0.4 (2026-04-30 late evening) — B6 + B5 + B2 lockdown
4 more migrations. **62 tables** flipped to RLS-on (server-only via service role). ERROR-level SEC 282 → 220 (↓62). Total SEC unchanged because the lints shifted from `rls_disabled_in_public` (ERROR) to `rls_enabled_no_policy` (INFO-level, expected).
- B6 gmail_*: gmail_contacts, gmail_messages, gmail_sync_status (3)
- B6 agent infra: agent_actions, agent_audit_log, agent_runs, agent_runtime_state, agent_schedules, agent_task_queue, agent_tasks, agentic_chat, agentic_projects, agentic_tasks, agentic_work_log, agents, ralph_prds, ralph_tasks (14)
- B5 finance/Xero: 27 tables (xero_*, bookkeeping_*, invoice_project_*, receipt_*, dext_*, subscription*, vendor_*, location_project_rules, collections_actions, charity_impact_reports, money_flows, metrics, outcomes_metrics)
- B2 supporting infra: 18 tables (llm_usage, api_pricing, app_config, pm2_cron_status, pipeline_*, processing_jobs, sync_status, profile_sync_log, ghl_sync_log, data_sources, data_catalog*, source_frontier, mv_refresh_log, webhook_delivery_log, privacy_audit_log, enrichment_candidates)
- **Verified at scale**: service role still reads privacy_audit_log (1.27M rows), source_frontier (53k), agent_runs (1,593), money_flows (4,630).
- **Skipped**: `agent_proposals` — anon-key consumer in `agent-approvals.tsx`. Real exposure (anyone hitting dashboard can approve agent proposals without auth). Tracked in B3.

**Closed ERROR-level security holes:**
- 3 sensitive_columns_exposed (gmail_auth_tokens, bank_statement_lines, xero_contacts)
- 5 policy_exists_rls_disabled (blog_posts, page_views, profiles, quotes, story_reactions)
- 3 extension_in_public (pg_trgm, vector, fuzzystrmatch moved to extensions schema)

**Performance / hygiene:**
- 215 auth.uid()/jwt()/role() calls wrapped in (select …) across 143 policies (advisor lints 212 → 18 → 0)
- 324 mutable function search_paths pinned to 'public, extensions, pg_catalog'
- 56 redundant service_role policies dropped (service_role bypasses RLS automatically)
- 5 orphan tables/matviews + 36 unused indexes dropped (~1 GB reclaim)
- 16 heavy tables tuned for autovacuum (per-table scale factors 0.005–0.05)
- 12 tables ANALYZE'd — fixed phantom-zero stats on 30M+ rows (abr_registry was reporting 0 rows on 20M actual)
- 81 matviews revoked from anon/authenticated (server-side service_role still works)

## Open items by priority

### Long tail (next sessions, civicscope-safe)
- 1,156 unused indexes still flagged
- 353 multiple_permissive_policies remaining
- **80 rls_disabled_in_public** (was 250 founding, **−170** across Weeks 0.3–0.6) — remaining likely BUCKETs B1 reference-data + niche server-only tables
- 186 rls_enabled_no_policy (INFO-level — defense-in-depth posture; tables migrated ERROR→INFO)
- 40 security_definer_view (all civicscope C1, leave alone)
- 49+49 anon/authenticated-executable SECURITY DEFINER functions — review each
- 161 unindexed_foreign_keys
- 77 rls_policy_always_true — policies that say `USING (true)`; either intentional public-read or they need real predicates
- 1 straggler on auth_rls_initplan

### B3 follow-up (✅ closed in Week 0.5)
- agent_proposals refactor + RLS enable — done.
- Remaining 49 user-facing tables — all locked down with no app-code changes needed (zero anon-key consumers verified).

### Schema reorganisation (bigger conversation)
- **Plan drafted: `thoughts/shared/plans/supabase-schema-reorg.md`** — needs Ben sign-off before any DDL
- 22 grantscope-only tables → move to `civicscope.*` schema
- 2 JusticeHub-only tables → move to `justicehub.*`
- 20 multi-owner tables → recommended NOT to move (no cross-schema views) — let `public.<table>` continue to serve both consumers
- See `table-consumers.md` for full per-table picture, `supabase-schema-reorg.md` for design + migration order

### Civicscope embedding decision (deferred)
- 4 vector embedding indexes (~3.2 GB total) ARE wired up to RPCs but get 0 scans (frontend dormant)
- gs_entities embeddings only 23% backfilled (135,994 / 591,790)
- Three paths in plan: (a) revive civicscope + finish backfill, (b) mothball + drop indexes, (c) defer
- User said "civicscope is used a lot" — sticking with (c) defer unless plans change

## Files
```
thoughts/shared/plans/supabase-health-2026-04-29.md         # session plan (history)
thoughts/shared/handoffs/supabase-health-2026-04-29/
  ├── current.md                                              # this file
  ├── weekly-runbook.md                                       # 10-min weekly process
  ├── advisor-summary.md                                      # session-start triage of 3,585 lints
  ├── ddl-rollback.sql                                        # CREATEs for everything we dropped
  └── table-consumers.md                                      # which sites use which tables
thoughts/shared/handoffs/db-health-log.md                    # weekly log (baseline filled)
scripts/db-health.mjs                                        # weekly DB snapshot
scripts/civicscope-smoketest.mjs                             # 6-route site smoke test
```

## Migrations applied (all reversible via PITR + ddl-rollback.sql)
**2026-04-30 batch (Week 0.6 — B6 long tail):**
29. `enable_rls_b6_longtail_50_tables_2026_04_30` — 50 tables across goods/community/wiki/tracker/sprint/financial/contact/knowledge/media/policy clusters

**2026-04-30 batch (Week 0.5 — agent_proposals + B3 user-facing):**
27. `enable_rls_agent_proposals_2026_04_30` — agent_proposals (after frontend refactor in agent-approvals.tsx)
28. `enable_rls_b3_user_facing_2026_04_30` — 49 B3 tables (users, sessions, synced_stories, etc.)

**2026-04-30 batch (Week 0.4 — RLS lockdown):**
23. `enable_rls_gmail_server_only_2026_04_30` — 3 gmail_* tables
24. `enable_rls_agent_infrastructure_2026_04_30` — 14 agent_*/agentic_*/ralph_* tables
25. `enable_rls_finance_xero_server_only_2026_04_30` — 27 xero/receipts/subscriptions/vendor tables
26. `enable_rls_supporting_infra_server_only_2026_04_30` — 18 telemetry/sync/audit/cron/pipeline tables

**2026-04-30 batch (Week 0.3 — security-only):**
18. `c2_batch1_security_invoker_views_2026_04_30` — 25 ACT views → security_invoker
19. `c2_batch2_security_invoker_views_2026_04_30` — 25 ACT views → security_invoker
20. `c2_batch3_security_invoker_views_2026_04_30` — 25 ACT views → security_invoker
21. `c2_batch4_security_invoker_views_2026_04_30` — 32 ACT views → security_invoker
22. `enable_rls_notion_server_only_2026_04_30` — 8 notion_* tables RLS-on (no policy = service-role-only)

**2026-04-30 batch (Week 0.2):**
16. `drop_unused_indexes_batch2_2026_04_30` — 13 unused indexes
17. `consolidate_permissive_policies_batch1_2026_04_30` — saved_foundations 4 + bgfit_* × 4 admin merges

**Founding session 2026-04-29:**
1. `lock_down_sensitive_columns_2026_04_29`
2. `cleanup_orphans_dupes_rls_2026_04_29`
3. `enable_rls_profiles_2026_04_29`
4. `enable_rls_blog_posts_with_public_read_2026_04_29`
5. `tune_autovacuum_heavy_tables_2026_04_29`
6. `wrap_auth_uid_in_subselect_batch1_2026_04_29`
7. `wrap_auth_uid_batch2_2026_04_29`
8. `wrap_auth_uid_batch3_procedural_2026_04_29`
9. `create_extensions_schema_2026_04_30`
10. `pin_function_search_path_2026_04_30`
11. `move_extensions_to_dedicated_schema_2026_04_30`
12. `drop_redundant_service_role_policies_2026_04_30`
13. `wrap_auth_role_in_subselect_2026_04_30`
14. `revoke_matviews_from_anon_2026_04_30`
15. `drop_largest_unused_indexes_2026_04_30`

## Key civicscope-protection rules established this session
- Never touch: `gs_*`, `grant_opportunities`, `foundations`, `abr_registry`, `asic_*`, `entity_xref`, `austender_contracts`, `political_donations`, all `acnc_*`, all `ndis_*`, `justice_funding`, `state_tenders`, `nz_*`, `dss_*`, `crime_stats_lga`, `ato_tax_transparency`, all the `mv_charity_*`/`mv_entity_*`/`mv_person_*`/`mv_donation_*`/`mv_funding_*`/`mv_trustee_*`/`mv_board_*` matviews
- Never drop: 4 embedding indexes (idx_gs_entities_embedding 2.6GB, idx_grants_embedding 242MB, idx_grants_matchable_embedding 170MB, idx_foundations_embedding 179MB) and the 4 search RPCs
- Verify with civicscope-smoketest.mjs after any change

## PITR turn-off readiness (track in db-health-log.md)
Earliest: 2026-05-13. Recommended: 2026-05-20.
Conditions: 2 consecutive clean weekly checks, no smoke-test failures, no new ERROR advisor findings, substantive use confirmed on each site, pg_dump cold-storage snapshot taken.
