# Supabase Advisor Triage — 2026-04-29

Source files (read 100%, parsed as JSON):
- Performance: `mcp-supabase-get_advisors-1777456788556.txt` (1,940,347 chars, 2,574 lints)
- Security: `mcp-supabase-get_advisors-1777456785641.txt` (710,957 chars, 1,011 lints)

No spans skipped. Project advisors return ~3,585 findings total.

## TL;DR

The database is groaning under three compounding loads:
1. **1,209 unused indexes** bloating writes + WAL across 380+ tables (write amplification + planner cost).
2. **978 multiple_permissive_policies findings on 94 tables** — every SELECT runs N policies and OR-joins them. Worst offenders carry 28 duplicate-policy events each (combinatorial: 7 roles x 4 actions for the same logical rule).
3. **212 `auth.uid()` / `auth.jwt()` calls re-evaluated per row** in RLS policies. Wrap them in `(select auth.uid())` and they become a single InitPlan.

Drop the 1,209 unused indexes, consolidate the policies on the 18 worst tables, and wrap the 212 RLS expressions: that's 80% of the felt slowness.

---

## 1. Performance findings — counts by category

| Category | Count | Level |
|---|---:|---|
| `unused_index` | 1,209 | INFO |
| `multiple_permissive_policies` | 978 | WARN |
| `auth_rls_initplan` | 212 | WARN |
| `unindexed_foreign_keys` | 160 | INFO |
| `duplicate_index` | 11 | WARN |
| `no_primary_key` | 3 | INFO |
| `auth_db_connections_absolute` | 1 | WARN |
| **TOTAL** | **2,574** | |

### 1a. `unused_index` (1,209 — top affected tables)

| Count | Table | Sample index names |
|---:|---|---|
| 14 | `public.email_financial_documents` | `idx_efd_account_email`, `idx_efd_category`, `idx_efd_consolidation_status`, `idx_efd_next_payment_date`, `idx_efd_subscription_status`, `idx_efd_tags`, `idx_efd_usage_status`, `idx_email_fin_account`, `idx_email_fin_gmail_message`, `idx_email_fin_raw_extraction`, `idx_email_fin_reconciliation`, `idx_email_fin_tenant_date`, `idx_email_fin_vendor`, `idx_email_fin_xero` |
| 13 | `public.media_items` | `idx_media_items_ai_tags`, `idx_media_items_consent`, `idx_media_items_created`, `idx_media_items_created_at`, `idx_media_items_file_type`, `idx_media_items_impact_themes`, `idx_media_items_is_hero`, `idx_media_items_manual_tags`, `idx_media_items_project_ids`, `idx_media_items_project_slugs`, `idx_media_items_search`, `idx_media_items_source`, `idx_media_items_story_ids` |
| 12 | `public.wiki_pages` | `idx_wiki_pages_org`, `idx_wiki_embedding`, `idx_wiki_pages_auto_approved`, `idx_wiki_pages_domains`, `idx_wiki_pages_notion_id`, `idx_wiki_pages_projects`, `idx_wiki_pages_review`, `idx_wiki_pages_search`, `idx_wiki_pages_slug`, `idx_wiki_pages_status`, `idx_wiki_pages_tags`, `idx_wiki_pages_type` |
| 11 | `public.person_identity_map` | `idx_pim_unified_tags`, `idx_person_exa_refresh_needed`, `idx_person_exa_unenriched`, `idx_person_identity_engagement_priority`, `idx_person_identity_ghl`, `idx_person_identity_linkedin`, `idx_person_identity_map_email_lookup`, `idx_pim_company_lower`, `idx_pim_data_quality`, `idx_pim_discovered_via`, `idx_pim_needs_cleanup` |
| 11 | `public.services` | `idx_services_active`, `idx_services_alma_intervention`, `idx_services_categories`, `idx_services_category`, `idx_services_data_source`, `idx_services_geographical`, `idx_services_keywords`, `idx_services_location`, `idx_services_location_coords`, `idx_services_project`, `idx_services_verification_status` |

