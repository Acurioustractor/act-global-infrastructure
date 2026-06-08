# Community-line `comms:*` strip — OCAP protective fix (2026-06-08)

**What:** Protectively remove wrongly-applied `comms:*` tags (newsletters AND drips) from 21 community-line GHL contacts so none can sit in an automated send.
**Why:** OCAP — community-line contacts must never be auto-enrolled in comms funnels.
**Scope:** ONLY `comms:*` tags to be removed. `lane:community` and all other tags preserved. No tag added. No merge/delete. Tier-2 GHL write, authorized by Ben.
**GHL location:** `agzsSZWgovjwgpcoASWG`
**Mirror (read-only):** Supabase `tednluwflfhxyucgwigh` → `ghl_contacts` (cols confirmed: `email` text, `ghl_id` text, `tags` ARRAY).
**Method:** mirror resolve email→ghl_id+tags → LIVE `contacts_get-contact` verify (`lane:community` present + `comms:*` present) → `contacts_remove-tags` (only `comms:*`) → LIVE re-verify.

---

## ✅ EXECUTED (codebase path) — 2026-06-08T09:49Z — all 21 stripped, 0 skip, 0 error

**Resolution of the blocker below.** Ben authorized the codebase OAuth path (the proven Phase B write surface). Ran `scripts/strip-community-comms-2026-06-08.mjs` using `createGHLService()` (PIT auth, `dotenv .env.local`) + `ghl.removeTagFromContact(id, tag)` — the function that builds the correct `DELETE /contacts/{id}/tags` body `{ tags:[tag] }`. Location guard asserted `GHL_LOCATION_ID === agzsSZWgovjwgpcoASWG` before any write. ~1.1s sleep between every GHL call.

**Per-contact protocol actually executed:** live re-fetch (confirm `lane:community` + a `comms:*` present, else SKIP) → remove **every** `comms:*` tag found on the contact (not just the planned set — defensive, catches any extra comms tag) → live re-fetch (assert: zero `comms:*` remain · `lane:community` intact · NO non-comms tag lost). A contact only logs OK if all three post-conditions held.

**Result: OK=21 · SKIP=0 · ERROR=0.** No contact outside the 21 touched; no tag added; no merge/delete. Raw before/after for every contact: `thoughts/shared/reviews/2026-06-08_community-line-comms-strip-RESULTS.json` (fully reversible — re-add via `contacts_add-tags` / `addTagToContact`).

| # | Email | comms:* removed | before→after tag count | lane:community | status |
|---|-------|-----------------|------------------------|----------------|--------|
| 1 | admin@myerfoundation.org.au | goods-newsletter, act-newsletter | 12→10 | intact | OK |
| 2 | alee@infoxchange.org | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 3 | applications@brianmdavis.org.au | goods-newsletter, act-newsletter | 12→10 | intact | OK |
| 4 | csm@bawinanga.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 5 | delaicee.power@julalikari.com.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 6 | erin@reddust.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 7 | eula.rohan@aracy.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 8 | gien@good-design.org | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 9 | gm@bawinanga.org.au | goods-newsletter, act-newsletter | 13→11 | intact | OK |
| 10 | info@impactfrontiers.org | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 11 | jf@wilyajanta.org | goods-newsletter, act-newsletter | 11→9 | intact (role:storyteller kept) | OK |
| 12 | keiron.lander@ygcc.com.au | goods-newsletter, act-newsletter | 11→9 | intact (role:storyteller kept) | OK |
| 13 | madelyn.hay@miwatj.com.au | goods-newsletter, **newsletter**, act-newsletter | 16→13 | intact | OK |
| 14 | mcarman@reddust.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 15 | peter.bent@impactfrontiers.org | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 16 | phillip.allan@bawinanga.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 17 | pkaur@paulramsayfoundation.org.au | goods-newsletter, act-newsletter | 15→13 | intact | OK |
| 18 | ren@relove.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 19 | rowena.cann@aracy.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |
| 20 | shellee.strickland@murrup.org.au | goods-newsletter, **newsletter**, act-newsletter | 12→9 | intact | OK |
| 21 | sr@office.org.au | goods-newsletter, act-newsletter | 11→9 | intact | OK |

