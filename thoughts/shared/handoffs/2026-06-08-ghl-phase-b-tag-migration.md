# RESUME HANDOFF — GHL Phase B: tag migration (legacy/flat → canonical)

> Self-contained execution brief. A fresh context can run Phase B from this doc alone. Created 2026-06-08 (end of a long GHL session). **This is a Tier-3 bulk GHL write — day-shift, human-in-loop, Ben's verb, tracer-first.**

## The one-line goal
Migrate the live "A Curious Tractor" GHL account (`agzsSZWgovjwgpcoASWG`) from legacy/flat tags to the canonical namespaces — bucket by bucket, tracer-first — so smart-lists / comms / workflows can be built on clean tags.

## Read these first (the complete spec — don't re-derive)
1. `thoughts/shared/reviews/ghl-flat-tag-map-2026-06-08.md` — **THE migration map**: every flat tag → canonical target (mechanical buckets + the ✅ RESOLVED orphan rulings + cruft list).
2. `thoughts/shared/reviews/ghl-system-state-of-play-2026-06-08.md` — the dashboard (sites/forms/tags/lists/comms/workflows/pipelines + phase status).
3. `wiki/concepts/ghl-crm-taxonomy.md` (§3 namespaces, §6 migration path) + `ghl-audience-comms-automation.md` (§5 gates, agency model).
4. `thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md` — the 2026-06-07 dry-run (counts; note: its 237 orphan / 284 consent / 1,024-add figures are INFLATED by stale gone-from-ghl rows — see traps).

## What's ALREADY DONE (do not redo)
- **OCAP cleanup complete**: `lane:community` backfilled on 94 live community-line contacts; 65 drip tags stripped; 13 no-consent newsletter comms stripped; 20 consented community-line kept. Tooling: `scripts/backfill-lane-community-2026-06-08.mjs`, `scripts/strip-noconsent-newsletter-community-2026-06-08.mjs`. The live base is OCAP-clean — **the migration must not re-introduce violations.**
- **All orphan rulings made** (flat-tag-map RESOLVED section). `grant`→`role:funder` (grant lifecycle stays in the Grants pipeline, not a tag).
- **Forms-at-source**: Harvest aligned; Goods PR #98 (draft, gated on GHL prereqs); act.place/JH/EL pending (separate from Phase B).

## CRITICAL TRAPS (learned this session — will bite if ignored)
1. **Mirror ≠ live GHL.** The `ghl_contacts` mirror (shared Supabase `tednluwflfhxyucgwigh`) holds STALE ids — 277 community-line rows are `gone-from-ghl`, and some non-gone rows still 404 in GHL (EL storyteller sync writes non-GHL rows). **Every write script MUST `getContactById`-verify-first and clean-skip not-found.** Never trust mirror ids as live. Exclude `gone-from-ghl*` rows.
2. **Rate limit** ~60/min/tenant → `await sleep(1100)` between GHL calls.
3. **comms: is the send-risk bucket** — migrate it LAST and carefully: never add a `comms:*` to a `lane:community` contact; only add a newsletter `comms:` where `newsletter_consent=true` (mirror has the boolean column). identity tags never trigger sends — only `comms:` does.
4. **Workflows: 7 published, dangerous ones DRAFT.** Don't publish any send-workflow until tags are clean. The migration itself doesn't send (it's tagging), but keep comms: discipline.
5. **Idempotent + UNDO**: per-tag add/remove (never blind overwrite), log before/after + UNDO per contact, dry-run default.

## Proven tooling pattern (copy these scripts)
`scripts/backfill-lane-community-2026-06-08.mjs` and `scripts/strip-noconsent-newsletter-community-2026-06-08.mjs` are the templates: `dotenv .env.local`+`.env` → `createGHLService()` (from `scripts/lib/ghl-api-service.mjs`: `getContactById`, `addTagToContact`, `removeTagFromContact`) → Supabase mirror for the worklist → verify-first → per-tag add/remove → log to a dated review sidecar with UNDO → `--tracer`/`--apply` flags, dry-run default, 1.1s sleep. The mirror has: `tags text[]`, `newsletter_consent bool`, `ghl_id`, `full_name`, `is_storyteller`/`is_elder` bools.

## Execution order (buckets, safest → riskiest)
Run each bucket as its own dry → tracer → apply. Re-assert the community-line guard after the comms bucket.
1. **DROP cruft first** — delete `gone-from-ghl*` (652 uses), test tags + the codex-smoke TEST CONTACTS themselves, operational tags (`no email`/`needs-attention`/`ai-flagged`/`business-registration`). (Removes noise before mapping.)
2. **`project:`** — `act-gd`/`goods`→`project:act-gd`, `act-hv`/`harvest-website`→`project:act-hv`(+`source:website`), `justicehub`→`project:act-jh`, `empathy ledger`→`project:act-el`, `civicgraph`→`project:act-cn`. Identity, no send risk, biggest volume.
3. **`role:`** — per flat-tag-map (storyteller variants→`role:storyteller`, `grant`→`role:funder`(+`role:gov` for gov bodies), partner/supporter/supplier/buyer/community/elder/etc.).
4. **`interest:`** — mostly hyphen→colon (`interest-*`→`interest:*`) + the orphan interest rulings.
5. **`source:`** — inquiry/website/event:*/gmail-discovery/grantscope/linkedin/xero.
6. **`place:`** — `goods-state-nt`→`place:nt`, cities, `goods-community-*`→`place:community:*`.
7. **`comms:` (LAST, gated)** — `goods-newsletter`→`comms:goods-newsletter`, `newsletter`→`comms:act-newsletter`, `harvest-newsletter`→`comms:harvest-newsletter`. **Gate each: skip if `lane:community`; require `newsletter_consent=true`.** RETIRE `comms:partner-drip` (221), `comms:nurture` (68), and the `comms:newsletter` dupe of `comms:act-newsletter` (176).
8. **SKIP / fields, don't auto-migrate**: `tier:`/`ring:` are hand-set; `goods-tier-*`→`capital_tier` field; temperature (`goods-warm/hot/cold`)/`priority-*`/`meeting-held`→custom fields, not tags.

## Still OPEN after Phase B (don't lose these)
- **62 non-community no-consent newsletter holders** — Spam-Act decision (strip vs verify-opt-in). Not OCAP.
- **Mirror ↔ GHL reconciliation** — the storyteller drift (EL sync writing non-GHL rows).
- **Downstream phases C–F**: build 7 smart-lists → wire 7 comms streams → build/publish workflows → rationalize the 11 pipelines (see dashboard §4–§7).

## First action on resume
`git log --since="6 hours ago" --oneline | cat` (check no other session touched GHL), then read the flat-tag-map, then **start with bucket 1 (cruft drop) dry-run**. Confirm counts vs the map before any `--apply`.
