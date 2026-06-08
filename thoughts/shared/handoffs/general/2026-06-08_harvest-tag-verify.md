# Harvest GHL tag-contract verification — 2026-06-08

**Verifier:** Claude Code (read-only verification pass; NO live GHL/Supabase API calls)
**Repo:** `Acurioustractor/theharvest` (LIVE; confirmed remote)
**Verified against:** `origin/main` @ `b2f2d95` (Merge PR #27), in isolated worktree `.claude/worktrees/tag-verify-2026-06-08`
**Migration under test:** PR #26 "Phase B converge…taxonomy" (`cfb14be`) + Phase-3 code-flip (`3739915`)

## Headline

**The migration was scoped to the tRPC server path (`server/routers.ts`) ONLY. It never touched the three Supabase edge functions, which are a separate, partially-LIVE form-emit surface still minting flat aliases.** There are TWO parallel form-emit code paths in this repo, and only one was migrated.

| Path | Files | Status |
|------|-------|--------|
| **A. tRPC routers** (newsletter, shop EOI, event/business/workshop submits, member wall, pulse) | `server/routers.ts` → chokepoint `server/gohighlevel.ts` | ✅ migrated to canonical |
| **B. Supabase edge functions** (contact form, community/venue submit, orphaned newsletter fn) | `supabase/functions/{contact-form,community-submit,newsletter-subscribe}/index.ts` | ❌ NOT migrated — flat aliases, no `project:act-hv`, no `lane:community` |

### Live wiring (which path each form actually uses)

- **Newsletter** (`PublicLayout.tsx:95`, `BauhausFooter.tsx:28`, `Membership.tsx:112`) → tRPC `newsletter.subscribe` → **Path A** ✅
- **Shop EOI** (`ShopInterestSection.tsx:33`) → tRPC `shopInterest.submit` → **Path A** ✅
- **Contact form** (`client/src/pages/Contact.tsx:44`) → `fetch(.../functions/v1/contact-form)` → **Path B (LIVE)** ❌
- **Community / Get-Involved / Venue** (`GetInvolved.tsx:166`, `VenueHire.tsx:81` via `lib/api.ts:191` `communitySubmit`) → `functions/v1/community-submit` → **Path B (LIVE)** ❌
- **`newsletter-subscribe` edge fn** (`lib/api.ts:188` `subscribeNewsletter`) → **exported but has ZERO importers in `client/src`** — orphaned/dead client-side, but still deployed & callable ❌

---

## Contract checks

### 1. `project:act-hv` stamped at the GHL chokepoint on every contact write

- **Path A (tRPC): PASS.** Stamped at the chokepoint in both helpers:
  - `server/gohighlevel.ts:86` (`createGHLContact`) — `Array.from(new Set([...(input.tags || [...]), "project:act-hv"]))`
  - `server/gohighlevel.ts:189` (`upsertGHLContact`) — same pattern on the separate `/tags` POST.
- **Path B (edge fns): GAP.** All three edge functions call GHL directly (`https://services.leadconnectorhq.com/contacts/upsert` + `/contacts/{id}/tags`) and **never add `project:act-hv`**:
  - `supabase/functions/contact-form/index.ts:80-87` — tags = `["contact-form","harvest-website","harvest-inbox","act-inquiry","project-harvest", …]`. No `project:act-hv`.
  - `supabase/functions/community-submit/index.ts:84-87` — tags from `TYPE_TAGS` + `harvest-inbox` + dynamic flats. No `project:act-hv`.
  - `supabase/functions/newsletter-subscribe/index.ts:40` — `["newsletter","harvest-newsletter","harvest-website", …]`. No `project:act-hv`.

### 2. Consent gate — `comms:harvest-newsletter` ONLY with explicit `newsletter_consent=Yes`

- **GAP (both paths).** There is **NO `newsletter_consent` capture anywhere in the codebase** (grep across `server/`, `supabase/functions/`, `client/src` returns only unrelated story/empathy-ledger consent). Consent is implied-by-form-submission, not explicitly captured/stored.
  - **Path A:** `server/routers.ts:174-177` `buildNewsletterTags` adds `comms:harvest-newsletter` to **every** subscriber unconditionally; `newsletter.subscribe` input schema (`routers.ts:670-679`) has no consent field.
  - **Path B (newsletter-subscribe edge fn):** `supabase/functions/newsletter-subscribe/index.ts:40` adds flat `newsletter` + `harvest-newsletter` unconditionally (no consent, no canonical `comms:`).
  - **Path B (contact-form):** `supabase/functions/contact-form/index.ts:86` adds `newsletter`/`harvest-newsletter` gated on a `subscribe` boolean (`Contact.tsx:243` checkbox). This is the closest thing to a consent gate, but uses flat aliases and an unchecked default rather than an explicit stored `newsletter_consent=Yes`.
  - **Nuance:** A user submitting a dedicated newsletter form is arguably express opt-in under Spam Act 2003 (the form's purpose IS subscribing). But the contract asks for explicit `newsletter_consent=Yes` capture; that flag does not exist. Reported as a GAP for the reviewer to rule on — **not auto-fixed**, because changing consent posture on a live form is a Tier-2/3 OCAP decision, not a mechanical tag rename.

### 3. OCAP — `community-submit` applies `lane:community` and grants NO `comms:`

- **GAP.** `supabase/functions/community-submit/index.ts:84-87` applies **no `lane:community` tag** and no canonical namespacing at all. (It also grants no `comms:` — that half is fine — but the protective `lane:community` marker that keeps community-line people out of drips forever is **absent**.) This is the highest-stakes gap: community-line contacts land in GHL without the OCAP guard the contract requires.

### 4. No flat aliases reintroduced

- **Path A: PASS.** `server/routers.ts:163-165` `withFlatAlias` is now a passthrough (canonical-only); `buildNewsletterTags` emits `comms:harvest-newsletter` + `interest:*` + `tier:*`; shop EOI emits `role:supplier`/`interest:markets`. Remaining non-namespaced strings (`harvest-website`, `harvest-inbox`, `shop-*`, `*-submission`) are deliberate broad-scope/inbox/journey markers the migration commit explicitly chose to keep ("`harvest-website` kept, retire later"), not the dropped flat aliases. No bare `newsletter`, `harvest-newsletter`, `harvest-member`, or `role:member` reintroduced. ✅
- **Path B: GAP.** All three edge functions still mint exactly the flat aliases the migration dropped:
  - bare `newsletter`, `harvest-newsletter` (`newsletter-subscribe:40`, `contact-form:86`)
  - `harvest-member`, `interest-membership` flat (`newsletter-subscribe:48-49`)
  - flat `interest-*` (`newsletter-subscribe:17-28` `INTEREST_TAGS` map → `interest-events` etc., hyphenated not `interest:`)
  - `community-idea`, `residency-applicant`, `business-interest`, `workshop-suggestion`, `story-feature`, `venue-enquiry`, dynamic `residency-*`/`idea-*`/`biz-*` (`community-submit:51-87`)
  - `project-harvest` (a flat project alias — `contact-form:85`) instead of `project:act-hv`.

### 5. Role/interest tags use canonical values

- **Path A: PASS.** Shop EOI (`server/routers.ts:919-925`) → `role:supplier` + `interest:markets` + `offerTag`. `NEWSLETTER_INTEREST_TAGS` (`routers.ts:118-127`) all `interest:*`. `REFERRAL_SOURCE_TAGS` (`routers.ts:110-114`) all `source:*`. ✅
- **Path B: GAP.** Edge-function interest tags are hyphenated flats (`interest-markets`, `interest-events`, … `newsletter-subscribe:17-28`); no `role:*` namespacing.

---

## Summary

| Check | Path A (tRPC, LIVE) | Path B (edge fns) |
|-------|---------------------|-------------------|
| 1. `project:act-hv` at chokepoint | PASS | **GAP** (all 3 fns) |
| 2. Newsletter consent gate | GAP* (implied, no flag) | **GAP** |
| 3. `lane:community` on community-submit | n/a | **GAP** (highest stakes) |
| 4. No flat aliases | PASS | **GAP** (all 3 fns) |
| 5. Canonical role/interest | PASS | **GAP** |

\* Path A check 2 is a posture/ruling question (express-opt-in-by-form vs explicit stored flag), not a tag bug.

## Verdict & action taken

The migration achieved its stated scope — the **tRPC path is clean and canonical** — but it left a **second, partially-live edge-function surface fully un-migrated**. `contact-form` and `community-submit` are wired to live pages (Contact, Get-Involved, Venue Hire); `newsletter-subscribe` is deployed but orphaned client-side.

**No code change was made by this verification pass.** Rationale: the real gaps are not mechanical tag renames — they sit on consent capture (check 2) and OCAP `lane:community` on a live community-line form (check 3). Per `~/.claude/rules/workflow.md`, consent-posture and OCAP changes on a form that writes to GHL are Tier-2/3 / day-shift, human-in-loop decisions requiring an explicit verb, not an autonomous edit. The task brief also says to make a code change only for a real GAP *with a small edit*; these gaps need a design ruling (do the edge functions route through a shared canonical tag-builder? deprecate `newsletter-subscribe`? add an explicit consent flag?), not a one-line patch.

**Recommended follow-up (for Ben / day-shift):**
1. Decide whether `contact-form` + `community-submit` should call a shared canonical tag-builder (mirror `server/routers.ts` logic in Deno) — they bypass `server/gohighlevel.ts` entirely.
2. Add `lane:community` to `community-submit` (OCAP — do first; lowest-effort, highest-protection).
3. Stamp `project:act-hv` in all three edge functions.
4. Replace flat aliases with canonical namespaces in the edge functions.
5. Decide the consent posture: keep implied-by-form, or capture an explicit `newsletter_consent` flag (resolves check 2 for both paths).
6. Confirm whether the orphaned `newsletter-subscribe` edge fn should be deprecated (no live importer) before spending effort migrating it.

**Provenance:** All findings verified by reading source on `origin/main@b2f2d95`; live wiring traced through `client/src` imports + `fetch`/tRPC call sites. No live GHL/Supabase calls were made, so actual tags on existing contacts are NOT verified here — only the code that emits them.

---

## FIXED — 2026-06-08

**Branch:** `wip/harvest-tag-fix-2026-06-08` (off `origin/main@b2f2d95`, pushed). NO PR opened. NO live GHL/Supabase calls, NO deploy. Code-only.
**Verification:** `deno check` passes on all 3 edited functions (the edge-fn-native typecheck; `tsc` N/A for Deno imports).

All 6 Path-B gaps closed. The LOCKED contract (canonical namespaces `project:/role:/comms:/interest:/source:/place:/lane:`, OCAP `lane:community`, Spam-Act consent gate) is now applied to the three edge functions, mirroring the tRPC chokepoint (`server/gohighlevel.ts` + `buildNewsletterTags` in `server/routers.ts`).

### `supabase/functions/contact-form/index.ts`
- **Tag set rewritten** (was line 80-87, now ~80-95): added `project:act-hv`; dropped flat aliases `contact-form`, `project-harvest`, `newsletter`, `harvest-newsletter`. Kept deliberate broad-scope markers `harvest-website`, `harvest-inbox`, `act-inquiry`.
- **Consent gate** (~89-100): `comms:harvest-newsletter` now granted only when `subscribe === true` (the live Contact-page opt-in checkbox, `Contact.tsx:243` — the only explicit-consent signal this form has). On consent, stamps `newsletter_consent=Yes` via `customFields` on the upsert body. Fail-safe: no checkbox => no comms tag.

### `supabase/functions/community-submit/index.ts`
- **`TYPE_TAGS` canonicalised** (was line 51-58, now ~50-61): flat per-type aliases → canonical values — `idea`→`interest:community`, `residency`→`role:resident`+`interest:community`, `business-interest`→`role:supplier`+`interest:markets`, `workshop-suggestion`→`interest:workshops`, `story-feature`→`role:storyteller`+`interest:community`, `venue-enquiry`→`interest:venue`. (The map *keys* are the client's submission-type discriminator, unchanged.)
- **OCAP guard** (was line 84-87, now ~83-92): every submission now stamped `project:act-hv` + `lane:community` (highest-stakes fix — community-line contacts can never be auto-enrolled in drips). NO `comms:` granted. Dropped dynamic flat sub-tags `residency-*`/`idea-*`/`biz-*` (detail still preserved in the GHL note + Supabase row).

### `supabase/functions/newsletter-subscribe/index.ts`
- **`INTEREST_TAGS` canonicalised** (line 17-28): `interest-*` → `interest:*` (mirrors `NEWSLETTER_INTEREST_TAGS`).
- **`buildNewsletterTags` → `buildBaseTags`** (was line 38-53, now ~38-60): base set now `project:act-hv` + `harvest-website` (dropped flat `newsletter`/`harvest-newsletter`); membership → `tier:member` (dropped flat `harvest-member`), non-member → `tier:connected`. The comms tag is deliberately NOT added here.
- **Consent gate** (~89-101): `comms:harvest-newsletter` appended only when `newsletter_consent`/`newsletterConsent` === `"Yes"` (case-insensitive) or `true`; stamps `newsletter_consent=Yes` on the contact body. Fail-safe: any other value => lead WITHOUT comms tag.
- `isMember` check updated `harvest-member` → `tier:member` (line ~158).

### Flagged / notes
- **`newsletter-subscribe` is client-side orphaned** (gap report §"Live wiring": no live importer in `client/src`). No current caller sends `newsletter_consent`, so under the new fail-safe every call lands a lead WITHOUT the comms tag — the OCAP-safe posture. When this fn is re-wired (or the dedicated newsletter forms route through it), the caller must pass `newsletter_consent="Yes"` to grant the channel. Deprecation decision (gap report follow-up #6) still open and unaffected by this fix.
- **Check 2 posture resolved as: explicit stored flag.** `newsletter_consent=Yes` is now written as a GHL custom field on consent in both consent-bearing fns. The custom-field key (`newsletter_consent`) is assumed to exist in the "A Curious Tractor" GHL location; if it doesn't, GHL will ignore the unknown key (the tag gate still holds — fail-safe). Not verified live (no GHL calls made). // TODO(tag-align): confirm `newsletter_consent` custom-field key exists in GHL, else create it.
- Consent fields used: `contact-form` → `subscribe` boolean (existing live checkbox); `newsletter-subscribe` → `newsletter_consent`/`newsletterConsent`. No new consent capture was added to live UI — that is a separate Tier-2 day-shift decision.
