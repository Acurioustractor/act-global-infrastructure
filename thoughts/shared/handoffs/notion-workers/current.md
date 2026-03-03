---
date: 2026-02-28T08:35:00Z
session_name: notion-workers
branch: main
status: active
---

# Work Stream: notion-workers

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-03-03T14:00:00Z
**Goal:** Full ACT Intelligence System — all 4 phases deployed. 21 Notion Worker tools live. Subscription management + Dext receipt forwarding automated.
**Branch:** main
**Test:** `cd packages/notion-workers && npx tsc --noEmit && cd ../../apps/command-center && npx tsc --noEmit`

### Now
[->] Commit code changes (forward-receipts-to-dext.mjs, ecosystem.config.cjs, migration) + subscription migration to accounts@act.place

### This Session
- [x] Built `scripts/forward-receipts-to-dext.mjs` — Gmail API receipt forwarding to Dext (nicmarchesi@dext.cc)
- [x] Created `dext_forwarded_emails` tracking table + migration (deduplication by gmail_message_id)
- [x] Added `dext-receipt-forward` PM2 cron (every 6h, --days 3) to ecosystem.config.cjs
- [x] Smart receipt filter (`isLikelyReceipt()`) — rejects marketing/promo emails, checks subject + from patterns
- [x] 33 vendor domain patterns across all 4 mailboxes (including subdomains: email.openai.com, mail.perplexity.ai, etc.)
- [x] Successfully forwarded 45 receipts to Dext across 3 test runs, dedup confirmed working
- [x] Integration health: `dext_receipt_forwarding` registered and showing "healthy"
- [x] Full subscription audit: cross-referenced subscriptions table with Xero bank transactions
- [x] Cancelled ~18 dead subscriptions (AHM, Amazon Prime, ChatGPT, Descript x2, MetLife, Midjourney, Cursor AI, etc.)
- [x] Added 9 missing subscriptions from Xero bank data (Canva, Figma, Obsidian, Starlink, Telstra, X/Twitter, Zapier, Easel, Landingfolio)
- [x] Set `current_login_email` for verified subscriptions (only @act.place mailboxes — cannot verify personal emails)
- [x] Set `account_email = accounts@act.place` as migration target for all subscriptions
- [x] Updated amounts: Claude Pro $287.07 (was $160), Supabase $126.22 (was $85)
- [x] Identified $178/mo waste: CodeGuide ($41), LinkedIn ($75), X/Twitter ($62) still charging despite being "cancelled"

### Next
- [ ] **Commit all code changes** — forward-receipts-to-dext.mjs, ecosystem.config.cjs, migration SQL
- [ ] **Cancel CodeGuide, LinkedIn Singapore, X/Twitter** — still charging $178/mo, find which email/account
- [ ] **Migrate ~20 subscriptions to accounts@act.place** — all have target set in DB
- [ ] **Resolve duplicate records** — Dialpad, HighLevel, Webflow, Mighty Networks may be dupes or separate accounts
- [ ] **Verify Webflow's 10 charges** — are all site plans needed?
- [ ] Create remaining 4 Custom Agents in Notion (Finance, Grants, Project Intel, Comms)
- [ ] Give Morning Briefing agent edit access to Morning Briefings page
- [ ] Phase 2b: Gmail push via GCP Pub/Sub (requires GCP console setup)
- [ ] Drop ~50 dead DB tables (cleanup migration)
- [ ] Push commits to remote

