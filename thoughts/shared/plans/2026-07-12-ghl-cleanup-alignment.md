# GHL Cleanup & Alignment Plan — 2026-07-12

**Source:** Live audit via HighLevel MCP (`/mcp/anthropic/v2`, location `agzsSZWgovjwgpcoASWG`) + Supabase mirror (`tednluwflfhxyucgwigh`), 12 Jul 2026.
**Prime directive:** nothing in this plan may break a live list, workflow, or pipeline. Every phase is additive-first; destructive steps come last and only after re-keying.

## Audit findings (live, 12 Jul 2026)

| Surface | Live | Mirror | Drift |
|---|---|---|---|
| Contacts | **3,280** | 4,861 (synced 12 Jul) | mirror +48% — deletions/merges never propagated (mirror shows 0 deleted) |
| Opportunities | **555** | 1,005 (synced **29 Jun** — stale) | mirror +81% — opp sync not running since cron trim |
| Pipelines | 13 | — | config references "CONTAINED: Partners & Funders"; live has "CONTAINED Engagement" |
| Tags | ~380 | — | flat + canonical coexist (`goods-newsletter` 118 vs `comms:goods-newsletter` 183 in mirror) |
| Custom fields | 63 | — | consent field IDs verified ✓ (`aVnqmajnysMtGYhLD0oA`, `MtsIWjiOFaplbdN74aZq`) |
| Workflows | 21 (9 published, 12 draft) | — | superseded drafts linger (e.g. "Contact → Universal Inquiry" v11 draft beside published equivalent) |
| Forms | 4 | — | clean |

Other flags:
- `cultural:sacred-knowledge` tag exists inside GHL — sits on the OCAP boundary; needs a deliberate keep/remove decision.
- Junk contacts from Gmail discovery import (e.g. `welcome@supabase.com`, created 11 Jul) — noise still flowing in.
- R8 exposure unresolved: bare `goods-newsletter` contacts without consent provenance; no bulk send until remediated.

## Phase 0 — Snapshot (Claude, read-only, no risk)
1. Export full live inventory via MCP: tags+IDs, pipelines+stage IDs, workflows, forms, custom fields → commit to `wiki/outputs/2026-07-12-ghl-live-snapshot/`.
2. This is the rollback reference for everything below.

## Phase 1 — Restore mirror trust (mirror-side only, zero GHL risk)
1. Re-enable/verify `ghl-sync` cron (opps sync dead since 29 Jun cron trim). Run `sync-ghl-to-supabase.mjs` manually from Ben's machine (not Cowork sandbox).
2. Add deletion reconciliation: full-pull live IDs, mark mirror rows absent live as `sync_status='deleted'` (explains 4,861 vs 3,280).
3. TDD rule applies: pin a test to live totals (contacts=3,280±, opps=555±) so silent drift fails loudly.
4. Acceptance: mirror totals within 1% of live; weekly gapcheck cron re-enabled.

## Phase 2 — Config alignment (repo-side, zero GHL risk)
1. Fix `config/campaigns/contained-adelaide-2026.json`: point deal pipeline at live "CONTAINED Engagement" (`vzatUY4dwN8t63ZoFIpH`) or confirm rename intent.
2. Regenerate tag→project map: diff live ~380 tags against `config/project-codes.json`; write canonical map to `config/` (single source of truth for Phase 4).
3. Decide `cultural:sacred-knowledge` tag (ADR in `wiki/decisions/` either way). If removed, removal happens in Phase 5 only.

## Phase 3 — Workflow hygiene (GHL UI, low risk — drafts are inert)
1. Keep the 9 published workflows untouched.
2. For the 12 drafts: confirm superseded (draft "Contact → Universal Inquiry" vs published "Contact Form to Universal Inquiry"; two draft Newsletter Signups; "Contained launch 2025"), then delete or rename with `zz-archive-` prefix. Drafts fire nothing — deleting them cannot affect contacts.
3. Document the 9 live workflows + their trigger tags in the snapshot dir — this trigger-tag list is the guard-rail for Phase 4.

## Phase 4 — Tag migration, re-key BEFORE retire (the careful one)
Order is everything. A tag deleted in Settings is stripped from every contact instantly — so nothing is deleted until every consumer is re-keyed.
1. **Map:** flat→canonical pairs from Phase 2 (e.g. `goods-newsletter`→`comms:goods-newsletter`, `adelaide`→`place:adelaide`, `harvest-newsletter`→`comms:harvest-newsletter`, `newsletter-stream:*`→`comms:*`).
2. **Backfill (additive):** bulk-add canonical tag to every contact holding only the flat tag. Tracer bullet: one contact end-to-end, verified in GHL UI + mirror, before the batch. MCP writes = Tier 3, explicit go per batch.
3. **Re-key consumers (Ben, GHL UI):** smart lists, Smart Router branches, workflow triggers, email-campaign audiences → canonical tags only. Verify each list's count is identical keyed old vs new before switching.
4. **Soak 1–2 weeks:** both tag sets live; weekly gapcheck confirms canonical counts stable.
5. **Retire flat tags:** remove from contacts, then delete tag definitions. Only after 3+4 pass.

## Phase 5 — Consent (R8) remediation — BLOCKS all bulk sends
1. Pull the bare `goods-newsletter` cohort (flat tag, no `consent:newsletter-yes`, empty `newsletter_consent`).
2. Triage: provable consent source → backfill `consent_source`/`consent_timestamp`; unknown → re-permission campaign or `comms:paused`. Never fabricate provenance.
3. Acceptance: every sendable contact has consent field + source, or is paused.

## Phase 6 — Contact hygiene (Tier 3, last)
1. Dedupe: refresh merge worklist from live (not stale mirror); merges per explicit approval, batch-by-batch.
2. Purge junk imports (Gmail-discovery noise like `welcome@supabase.com`): build filter list, review, delete.
3. Fix the Gmail import filter so noise stops at the source.

## Phase 7 — Standing guardrails
1. Weekly live-vs-mirror gapcheck (counts + key segments) → Telegram alert on >2% drift.
2. Monthly MCP review session: workflows/tags/fields vs canonical config.
3. New tags must be namespaced (`comms:` `place:` `role:` `project:` `source:`) — flat tags rejected at PR review for scripts, and by convention in UI.
4. MCP write etiquette stays Tier 3: explicit verb, tracer bullet before batch, attempted-vs-actual logged.

## Who does what
- **Claude (MCP/repo):** Phases 0–2 fully; Phase 4 backfill + verification; Phase 5 cohort pull; Phase 6 worklists.
- **Ben (GHL UI):** Phase 3 draft cleanup call; Phase 4 step 3 re-keying (Smart Router/lists); all Tier-3 go/no-go verbs.
- **Scripts (Ben's machine):** Phase 1 sync runs — never from the Cowork sandbox.