(comms:* names shown without the `comms:` prefix for brevity; #13 & #20 each had all THREE comms tags incl. the legacy `comms:newsletter` removed as planned.)

**Out-of-scope note (left in place, correct):** every contact still carries a bare `goods-newsletter` tag (no `comms:` prefix). That is NOT a `comms:`-namespaced send tag, so it was correctly untouched per the strict `comms:*`-only constraint. If the live comms guard keys on the `comms:` namespace, these 21 now read clean; if any send-list also matches the bare `goods-newsletter` legacy tag, that is a separate cleanup decision for Ben (not part of this OCAP strip).

**Live guard status:** should now read ~0 community-line `comms:*` violations from this set (Ben/Nic exempt as before).

---

## ⛔ BLOCKER — no contacts modified (all 21 untouched) — RESOLVED ABOVE (superseded 2026-06-08T09:49Z)

The authorized write tool **`mcp__ghl__contacts_remove-tags` is broken at the MCP bridge.** Every call returns:

```
422 Unprocessable Entity
"each value in tags should not be empty" / "each value in tags must be a string"
"tags should not be empty" / "tags must be an array"
```

i.e. the `body_tags` array is arriving **empty** at the GHL API — the bridge is not forwarding array contents into the request body's `tags` field.

Tried and all failed with the identical 422 (5 attempts):
- 4-contact batch, 2-element array `["comms:goods-newsletter","comms:act-newsletter"]`
- single contact, single-element array `["comms:goods-newsletter"]`
- single contact, 2-element array (retry, to rule out transient flake)

422 means **GHL rejected the request — no mutation occurred.** Re-verified `admin@myerfoundation.org.au` live after the attempts: comms tags still present (unchanged). All 21 contacts confirmed untouched.

Per fallback rule (never guess, never strip blindly) and the strict constraint that the ONLY permitted write is `mcp__ghl__contacts_remove-tags`, I did NOT switch to the codebase OAuth path (`scripts/lib/ghl-api-service.mjs` `removeTagFromContact`, which builds the correct `DELETE /contacts/{id}/tags` body `{ tags:[...] }`) — that is a different write surface than Ben authorized.

**Correct request shape (verified against `scripts/lib/ghl-api-service.mjs:432`):** `DELETE /contacts/{contactId}/tags` with body `{ "tags": ["comms:..."] }`. The MCP tool's `body_tags` should map to that `tags` field but does not.

**Resume options for Ben:**
1. Fix the GHL MCP bridge's `body_tags` array marshalling, then re-run this list (all IDs + exact comms sets resolved below).
2. Authorize the codebase OAuth path explicitly — then a tiny script can loop the 21 IDs calling `removeTagFromContact(id, tag)` per comms tag.

**Live guard status:** still reads ~21 (unchanged) — the strip did NOT happen.

---

## Resolved targets (mirror + live-verified where checked) — ready to strip on resume

All 21 resolved in mirror; all hold `lane:community` (live-confirmed for the 4 marked ✓live below; remaining 17 confirmed via mirror only, were not live-checked because the write tool was already known-broken). Every row's mirror tags showed `lane:community` present and `comms:*` present, so none would SKIP on the no-lane / already-clean guards.

| # | Email | GHL id | live? | comms:* to remove |
|---|-------|--------|-------|-------------------|
| 1 | admin@myerfoundation.org.au | `10phNqWAjEmflMzAzXYT` | ✓live | comms:goods-newsletter, comms:act-newsletter |
| 2 | alee@infoxchange.org | `7ox7Rp2Dr3OZdLNXjHVW` | ✓live | comms:goods-newsletter, comms:act-newsletter |
| 3 | applications@brianmdavis.org.au | `qvnemoBQU7FjnSdfEwPP` | ✓live | comms:goods-newsletter, comms:act-newsletter |
| 4 | csm@bawinanga.org.au | `Z1kOiaNiVGNOuscHED4V` | ✓live | comms:goods-newsletter, comms:act-newsletter |
| 5 | delaicee.power@julalikari.com.au | `CINaVh3o4cgFjBuscV0C` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 6 | erin@reddust.org.au | `iRmsOTOvF1DgmmJ6QpzT` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 7 | eula.rohan@aracy.org.au | `K4ejYaIJ3ILO9yQTFBhm` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 8 | gien@good-design.org | `qd0lpqQ9dZpyDDERIMhE` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 9 | gm@bawinanga.org.au | `yIYUvOBZMemF5tynz5wL` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 10 | info@impactfrontiers.org | `z54hf3IrFhNzQeMW6Gzv` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 11 | jf@wilyajanta.org | `8f3onwaS2iK3Lk7ThsiA` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 12 | keiron.lander@ygcc.com.au | `X4qlBT2huXIB5I5XJ2dK` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 13 | madelyn.hay@miwatj.com.au | `ef3tYp3HPNOmUNeu05gc` | mirror | comms:goods-newsletter, **comms:newsletter**, comms:act-newsletter |
| 14 | mcarman@reddust.org.au | `Hfckaos5BIXAiDWhkD6v` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 15 | peter.bent@impactfrontiers.org | `MCNT6MZyAW4S0Fg0wLol` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 16 | phillip.allan@bawinanga.org.au | `avh1foMDU4rpglfjDxp3` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 17 | pkaur@paulramsayfoundation.org.au | `4nTVTPHZJcIaXPnZNpLL` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 18 | ren@relove.org.au | `P5Qw6atbYWZIKKsVhKSQ` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 19 | rowena.cann@aracy.org.au | `MLDUH7oecmisGwYJ7y8Q` | mirror | comms:goods-newsletter, comms:act-newsletter |
| 20 | shellee.strickland@murrup.org.au | `II1BhBXv0iuzv888Wb7x` | mirror | comms:goods-newsletter, **comms:newsletter**, comms:act-newsletter |
| 21 | sr@office.org.au | `G9PItuZMWk1c8x6unFvB` | mirror | comms:goods-newsletter, comms:act-newsletter |

**Note on #13 and #20:** these two carry an extra legacy `comms:newsletter` tag in addition to `comms:goods-newsletter` + `comms:act-newsletter`. All three must be stripped (every `comms:*`).

---

## 🔎 Ben review — likely MIS-classified as `lane:community` (re-classify, do NOT leave on community line)

These are **role-addresses at funder / intermediary / brand orgs**, not community-line storytellers. The protective strip is still the correct default (DONE on resume), but they should very likely be re-classified — remove `lane:community` and re-enrol in the right outbound stream (funder-drip / partner-drip), which is a SEPARATE, deliberate decision Ben must make. Listed here so the OCAP strip doesn't accidentally cement a wrong lane.

| Email | Org | Why likely not community-line |
|-------|-----|-------------------------------|
| admin@myerfoundation.org.au | The Myer Foundation & Sidney Myer Fund | Funder. Role inbox. Already carries `newsletter-stream:funder-brief`. |
| pkaur@paulramsayfoundation.org.au | Paul Ramsay Foundation | Funder. Carries `role:partner` + `newsletter-stream:funder-brief` + `youth-justice-brief`. |
| applications@brianmdavis.org.au | Brian M Davis Charitable Foundation | Funder. Role inbox (`applications@`). Carries `newsletter-stream:funder-brief`. |
| info@impactfrontiers.org | Impact Frontiers | Intermediary/standards body. Role inbox (`info@`). |
| peter.bent@impactfrontiers.org | Impact Frontiers | Intermediary/standards body. |
| eula.rohan@aracy.org.au | ARACY | Research/peak body intermediary. |
| rowena.cann@aracy.org.au | ARACY | Research/peak body intermediary. |
| gien@good-design.org | Good Design Australia | Brand/awards body. |
| alee@infoxchange.org | Infoxchange | Tech-for-good intermediary. |
| ren@relove.org.au | Relove | Partner/intermediary org. |

**Not flagged for re-classification** (plausibly genuine community / community-controlled / storyteller — leave on community line after the strip): bawinanga (gm@, csm@, phillip.allan@), julalikari (delaicee.power@), reddust (erin@, mcarman@), wilyajanta (jf@, `role:storyteller`), ygcc/keiron.lander (`role:storyteller`), miwatj/madelyn.hay (`role:community-controlled`, `role:health-service`), murrup (shellee.strickland@), office.org.au (sr@). Ben to confirm.

---

## Provenance
- Mirror resolve query + schema check: Supabase `tednluwflfhxyucgwigh`, table `ghl_contacts`, 2026-06-08. All 21 emails matched exactly one row.
- Live verify: `mcp__ghl__contacts_get-contact` for IDs 1–4 (matched mirror exactly) + post-attempt re-verify of #1 (unchanged).
- Write attempts: 5× `mcp__ghl__contacts_remove-tags`, all 422 (empty-array bridge bug), zero mutations.
- Reversibility: N/A this run (no change made). On resume, removed tags are re-addable via `contacts_add-tags` — the table above records the exact comms set per contact.
