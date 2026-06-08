---
title: Goods (goodsoncountry.com) GHL tag-contract alignment — R8–R11 implemented
date: 2026-06-08
status: PUSHED (branch wip/goods-tag-align-2026-06-08, no PR opened)
repo: goods-asset-tracker (Acurioustractor) — LIVE repo, NOT stale goods-on-country
worktree: /Users/benknight/Code/Goods Asset Register/.claude/worktrees/tag-align-goods-2026-06-08
plan: thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md §E (R8–R11)
evidence: thoughts/shared/reviews/goods-forms-tag-mapping-2026-06-08.md
type: handoff
tier: code-only (NO live GHL API calls, NO tracers) — P4/P5 day-shift writes still pending
---

# Goods tag-contract alignment — R8–R11

## What PR #103 already did (CHECK-ALREADY-DONE result)
**Nothing relevant.** PR #103 (`fix/canon-storyteller-el-alignment`, merged 3h before this work)
touched ONLY three storyteller-data files (`v2/src/lib/data/{compendium,content,curated-quotes}.ts`)
— Annie Morrison "Elder" label, Tracy McCartney location, Gloria Turner quote key. It did NOT
touch `v2/src/lib/ghl/index.ts` or any form/route, and added NO canonical namespaces.
Verified: `git grep "project:act-gd|lane:community|comms:goods-newsletter" origin/main -- v2/**`
returned NONE on origin/main. ALL of R8–R11 + project:act-gd was still to do. No shipped work redone.

## Collision check
**No collision.** `git status -s v2/src/lib/ghl/index.ts` in the main working tree was clean —
the chokepoint is not being edited by another session. (Main has 127 other dirty files + PR #103
merged; the dirty tree was left untouched — work done in an isolated worktree off fresh origin/main.)

## What changed (file:line)
New module **`v2/src/lib/ghl/canonical-tags.ts`** — the auditable contract:
- `PROJECT_TAG = 'project:act-gd'`, `LANE_COMMUNITY = 'lane:community'`.
- `FLAT_TO_CANONICAL` map: goods-media→role:media+interest:media-pack; goods-customer→role:buyer;
  goods-bed-owner→interest:beds; goods-washer-owner→interest:washer; goods-sponsor→role:supporter;
  goods-partner-lead→role:partner; goods-capital-interest→role:funder+interest:capital;
  goods-washer-interest→role:buyer+interest:washer; goods-recipient→role:community+lane:community;
  goods-support-request→role:community+interest:support+lane:community;
  goods-story-submitter→role:storyteller+lane:community; goods-feedback→role:supporter+interest:feedback;
  goods-consent-to-contact→interest:story-followup (R11, never comms:); strategic *-target→role:*.
  The map NEVER emits comms:*.
- `toCanonicalTags()`: injects project:act-gd + source:website (public forms), expands flat→canonical,
  KEEPS flat tags (live Smart Router still branches on them), and runs the OCAP strip-guard
  (any comms:* on a lane:community contact is dropped — defense-in-depth).
- `grantNewsletterComms()`: mints comms:goods-newsletter ONLY when newsletterConsent==='Yes'.

**`v2/src/lib/ghl/index.ts`** (the single chokepoint):
- Imports the contract module; added `tagSource?: 'website'|'none'` to `ContactData`.
- `createOrUpdateContact` (~597): `tags: toCanonicalTags(data.tags, {source: data.tagSource ?? 'website'})`
  → **project:act-gd stamped on EVERY write** (priority 3) + canonical expansion + strip-guard.
- R9 lane:community added explicitly where flat tags don't carry goods-recipient:
  updateContactWithClaim (~1650), sendSms/bed-scan (~1103, tagSource:'none'), logInboundMessage
  (~1683, 'none'), logUserRequest (~1719, 'none'). The 3 primary community paths (recipient claim,
  support, bed-story) get lane:community via the FLAT_TO_CANONICAL map. createStrategicTargetContact
  set tagSource:'none' (cold prospects, no source:website, never comms:).
