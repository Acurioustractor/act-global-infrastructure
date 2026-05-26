# H — Schema-contract burn-down (the P3 "honest by construction" checklist)

**Date:** 2026-05-27 · **Tool:** `scripts/check-schema-contract.mjs` (live-schema diff of every
command-center `.from().select()`). **Baseline:** `config/schema-contract-baseline.json` — the test
fails on any NEW drift. **Goal:** burn this to 0, then delete the baseline for full strictness.

> **Progress 2026-05-27 (tranche 2):** baseline **72 → 64** (8 more fixed). Clean renames via aliases:
> `ghl_opportunities.pipeline_stage→stage_name` (runway, notion-agent health+mission),
> `xero_transactions.vendor_name→contact_name` (projects/financials), `xero_transactions.{description,
> account_code}→line_items[]` (tax/export, projects/[code]/financials),
> `communications_history.{received_at→occurred_at, ai_summary→summary}` (briefing/morning, tools/core).
> Also fixed a **filter-column** drift the checker can't see: `briefing/morning` filtered
> `.is('responded_at', …)` → `response_received_at` (the checker only validates `.select()` columns —
> extending it to `.eq/.gte/.is/.order` args is a worthwhile follow-up; would also catch the
> `notion-agent` `.ilike('tags', …)` on ghl_opportunities, which has no `tags` column).
>
> **Progress 2026-05-27 (tranche 1):** baseline **87 → 72** (15 fixed). Done: the live `/harvest` regression
> (both routes — `description`/`account_code` now read from `line_items[]`, restoring zeroed totals +
> vendor + GL-account spend) and 13 clean column renames via PostgREST aliases (preserve downstream
> keys): `xero_transactions.amount→total`, `communications_history.communication_date→occurred_at`,
> `daily_reflections.date→reflection_date`, `agent_audit_log.{agent_name→agent_id,created_at→timestamp}`,
> `project_summaries.summary→summary_text`, `foundations.annual_giving_total→total_giving_annual`,
> `opportunities_unified.deadline→expected_close`, `relationship_health.last_touchpoint_date→last_contact_at`,
> `calendar_events.summary→title`, `grant_opportunities.{title→name,funder_name→provider,close_date→closes_at}`.
> **Skipped (needs intent, still baselined):** `contact_project_links.ghl_contact_id` (table keys on
> `entity_id` = canonical entity, not a GHL contact id — needs a join, not a rename); `subscriptions`
> old names; `project_budgets` (needs aggregation); remaining `ghl_opportunities` drift;
> `api_usage` (table repurposed → rewrite/archive); `receipt_matches.project_code`;
> `xero_transactions.{description,account_code}` in `tax/export` + `projects/financials` (line_items).

This is the mechanical, client-aware reproduction of the audit's manual findings — and it caught a
**fresh regression the audit missed**: the just-shipped `/harvest` routes select
`xero_transactions.description/account_code/account_name`, none of which exist (the query 400s →
silent empty). Exactly the class of bug the contract test exists to stop.

> The 8 storyteller/wiki/briefing routes that read `storyteller_master_analysis` etc. are NOT here —
> the checker resolves their `import { elSupabase as supabase }` alias and routes those reads to the
> EL v2 instance (30 refs skipped). No false positives.

## Category 1 — Archive the fake page + route (dead-table API routes)
These back UI pages that read tables that don't exist → silent zeros. Per the audit's archive list.
`git mv` route + page to `_archived/` with a `RESTORE.md`. **Judgment flags noted.**

| Route | Dead table(s) | Note |
|---|---|---|
| `agent/autonomy`, `agent/learning`, `agent/procedures` | `agent_*` | whole agent-learning layer is dead |
| `assets` | `assets, asset_maintenance, lodgings, properties` | |
| `business-dev`, `development/contacts`, `development/overview` | `business_initiatives, repo_contacts` | |
| `compliance` + `lib/tools/projects.ts` | `compliance_items, tracked_documents` | ⚠️ superseded by the file-based compliance calendar (G-audit); confirm before archiving |
| `debt` | `debts, debt_payments, debt_scenarios, properties` | |
| `ecosystem/[slug]/{deployments,details,health-history}` | `deployments, health_checks` | the ecosystem deploy/uptime panels |
| `finance/cashflow-explained` | `v_cashflow_explained` | dead view |
| `intelligence/actions`, `intelligence/feed/[id]` | `insight_votes` | vote feature dead; rest of route may be live — fix not archive? |
| `knowledge/stats` | `agent_*, memory_consolidation_log` | stats page reads dead memory tables |
| `notion-agent/trials` | `notion_agent_trials, v_notion_agent_reliability` | |
| `pipeline/unified` | `opportunity_stage_history` | |
| `receipts/achievements`, `receipts/score` | `receipt_gamification_stats` | gamification dead |
| `subscriptions/alerts` | `subscription_alerts` | (the `subscriptions` table itself is live — see Cat 3) |
| `team` | `seasonal_demand` | |
| `webhooks/stripe` | `revenue_stream_entries` | is Stripe even wired? |
| `finance/tax`, `projects/[code]/financials`, `revenue-streams` | `donations` | ⚠️ partial — these routes are otherwise live; **fix** the donations ref, don't archive the route |
| `strategy` | `grant_financial_tracking` | ⚠️ `/strategy` is the best exec-view candidate (per trust-map) — fix, don't archive |
| `finance/projects/[code]` | `financial_variance_notes` | ⚠️ this is the GOOD finance route — fix the one dead ref, don't archive |

