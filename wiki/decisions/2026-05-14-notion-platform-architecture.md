---
title: Notion platform architecture — read · ask · agent surface
slug: notion-platform-architecture-2026-05-14
status: active
date: 2026-05-14
tags: [decision, notion, integration, ai, agents, architecture]
audience: [Ben, Nic, Claude, Codex]
supersedes: partially [[notion-page-policy]]
related: [[notion-page-policy]], [[finance-4-surface-model]]
---

# Notion as the unified ask layer

## What changed (Notion, May 2026)

Notion shipped three platform features that change the question "where do we ask questions about our data":

1. **Workers** — server-side code that runs on Notion's infrastructure, polls external systems, and writes to Notion databases on a schedule. Free until 2026-08-11, then ~$0.86/month per 15-min poll.
2. **Agent SDK** — external AI tools (Claude, Codex, Cowork, ChatGPT) can call Notion AI as an MCP-style tool. Notion AI becomes a queryable index of your workspace.
3. **Agent API** — every agent (Notion AI, Claude, Codex) shows up in one Notion agent menu inside the workspace.

The shift: Notion was a display layer; it's now also a **query layer**.

## What we're deciding

Notion becomes the **unified read + ask interface** for the data that lives canonically in Supabase. External agents (Claude in CLI, Codex, Telegram bot, command-center) all converge on the same Notion index.

Supabase stays the source of truth. Notion becomes the lens.

## Architecture

```
   Supabase (truth)
       │
       │   Notion Worker (poll views every 15 min)
       ▼
   Notion: live mirror databases
       │
       │   Notion AI indexes everything
       ▼
   ┌──────────────────────────────────────────┐
   │  ONE PLACE TO ASK                        │
   │                                          │
   │  Ben in Notion:    "Goods funders silent │
   │                    90+ days?"            │
   │  Claude (CLI):     same question via SDK │
   │  Codex:            same question via SDK │
   │  Telegram bot:     same question via API │
   └──────────────────────────────────────────┘
```

## The five surfaces, restated

The [[finance-4-surface-model]] decision held that every use case maps to exactly one of four surfaces. This ADR adds a fifth — and tightens what each is for:

| # | Surface | What it's for | Where canonical data lives |
|---|---|---|---|
| 1 | **Notion (read + ask)** | Daily reading, planning, capture, decision logging, **and now asking questions of the data** | Supabase (mirrored via Workers) |
| 2 | **Command-center web** | Operate — tag, fix, reconcile, drill into a project | Supabase (direct) |
| 3 | **Scripts (`scripts/*.mjs`)** | Automate + admin (cron, on-demand ops) | Supabase (direct) |
| 4 | **Telegram bot** | Push — daily briefings, alerts, on-demand `/standup` | Supabase (direct) |
| 5 | **Claude / Codex CLI** | AI-assisted exploration, builds, ops | Supabase MCP **+** Notion AI via Agent SDK |

Notion is no longer just outbound; it has a queryable index. Claude/Codex are explicitly a fifth surface — what we use to build, debug, and ask deep questions of the system.

## Why this is the right shape

1. **Ben already lives in Notion.** Adding a query interface where he already reads doesn't fragment attention.
2. **All AIs converge on one place.** Whatever AI wins the next 12 months (Claude, GPT-5, Gemini, etc.) — they all speak MCP / Agent SDK. We don't pick a horse.
3. **The data stays canonical in Supabase.** Notion is a mirror, not a fork. Workers are read-only into Notion for these databases — preventing the "Notion is now another source of truth" trap.
4. **The 17 outbound `sync-*-to-notion` scripts can retire over time.** Workers are cleaner: server-side, no cron, observable in Notion's UI. Migration is incremental.
5. **Compliance + audit.** Notion AI answering "who can I email about Goods?" returns 116 contacts from `v_newsletter_audience` — which enforces consent + real email + not unsubscribed. Wrong-cohort sends become much harder.

## What this does NOT change

