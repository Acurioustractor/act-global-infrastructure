# ACT Field Desk — infrastructure alignment report

*2026-07-15. Maps act-global-infrastructure to the Field Desk model (Today / Listen / Curiosity / Action / Money / Sources) built in GrantScope. Method: 5 inspection agents over the GrantScope service contracts, this repo's API surface, the scripts/lib layer, observability, and env/secrets (workflow wf_fc84a6ba-f3d), combined with this session's live-verified state (131-cron triage wf_0eaddb07-e1d, live Supabase probes, PM2 fleet revival). Verified = file read or state queried this session. Inferred = mapped from names/conventions and marked as such.*

## 0. The load-bearing fact

**GrantScope's Field Desk and this repo run on the SAME Supabase instance** (`tednluwflfhxyucgwigh`; verified in GrantScope's `apps/web/.env.local`). There is no integration boundary to build. The alignment contract is **which pipeline populates which table**:

- This repo populates: `xero_invoices`, `xero_transactions`, `ghl_contacts`, `ghl_opportunities`, `communications_history`, `relationship_health`, `sync_status`, `pm2_cron_status`, `project_knowledge`, receipts tables.
- GrantScope populates: `foundations` + `foundation_*`, `gs_entities`, `person_roles`, `contact_entity_links`, `org_*` tables, `opportunity_context_events`, `agent_runs`, `funder_context_snapshot`.
- Both sides read across freely. The Field Desk frontend also depends on the `exec_sql` read-only RPC and the `pg_trgm` extension (board-bridge similarity SQL) — DB-level contract items this repo's migrations must never break.

## 1. Verified current infrastructure, by Field Desk area

Full item-level registry: `docs/architecture/field-desk-map.md` (created with this report). Summary:

### Today — what needs moving now
- **Jobs (PM2):** `field-surfaces` (6:50am: morning read ≤7 actions), `daily-briefing`, `daily-priorities`, `monday-morning-chain` (5:30-9:10 orchestrator, failure-isolated steps, one Telegram summary), `telegram-queue-drain` (6:35), `telegram-daily-focus` + `drain` (registered today / in plan). VERIFIED.
- **APIs:** `field/surface` (GET surfaces, POST capture), `briefing/morning`, `finance/today-actions` (untagged txns, receipts ready, overdue AR counts), `intelligence/actions` (ranked action feed with votes). VERIFIED.
- **GrantScope contract:** daily actions persist as `opportunity_context_events` rows (`signal_kind=daily_action`, `source_ref=YYYY-MM-DD:id`, `metadata.status` done|waiting|tomorrow, 21-day deferral memory). GrantScope writes these via its own `/api/org/*/daily-actions`; this repo does not need to.
- **Honest note:** "Today" exists here as four parallel surfaces (field morning read, briefing/morning, finance/today-actions, intelligence/actions) with no single owner.