## Category 2 — Fix / remove dead-table ref in library code (not a page)
Library modules referencing dead tables. Remove the dead feature or wire the real table.

| File | Dead table | Likely action |
|---|---|---|
| `lib/events/reactor.ts` | `notification_rate_limits` | table never created — add it or drop the rate-limit guard |
| `lib/telegram/pending-action-state.ts` | `telegram_pending_actions` | confirm bot pending-action flow; create table or refactor |
| `lib/tools/finance.ts` | `communications`, `v_upcoming_renewals` | → `communications_history`; renewals view dead |
| `lib/tools/writing.ts`, `reports/monthly`, `reports/yearly` | `communications`, `contacts` | → `communications_history`, `ghl_contacts` |
| `lib/webhooks/gmail-push.ts` | `gmail_sync_state` | gmail push sync-state table missing |
| `communications/pending` | `agent_insights` | dead |

## Category 3 — Column drift in KEPT routes (rename to the real column)
Table is live; the query uses a stale column name. **Some are 1:1 renames; some need intent.**

**Unambiguous renames (safe to batch):**
- `xero_transactions.amount` → `total` (`lib/tools/finance.ts`, `lib/telegram/notifications.ts`)
- `communications_history.communication_date` → `occurred_at` (`lib/tools/actions.ts`, `lib/telegram/notifications.ts`)
- `daily_reflections.date` → `reflection_date` (`lib/tools/writing.ts`)
- `agent_audit_log.{agent_name,created_at}` → `{agent_id, timestamp}` (`agents/route.ts`)
- `project_summaries.summary` → `summary_text` (`notion-agent/health`)
- `contact_project_links.ghl_contact_id` → `entity_id` (`intelligence/actions`)

**Need intent (no clean 1:1 — verify before editing, don't guess):**
- `xero_transactions.{description,account_code,account_name}` (harvest ×2, tax/export, projects financials) — no such columns; data lives in `line_items` JSON or must be dropped. **`/harvest` is live + just shipped — highest priority.**
- `subscriptions.{vendor,name,amount_aud,status,renewal_date,value_rating}` → `{vendor_name, ?, amount, review_status, next_billing_date, ?}` (`lib/tools/finance.ts`, `lib/tools/writing.ts`)
- `project_budgets.{fy,annual_budget,annual_revenue_target,ytd_budget}` → has `fy_year, budget_amount, budget_type` only (`finance/overview`, `finance/projects`)
- `ghl_opportunities.{close_date,pipeline_stage,contact_name,contact_id}` → `{actual_close?, stage_name, (join), ghl_contact_id}` (×5 routes)
- `communications_history.{received_at,ai_summary}` → `{occurred_at, summary}` (`briefing/morning`, `lib/tools/core.ts`)
- `grant_opportunities.{title,funder_name,close_date}` → `{name, provider, closes_at}` (`grantscope/intelligence`, `weekly-review`)
- `opportunities_unified.deadline` → `expected_close` (`strategy`)
- `foundations.annual_giving_total` → `total_giving_annual` (`pipeline/search`)
- `relationship_health.last_touchpoint_date` → `last_contact_at` (`relationships/touchpoints`)
- `calendar_events.summary` → `title` (`notion-agent/mission`)
- `receipt_matches.project_code` → no project_code col (`lib/tools/finance.ts`)
- `api_usage.*` (8 cols) → table fully repurposed (`action, response_ms, status_code`…) — `system/usage` needs a rewrite or archive

## How to burn down
1. Fix or archive a violation. 2. `pnpm schema:baseline` to regenerate (shrinks the count;
the report flags fixed entries as "prunable"). 3. When the baseline hits 0, delete it — the test
goes fully strict. CI gate: `.github/workflows/schema-contract.yml`.