- **Supabase is still the truth.** Workers write Notion mirrors. Supabase is the source for those mirrors. Don't add a parallel truth layer in Notion.
- **GHL is still the operational CRM.** Tags fire workflows in GHL. We do not move automation logic into Notion.
- **Xero is still the finance ledger.** Workers mirror financial summaries into Notion; they do not write to Xero.
- **The capture pages stay bidirectional.** Money Sync (Q&A), meeting notes, action items, decisions log — those flow Notion → Supabase via existing scripts. [[notion-page-policy]] still applies for what's editable in Notion.

## Mono-repo home for Workers

ACT already has a deployed Notion Worker at **`packages/notion-workers/`** (workerId `019c9e89-3eee-7bad-9745-dfa1073f7fa0`) with 43 `worker.tool()` capabilities. New syncs extend the same worker rather than starting a new one — Notion runs each worker in its own sandbox, so a single worker happily hosts tools + syncs + databases + webhooks together.

```
packages/notion-workers/
  src/
    index.ts                  ← Worker instance + 43 tool registrations
    syncs/
      contacts.ts             ← Phase 1: v_canonical_contacts → Notion DB (this PR)
      money.ts                ← Phase 3: financial views (not yet)
      projects.ts             ← Phase 3: project health (not yet)
    webhooks/
      ghl-contact-updated.ts  ← Phase 2.5: real-time push (not yet)
  deploy.sh                   ← bundles via esbuild, deploys via ntn
  workers.json                ← workerId + workspace pinned
```

Each sync file exports a `register*Sync(worker)` function that owns its database, pacer, and sync handlers. `src/index.ts` adds one import + one call per sync. The 3,000-line tool catalogue stays untouched.

## Migration plan

### Phase 1 — Contacts (Week of 2026-05-19)

**Code shape** (per `https://developers.notion.com/workers/guides/syncs.md`):
- `worker.database("contacts", ...)` declares the Notion schema (auto-migrates on deploy)
- `worker.pacer("supabase", { allowedRequests: 30, intervalMs: 1000 })` budgets the Supabase REST calls
- `worker.sync("contactsBackfill", { mode: "replace", schedule: "manual" })` does the one-time historical load (mark-and-sweep — deletes Notion rows that disappeared from Supabase)
- `worker.sync("contactsDelta", { mode: "incremental", schedule: "15m" })` watermarks on `updated_at` and pulls only changed rows

