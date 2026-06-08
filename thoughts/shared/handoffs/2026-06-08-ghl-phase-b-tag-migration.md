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
1. ~~**DROP cruft first**~~ ✅ **DONE 2026-06-08** — live reality was 11 tag defs (not 652; `gone-from-ghl*` is mirror-only; test contacts already gone from GHL). All 11 cruft defs deleted (incl. 2× `auto-triage` dup, `minderoo-connection` tag-drop). 393→382 tag defs. Record: `thoughts/shared/reviews/bucket1-cruft-apply-2026-06-08.md`. **Carry the lessons there into buckets 2–7** (map counts are mirror-inflated → reconcile vs live tag library first; `getAllContactsByTag` is broken → mirror worklists; GHL tags list is eventually consistent; `--tags` dedups by name → 2nd pass for dup defs).
2. ~~**`project:`**~~ ✅ **CONTACT MIGRATION DONE 2026-06-08** — `migrate-ghl-project-tags-2026-06-08.mjs --apply`: **712 contacts** migrated (43 canonical adds, 1,222 legacy removes, 71 not-in-GHL clean-skips, **0 errors**). Tracer verified (Annie Taylor). Record: `thoughts/shared/reviews/bucket2-project-apply-2026-06-08.md`. **⚠ OPEN sub-step — legacy DEF picker cleanup HELD:** all 15 legacy project defs still in the picker; deleting them now = they REGROW because forms-at-source is incomplete (only Harvest aligned; Goods PR #98 draft, JH/act.place/EL pending still write legacy tags). **Delete the form-written legacy defs only AFTER forms-at-source lands.** Non-form internal defs (civicgraph/act-cn/act-in/act-regenerative-studio) safe to delete anytime.
3–6. ~~**`role:` / `interest:` / `source:` / `place:`**~~ ✅ **DONE 2026-06-08** via `migrate-ghl-buckets-3to6-2026-06-08.mjs --fast --apply` (one validated engine; role tracer-verified Cat Sullivan, fast-path tracer-verified, live spot-check passed). Tallies: role 492c/41a/888r · interest 74c/7a/337r · source 225c/153a/326r · place 82c/0a/108r · **873 contacts, 201 adds, 1,659 removes, 99 not-in-GHL, 0 errors**. Record: `thoughts/shared/reviews/buckets3-6-apply-2026-06-08.md`. **Engine built FRESH from the flat-tag map (old migrate-ghl-tags.mjs/ghl-taxonomy-migrate.mjs conflict with rulings — do NOT reuse them).** `goods-role-corp` dropped (Ben). **OPEN loose ends:** (a) source deferred — `event registrant`/`event-submission`/`goods-event` (5, ambiguous, need ruling); (b) `real innovation fund` (grant+dewr.gov.au) needs `role:gov` on top of role:funder; (c) `role:corporate` non-canonical sweep; (d) legacy-DEF picker cleanup still HELD until forms-at-source. ⚠ `--fast` had no per-contact UNDO log — UNDO reconstructable from mirror+rules (mirror not yet re-synced).
7. ~~**`comms:` (LAST, gated)**~~ ✅ **DONE 2026-06-08** (Ben explicit "apply full comms"). `migrate-ghl-comms-tags-2026-06-08.mjs --apply`: **341 contacts · 15 adds · 611 removes · 0 errors**. Gated correctly (skip lane:community, require newsletter_consent). 15 consent-gated `comms:goods-newsletter` adds (0 new act/harvest exposure); retired `comms:partner-drip`/`comms:nurture`/`goods-nurture`; stripped `comms:newsletter` dupe (146). Tracer-verified (pauline cowham). Live spot-check ✅. **LEFT (untouched, flagged):** 102 no-consent/community legacy newsletter holders (the Spam-Act decision) + `audience-brand` (85, not treated as consent). Record: `thoughts/shared/reviews/bucket7-comms-and-looseends-2026-06-08.md`.
8. ✅ **Loose ends DONE 2026-06-08** — `role:corporate`+`goods-role-corp` stripped (4 orgs); `real innovation fund` confirmed `role:gov`; deferred source ruled (event registrant/event-submission→interest:events/source:website, garma migrated, test contacts 404). Mirror re-synced GHL→Supabase post-migration.

## ✅ PHASE B COMPLETE (buckets 1–7) — 2026-06-08
All 7 buckets applied, 0 errors. **Still open (documented-as-separate, NOT Phase B blockers):** (a) 102 Spam-Act no-consent newsletter holders — strip vs re-opt-in; (b) `audience-brand` (85) ruling; (c) legacy-DEF picker cleanup — HELD until forms-at-source (else regrow); (d) `--fast` buckets had no per-contact UNDO (reconstructable from pre-sync mirror snapshot + rules). Next real work: smart-lists → comms streams → workflows → pipelines (phases C–F).
8. **SKIP / fields, don't auto-migrate**: `tier:`/`ring:` are hand-set; `goods-tier-*`→`capital_tier` field; temperature (`goods-warm/hot/cold`)/`priority-*`/`meeting-held`→custom fields, not tags.

## Still OPEN after Phase B (don't lose these)
- **62 non-community no-consent newsletter holders** — Spam-Act decision (strip vs verify-opt-in). Not OCAP.
- **Mirror ↔ GHL reconciliation** — the storyteller drift (EL sync writing non-GHL rows).
- **Downstream phases C–F**: build 7 smart-lists → wire 7 comms streams → build/publish workflows → rationalize the 11 pipelines (see dashboard §4–§7).

## First action on resume
`git log --since="6 hours ago" --oneline | cat` (check no other session touched GHL), then read the flat-tag-map, then **start with bucket 1 (cruft drop) dry-run**. Confirm counts vs the map before any `--apply`.