### Decisions
- **Package location:** `packages/notion-workers/` (mono-repo workspace pattern)
- **SDK version:** `@notionhq/workers@>=0.0.0` (tracks latest, aligned with template)
- **Schema pattern:** All properties required, optional fields use `anyOf: [{type: "string"}, {type: "null"}]` — SDK enforces this
- **Architecture:** Workers share same Supabase as Telegram bot + Command Center (3rd interface, no data duplication)
- **Secrets:** Only SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY needed (read-only tools, Wave 1)
- **Worker tool pattern:** `worker.tool(name, { title, description, schema, execute })` with `getSupabase()` helper
- **tsconfig:** module=nodenext, moduleResolution=nodenext, target=ES2020 (matches official template)
- **ntn CLI auth workaround:** Pass NOTION_API_TOKEN via env var (read from auth.json) — keychain read is broken
- **PostgREST .catch():** Not valid on builder chain — use try/catch instead
- **Revenue scenarios:** 3 models (conservative 5% attrition, moderate 10% growth, aggressive 25% + new streams)
- **Unified pipeline stages:** identified → researching → pursuing → submitted → negotiating → approved → realized → lost → expired
- **Vercel deploy:** Must run from `apps/command-center/` dir (not repo root — that deploys 1GB)
- **PM2 ops on Vercel:** Sync PM2 status to Supabase via cron (`sync-pm2-status.mjs` every minute), API reads from DB
- **Composite health score:** 25% connectors + 25% data freshness + 50% cron uptime
- **Cron autorestart:false:** Cron scripts run and exit — "stopped" is normal, not an error
- **Custom Agent pattern:** 1 worker (all 21 tools), split at agent level with instructions guiding tool usage
- **5 Custom Agents:** Morning Briefing (scheduled), Finance, Grants, Project Intel, Comms (all chat-triggered)
- **Health script v2.0:** `compute-project-health.mjs --apply` (v2.0.0) is canonical — old v1.0 creates ghost codes
- **Xero auth:** OAuth PKCE flow via `scripts/xero-auth.mjs` — refresh tokens expire, need periodic re-auth
- **LLM scripts use Claude:** financial_variance_notes + extract_impact_metrics use Anthropic, NOT OpenAI
- **Dext forwarding:** RFC822 MIME wrapping (original email as attachment), not inline forward
- **Gmail from: search:** Doesn't match subdomains — `from:openai.com` won't find `email.openai.com`. Must list each subdomain.
- **Subscription emails:** Can only verify @act.place mailboxes via Gmail API. Personal emails (ben@benjamink.com.au) must be manually confirmed by user.
- **Subscription migration target:** All subscriptions → accounts@act.place (centralised billing)

### Open Questions
- RESOLVED: Custom Agents feature — working, ACTbot visible in agent settings with all 21 tools
- RESOLVED: Morning Briefing agent — working, tested, producing quality output with real data
- RESOLVED: Dext receipt forwarding — 45 receipts forwarded, dedup working, integration health "healthy"
- UNCONFIRMED: Worker execution timeout limits? (may affect daily briefing which makes 5+ Supabase queries)
- UNCONFIRMED: ntn keychain bug — need to report to Kenneth
- UNCONFIRMED: Which email account has CodeGuide, LinkedIn Singapore, X/Twitter logins (for cancellation)
- UNCONFIRMED: Easel Software $312.71 — one-off or recurring?
- UNCONFIRMED: Starlink, Landingfolio, Only Domains — no @act.place emails found, which personal email?

### Workflow State
pattern: incremental-deployment
phase: 6
total_phases: 6
retries: 0
max_retries: 3

#### Resolved
- goal: "Full ACT Intelligence System across all interfaces"
- resource_allocation: balanced
- intelligence_phases: all 4 code-complete, deployed, PM2 running
- pm2_ops_visibility: deployed (Supabase-backed, works on Vercel)
- tier1_crons: re-enabled and verified
- live_alerts_db: created in Notion
- notion_workers_deployed: 21 tools live, verified from CLI + Notion agent
- custom_agents_enabled: yes, ACTbot visible in workspace
- dext_receipt_forwarding: working, 45 receipts forwarded, PM2 cron configured
- subscription_audit: 18 cancelled, 9 added, amounts corrected