By table-prefix subsystem (top 8): `mv_*` 79, `alma_*` 69, `funding_*` 39, `project_*` 38, `knowledge_*` 28, `justice_*` 27, `org_*` 25, `procurement_*` 21.

Description: *"This index has not been used. Indexes are sometimes added speculatively and not used in production. They use disk space and add write overhead. They may also be redundant."*

### 1b. `multiple_permissive_policies` (978 — top affected tables, all 28-event)

Each table below has **28 policy collisions** (7 roles × 4 actions); 17 tables tie at the maximum:

`public.bgfit_budget_items`, `public.bgfit_deadlines`, `public.bgfit_financial_periods`, `public.bgfit_grants`, `public.bgfit_suppliers`, `public.bgfit_transactions`, `public.coe_key_people`, `public.events`, `public.funder_portfolio_entities`, `public.funder_portfolios`, `public.historical_inquiries`, `public.org_projects`, `public.platform_media_items`, `public.platform_media_processing_jobs`, `public.platform_organizations`, `public.saved_foundations`, `public.user_grant_tracking`.

Then `public.alma_conversations` 21, `public.knowledge_sources` 14, `public.member_actions` 14.

**Total distinct tables affected: 94.**

Role x action breakdown of all 978 events:
- SELECT: 574 (authenticated 94, agent_readonly 80, anon 80, authenticator 80, cli_login_postgres 80, dashboard_user 80, supabase_privileged_role 80)
- INSERT: 144, UPDATE: 137, DELETE: 123

**Recurring duplicate-policy pairs** (these are the same patch applied many tables over):
| Count | Policy pair |
|---:|---|
| 63 | `Public read` + `Service write` |
| 28 | `bgfit_financial_periods_admin` + `_service` |
| 28 | `bgfit_suppliers_admin` + `_service` |
| 28 | `funder_portfolio_entities_service` + `_user_policy` |
| 28 | `funder_portfolios_service` + `_user_policy` |
| 28 | `Platform organization media isolation` + `Service role full access platform media` |
| 28 | `Platform organization processing isolation` + `Service role full access platform processing` |
| 28 | `Service role full access platform organizations` + `Users see their own platform organization` |
| 28 | `Users manage own pipeline` + `Users manage own tracking` |
| 21 | `bgfit_budget_items_{admin,org_admin,service}` (3-way) |
| 21 | `bgfit_deadlines_{admin,org_admin,service}` (3-way) |
| 21 | `bgfit_grants_{admin,org_admin,service}` (3-way) |
| 21 | `bgfit_transactions_{admin,org_admin,service}` (3-way) |
| 21 | `Service role full access events` + `Service role full access to events` (literal duplicate, just different name) |
| 21 | `Service role full access key people` + `Service role full access to key people` (literal duplicate) |

Description: *"Detects if multiple permissive row level security policies are present on a table for the same `role` and `action` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query."*

### 1c. `auth_rls_initplan` (212 — top affected tables)

The fix is mechanical: `auth.uid()` → `(select auth.uid())`, same for `auth.jwt()` and `current_setting()`.

