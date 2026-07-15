# Provenance: the-relationship-spine-2026-07-15.md

**Generated:** 2026-07-15, Claude Code session (same session as the-everyday-engine-2026-07-15.md).
**Method:** 8 parallel sweep agents + 1 architect agent (workflow run `wf_771fd23e-5c2`, 9/9 completed, 94 tool calls). Read-only throughout: no writes to GHL, Notion, Supabase, or any external system. Per-agent raw returns in session journal `subagents/workflows/wf_771fd23e-5c2/journal.jsonl`.

## Live probes performed (verified, this session)

| Finding | How verified |
|---|---|
| Supabase instance = tednluwflfhxyucgwigh | mcp claude.ai Supabase get_project_url (local supabase MCP was Unauthorized: SUPABASE_ACCESS_TOKEN missing) |
| ghl_contacts 4,908 rows max updated 2026-07-14; ghl_opportunities 1,093 max 2026-07-14 | live SELECT count + max(updated_at) |
| communications_history 29,124 rows, max created_at 2026-06-29 (halted); relationship_health max 2026-06-29 | live SELECT |
| newsletter_drafts: 1 row, status reviewed, sent_at NULL (2026-05-23); newsletter_subscriptions 15 rows max 2026-07-09 | live SELECT |
| storytellers 226 rows stale since 2026-04-15; people 83 rows since 2026-05-23; contact_intelligence dead since 2025-11-20 | live SELECT |
| Field surfaces last built 16 Jun 11:01; field-captures.jsonl 0 bytes; field-decisions.jsonl last entry 7 Jun; field-freshness.json written 15 Jun claiming stale_days 0 | ls -la + tail + cat on the files |
| field-surfaces cron defined in ecosystem.config.cjs (50 6 * * *) but absent from pm2 ls | config read + pm2 ls |
| Person pages: 845 files, sampled 3 frontmatter all updated 2026-06-06, mtimes 7 Jun, _overnight.log 4 Jun | ls -lT + file reads |
| Owes CSV not an input to build-field-surfaces.mjs | grep in script source |
| Telegram bot has no contact-create/capture tool (read tools + save_writing_draft only) | grep of agent-tools.ts |
| Field surfaces rebuilt fresh 2026-07-15 by this session | ran `node scripts/build-field-surfaces.mjs` manually (Tier 1); output: 6 latent / 12 cooling / 12 owed, tending board 66 read / 197 owed; Beeper overlay still on 2026-06-08 snapshot |

## Document sources (read by agents)

- GHL current/target: `wiki/decisions/2026-07-12-ghl-target-architecture.md` (live audit 2026-07-12 + D1-D3), `wiki/concepts/ghl-tag-namespaces.md`, `ghl-crm-taxonomy.md`, `ghl-crm-operating-model.md`, memory ghl-api-write-traps / lane-community-overapplication / ghl-money-alignment.
- Notion: `wiki/decisions/notion-page-policy.md`, `config/notion-database-ids.json`, `wiki/cockpit/notion-money-stack-audit-2026-07-14.md` (9 STALE relationship/money DBs, 44-70d).
- Field: `ecosystem.config.cjs:966-975`, `scripts/build-field-surfaces.mjs`, `build-morning-read.mjs`, `build-scope-board.mjs`, `/field` routes in apps/command-center.
- Person pages: `scripts/build-person-pages.mjs`, `thoughts/shared/people/maree-meredith.md` (full read), memory energy-orbit-system.
- Constellation: `wiki/concepts/energy-orbit.md`, `ecosystem-value-exchange.md`, `config/wiki-story-sync.json`, `el-contributor-constellation.csv`, 2026-05-28 story-back blocker handoff.
- Intake: memory website-forms-ghl-one-account / newsletter-consent-signup-path, `wiki/concepts/ghl-audience-comms-automation.md`, telegram agent-tools grep.
- CivicGraph: `grantscope/OPERATING_PLAN.md` (full), `docs/strategy/buyer-wedge.md`, leverage map iter 9, `build-funder-discernment.mjs`, `build-orbit-soil.mjs`, `backfill-ghl-civicgraph-links.mjs`, `lib/ghl.ts`, app route ls.

## Inferred (not confirmed)

- Comms-spine halt cause = dead credential from the 2026-06-29 incident remediation (date coincidence only).
- OPERATING_PLAN vs buyer-wedge reconciliation (internal engagement layer vs external product) is consistent with both docs and code layout but stated nowhere.
- Orbit-viz containing the tending board (no standalone artifact found).

## Known gaps

Carried into doc section 7: PM2 drop cause, captures-ledger truncation vs never-used, Notion archive semantics, EL fix progress, person_identity_map link freshness.