#### Unknowns
- worker_timeout_limits: UNKNOWN
- gmail_push_pubsub_setup: UNKNOWN (requires GCP console)
- openai_quota_restoration: UNKNOWN (blocks 22 scripts)
- codeguide_linkedin_xtwitter_cancellation: UNKNOWN (which account/email)

#### Last Failure
(none)

### Checkpoints
**Agent:** (manual — user-driven deployment)
**Task:** ACT Intelligence System — hardening, Notion Workers, subscription management
**Started:** 2026-02-28T06:00:00Z
**Last Updated:** 2026-03-03T14:00:00Z

#### Phase Status
- Phase 1 (Project Intelligence Hub): ✓ DEPLOYED
- Phase 2 (Financial Clarity): ✓ DEPLOYED
- Phase 3 (Unified Pipeline): ✓ DEPLOYED
- Phase 4 (Agent Intelligence): ✓ DEPLOYED
- PM2 Ops Visibility: ✓ DEPLOYED
- Cron Health Recovery: ✓ DONE
- Live Alerts DB: ✓ CREATED
- Notion Workers Deploy: ✓ DEPLOYED (21 tools live)
- Dext Receipt Forwarding: ✓ DEPLOYED (45 receipts forwarded, PM2 cron every 6h)
- Subscription Audit: ✓ DONE (18 cancelled, 9 added, amounts corrected, migration targets set)
- Subscription Migration: → IN_PROGRESS (targets set, actual migration pending)

#### Validation State
```json
{
  "test_count": 21,
  "tests_passing": 21,
  "files_modified": [
    "scripts/forward-receipts-to-dext.mjs",
    "supabase/migrations/20260303_dext_forwarded_emails.sql",
    "ecosystem.config.cjs"
  ],
  "last_test_command": "cd apps/command-center && npx tsc --noEmit",
  "last_test_exit_code": 0
}
```

#### Resume Context
- Current focus: Dext forwarding working. Subscription audit complete. Need to commit code + cancel 3 still-charging subs.
- Next action: Commit forward-receipts-to-dext.mjs + ecosystem.config.cjs + migration. Then cancel CodeGuide/LinkedIn/X.
- Blockers: Need user to confirm which email accounts have CodeGuide, LinkedIn, X/Twitter logins

### Subscription State (Mar 3 2026)
- **Active count:** ~35 subscriptions across 4+ email accounts
- **Monthly spend:** ~$3,500-4,000/mo (estimated from Xero bank data)
- **Still charging but "cancelled":** CodeGuide $41, LinkedIn $75, X/Twitter $62 = **$178/mo waste**
- **Migration target:** All → accounts@act.place (centralised billing)
- **Key personal email subs:** Anthropic, Claude Pro, Webflow, Xero on ben@benjamink.com.au
- **Dext billing:** Goes to nicholas@act.place (not benjamin@)
- **Duplicate records to resolve:** Dialpad, HighLevel (2 accounts), Webflow (10 charges), Mighty Networks

### Ecosystem Audit Findings (Mar 1 2026)
- **API Routes:** 171/173 real (2 stubs: `/api/ai/proposals`, `/api/ai/learning`)
- **Pages:** 55 total, ~38 in nav, most functional
- **Agentic:** Telegram bot (30 tools) is production. Agent proposals system is empty theatre (nothing creates proposals). Agent learning has no data.
- **PM2 Crons:** Were 1/49 running at audit time. Tier 1 now re-enabled (9 scripts).
- **Data Model:** ~50 dead tables (26% of schema). Duplicate migrations exist.
- **OpenAI:** Quota exceeded — blocks 22 scripts (embeddings, TTS, variance notes)

---

## Context

### What This Is
ACT Intelligence System — 4-phase build delivering project intelligence, financial clarity, unified opportunity pipeline, and agent automation. Built on 130+ Supabase tables, surfaced through Command Center (Next.js), Telegram bot, and 21 Notion Worker tools.