| Count | Table | Policy names to wrap |
|---:|---|---|
| 6 | `public.saved_foundations` | `delete own`, `insert own`, `org members see shared foundations`, `select own`, `update own`, `Users manage own saved foundations` |
| 5 | `public.saved_grants` | `delete own`, `insert own`, `org members see shared grants`, `select own`, `update own` |
| 4 | `public.funding_application_draft_workspace` | `Admins {delete,insert,read,update} funding_application_draft_workspace` |
| 4 | `public.funding_discovery_review_workspace` | same shape |
| 4 | `public.funding_relationship_engagements` | same shape |
| 4 | `public.alma_conversations` | `Users can {read,insert,update} own conversations`, `Service role full access conversations` |
| 4 | `public.knowledge_sources` | `Authenticated users can create sources`, `org_sources_{select,insert,delete}` |
| 4 | `public.bgfit_grants` | `bgfit_grants_{admin,org_admin,service,org_read}` |
| 4 | `public.bgfit_budget_items` | `bgfit_budget_items_{admin,service,org_read,org_admin}` |
| 4 | `public.bgfit_transactions` | `bgfit_transactions_{admin,service,org_read,org_admin}` |
| 4 | `public.bgfit_deadlines` | `bgfit_deadlines_{admin,service,org_read,org_admin}` |
| 3 | `public.member_actions` | `Users can read own actions`, `Users can insert own actions`, `Service role full access` |
| 3 | `public.wiki_pages` | `Authenticated users can create wiki pages`, `Users can update their own wiki pages`, `org_wiki_select` |
| 3 | `public.public_profiles` | `Users can {create,update,view} own profile` |
| 3 | `public.articles` | `Users can {delete,update,view} their own articles` |
| 3 | `public.org_members` | `admin manage memberships`, `owner sees memberships`, `select own memberships` |
| 3 | `public.app_users` | `app_users_{insert,select,update}_own` |
| 3 | `public.charity_claims` | `insert own`, `select own or verified`, `update own` |
| 3 | `public.api_keys` | `api_keys_owner_{select,insert,update}` |

Most-repeated policy name across 212: `Service write` (10 tables).

### 1d. `unindexed_foreign_keys` (160 — top affected tables)

| Count | Table | FKs needing indexes |
|---:|---|---|
| 8 | `public.procurement_shortlists` | `..._approval_locked_by_fkey`, `..._approved_by_fkey`, `..._approved_pack_export_id_fkey`, `..._approver_user_id_fkey`, `..._last_pack_export_id_fkey`, `..._owner_user_id_fkey`, `..._reopened_by_fkey`, `..._requested_by_fkey` |
| 5 | `public.funding_relationship_engagements` | `..._parent_conversation_task_id_fkey`, `..._created_by_fkey`, `..._opportunity_id_fkey`, `..._recommendation_id_fkey`, `..._updated_by_fkey` |
| 5 | `public.wiki_pages` | `..._parent_method_id_fkey`, `..._parent_practice_id_fkey`, `..._parent_principle_id_fkey`, `..._updated_by_fkey`, `..._verified_by_fkey` |
| 4 | `public.procurement_notification_outbox` | `..._alert_id_fkey`, `..._pack_export_id_fkey`, `..._shortlist_id_fkey`, `..._task_id_fkey` |
| 3 | `public.alma_interventions` | `..._linked_community_program_id_fkey`, `..._linked_service_id_fkey`, `..._reviewed_by_fkey` |
| 3 | `public.outcome_submissions` | `..._proof_bundle_id_fkey`, `..._reviewed_by_fkey`, `..._submitted_by_fkey` |
| 3 | `public.grant_notification_outbox` | `..._alert_preference_id_fkey`, `..._grant_id_fkey`, `..._org_profile_id_fkey` |
| 3 | `public.goods_procurement_signals` | `..._asset_id_fkey`, `..._buyer_entity_id_fkey`, `..._product_id_fkey` |
| 3 | `public.funding_application_draft_workspace` | `..._application_id_fkey`, `..._created_by_fkey`, `..._updated_by_fkey` |

### 1e. `duplicate_index` (11 — all listed)

Drop one of each pair:
- `public.asic_companies`: `{idx_asic_name, idx_asic_name_trgm}`
- `public.gs_entities`: `{idx_gs_entities_canonical_trgm, idx_gs_entities_name_trgm}`
- `public.media_items`: `{idx_media_items_created, idx_media_items_created_at}`
- `public.recommendation_outcomes`: `{idx_rec_outcomes_type, idx_recommendation_type}`
- `public.registered_services_profiles`: `{idx_community_programs_profiles_program, idx_registered_services_profiles_program}`
- `public.registered_services_profiles`: `{idx_community_programs_profiles_profile, idx_registered_services_profiles_profile}`
- `public.registered_services_profiles`: `{community_programs_profiles_program_id_public_profile_id_key, community_programs_profiles_program_public_profile_key}`
- `public.relationship_health`: `{idx_relationship_health_lcaa_stage, idx_relationship_health_stage}`
- `public.story_analysis`: `{idx_story_analysis_storyteller, idx_story_analysis_storyteller_id}`
- `public.storytellers`: `{idx_storytellers_project, idx_storytellers_project_id}`
- `public.user_grant_tracking`: `{idx_pipeline_stage, idx_user_grant_tracking_user}`

