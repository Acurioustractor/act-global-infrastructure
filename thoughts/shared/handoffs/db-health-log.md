# Supabase shared-DB — weekly health log
Append one dated entry per week. Template at the bottom.

Runbook: `thoughts/shared/handoffs/supabase-health-2026-04-29/weekly-runbook.md`

---

## 2026-04-29 (founding session — baseline)
- **Smoke test:** 6/6 (homepage, architecture, power-concentration, /api/data/health, /api/data/power-index, /api/ops/health 401)
- **DB size:** 21 GB
- **Tables / indexes / policies / matviews:** 604 / 2,493 / 502 / 81
- **Public functions:** 335
- **Connections:** 2 active / 25 idle / 0 idle-in-tx
- **Worst dead_pct:** 0% across all heavy tables (just vacuumed)
- **WAL archiving:** healthy (100s lag, 0.03% fail rate, 20,145 WALs shipped)
- **Top query share:** PostgREST `set_config` 29.3% (normal)
- **Advisor PERF:** 1,830 (baseline)
- **Advisor SEC:** 673 (baseline)
- **Civicscope counts:**
  - gs_entities: 591,819
  - grant_opportunities: 32,059
  - foundations: 10,918
  - asic_companies: 2,167,341
  - austender_contracts: 798,586
- **RLS audit:** all 8 sensitive tables show `rls_on=true`
- **Notes:** Founding session. PITR turned on for 7-day window. 13 migrations applied — all reversible.

---

## 2026-04-30 (Week 0.1 — confirmation snapshot, day after migrations)
- **Smoke test:** 6/6 (homepage 1127ms, architecture 1143ms, power-concentration 787ms, /api/data/health 1599ms, power-index 785ms, ops/health 401 288ms)
- **DB size:** 21 GB (no change)
- **Tables / indexes / policies / matviews:** 604 / 2,493 / 502 / 81 (no change)
- **Connections:** 1 active / 33 idle / 0 idle-in-tx ✅
- **Worst dead_pct:** 3.5% on grant_opportunities (well under 30% threshold)
- **Autovacuum-behind:** 10 entries flagged but all dead/live ratios <5% (e.g. person_roles 14k/340k = 4.3%, abr_registry 11k/20M = 0.06%) — noise, not concerning
- **WAL archiving:** 84 secs since last; fail rate 0.0288% ✅
- **Top query share:** PostgREST `set_config` 29.0% (normal); REFRESH MATERIALIZED VIEW operations from cleanup session show up in 2nd–9th place
- **Advisor PERF:** 1,794 (Δ −36 vs baseline)
- **Advisor SEC:** 592 (Δ −81 vs baseline)
- **ERROR-level changes:** 0 new — `sensitive_columns_exposed`, `policy_exists_rls_disabled`, `extension_in_public` all confirmed closed
- **Civicscope counts:** gs_entities 591,821 (+2); grants 32,059; foundations 10,918; asic_companies 2,167,341; austender 798,586; donations 437,399; acnc_charities 64,988 — all stable or growing ✅
- **RLS audit:** all 8 sensitive tables `rls_on=true` ✅
- **Notes:** Same-day confirmation run. `scripts/db-health.mjs` couldn't connect via pooler (JWT in env not the DB password) — ran probes via Supabase MCP `execute_sql` instead. Lint counts dropped further (likely matview revoke from anon/authenticated clearing some derived findings). No regressions. Healthy.

---

## 2026-04-30 (Week 0.2 — post-Batch D + A + triage)
- **Smoke test:** 6/6 (run 3 times across the session — pre-D, post-D, post-A — all green)
- **DB size:** 21 GB (no change)
- **Indexes:** 2,480 (Δ −13 from baseline; 13 unused dropped in Batch D)
- **Policies:** 494 (Δ −8 from baseline; 4 saved_foundations redundant + 8 bgfit split admin policies dropped, 4 merged bgfit admin_or_org_admin policies created)
- **Worst dead_pct:** 3.5% on grant_opportunities (unchanged)
- **WAL archiving:** healthy
- **Top query share:** postgrest set_config 29.0% (unchanged)
- **Advisor PERF:** 1,677 (Δ −153 vs 2026-04-29 baseline of 1,830, Δ −117 within session)
  - unused_index: 1,169 → 1,156 (−13)
  - multiple_permissive_policies: 458 → 353 (**−105** — biggest single delta)