### Architecture
```
Telegram Bot  → Claude → Agent Tools → Supabase  (mobile)
Command Center → Next.js API routes → Supabase   (dashboard)
Notion Workers → Worker functions → Supabase      (workspace)

Intelligence Layers:
  Phase 1: project_intelligence_snapshots, project_focus_areas, v_project_activity_stream
  Phase 2: project_monthly_financials, financial_variance_notes, v_cashflow_explained
  Phase 3: opportunities_unified (484), revenue_scenarios (3), revenue_stream_projections
  Phase 4: impact_metrics, knowledge_links, email_response_templates, project_knowledge.public
```

### Key Files
- `packages/notion-workers/src/index.ts` — 21 Worker tools
- `apps/command-center/src/app/finance/revenue-planning/page.tsx` — 10-year scenario planning
- `apps/command-center/src/app/finance/projects/[code]/page.tsx` — Project P&L
- `apps/command-center/src/app/knowledge/public/page.tsx` — Public knowledge base
- `scripts/calculate-project-monthly-financials.mjs` — Monthly P&L calculation
- `scripts/generate-financial-variance-notes.mjs` — LLM variance explanations
- `scripts/migrate-opportunities-to-unified-pipeline.mjs` — One-time pipeline migration
- `scripts/build-revenue-scenarios.mjs` — 3 revenue scenario models
- `scripts/sync-opportunities-to-unified-pipeline.mjs` — Daily pipeline sync
- `scripts/extract-impact-metrics.mjs` — Weekly LLM impact extraction
- `scripts/auto-link-knowledge.mjs` — Daily knowledge cross-linking

### 21 Notion Worker Tools
1. `check_grant_deadlines` — Grant deadlines + milestone progress
2. `get_daily_briefing` — Morning digest (overdue, follow-ups, decisions, alerts)
3. `lookup_contact` — Relationship intelligence for any contact
4. `get_project_health` — Project health scores and activity
5. `get_financial_summary` — Spend by project, pipeline totals
6. `get_unanswered_emails` — Emails waiting for our response
7. `get_attention_items` — Projects flagged as needing attention
8. `get_funding_pipeline` — Discovered funding opportunities
9. `get_cashflow` — Monthly cash flow summary
10. `get_outstanding_invoices` — Unpaid invoices / AR
11. `get_data_freshness` — Sync status + staleness per integration
12. `triage_emails` — Prioritized email triage (key contacts → recent → backlog)
13. `get_grant_readiness` — Grant readiness checklist (ready vs gaps)
14. `get_project_intelligence` — Full project snapshot (financials, activity, focus, relationships)
15. `explain_cashflow` — Monthly cash flow with variance explanations
16. `get_project_pnl` — Monthly P&L for specific project with trends
17. `get_pipeline_value` — Weighted pipeline value by type/stage
18. `get_revenue_forecast` — 10-year scenario projections
19. `suggest_transaction_fixes` — Unmapped transactions, duplicates, anomalies
20. `get_impact_summary` — Aggregated impact metrics across projects
21. `search_knowledge_graph` — Knowledge search with related links

### Deploy Commands (for resume)
```bash
cd ~/Code/act-global-infrastructure/packages/notion-workers
ntn login
ntn workers env set SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL ../../.env.local | cut -d= -f2-)
ntn workers env set SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY ../../.env.local | cut -d= -f2-)
ntn workers deploy
ntn workers exec get_data_freshness '{"integration": null}'
```

### SDK Quirks
1. All schema properties MUST be in `required` array — SDK validates at registration
2. Optional fields use `anyOf: [{type: "string"}, {type: "null"}]` pattern
3. Execute function receives `(input, context)` where context has `context.notion`
4. SDK is `@notionhq/workers@0.0.85` (alpha, expect breaking changes)
5. CLI is `ntn` (Rust binary, v0.1.35)
6. Use `worker.tool(name, { title, description, schema, execute })` — NOT `worker.addTool()`
7. Use `getSupabase()` — NOT `getClient()`
8. PostgREST builders don't support `.catch()` — use try/catch instead