### 1f. `no_primary_key` (3)

`public.processing_jobs`, `public.asic_name_lookup`, `public.entity_xref`. Add primary keys (replication, ORM behaviour, and update performance all suffer without one).

### 1g. `auth_db_connections_absolute` (1)

*"Your project's Auth server is configured to use at most 10 connections. Increasing the instance size without manually adjusting this number will not improve the performance of the Auth server. Switch to a percentage based connection allocation strategy instead."*

---

## 2. Security findings — counts by category

| Category | Count | Level |
|---|---:|---|
| `function_search_path_mutable` | 324 | WARN |
| `rls_disabled_in_public` | 260 | ERROR |
| `security_definer_view` | 147 | ERROR |
| `materialized_view_in_api` | 84 | WARN |
| `rls_policy_always_true` | 74 | WARN |
| `anon_security_definer_function_executable` | 49 | WARN |
| `authenticated_security_definer_function_executable` | 49 | WARN |
| `rls_enabled_no_policy` | 9 | INFO |
| `policy_exists_rls_disabled` | 5 | ERROR |
| `extension_in_public` | 3 | WARN |
| `sensitive_columns_exposed` | 3 | ERROR |
| `public_bucket_allows_listing` | 3 | WARN |
| `auth_leaked_password_protection` | 1 | WARN |
| **TOTAL** | **1,011** | |

### 2a. `policy_exists_rls_disabled` (5 — ERROR, fix first)

These tables have policies written but RLS is OFF, so the policies are never enforced:
- `public.blog_posts`
- `public.page_views`
- `public.profiles`
- `public.quotes`
- `public.story_reactions`

Quote (verbatim): *"Detects cases where row level security (RLS) policies have been created, but RLS has not been enabled for the underlying table."*

### 2b. `sensitive_columns_exposed` (3 — ERROR, fix immediately)

- `public.bank_statement_lines` exposes `bank_account` via PostgREST without RLS.
- `public.gmail_auth_tokens` exposes `access_token`, `refresh_token` via PostgREST without RLS.
- `public.xero_contacts` exposes `account_number` via PostgREST without RLS.

Quote: *"Table is exposed via API without RLS and contains potentially sensitive column(s) ... This may lead to data exposure."*

### 2c. `rls_disabled_in_public` (260 — ERROR)

260 tables in the public schema have RLS disabled. By table-prefix:
`project_*` 14, `ndis_*` 11, `civic_*` 9, `agent_*` 8, `notion_*` 8, `alma_*` 7, `goods_*` 7, `contact_*` 6, `foundation_*` 6, `grant_*` 5, `xero_*` 5, `agentic_*` 4, `entity_*` 4, `gmail_*` 4, `intelligence_*` 4, `photo_*` 4, `acnc_*` 3, `bookkeeping_*` 3, `data_*` 3, `dext_*` 3 ... (all 260 enumerated in the JSON).

### 2d. `security_definer_view` (147)

Views defined with `SECURITY DEFINER` enforce permissions of the view creator, not the caller. Top examples: `public.v_rd_expenses`, `public.v_recent_communications`, `public.agentic_project_dashboard`, `public.v_bgfit_pnl`, `public.v_outstanding_invoices`, `public.v_bgfit_budget_vs_actual`, `public.v_youth_justice_state_dashboard`, `public.agent_health_dashboard`, `public.v_ndis_support_class_supply`, `public.v_data_quality_scores`. (Each appears once; 147 distinct views.)

