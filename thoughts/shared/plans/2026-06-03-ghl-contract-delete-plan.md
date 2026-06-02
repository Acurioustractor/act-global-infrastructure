---
title: GHL Phase 3 — CONTRACT delete plan
status: Ready (gated; every delete is Tier 3 / Ben go)
date: 2026-06-03
relates_to: 2026-06-02-ghl-cleanup-execution-plan.md (§5) · 2026-06-02-act-ecosystem-ghl-architecture.md · reviews/2026-06-02-ghl-tag-cleanup-review.md
---

# GHL Phase 3 — CONTRACT delete plan

> Deleting a location tag removes it from the picker **and every contact** in one API call (`DELETE /locations/{loc}/tags/{id}`). Irreversible-ish (you'd have to re-tag). So every delete is **Tier 3, gated, eyeballed**. Counts are this-session live; **re-verify at delete time** (GHL search lags writes ~1 min).

## The TWO-SIDED gate (the rule that prevents silent breakage)
A flat/stale tag is safe to delete only when **both** are true:
1. **GHL side** — no workflow trigger, no smart-list filter, no pipeline rule still fires on it (UI-verified; the API can't read triggers).
2. **CODE side** — nothing still *mints* it: every producing script + the project website emits the canonical tag instead. **Today our 3 producing scripts + the Harvest site still DUAL-WRITE the flats** — so they must be switched to canonical-only first, or the tag respawns on the next signup.

## Tooling
- **Wave 0** (junk): `scripts/delete-junk-ghl-tags.mjs` — ready. Dry-run, eyeball, `--apply`.
- **Waves 1–3** (named tags): the tool needs a small **`--tags a,b,c` extension** (Tier 1, ~10 lines) so it deletes a specific gated list, not just the junk regex. I'll add it when we reach each wave.

---

## WAVE 0 — pure junk · NO gate · runnable NOW
**CORRECTED against LIVE GHL (2026-06-03 dry-run): the live tag library (398 defs) has only ONE junk tag — `context: footer newsletter signup`.** The `gone-from-ghl*` / `test-submission` / `codex-smoke-test` "junk" I first listed came from the **stale Supabase mirror** (deleted-contact rows), not live tag definitions — so there is nothing bulk to delete here. Wave 0 is a non-event.
**Gate:** none. **Run:** `node scripts/delete-junk-ghl-tags.mjs` (dry-run) → `--apply` deletes the 1 tag. Negligible — the real cleanup is Wave 2.

## WAVE 2 — stale canonical (from the prior bad run) · near-ready
Replacements verified in place, and **nothing re-emits these** (already fixed in code), so the only gate is a quick UI check.

| Tag | Count | Replacement (in place) | Gate remaining |
|---|---|---|---|
| `role:member` | 57 | `tier:member` (57 ✅) | VERIFY no workflow/smart-list uses `role:member` (UI) — website no longer emits it (`fe2cbcf`) |
| `interest:shop` | 32 | `interest:markets` (63 ✅) | VERIFY no workflow/smart-list uses `interest:shop` — shop handler emits `interest:markets` now |
| `temp:*` (warm 41/cooling 13/hot 12/cold 11/steady 6/new 1 = 84) | 84 | retired (folds to `tier:`, earned) | VERIFY no workflow triggers on any `temp:*`; optional one-off heat→tier map for contacts with no `tier:` (`hot→active`, `warm→connected`, `cold/cooling→curious`) before delete |

**Once the UI verify passes, these delete cleanly in one batch** (`--tags role:member,interest:shop,temp:warm,temp:cooling,temp:hot,temp:cold,temp:steady,temp:new`).

## WAVE 1 — pipeline-stage duplicates · gated on Ben verifying Goods stages
The Goods pipeline stage column is source of truth; these duplicate it.
- `goods-stage-prospect` (56), `goods-stage-customer`, `goods-stage-active` — Gate: matching Goods pipeline stage count confirmed in UI.
- `goods-tier-aware` (34), `goods-tier-engaged` (25), `goods-tier-champion` (17), `goods-tier-active` (12) — Gate: Goods Journey stages verified; delete together.
- `goods-signal`, `engagement:lead` (14), `engagement:active` — Gate: VERIFY no workflow/smart-list references them.
**CODE check:** confirm `seed-goods-opps-from-xero.mjs` / any goods sync no longer emit `goods-stage-*` / `goods-signal`.

## WAVE 3 — flat legacy · one at a time · the heaviest gates
Each needs **its re-point done (GHL) AND its emitters switched to canonical-only (CODE)**. Status as of this session:

| Tag(s) | Count | Replacement | GHL gate | CODE gate (stop emitting) | Status |
|---|---|---|---|---|---|
| `harvest-member` | 57 | `project:act-hv`+`tier:member` | Harvest Members list ✅; welcomes enrol-by-ID (no trigger) ✅ | Harvest site `buildNewsletterTags` still emits it (dual-write) | ⏳ code |
| `harvest-newsletter` | 61 | `comms:harvest-newsletter` | Harvest Newsletter list ✅ | Harvest site still emits it | ⏳ code |
| `harvest-shop-interest` | 32 | `interest:markets`+`project:act-hv` | Shop lists ✅ | Harvest shop handler still emits it (dual) | ⏳ code |
| `shop-prospect` | 28 | `interest:markets`+`role:buyer` | Shop prospects list ✅ | check emitter | ⏳ verify |
| `goods`,`act-gd`,`project-goods` | 268/463 | `project:act-gd` (505 ✅) | Goods Global list ✅; B8/B11 Add-Tag steps ⏳ | `clean-funder`+`seed-goods` dual-write; `project-notifications` matches both | ⏳ both |
| `goods-inquiry` | 92 | `project:act-gd`+`source:inquiry` | Goods Contact Form list ✅; B8 ⏳ | check emitter | ⏳ workflow |
| `goods-newsletter` | 195 | `comms:goods-newsletter` (195 ✅) | Goods newsletter list ✅ | `clean-funder` dual-write | ⏳ code |
| `newsletter`,`audience-brand` | 62/119 | `comms:act-newsletter` (181 ✅) | ACT Newsletter list ⏳; ACT Signup workflow ⏳ | check emitter of `audience-brand` (×119) | ⏳ both |
| `comms:newsletter` | 181 | `comms:act-newsletter` (181 ✅) | ACT lists re-pointed off it ⏳ | n/a (derived, not emitted) | ⏳ list |
| `justicehub`,`act-jh` | 57/57 | `project:act-jh` (62 ✅) | JusticeHub Global ⏳; B12 parked | `project-notifications` matches both | ⏳ parked |
| `contained`,`contained-*` | 1+ | `project:act-jh`+`interest:justice-reform` | Contained list ⏳; B12 parked | — | ⏳ parked |
| `audience-partner`,`partner`,`goods-partner` | 281/50 | `role:partner` (271 ✅) | VERIFY no filter on `audience-partner` | `clean-funder`/`webhook` | ⏳ verify |
| `audience-funder`,`goods-funder`,`funder`,`grant` | — | `role:funder` (87 ✅) | VERIFY no triggers; re-point any funder drip | `clean-funder` | ⏳ verify |
| `audience-storyteller`,`storyteller` | 37 | `role:storyteller`+`consent:needed` | community line — VERIFY no send fires; confirm `consent:needed` added first | — | ⏳ consent |

## The CODE prerequisite for Wave 3 (Tier 1, my hands)
Before deleting the dual-written flats, flip the emitters from **dual-write → canonical-only**:
- `scripts/clean-funder-ghl-contacts.mjs` — drop the flat side of `withCanonical` (emit canonical only)
- `scripts/seed-goods-opps-from-xero.mjs` — drop flat `goods`
- `scripts/project-notifications.mjs` — drop flat match strings (keep canonical)
- **Harvest site** (`server/routers.ts`): `buildNewsletterTags` + shop/member-wall — drop `harvest-member`/`harvest-newsletter`/`harvest-shop-interest`/flat interest-/source- aliases (the `withFlatAlias` dual-write). Deploy.
Each emitter-switch is the CODE gate for its tag(s).

---

## Recommended execution order
1. **WAVE 0 now** — junk, no gate. (`delete-junk-ghl-tags.mjs --apply`)
2. **WAVE 2** — after a 5-min UI verify (no workflow/list on `role:member`/`interest:shop`/`temp:*`). Clean, replacements done, nothing re-emits.
3. **WAVE 1** — after Ben verifies Goods pipeline stage counts.
4. **Flip emitters to canonical-only** (Tier 1 code, deploy Harvest).
5. **WAVE 3** — one tag (or synonym-set) at a time, only after its row above is all-✅. Re-verify count before each delete.

> No tag is deleted while any workflow, smart list, or code path still uses or mints it. When in doubt, leave it — a lingering flat tag costs nothing; a deleted live one breaks a send silently.