- **Advisor SEC:** 592 (unchanged — Batches B + C are triage-only this session)
- **ERROR-level:** 0 new findings; 3 closures from founding session still hold
- **Civicscope counts:** gs_entities 591,821 / grants 32,059 / foundations 10,918 ✅
- **Migrations applied:**
  1. `drop_unused_indexes_batch2_2026_04_30` — 13 unused indexes (organizations, voice_notes, communications_history, integration_events, articles, alma_evidence, linkedin_contacts, campaign_alignment_entities × 4)
  2. `consolidate_permissive_policies_batch1_2026_04_30` — saved_foundations 4 redundant policies + bgfit × 4 admin/org_admin merges
- **Triage produced (no execution):**
  - `batch-bc-triage.md` — 250 RLS-disabled grouped into 6 buckets, 147 SECURITY DEFINER views into 3 buckets
  - `thoughts/shared/plans/supabase-schema-reorg.md` — full design doc for civicscope/justicehub schema split (needs sign-off before any DDL)
- **Notes:** Single session (Week 0.2 within Week 1). Civicscope-protect rules held throughout. PITR remains on. Next routine check still scheduled for 2026-05-06.

---

## 2026-04-30 (Week 0.3 — Bucket C2 sweep + B6 notion_*)
- **Smoke test:** 6/6 (run 5 times — pre-batch + after each of 4 batches + after notion RLS — all green, 280–950 ms)
- **DB size:** 21 GB (no change)
- **Indexes / policies / matviews:** unchanged (no DROP this session, only `ALTER VIEW SET` + `ALTER TABLE ENABLE RLS`)
- **WAL archiving:** healthy
- **Advisor PERF:** 1,677 (unchanged — this session was security-only)
- **Advisor SEC:** 485 (Δ **−107** vs Week 0.2 of 592, Δ −188 vs founding baseline of 673)
  - `security_definer_view`: 147 → 40 (−107) — remaining 40 are all civicscope C1, intentionally untouched
  - `rls_disabled_in_public`: 250 → 242 (−8) — 8 notion_* tables flipped to RLS-on
  - `rls_enabled_no_policy`: 16 → 24 (+8) — same 8 notion_* now show under this lint (INFO-level, expected; service-role bypass means anon is denied which is the goal)
- **ERROR-level:** 290 → 282 (Δ −8 from notion_* RLS); founding-session 3 ERROR closures still hold
- **Civicscope counts:** gs_entities ≥591k / grants 32k / foundations 10.9k ✅ (smoke test verifies live aggregate paths)
- **Migrations applied:**
  1. `c2_batch1_security_invoker_views_2026_04_30` — 25 ACT views (accounting_summary → partner_storytellers_v)
  2. `c2_batch2_security_invoker_views_2026_04_30` — 25 views (pending_extractions → v_bgfit_upcoming_deadlines)
  3. `c2_batch3_security_invoker_views_2026_04_30` — 25 views (v_calendar_events_with_projects → v_project_health_summary)
  4. `c2_batch4_security_invoker_views_2026_04_30` — 32 views (v_project_questions → xero_upcoming_payables)
  5. `enable_rls_notion_server_only_2026_04_30` — 8 notion_* tables ENABLE ROW LEVEL SECURITY (zero policies, server-only via service role)