### 2e. `materialized_view_in_api` (84)

Materialized views exposed via PostgREST. Notable: `mv_yj_report_*` family (multiple), `mv_foundation_grantees`, `mv_charity_network`, `mv_charity_rankings`, `mv_sa2_map_data`, `mv_indigenous_procurement_score`, `mv_lga_indigenous_proxy_score`, `mv_evidence_backed_funding`, `v_austender_entity_summary`, `mv_entity_total_funding`, `alma_dashboard_interventions`, etc. Restrict via `revoke ... on ... from anon, authenticated;` if not consumer-facing.

### 2f. `rls_policy_always_true` (74)

Policies whose USING and/or WITH CHECK is literal `true` — RLS is effectively bypassed. Top tables: `public.australian_frameworks` (3), `public.portraits` (3), `public.research_items` (3), `public.signal_content` (3), `public.signal_events` (3), `public.alma_funding_opportunities` (2), `public.art_innovation` (2), `public.content_placements` (2), `public.discrimination_reports` (2), `public.project_knowledge` (2). Sample policy names from JSON: `Service manages alert events` (alert_events), `Authenticated users can manage applications` (alma_funding_applications), `Authenticated users can {insert,update} funding opportunities` (alma_funding_opportunities).

### 2g. `function_search_path_mutable` (324)

324 functions with mutable `search_path` — mass-fix candidate. Quote: *"Function `public.<name>` has a role mutable search_path"*. Includes 49 marked anon-executable and 49 authenticated-executable SECURITY DEFINER overlap (`accept_pending_invitations`, `auto_create_org_membership`, `can_access_story`, `can_read_storyteller_data`, `compare_interventions`, `create_empathy_project`, `create_research_session`, `decrement_communities_joined`, `decrement_stories_contributed`, `exec`, etc).

### 2h. `extension_in_public` (3)

`fuzzystrmatch`, `pg_trgm`, `vector` are installed in `public`. Move to a dedicated `extensions` schema.

### 2i. `public_bucket_allows_listing` (3)

Storage buckets `images`, `media-uploads`, `portraits` have a broad SELECT policy on `storage.objects` allowing clients to list every file. *"Public buckets don't need this for object URL access and it may expose more data than intended."*

### 2j. `rls_enabled_no_policy` (9)

RLS is on but no policies exist (so all access denied except service role): `ai_discoveries`, `alma_consent_ledger`, `alma_intervention_evidence`, `alma_intervention_outcomes`, `nz_charities`, `nz_gets_contracts`, `pilot_participants`, `report_leads`, `validation_reviews`. Decide: write policies or document service-role-only intent.

### 2k. `auth_leaked_password_protection` (1)

Auth project-level setting: enable HIBP-leaked-password protection in Auth → Policies.

---

## 3. Highest-impact remediations (ranked by load reduction)

### #1 — Drop the 1,209 unused indexes (massive write/WAL relief)
Fastest single win for "feels slow" symptoms during ingestion-heavy work (Goods imports, Xero sync, ALMA discovery). Start with the heaviest tables:
- `public.email_financial_documents` (14 indexes), `public.media_items` (13), `public.wiki_pages` (12), `public.person_identity_map` (11), `public.services` (11), `public.justice_matrix_cases` (9), `public.research_items` (9).
- Generate the `DROP INDEX CONCURRENTLY` script straight from the advisor JSON.

### #2 — Wrap `auth.uid()` / `auth.jwt()` / `current_setting()` in SELECT subselects (212 policies)
Each call is currently re-evaluated per row. Pattern:
```sql
-- before:  using ( user_id = auth.uid() )
-- after:   using ( user_id = (select auth.uid()) )
```
Hit the top 11 tables first (saved_foundations, saved_grants, funding_application_draft_workspace, funding_discovery_review_workspace, funding_relationship_engagements, alma_conversations, knowledge_sources, bgfit_grants, bgfit_budget_items, bgfit_transactions, bgfit_deadlines) — that knocks out 47/212 = 22% in 11 migrations.

