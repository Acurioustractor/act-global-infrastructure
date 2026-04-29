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
- 1,156 unused indexes still flagged (was 1,188, −32 across two batches)
- 353 multiple_permissive_policies remaining (was 458, **−105** consolidated)
- 242 rls_disabled_in_public (was 250, **−8** notion_* in Week 0.3) — see `batch-bc-triage.md` for remaining 6 buckets
- 40 security_definer_view (was 147, **−107** in Week 0.3) — all 40 remaining are civicscope C1, leave alone unless schema-reorg goes ahead
- 24 rls_enabled_no_policy (was 16, +8 — these are the notion_* tables now showing RLS-on without explicit policies; INFO-level, expected)
- 161 unindexed_foreign_keys — `procurement_shortlists` worst (8 unindexed FKs)
- 49+49 anon/authenticated-executable SECURITY DEFINER functions — review each
- 1 straggler on auth_rls_initplan (was 18, all but one resolved through wraps) — find & wrap

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