- **Verified after migration:** service-role read of notion_projects (80), notion_organizations (74), notion_opportunities (43) succeeds — RLS bypass intact for service role.
- **Skipped:** 40 civicscope C1 SECURITY DEFINER views (v_acnc_*, v_charity_*, v_funding_*, v_justice_*, v_ndis_*, v_youth_justice_*, v_governed_proof_*, v_qld_watchhouse_latest, v_state_ecosystem_summary, v_data_health, v_data_quality_scores, v_data_catalog_latest, v_alma_current_impact, v_prf_portfolio_outcomes, v_nt_community_*, justice_funding_clean) — service-role-only path makes SECURITY DEFINER non-issue and they may rely on creator-priv joins.
- **Notes:** Mechanical session. No application code touched. Frontend dashboards reading these views via service-role client are unaffected (security_invoker only changes the permission check; service role bypasses RLS on underlying tables). The 8 notion_* tables had 0 anon-key consumers (all imports via service-role-bound `@/lib/supabase`), so RLS-on with no policy is the correct posture.

---

## 2026-04-30 (Week 0.4 — B6 gmail/agent + B5 finance/Xero + B2 infra)
- **Smoke test:** 6/6 (run twice — after gmail+agent batch, after finance+infra batch)
- **DB size:** 21 GB (no change)
- **Indexes / policies / matviews:** unchanged (RLS-enable is a flag flip, no DDL beyond ALTER TABLE)
- **WAL archiving:** healthy
- **Advisor PERF:** 1,677 (unchanged — security-only session)
- **Advisor SEC total:** 485 (unchanged in count, but composition shifted ERROR → INFO)
  - `rls_disabled_in_public`: 242 → 180 (Δ −62)
  - `rls_enabled_no_policy`: 24 → 86 (Δ +62, INFO-level — same 62 tables, now defense-in-depth)
- **ERROR-level SEC:** 282 → **220** (Δ −62) — biggest single-session ERROR drop after C2 closure
- **Civicscope counts:** unchanged ✅ (gs_entities ≥591k, grants 32k, foundations 10.9k, asic 2.17M, austender 798k)
- **Verified after migration:** service-role reads succeed for xero_bank_accounts (5), subscription_patterns (48), money_flows (4,630), agent_runs (1,593), privacy_audit_log (1,278,440), source_frontier (53,485) — RLS bypass intact at scale.
- **Migrations applied:**
  6. `enable_rls_gmail_server_only_2026_04_30` — 3 gmail_* tables (gmail_auth_tokens already had RLS)
  7. `enable_rls_agent_infrastructure_2026_04_30` — 14 agent_*/agentic_*/ralph_* tables (skipped agent_proposals — see below)
  8. `enable_rls_finance_xero_server_only_2026_04_30` — 27 finance/Xero/receipts/subscriptions/vendor tables
  9. `enable_rls_supporting_infra_server_only_2026_04_30` — 18 telemetry/sync/audit/cron/pipeline/data-catalog tables
- **62 tables locked down** in this session.
- **NOT migrated (B3 follow-up needed):** `agent_proposals` — `apps/command-center/src/components/agent-approvals.tsx` reads + writes via the browser anon-key client. Real exposure: anyone hitting the dashboard can approve/reject AI agent proposals without auth. Fix is to move read+write into `apps/command-center/src/app/api/agent/proposals/` (the route exists) and refactor the component to call the API. Tracked as B3 priority.
- **Notes:** Per-table consumer-grep before each batch (frontend components vs API routes vs scripts). Pattern: 0 frontend = safe to enable RLS no-policy. The ERROR→INFO migration is the actual security improvement — anon/authenticated paths now blocked, service-role bypass keeps everything else working unchanged.

---

## 2026-04-30 (Week 0.5 — agent_proposals fix + B3 user-facing tables)
- **Smoke test:** 6/6 (run twice — after agent_proposals, after B3 batch)
- **DB size:** 21 GB
- **Advisor PERF:** 1,677 (unchanged — security-only)
- **Advisor SEC total:** 485 (unchanged total, composition still shifting ERROR → INFO)
  - `rls_disabled_in_public`: 180 → **130** (Δ −50)
  - `rls_enabled_no_policy`: 86 → 136 (Δ +50, INFO-level — same 50 tables)