**Steps:**
1. Code is in `packages/notion-workers/src/syncs/contacts.ts`; registered from `src/index.ts` (this PR).
2. Secrets already set on the live worker (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — no new credentials needed.
3. Build + deploy: `cd packages/notion-workers && ./deploy.sh` (bundles locally via esbuild, deploys to the existing `workerId 019c9e89-3eee-7bad-9745-dfa1073f7fa0`).
4. Verify schema migration: `ntn workers sync status` (the new `contacts` database is created on deploy).
5. Trigger one-time historical load: `ntn workers sync trigger contactsBackfill`.
6. Watch via `ntn workers` TUI for 24 hours.
7. Add `inbound-mirror` category to `wiki/decisions/notion-page-policy.md` once the sync is healthy.

**The `/sync` Claude skill** ships with the `ntn workers new` scaffold. When authoring or debugging the Worker, an agent (me) can invoke `/sync` to load the full SDK reference + CLI patterns into context. Use this for the actual build session.

**Column whitelist for the Contacts mirror** (cultural-sensitivity columns explicitly excluded):
- INCLUDED: full_name, email, phone, company_name, ghl_id, projects, tags, last_contact_date, newsletter_consent, is_storyteller, is_elder, empathy_ledger_id, canonical_entity_id, xero_contact_id, last_synced_at
- EXCLUDED: elder_consent, sacred_knowledge, sacred_knowledge_notes, cultural_nation_details, ocap_ownership, ocap_control, ocap_access, ocap_possession, detailed_consent_history, elder_review_notes
- This mirrors the BLOCKED_FIELDS_TO_GHL set in `scripts/sync-ghl-to-supabase.mjs`.

### Phase 2 — Wire Claude + Codex via Agent SDK (Week of 2026-05-26)
1. Register Notion AI as an MCP tool in `.claude/.mcp.json`.
2. Verify Claude (this CLI) can ask Notion AI a question and get an answer from the mirrored contact data.
3. Document the query patterns in `wiki/decisions/notion-agent-query-patterns.md`.

### Phase 2.5 — One webhook end-to-end (Week of 2026-05-30)
Test the real-time path before scaling to financial views: wire **one** GHL webhook → Notion Worker → contact upsert.

- `worker.webhook("ghlContactUpdated", { execute: async (events) => {...} })` declares the handler
- Deploy assigns a unique URL; configure it in GHL's webhook settings for the `ContactUpdate` event
- HMAC verification via `event.rawBody` + the signing secret stored as a Worker secret
- Verify: edit a contact in GHL → it reflects in the Notion mirror within seconds (vs. 15-min poll)

This proves the push-driven path works before we wire Xero events in Phase 3.

### Phase 3 — Mirror financial views (Week of 2026-06-02)
1. Workers for `v_money_status`, `v_cash_position`, `v_rd_pack_score`, `v_top_funders_by_amount`.
2. Notion AI answers "what's our runway?" from the same data the command-center cockpit shows.

### Phase 4 — Retire overlapping outbound syncs (June 2026)
1. Audit the 17 `sync-*-to-notion` scripts against what Workers now cover.
2. Migrate. Delete cron entries. Reduce maintenance surface.

## Cost

- Workers poll cost: ~$0.86 per 15-min poller per month. For 5 mirrors (contacts, money, cash, RD, funders) = ~$4.30/month. Negligible.
- Notion Business plan: already paid.
- Agent SDK: per Notion's announcement, no marginal cost for external agent calls into Notion AI.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Notion mirror drifts from Supabase truth | Worker has a `last_synced_at` column per row; daily reconcile script flags rows older than 6 hours |
| Notion AI hallucinates on edge cases | Answers must cite specific row IDs / counts; we add a "this came from Notion mirror, not Supabase direct" footer to AI responses in agent flows |
| Workers feature changes pricing post Aug 11 | Code is portable — we can replicate Workers as Vercel cron + Notion API if needed. No lock-in. |
| External agents can read sensitive data | Notion permission model is per-database. The `Contacts` mirror can be limited to Ben + Nic + service accounts. Cultural-sensitivity columns from `ghl_contacts` (elder_consent, sacred_knowledge) stay in Supabase, never mirrored. |
| 17 existing outbound syncs duplicate Worker output | Retire incrementally; don't both-write to the same Notion page from script + Worker. Each Notion DB has exactly one writer. |

## Decision checklist (before Phase 1 ships)

- [x] Confirm Notion Business plan has Workers (confirmed 2026-05-14)
- [x] Cultural-sensitivity column whitelist defined (see Phase 1 above)
- [ ] Scaffold `notion-workers/act-contacts/` (this PR)
- [ ] Run `npx ntn workers new .` in the scaffold dir to get the SDK bootstrap
- [ ] Set Worker secrets via `ntn workers env set` (not in `.env`, not in git)
- [ ] Deploy to staging Notion workspace first; smoke test 48 hours
- [ ] Document `inbound-mirror` page category in [[notion-page-policy]] after first successful deploy

## Sources

- Matthias Frihændig announcement thread (2026-05-13): Workers, Agent SDK, Agent API
- Notion Workers official docs (2026-05-14 read):
  - https://developers.notion.com/workers — overview
  - https://developers.notion.com/workers/guides/syncs.md — backfill+delta pattern
  - https://developers.notion.com/workers/guides/webhooks — push events into Workers
  - https://developers.notion.com/workers/guides/secrets.md — `ntn workers env set`
  - https://developers.notion.com/workers/get-started/quickstart.md — `@notionhq/workers` package + `ntn workers new`
- Anthony + Jimmy sync-functions walkthrough video (Notion, 2026-05-14)
- Existing [[notion-page-policy]] and [[finance-4-surface-model]] decisions
- This session's contact-system work — `thoughts/shared/audits/ghl-tag-alignment-2026-05-13.md`
