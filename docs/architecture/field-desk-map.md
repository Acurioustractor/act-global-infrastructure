# Field Desk map — infrastructure registry

> Canonical mapping of this repo's jobs, APIs, tables, and libs to the ACT Field Desk areas
> (Today / Listen / Curiosity / Action / Money / Sources) as built in GrantScope
> (`apps/web/src/app/org/[slug]`). Labels only — deployed names are never renamed to match.
> Full analysis: `thoughts/shared/analysis/field-desk-infra-alignment-2026-07-15.md`.
> One DB: GrantScope's desk reads the same Supabase (`tednluwflfhxyucgwigh`) these pipelines populate.

Layers: **Ingest** (webhooks + syncs) → **Mirror** (tables) → **Derive** (rollups/intelligence) → **Surface** (APIs, HTML, Telegram) → **Guard** (write-path libs).

## Today — what needs moving now

| Item | Layer | What |
|---|---|---|
| PM2 `field-surfaces` (6:50am) | Derive/Surface | Morning read ≤7 actions, scope board, tending board |
| PM2 `daily-briefing`, `daily-priorities` | Derive | Local morning digest; ranked sprint_suggestions |
| PM2 `monday-morning-chain` (Mon 5:30) | Derive | Weekly sequence orchestrator, failure-isolated, one Telegram summary |
| PM2 `telegram-queue-drain` (6:35), `telegram-daily-focus` | Surface | Quiet-hours queue drain; phone-first morning push |
| API `field/surface`, `briefing/morning`, `finance/today-actions`, `intelligence/actions` | Surface | Surfaces + capture POST; briefing; money action counts; ranked action feed |
| Table `opportunity_context_events` (`signal_kind=daily_action`) | Mirror | Desk daily-action state + 21-day deferral memory (GrantScope-written) |

## Listen — relationships, people, funders, resolution, history