### Listen — relationships, people, funders, resolution, history
- **Ingest:** 5 website codebases → one GHL account (consent stamped in code); `webhooks/ghl` (secret-check → mirror upsert, strips culturally blocked fields); `gmail-sync` 4 mailboxes → `communications_history` (revived + backfilled today, 1,180 rows); `calendar-sync`; Beeper metadata vibe-pass (manual promotion only). VERIFIED.
- **Derive:** `contact-signals`, `relationship-health` (recomputed live today), `supporter-comms`, `engagement-status`, `contact-reconciliation` (has a `--create-contacts` live-GHL path — batch C), person pages (844, qwen night shift, no cron), field-warmth v2 (`lib/field-warmth.mjs`: ring human-only, community lane never laddered). VERIFIED.
- **APIs:** `contacts/[id]` (detail + engagement stats, PATCH→GHL), `contacts/search`, `supporters` (tier + $ + last touch + needs-reply), `relationships/*` (attention/touchpoints/health/nudges), `finance/funders` (warmth-ranked, GHL-vs-Xero drift verdicts). VERIFIED.
- **Guard:** `lib/ghl-api-service.mjs` (all GHL writes), `lib/cultural-guard.mjs`, the EL↔GHL boundary (storytellers never pushed, PR #116).
- **GrantScope contract:** the relationship ledger aggregates `xero_invoices` (ACCREC+ACCPAY reciprocity states) + `org_contacts` + `ghl_contacts` + `opportunity_context_events` (conversations, contributions, follow-ups). This repo's Xero and GHL mirrors are its money+people substrate.

### Curiosity — discovery, research, triage
- **Jobs:** `discover-grants` (GrantScope discovery + scoring vs 26 projects), `enrich-grants`, `grant-seed-weekly`, `sync-grantscope-matches` (GrantScope saved_grants → `opportunities_unified`), `notion-to-grantscope` (stage edits back). All currently unregistered (batch B/C of the revival plan). VERIFIED (scripts read; PM2 state verified).
- **Research creds:** Exa/Tavily/Perplexity/Firecrawl keys present. VERIFIED (names).
- **GrantScope contract:** `grant_opportunities`, `opportunity_decisions` (decision memory), `foundations` dossier stack, `gs_entities` board bridges. GrantScope populates most; this repo consumes matches.

### Action — committed pipeline, next moves
- **Jobs:** `pipeline-sync` (→ `opportunities_unified`), `project-pipelines`, `relationship-pipeline-populate` (cultivation kanban), `sync-grants-ghl` (two-way GHL Grants pipeline), GitHub project sync scripts, Webflow publishers, `agent-procurement-analyst` (L2: proposes, Ben sends). Mostly unregistered pending batch B/C. VERIFIED.
- **Structure:** GHL pipelines are the Action system of record; the 2026-07-12 ADR (13 pipelines → 4: Grants/Goods/Harvest/CONTAINED, quarantine ~2,000 noise contacts, per-project intake, ≥1-terminal-move-per-month rule) is the target state. Sweep tooling exists (`ghl-quarantine-sweep.mjs`, `ghl-taxonomy-migrate.mjs`). VERIFIED.
- **GrantScope contract:** `org_project_foundations` (stage/fit/next_touch_at), `org_pipeline`. GrantScope-populated.

### Money — invoices, payments, receivables, reciprocity, proof
- **Ingest:** `xero-sync` (6-hourly, registered, ↺105), `xero-payments-sync`, `webhooks/xero` (HMAC-verified event bus), Dext/receipt pipeline (`receipt-capture/match/upload`, `receipt-acquittal-daily` — stamps provenance jsonb on auto-links). VERIFIED.
- **Derive:** taggers with `lib/tagging-guard.mjs` (manual rows never overwritten), `monthly-financials`, `financial-snapshots`, TDD-pinned money libs (`two-account-cash-lib`, `rd-basis-lib`, `recon-status-lib`, `whole-picture-money-display-lib` with its stale-sidecar withhold gate). VERIFIED.
- **APIs:** ~70 finance routes (invoices verified; reconcile/runway/rd-*/tagging mapped by name only — INFERRED).
- **GrantScope contract:** the ledger's reciprocity math ("the orbit pays, the constellation is paid" made visible: awaiting_payment → mutual_flow → repeat_paid states) runs directly on `xero_invoices` as this repo populates it, including `fully_paid_date`, `project_code`, `line_items`.

### Sources — evidence health, freshness, provenance, failed syncs
- **Freshness:** `data-freshness-monitor` (daily, 9 tables, warn/critical → Telegram + `integration_events`), `lib/sync-status.mjs` → `sync_status` (~12 syncs adopted), field spine canary → `field-freshness.json` (+ error recording added on branch today), `finance/sync-freshness` API, `health/data-freshness` API. VERIFIED.
- **Job health:** `sync-pm2-status.mjs` (every minute → `pm2_cron_status` → `health/crons` route → dashboard) — the watchdog whose absence hid a 131-cron outage for 16 days; re-registered today. VERIFIED.
- **Drift:** `verify-ghl-mirror.mjs` (live-vs-mirror 2% tolerance, built after a 48% over-report) — was manual-only; **scheduled today** (safe change). VERIFIED.
- **Provenance:** `.provenance.md` sidecar convention + template; provenance jsonb on receipt links; `wiki/cockpit/` dated audits. VERIFIED.
- **Alerts:** Telegram works (quiet-hours queue + dedup). Discord is fully dead (naming inversion, see gaps). VERIFIED.
- **GrantScope contract:** its Sources cards read `gmail_sync_status`, `knowledge_source_sync`, `agent_runs`, plus MAX-timestamp checks over the mirrors this repo feeds.

### Execution model (cross-cutting)
PM2 cron one-shots (`autorestart:false` + `cron_restart`), no message queue; the only queue is the file-based Telegram quiet-hours queue. Retry lives in libs (`llm-client` backoff, `finance.retry`). No dead-letter convention; failure surfaces via `sync_status`, PM2 logs, and freshness gates. Agent runtime = `scripts/agents/` with bounded-autonomy levels (L1 suggest / L2 propose+approve / L3 autonomous-logged) and a four-part contract template. VERIFIED.

## 2. Gaps

**Ranked by how much Field Desk truth they cost:**

1. **`opportunity_context_events` writers unverified.** The Field Desk's spine table (Today actions, Listen conversations/contributions, Curiosity signals) assumes gmail and notion sweeps populate it. Nobody traced who writes it or whether those jobs run. If absent, three desk areas read empty. (INFERRED gap — verify first.)
2. **Silent-failure holes in the two most important mirrors:** `sync-xero-to-supabase.mjs` and `sync-ghl-to-supabase.mjs` record no `sync_status` (grep-verified), and no Xero table is in the freshness monitor's thresholds. The monitor checks recency, not success — a sync erroring on every row (the 699/699 gmail case, and this week's 1,449-fetched/0-inserted case) stays invisible until staleness trips.
3. **Discord alerting dead by naming inversion:** env has `DISCORD_ALERTS_WEBHOOK`; scripts read `DISCORD_WEBHOOK_ALERTS` (+6 more channel names, 9 refs). Every Discord alert since the rename fails soft. Receipt-notification alerts affected.
4. **Env name drift, same class as this week's BWS incident:** `EL_SUPABASE_SERVICE_ROLE_KEY` (22 script refs) vs `EL_SUPABASE_SERVICE_KEY` (what exists); `NOTION_API_KEY` vs `NOTION_TOKEN`; `GMAIL_PUBSUB_TOPIC` absent (real-time Gmail push off); duplicate `GOOGLE_CLIENT_ID/SECRET` lines (last-wins); `GOOGLE_SERVICE_ACCOUNT_KEY` exists ONLY in BWS while command-center code reads it from process.env. No doc defines BWS-vs-dotenv precedence (ENV_STRATEGY doc predates BWS adoption).
5. **PostgREST 1000-row cap inside the Field Desk money math:** GrantScope's relationship ledger reads `xero_invoices` with `.range(0,999)` — the exact truncation class that once read org cash at $590K of a real $975K. Flag upstream to GrantScope; this repo can also expose a counterparty rollup view so the desk never scans raw invoices.
6. **Monitoring blind spots:** verify-ghl-mirror was unscheduled (fixed today); Beeper pull failure is console-only; quiet-hours Telegram drain health unverified; `agent_runs` expects 5 named agent_ids nobody confirmed still run.
7. **Missing APIs needed by the frontend: none found.** The desk talks to the shared DB and its own GrantScope routes. What it needs from this repo is table population + the `exec_sql` RPC + `pg_trgm` staying intact (pg_trgm presence UNVERIFIED — check before relying on board bridges).
8. **Agents README/disk drift:** README lists 8 Goods agents, 5 exist, 1 exists that isn't in the README.