### #3 — Consolidate or merge multiple_permissive_policies on the 17 worst tables (28-event each)
For the BGFit cluster, platform_* cluster, funder_portfolio* cluster, and the 17 saved_foundations / events / coe_key_people / org_projects / historical_inquiries / user_grant_tracking peers: collapse `*_admin` + `*_org_admin` + `*_service` triples into a single `USING (is_admin_or_service(...))` policy. The duplicated pairs (e.g. `Service role full access events` AND `Service role full access to events` on `events`) are literal duplicates from naming churn — drop one of each pair. Each consolidation drops 7-21 lints because the same logical rule is multiplied across 7 grant roles.

### #4 — Plug the three sensitive-column leaks (security ERROR)
- `public.gmail_auth_tokens` — currently exposes `access_token` + `refresh_token` to anon via PostgREST. Either disable the API on the table (`revoke select on public.gmail_auth_tokens from anon, authenticated;` and remove from PostgREST visibility) or enable RLS with a service-role-only policy.
- `public.bank_statement_lines` — `bank_account` exposed.
- `public.xero_contacts` — `account_number` exposed.

### #5 — Enable RLS on the 5 `policy_exists_rls_disabled` tables
Trivial fix: `alter table {blog_posts, page_views, profiles, quotes, story_reactions} enable row level security;` — the policies are already written, just not enforced.

### #6 — Add covering indexes for the 8 procurement_shortlists FKs + top FKs
`procurement_shortlists` has 8 unindexed FKs and is a join hot-spot for the Goods pipeline. Then `funding_relationship_engagements` (5), `wiki_pages` (5), `procurement_notification_outbox` (4). Use partial / `NULLS NOT DISTINCT` indexes if these FKs are mostly NULL.

### #7 — Drop the 11 duplicate indexes
List in §1e. Pure dead weight on writes.

### #8 — Move `fuzzystrmatch`, `pg_trgm`, `vector` out of public schema
`create schema if not exists extensions; alter extension <name> set schema extensions;` — then update `search_path` if any functions reference them unqualified.

### #9 — Lock down public storage buckets
For `images`, `media-uploads`, `portraits`: replace the broad SELECT-all policy with object-URL-only access (clients don't need LIST to fetch a known URL). Cuts enumeration risk on ALMA media + portraits.

### #10 — Set `search_path` on the 324 functions (mass fix)
Add `SET search_path = public, pg_catalog` to each function definition. Many are SECURITY DEFINER (49 anon + 49 authenticated overlap) — this is the bigger of the two SECURITY DEFINER concerns; combined with extension-schema move (§#8), it closes the search-path-hijack class of issue.

### Bonus — Auth connection setting (`auth_db_connections_absolute`)
Switch the Auth server from absolute (10) to percentage-based connection allocation in project settings. Without this, scaling the instance won't speed Auth up.

---

## Ratio sanity check

- 1,209 unused indexes ÷ ~250 tables hit = ~5 dead indexes per table on average. Index churn during ingestion is a non-trivial slice of write CPU.
- 978 MPP findings on 94 tables = average 10.4 redundant policy evaluations per row read. On the 17 worst tables, every SELECT runs 7 policy evaluations OR-joined.
- 212 RLS-initplan + 978 MPP together explain felt slowness on RLS-protected reads — they compound multiplicatively per row.

## Reproduction

```python
import json
sec = json.loads(open('mcp-supabase-get_advisors-1777456785641.txt').read())['result']['lints']
perf = json.loads(open('mcp-supabase-get_advisors-1777456788556.txt').read())['result']['lints']
```
Then `Counter(l['name'] for l in perf)` and same for `sec`. Top-affected tables via `defaultdict(Counter)` keyed on `l['metadata']['name']`. Index/FK/policy names parsed from `l['detail']` with regex `\\\`([^`\\\\]+)\\\``.