- R8 `addToNewsletter` (~1491): send-trigger tags (flat goods-newsletter + comms:goods-newsletter)
  granted ONLY when newsletterConsent==='Yes'; consent custom field stamped; router fired only on
  consent. No consent = lead created, NOT enrolled.
- R10 `createPartnershipContact` (~1276): fundingTier → `GHL_FIELD_CAPITAL_TIER` custom field;
  goods-tier-* tag DROPPED (no longer built). Fallback: if env field id unset, value dropped (kept
  in note + DB), not half-wired into tier:.

**`v2/src/app/api/newsletter/route.ts`**: accepts `newsletterConsent='Yes'` / boolean `consent`,
passes to addToNewsletter. All Goods newsletter forms route through here → all R8-gated by one change.

**`v2/src/app/api/contact/route.ts`**: subscribe===true → newsletterConsent='Yes' (explicit opt-in).

## Done vs remaining (by priority)
1. R9 lane:community on community paths — **DONE** (all 3 primary + 4 secondary paths).
2. R8 newsletter consent gate — **DONE** (chokepoint + both routes; fails safe without checkbox).
3. project:act-gd at chokepoint — **DONE** (every write).
4. R10 capital_tier field — **DONE** (tag dropped; field write gated on env id with safe fallback).
5. Remaining §E flat→canonical mappings — **DONE** (full map: roles, interests, source).

Nothing in priorities 1–5 left incomplete.

## UNCONFIRMED items — resolved
- **/contact `subscribe` opt-in checkbox**: RESOLVED. The `/contact` page form (`v2/src/app/contact/page.tsx`)
  has NO subscribe checkbox and never sends the `subscribe` field — the API's subscribe branch is
  currently DORMANT. Treated as: when subscribe IS sent (after a checkbox is added), true = explicit
  consent. TODO(tag-align) left in the route. The newsletter forms (footer/get-involved/sponsor/
  canberra) also have no opt-in checkbox today → they now create leads but DON'T enrol (OCAP-safe).
- **partnershipType / partnerSegment option values**: not exhaustively enumerated, but not load-bearing
  — the canonical map keys on the goods-* tags emitted (goods-partner-lead, goods-capital-interest,
  goods-washer-interest, goods-media), not on raw form values. fundingTier values flow to capital_tier
  verbatim. No mapping depends on the unenumerated segment strings.
- **live GHL_LOCATION_ID**: env-driven (inferred agzsSZWgovjwgpcoASWG); not verified here (no live calls,
  per scope). Confirm against deployed Vercel env before any tracer.

## TODOs left in code (for the day-shift P4/P5 follow-up)
- `GHL_FIELD_CAPITAL_TIER` env var + "Capital Tier" custom field in GHL (R10 field write).
- `GHL_FIELD_NEWSLETTER_CONSENT` env var (consent flag custom field — optional, mirrors act.place).
- Default-OFF newsletter opt-in checkbox on the Goods forms (lights up the R8 consent path).
- P5: re-key the GHL-UI Smart Router branches to the canonical tags, THEN flat goods-* removal can ship
  (flat tags deliberately KEPT here so live routing doesn't break before the dashboard side migrates).

## Gates
- `npx tsc --noEmit` (whole v2, via worktree node_modules): **EXIT 0, zero output** — no new errors,
  no pre-existing errors surfaced.
- 3 commits: 54b0c5e (canonical contract + R9 + project:act-gd), 8148760 (R8 consent gate),
  9183292 (R10/R11 clarity).
- Pushed: **wip/goods-tag-align-2026-06-08** → origin. No PR opened (per instructions).

## NOT done (out of scope — Tier 3 day-shift, needs Ben's verb)
No live GHL API calls. No tracers. No PR. No deploy. P4 (live tracer per form), P5 (GHL bulk tag
migration + flat-tag removal), P6 (smart-list/newsletter confirm) all remain.