## 3. Recommended alignment

**Labels, not renames.** Deployed PM2 job names stay (renames would orphan dump/logs/status history). The Field Desk area becomes a mapping layer:
- `docs/architecture/field-desk-map.md` (created today) is the canonical job/API/table/lib → area registry.
- When touching `ecosystem.config.cjs` entries for other reasons, add a `// field-desk: <area>` line to the entry's comment; do not do a big-bang comment sweep.

**Service boundaries (name the five layers, they already exist):** Ingest (webhooks + sync-* jobs) → Mirror (Supabase tables) → Derive (intelligence/rollup jobs) → Surface (APIs, field HTML, Telegram) → Guard (write-path libs: ghl-api-service, xero-client, tagging-guard, field-warmth, cultural-guard). Every new job should say which layer and which area it serves, in its header.

**Job conventions:** keep PM2 one-shots (right scale, no queue needed). Adopt two rules: (1) every sync job calls `recordSyncStatus` — start with `sync-xero-to-supabase.mjs` and `sync-ghl-to-supabase.mjs`; (2) every sync compares attempted-vs-written counts and exits non-zero on 100% failure (the 0-inserted class must crash loudly, not print "[OK] Sync complete!").

**Monitoring:**
- Add `xero_invoices`/`xero_transactions` to `data-freshness-monitor` thresholds.
- Teach the monitor to read `sync_status.last_error` so job failure (not just table staleness) alerts.
- Consolidate alerting on Telegram (works, has quiet hours + dedup). Either fix Discord's 8 channel env names deliberately or retire `discord-notify.mjs`; do not leave it half-dead. Decision for Ben — both are one-hour jobs.
- The `pm2_cron_status` → `health/crons` loop is the right dashboard; add the ~131-vs-registered delta (config entries not in PM2) as a metric so a fleet drop can never hide again.