| Item | Layer | What |
|---|---|---|
| 5 site codebases → GHL `agzsSZWgovjwgpcoASWG` | Ingest | Form capture, consent stamped in code |
| API `webhooks/ghl` | Ingest | Event → mirror upsert, culturally blocked fields stripped |
| PM2 `gmail-sync` (4am), `calendar-sync` | Ingest | 4 mailboxes → `communications_history`; calendar → events |
| Tables `ghl_contacts`, `ghl_opportunities`, `communications_history`, `org_contacts` | Mirror | People, opps, 29K-message spine |
| PM2 `contact-signals`, `relationship-health`, `supporter-comms`, `engagement-status` | Derive | Temperature/trends → `relationship_health`; domain rollups; status promotion |
| PM2 `contact-reconciliation` | Derive | Comms→contact linking (`--create-contacts` = live GHL write; batch C) |
| Person pages `thoughts/shared/people/` + `build-person-pages.mjs` | Derive | 844 layered dossiers (no cron; night-shift manual) |
| API `contacts/[id]`, `contacts/search`, `supporters`, `relationships/*`, `finance/funders` | Surface | Detail+PATCH→GHL; unified supporter view; attention/touchpoints; funder warmth+drift |
| Lib `ghl-api-service.mjs`, `field-warmth.mjs`, `cultural-guard.mjs` | Guard | All GHL writes; ring human-only + community lane never laddered; sacred-content filter |
| Ledgers `field-decisions.jsonl`, `field-captures.jsonl` | Mirror | Ben's ring reads + live captures (system of record for tending) |
| EL boundary (PR #116) | Guard | Storytellers never pushed to GHL; owes ledger `el-contributor-constellation.csv` |

## Curiosity — discovery, research, triage

| Item | Layer | What |
|---|---|---|
| PM2 `discover-grants`, `enrich-grants`, `grant-seed-weekly` | Ingest/Derive | GrantScope discovery vs 26 projects; LLM readiness; top-5 weekly seeds |
| PM2 `sync-grantscope-matches`, `notion-to-grantscope` | Ingest | saved_grants → `opportunities_unified`; Notion stage edits back |
| Tables `grant_opportunities`, `opportunity_decisions`, `foundations`+`foundation_*`, `gs_entities`, `contact_entity_links`, `funder_context_snapshot` | Mirror | Grants; decision memory; funder dossiers; entity graph (GrantScope-populated) |
| Env Exa/Tavily/Perplexity/Firecrawl | — | Research providers |

## Action — committed pipeline, next moves

| Item | Layer | What |
|---|---|---|
| GHL pipelines (target 4: Grants/Goods/Harvest/CONTAINED) | Mirror | System of record for stage; ADR `wiki/decisions/2026-07-12-ghl-target-architecture.md` |
| PM2 `pipeline-sync`, `project-pipelines`, `relationship-pipeline-populate` | Derive | `opportunities_unified`; project rollups; cultivation kanban |
| PM2 `sync-grants-ghl`, `enrich-grants-ghl`, `grant-seed-weekly` | Ingest | Two-way GHL Grants pipeline (batch C: wait for D1-D3 migration) |
| Agents `agent-procurement-analyst` (L2) | Derive | Weekly top-3 buyer touches, proposes only |
| GitHub project sync, Webflow publishers | Surface | Cross-repo work + site publishing |
| Tables `org_project_foundations`, `org_pipeline` | Mirror | Desk portfolio + pipeline (GrantScope-populated) |

## Money — invoices, payments, receivables, reciprocity, proof

| Item | Layer | What |
|---|---|---|
| PM2 `xero-sync` (6-hourly), `xero-payments-sync` | Ingest | Xero → `xero_invoices`/`xero_transactions`/`xero_payments` mirrors |
| API `webhooks/xero` | Ingest | HMAC-verified event bus (IDs only; refetch) |
| Receipt pipeline: `receipt-capture/match/upload`, `receipt-acquittal-daily` | Ingest/Derive | Mailbox receipt hunt; AI match; Xero attach; provenance-stamped auto-links |
| Taggers + `lib/tagging-guard.mjs` | Derive/Guard | project_code assignment; manual rows never overwritten |
| Money libs (TDD-pinned): `two-account-cash-lib`, `rd-basis-lib`, `recon-status-lib`, `whole-picture-money-display-lib` | Guard | Pinned money math; stale-sidecar withhold gate |
| ~70 `finance/*` API routes | Surface | Invoices, reconcile, runway, R&D, tagging (most mapped by name only) |
| Lib `finance/xero-client.mjs` | Guard | ALL Xero API access: token refresh (rotates single-use refresh token — never cron casually), rate limit |
| Desk contract: reciprocity states on `xero_invoices` | Mirror | awaiting_payment → mutual_flow → repeat_paid; `fully_paid_date`/`project_code`/`line_items` load-bearing |

## Sources — evidence health, freshness, provenance, failed syncs

| Item | Layer | What |
|---|---|---|
| PM2 `data-freshness` (6am) | Derive | 9-table staleness + embeddings; Telegram + `integration_events` on critical |
| Lib `sync-status.mjs` → table `sync_status` | Mirror | Per-sync last_success/error/count (~12 syncs adopted; xero+ghl syncs NOT yet) |
| PM2 `pm2-status-sync` (every min) → `pm2_cron_status` → API `health/crons` | Surface | Job health to the dashboard; the fleet-drop watchdog |
| PM2 `verify-ghl-mirror` (7:05am, added 2026-07-15) | Derive | Live-GHL vs mirror drift, 2% tolerance, exit 1 |
| Spine canary in `build-field-surfaces.mjs` → `field-freshness.json` | Derive | Gmail-ingest staleness + error recording; morning-read banner |
| APIs `health/data-freshness`, `finance/sync-freshness` | Surface | Threshold checks; "Xero data as of" |
| Alerts: `lib/telegram.mjs` (+dedup, quiet hours) | Surface | WORKING channel. `discord-notify.mjs` = dead (env naming inversion) |
| Provenance: `.provenance.md` sidecars, provenance jsonb on receipt links, `wiki/cockpit/` audits | Mirror | Evidence trail conventions |
| Desk contract tables: `gmail_sync_status`, `knowledge_source_sync`, `agent_runs` | Mirror | Desk Sources cards read these |

## Cross-cutting

| Item | What |
|---|---|
| `ecosystem.config.cjs` | PM2 registry (~150 entries; ~40 registered as of 2026-07-15 — see `thoughts/shared/plans/cron-fleet-revival-2026-07-15.md`) |
| `lib/load-env.mjs` | Canonical dotenv loader (`override:true`) |
| BWS (`getSecret` family, 37 scripts) | Secrets-manager-first, env fallback — precedence doc: `deployment/docs/ENV_STRATEGY_ACT_ECOSYSTEM.md` addendum 2026-07-15 |
| `scripts/agents/` runtime | Bounded autonomy L1 suggest / L2 propose+approve / L3 autonomous-logged; four-part contract template |
| DB interfaces the desk depends on | `exec_sql` read-only RPC; `pg_trgm` extension — protect in migrations |