- **ERROR-level SEC:** 220 → **170** (Δ −50)
- **Application code change:** `apps/command-center/src/components/agent-approvals.tsx` refactored — removed direct `supabaseClient` reads/writes against `agent_proposals`; now calls existing `/api/agent/proposals` GET + POST endpoints. TypeScript clean. This was a real exposure: the dashboard was readable+writable from anyone with the URL via the anon key. Now any anon-key path is blocked.
- **Migrations applied:**
  10. `enable_rls_agent_proposals_2026_04_30` — agent_proposals after frontend refactor
  11. `enable_rls_b3_user_facing_2026_04_30` — 49 tables: users (13 rows), sessions (14), synced_stories (142), agent_proposals (188), pulse_reports (5), project_commentary (4), all photo_*, intelligence_*, project_* (most at 0 rows but locked for defense-in-depth)
- **NOT migrated:** profiles already had RLS-on with 1 policy, untouched.
- **Verified:** service-role reads still work for users (13), sessions (14), synced_stories (142), agent_proposals (188).
- **Notes:** B3 was the last riskiest bucket. 49 tables × per-table grep confirmed zero frontend-component or anon-key consumers (excluding the one we just refactored). All access via API routes (server-side, service-role) or scripts. Defense-in-depth is now on across the entire B6+B5+B2+B3 surface — 121 tables flipped this session.

---

## 2026-04-30 (Week 0.6 — B6 long tail, 50 more tables)
- **Smoke test:** 6/6
- **Advisor SEC:** 485 total (unchanged) but `rls_disabled_in_public` 130 → **80** (Δ −50)
- **ERROR-level SEC:** 170 → **120** (Δ −50)
- **Migration:** `enable_rls_b6_longtail_50_tables_2026_04_30` — goods_*, community_orgs, integration_events (14k rows), wiki_*, tracker_*, ghl_pipelines/tags, act_entities, blog_posts_profiles, ecosystem_projects, studio_projects, services, scraped_services, project_contact_alignment, knowledge_edges/links, media_*, sprint_items/suggestions, contact_*_links, user_gamification_stats, financial_overview_cache, financial_summary, partner_external_links, repo_project_links, sector_map_cache, organizations_profiles, opportunities_unified, policy_events, privacy_settings, procurement_webhook_receipts, migration_email_templates, email_response_templates, content_link_suggestions, communication_*, campaign_tracked_posts, clearinghouse_documents, reminders.
- **Verified at scale:** integration_events 14,242 rows, goods_supply_routes 3,917, community_orgs 826, goods_asset_lifecycle 404, wiki_search_index 271 — all readable via service role.
- **Notes:** Per-table grep across 50 tables, zero frontend or anon-key consumers. ERROR-level SEC has now dropped from ~397 founding → 120 (−70%).

---

## Template (copy this for next week)

```markdown
## YYYY-MM-DD
- Smoke test: X/6
- DB size: NN GB; tables NNN; indexes NNNN
- Connections: N active / NN idle / 0 idle-in-tx
- Worst dead_pct: X% on <table>
- WAL archiving: NN secs since last
- Top query share: <pattern> X% (normal/unusual)
- Advisor: perf NNNN (Δ) / sec NNN (Δ)
- Civicscope counts: gs_entities NNN; grants NN; foundations NN
- Notes: <anything unusual or none>
```

---

## PITR turn-off — readiness checklist

Track when each criterion is met. Earliest turn-off date: **2026-05-13** (2 weeks post-session).

- [ ] 2 consecutive weekly checks with no regressions (target: 2026-05-13)
- [ ] No civicscope smoke-test failure in 14 days
- [ ] No new ERROR-level advisor findings vs 2026-04-29 baseline
- [ ] Substantive use confirmed on each site:
  - [ ] Grantscope search/report run
  - [ ] JusticeHub page rendered
  - [ ] act.place visited
  - [ ] command-center finance reconciliation run
  - [ ] Xero sync executed
  - [ ] Goods photo upload tested
- [ ] `pg_dump` cold-storage snapshot taken
- [ ] **PITR disabled — date: ____**