**Docs:** ENV strategy addendum (done today, see below); a future short ADR in `wiki/decisions/` naming the table-population contract between this repo and GrantScope (who owns which table, plus exec_sql/pg_trgm as protected interfaces).

## 4. Safe changes made (all local, reversible, no deploys touched)

1. **Created `docs/architecture/field-desk-map.md`** — the durable area registry (labels/docs layer).
2. **Created this report** at `thoughts/shared/analysis/field-desk-infra-alignment-2026-07-15.md`.
3. **Scheduled `verify-ghl-mirror`** — added the ecosystem.config.cjs entry (daily 7:05am, its own header says "wire into cron") and registered it in PM2 (`pm2 save`). Read-only against GHL; failures land in `pm2_cron_status` and the health dashboard.
4. **ENV strategy addendum** appended to `deployment/docs/ENV_STRATEGY_ACT_ECOSYSTEM.md`: BWS-vs-dotenv precedence reality, the 2026-07-15 stale-BWS incident, and the known name-drift list.
5. **Not done on purpose:** no Discord env aliases (would resurrect a weeks-dead alert channel unsupervised), no sync_status code edits to live money/CRM sync scripts (recommended as reviewed changes), no PM2 job renames, no secret changes beyond what Ben authorized earlier today.

## 5. Verification (run 2026-07-15, results actual)

- `node -e "require('./ecosystem.config.cjs')"` — PASS: config parses, 135 apps, verify-ghl-mirror entry present with cron `5 7 * * *`.
- `npx tsc --noEmit` in `apps/command-center` — PASS: exit 0 (no app code touched; baseline confirmed unaffected).
- verify-ghl-mirror registered in PM2 + `pm2 save`; its FIRST run found real drift: contacts live=3,277 vs mirror=3,345 (2.08%, over the 2% tolerance — 68 ghost rows, the known upsert-only ghost class); opportunities 0.00% clean. Action: covered by the GHL D1 quarantine/mirror work — do not trust mirror-derived contact segments until reconciled.
- UNVERIFIED and flagged: `pg_trgm` extension presence; `opportunity_context_events` writer jobs; live contents of `sync_status`/`gmail_sync_status`/`knowledge_source_sync`; the ~70 finance route bodies; Vercel-hosted env for command-center.

*Provenance: agent briefs in workflow journal wf_fc84a6ba-f3d; cron classifications from wf_0eaddb07-e1d; live-state facts from this session's Supabase probes and PM2 operations (see `thoughts/shared/plans/cron-fleet-revival-2026-07-15.md`).*
