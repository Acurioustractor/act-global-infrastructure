---
title: GHL Cleanup — Master Execution Plan
status: Build-ready (plan only — every live step is Tier 3 / Ben go)
date: 2026-06-02
generated_by: ghl-cleanup-execution-plan workflow (9 agents); synthesised + filed by main session
relates_to: 2026-06-02-act-ecosystem-ghl-architecture.md · reviews/2026-06-02-ghl-tag-cleanup-review.md · handoffs/2026-06-02-act-ghl-build-spec.md
---

# ACT Ecosystem GHL — Master Execution Plan: Tag Cleanup → Next Dev Phase

> **Plan-only.** This document is the runbook an operator follows. It does not perform any live GHL write. Every live step (any workflow publish, any tag delete, any contact write, any re-opt-in send) is **Tier 3 / human-in-loop — Ben's explicit go required.** The tag foundation is settled and locked (2026-06-02); this plan takes it through the safe cleanup sequence and into the next development phase.
>
> **The iron rule that overrides everything:** a flat or stale tag is deleted only after every workflow trigger, every Smart List filter, and every producing script that emits or fires on it has been re-pointed to its canonical replacement and tested — one at a time. The GHL API cannot read workflow triggers, so every gate marked **VERIFY IN UI** is a human step in the GHL workflow builder, not a script step.
>
> **Canonical sources** (read these, do not re-derive): `thoughts/shared/handoffs/2026-06-02-act-ghl-build-spec.md` · `thoughts/shared/plans/2026-06-02-act-ecosystem-ghl-architecture.md` · `thoughts/shared/reviews/2026-06-02-ghl-tag-cleanup-review.md` · the `canonicalize()` function in `scripts/migrate-ghl-tags.mjs` (the flat→canonical map).

---

## 1. The phased order (the spine)

Five phases, strictly sequential. EXPAND breaks nothing. Nothing is deleted before its trigger is re-pointed and tested. Workflows publish only after their triggers are re-pointed.

```
PHASE 0  Tags aligned + locked (DONE)
   │
PHASE 1  EXPAND — migrate-ghl-tags.mjs --apply (additive; breaks nothing)
   │
PHASE 2  RE-POINT — per project, one trigger at a time, TEST each (workflows + smart lists + scripts)
   │
PHASE 3  CONTRACT — delete stale/junk, gated per-tag behind a verified re-point
   │
PHASE 4  PUBLISH + BUILD — re-point triggers FIRST, then publish; then the dev roadmap
```

| Phase | What happens | Tier | Gate to START | Gate to EXIT | Who |
|---|---|---|---|---|---|
| **0 — Settled** | Tag spec locked: `tier:member` (not `role:member`), Harvest shop EOI = `project:act-hv` + `interest:markets` + `role:supplier`, shop prospect = `interest:markets` + `role:buyer`, `project:` vocab aligned to business-architecture, `act-rs`→`act-core`, `act-fa`→`act-fm`, `temp:` retired. `canonicalize()` reconciled this session. | n/a | — | Spec locked (2026-06-02) | Done |
| **1 — EXPAND** | Run `migrate-ghl-tags.mjs --apply`. Every contact with a flat tag ALSO gains its canonical tag. Old flat tags stay; workflows still fire on them. Nothing breaks, nothing is removed. | **Tier 3** (live write, additive) | Phase 0 locked; dry-run (`node scripts/migrate-ghl-tags.mjs`, no flag) reviewed and clean | Dry-run re-run confirms every flat tag's contacts also carry the canonical (gap = 0 on the key pairs, esp. `goods-newsletter`→`comms:goods-newsletter`) | Ben (explicit go) |
| **2 — RE-POINT** | Per project: re-point each workflow trigger, each Smart List filter, each producing script from flat→canonical. One at a time. Test each with a single contact. Senders stay DRAFT. | **Tier 1** (script edits) + **Tier 2** (GHL Smart List edits, workflow draft edits) | EXPAND confirmed complete | Every keeper workflow + Smart List + producing script for that project is re-pointed and one-contact-tested; senders still DRAFT | Ben / operator (UI) + agent (script edits) |
| **3 — CONTRACT** | Delete stale + junk tags, gated per-tag behind a verified Phase-2 re-point. Wave 0 (pure junk) → Wave 1 (stage dupes) → Wave 2 (stale canonical) → Wave 3 (flat legacy, one at a time). | **Tier 3** (every delete) | The specific tag's re-point gate (§5 per tag) is checked off and tested | Tag deleted; its Smart Lists/workflows confirmed still firing on canonical | Ben (explicit go per wave) |
| **4 — PUBLISH + BUILD** | Re-point each draft workflow's trigger FIRST, add the `newsletter_consent=true` gate where it's a marketing send, then publish one at a time watching each. Then execute the dev roadmap (§6). | **Tier 3** (publish, re-opt-in send) | All keeper workflow triggers re-pointed + consent-gated; CONTRACT complete for that project | Workflows live; sendable Smart Lists populate as people consent; first broadcast only when the send-ready list is non-empty | Ben (day-shift, human-in-loop) |

**The launch sequence inside Phase 4** (per project, Harvest first): all workflows built + DRAFT → pre-flight check (every send-workflow reads DRAFT) → re-point trigger + add consent gate → re-publish one at a time, watching each → run the re-opt-in campaign → sendable Smart Lists populate as people click yes → first broadcast when the send-ready list is non-empty.

**AFK boundary:** Phases 2 (script edits) and the build work in Phase 4 are night-shift safe (Tier 1–2, schema-protected). EXPAND `--apply`, every CONTRACT delete, every workflow publish, and the re-opt-in send are **day-shift, human-in-loop, never queued into a background loop.**

---

## 2. Per-project re-point runbooks

> All five assume EXPAND has run and is confirmed. Each re-points one trigger at a time, tests, then the matching CONTRACT delete (§5) is gated behind it. Senders stay DRAFT through Phase 2.

### 2.1 ACT main site (ACT Core)

**Scope:** ACT Core folder · 2 workflows · 2 Smart Lists · 4 flat tags.

| Object | Type | Current (flat) | Canonical replacement | UI re-point action | One-contact test |
|---|---|---|---|---|---|
| **ACT Core — Newsletter Signup** | Workflow (marketing) | `newsletter` and/or `audience-brand` | `comms:act-newsletter` + `newsletter_consent = true` gate | Automation → ACT Core folder → open workflow → change trigger from `newsletter`/`audience-brand` to `comms:act-newsletter`. Confirm step 1 after trigger is the `newsletter_consent = true` If/Else gate; add it if missing. Save, keep DRAFT. | Add `comms:act-newsletter` + `newsletter_consent = true` to a throwaway contact → welcome email fires; a contact with `comms:act-newsletter` but consent ≠ true exits with nothing. |
| **ACT Core — Contact → Universal Inquiry** | Workflow (transactional, no gate) | `contact-form` and/or `act-inquiry` | `source:contact-form` (trigger); routing reads `role:`/`interest:` post-EXPAND | Open workflow → change trigger to `source:contact-form`. Confirm it sends ONE acknowledgement only, no drip. Save. | Submit the Contact form (or add `source:contact-form` to a test contact) → one ack fires; no second email within 48h. |
| **Smart List: "ACT newsletter — sendable"** | Smart List | `newsletter` / `audience-brand` filter | `comms:act-newsletter` AND `Newsletter Consent = true` AND `Newsletter Unsubscribed At = empty` | Smart Lists → open list → delete old tag condition → add the three conditions. Save. | Count reads ~0 (correct — nobody is consented yet). |
| **Smart List: "ACT — unrouted inbox"** | Smart List (triage, no consent filter) | `contact-form` filter (if used) | `project:act-core` AND `tier:curious` AND no `role:` tag | Replace `contact-form` filter with `has project:act-core` AND `has tier:curious` AND one `does not have role:<value>` per role. Save. | A `project:act-core + tier:curious` (no role) contact appears; a `project:act-core + role:funder` does not. |

**VERIFY IN UI:** Newsletter Signup trigger type (form-submit vs tag-add); exact trigger tag(s) on Universal Inquiry; that the two Smart Lists exist under these names; which script/handler emits `audience-brand` (×119 — large, must stop regenerating it). Spec defines the signup trigger as **Form Submitted** — if it's already form-submit, only the consent gate + in-workflow tag-stamps change, not the trigger.

### 2.2 Goods

**Scope:** 4 keeper workflows (B8–B11) · 5 Smart Lists · 3 producing scripts.

| Object | Current (flat) | Canonical replacement | UI re-point action | One-contact test |
|---|---|---|---|---|
| **Goods — Inquiry → Acknowledge** (B8, transactional) | form stamps `goods-inquiry`; trigger VERIFY IN UI | Form-submit trigger stays; "Add Tag" step emits `project:act-gd` + `interest:container`/`washer` + `role:community` + `source:website` + `tier:curious` | Confirm trigger is "Form submitted: Goods Inquiry"; update Add-Tag step to emit canonical instead of `goods-inquiry`. Save, DRAFT. | Submit Goods Inquiry test form → ack fires; contact gains `project:act-gd` + `interest:container` (not `goods-inquiry`). |
| **Goods — Goods media form** (B9, community-aware) | form stamps `goods-media`; trigger VERIFY IN UI | Form-submit stays; tags become `project:act-gd` + `interest:media` + `source:form:goods-media`; Create-Task routes to Ben | Update Add-Tag step; confirm Create-Task to Ben (required). Save, DRAFT. | Submit media form → task created for Ben, ack fires, contact gains `interest:media` and NO `tier:` tag (community contacts are never laddered). |
| **Goods — Grant Deadline** (B10, internal) | internal date/deadline trigger | No tag re-point | Confirm it triggers on a date field/calendar event, not a contact tag/list; notifies Ben only, no external email. | Trigger in test pane → Ben notified, no contact emailed. |
| **Goods — New Order Notification** (B11, internal) | order event; adds `goods`, `goods-customer` | Trigger stays; "Add Tag" steps: `goods-customer`→`role:buyer`, `goods`/`act-gd`→`project:act-gd` | Find each Add-Tag action, swap to canonical; confirm internal notification step for Ben. Save, DRAFT. | Test order/manual enrol → contact gains `role:buyer` + `project:act-gd`; Ben notified; no marketing email sent. |
| **Smart List: Goods demand register** | `project:act-gd` AND `interest:container` AND `role:community` | Already canonical | VERIFY IN UI; if built on `goods-inquiry`, re-point. | Count matches Goods Inquiry form submitters. |
| **Smart List: Goods media requests** | `project:act-gd` AND `interest:media` | Already canonical | VERIFY IN UI; if built on `goods-media`, re-point. | Count matches media submitters. |
| **Smart List: Goods supporters** | `project:act-gd` AND `role:supporter` | Already canonical | VERIFY IN UI; if on flat `goods-supporter`, re-point to `role:supporter`. | Count matches `goods-supporter ×103` after EXPAND. |
| **Smart List: Goods · Newsletter · send-ready** | `comms:goods-newsletter` AND `newsletter_consent = true` | `comms:goods-newsletter` already canonical (×186) | VERIFY IN UI; if built on flat `goods-newsletter` (×197), re-point. Consent filter last. | Count ~0 (correct). |
| **Smart List: RE-OPT-IN · Goods** | `comms:goods-newsletter` AND consent not true | already canonical | VERIFY IN UI uses `comms:goods-newsletter` not flat; second condition `consent is false OR empty`. | Non-zero (everyone tagged, not yet consented). |

**Producing scripts** (re-point before contract-delete — see §4): `clean-funder-ghl-contacts.mjs`, `seed-goods-opps-from-xero.mjs` (line 224), `project-notifications.mjs` (line 34).

### 2.3 JusticeHub + Contained

**Scope:** 1 known live workflow (B12) · 1 known live Smart List · 2 new Smart Lists · 1 script. JusticeHub is parked (revisit mid-June) — build the new lists only after it's unparked.

| Object | Current (flat) | Canonical replacement | UI re-point action | One-contact test |
|---|---|---|---|---|
| **Workflow: JusticeHub — Contained launch 2025** | `contained` and/or `contained-*` | `project:act-jh` + `interest:justice-reform` | Open workflow → trigger → change tag filter to both canonical tags. Save, keep **DRAFT** (consent gate must be added before publish). | Find a contact with both canonical tags (EXPAND added them); confirm workflow shows triggered in activity log. Do NOT publish yet. |
| **Smart List: CONTAINED leads** | `contained` filter | `project:act-jh` AND `interest:justice-reform` | Replace `has tag: contained` with both canonical. Save. | Count ≥ pre-edit count. If it drops, EXPAND hasn't run — stop. |
| **Smart List: JusticeHub · Connected** (new) | does not exist | `project:act-jh` AND `tier:connected` | Build new. | Count matches known JH Connected-rung contacts. |
| **Smart List: JusticeHub · CONTAINED · send-ready** (new) | does not exist | `project:act-jh` AND `comms:justicehub-newsletter` AND `Newsletter Consent = true` AND `Newsletter Unsubscribed At = empty` | Build new. | Reads 0 (correct). |
| **Script: `project-notifications.mjs`** | emits `justicehub`, `justice`, `youth justice`, `contained` | add `project:act-jh`, `interest:justice-reform` | Code edit (Tier 1) — see §4. | Dry-run against one contact → emits `project:act-jh` not `justicehub`. |

**VERIFY IN UI:** exact trigger on Contained launch 2025 (tag vs form-submit); any additional JusticeHub-folder workflows; whether CONTAINED leads filters on a tag vs pipeline stage; whether any contact carries `comms:justicehub-newsletter` yet (if zero, the JH re-opt-in must run first to populate it).

### 2.4 Harvest shop

**Scope:** The Harvest folder · 2 keeper workflows · 2 Smart Lists.

| Object | Current (flat) | Canonical replacement | UI re-point action | One-contact test |
|---|---|---|---|---|
| **Harvest — Shop Interest Receipt** (transactional) | `harvest-shop-interest` | `interest:markets` + `project:act-hv` | Open → trigger → change "Tag Added" to `interest:markets`. Save, DRAFT. | Add `interest:markets` to a test contact → receipt email fires within 60s. |
| **Harvest — Shop prospect → create card** (internal, no email) | `shop-prospect` | `interest:markets` + `role:buyer` | Open → trigger → change to `interest:markets` (add `role:buyer` as second condition if workflow filters on both). Save, DRAFT. | Add `interest:markets` + `role:buyer` → card appears in The Shop pipeline. |
| **Smart List: Harvest · Shop prospects** | `interest:shop` (stale, ×32) | `interest:markets` AND `project:act-hv` | Remove `interest:shop` condition → add both canonical. Save. | Count reflects known shop prospects; cross-check vs old `interest:shop ~32`. |
| **Smart List: Harvest · Shop prospects · send-ready** | `interest:shop` (stale) | `interest:markets` AND `project:act-hv` AND `Newsletter Consent = true` | Same, consent condition last. | Count 0 until re-opt-in runs (correct). |

**VERIFY IN UI:** both workflow triggers (tag-add vs form-submit — if form-submit, re-point the form handler not the trigger); whether a `shop-follow-up` drip exists; which script emits `harvest-shop-interest`/`shop-prospect` (grep `scripts/ghl-webhook-handler.mjs`); that "The Shop" pipeline exists under that name and the card-creation step targets it.

### 2.5 Harvest members

**Scope:** 3 workflows (all DRAFT) · 2 Smart Lists.

| Object | Current (flat) | Canonical replacement | UI re-point action | One-contact test |
|---|---|---|---|---|
| **Harvest — Member Welcome** (DRAFT) | Tag Added = `harvest-member` (62 contacts) | Tag Added = `tier:member` | Open → trigger → change tag from `harvest-member` to `tier:member`. Save. | Add `tier:member` to a non-consented test contact → workflow fires; consent gate exits them; no email sends. Confirm no email sent. |
| **Harvest — Member Question Receipt** (DRAFT) | Tag Added = `member-question` (3) | **Form Submitted = "Harvest member question" form** | Change trigger type from Tag-Added to Form-Submitted; select the form. If no GHL form exists, VERIFY which source populates `member-question`, point there. Save. | Submit the form (or fire the source webhook) → receipt fires; contact exits after single receipt, no drip. |
| **Harvest — Follow Welcome** (DRAFT) | **UNKNOWN — VERIFY IN UI** | `tier:connected` OR Form Submitted "Follow/newsletter" — VERIFY which | Read existing trigger first. If flat tag → change to `tier:connected`. If form-submit → keep, add `tier:connected` + `comms:harvest-newsletter` + consent gate as step 1 actions. DO NOT PUBLISH until trigger confirmed. | Add `tier:connected` to a test contact with `newsletter_consent=true` → welcome fires once, contact exits cleanly. |
| **Smart List: Harvest members** | `has harvest-member` (check in UI) | `project:act-hv` AND `tier:member` | Replace `harvest-member` with both canonical. Save. | Count ≥ old (62+). If it drops, a contact has `tier:member` but not `project:act-hv` — investigate. |
| **Smart List: Harvest connected** | `harvest-newsletter` or `tier:connected` (VERIFY) | `project:act-hv` AND `tier:connected` | Replace flat filter with both canonical. Save. | Count nonzero (5+ per dry-run). |

**VERIFY IN UI:** Follow Welcome trigger; Member Question Receipt source (tag/form/webhook); actual Smart List names (may need renaming not replacing); whether any workflow triggers on `member-comments` or `role:member`.

---

## 3. Cross-project non-regression notes (the silent breaks)

These are the failures that produce no error — a send list that quietly empties, a drip that double-fires, a welcome that goes dark. Each has a concrete pre-delete check.

| # | Risk | Where | The check (do BEFORE the delete) |
|---|---|---|---|
| 1 | **`comms:partner-drip` (×229) double-fires.** If its trigger is accidentally changed to a flat equivalent during Goods re-pointing, 229 contacts restart the drip. | Goods | Before touching any Goods workflow, open partner-drip, confirm trigger is `comms:partner-drip` (canonical), do NOT modify it. It is not a re-point target. |
| 2 | **`goods-newsletter` (×197) vs `comms:goods-newsletter` (×186) — 11-contact gap.** Deleting the flat tag before the gap closes drops 11 contacts from the Goods newsletter silently. | Goods | After EXPAND, re-run `node scripts/migrate-ghl-tags.mjs` (dry-run) and confirm gap = 0. If non-zero, EXPAND missed contacts — investigate. Do not delete `goods-newsletter` until the Smart List is on `comms:goods-newsletter` AND gap = 0. |
| 3 | **Newsletter Signup unreachable after `newsletter`/`audience-brand` deleted.** New signups arrive with only `comms:act-newsletter`; if the workflow still triggers on the flat tag it never fires. | ACT Core | After re-pointing to `comms:act-newsletter`, submit the footer form, confirm welcome fires, BEFORE deleting the flat tags. |
| 4 | **"ACT newsletter — sendable" silently empties.** If it still filters on the flat tag when deleted, the list goes to zero with no error and broadcasts go to no one. | ACT Core | After updating filters, confirm count is stable (~0 now, not a spurious non-zero from a stale filter). |
| 5 | **Bare `contained` not caught by the regex.** `^contained-(.+)$` matches `contained-lead` etc. but NOT the bare word `contained`. | JusticeHub | Before retiring `contained`, query the Supabase mirror for contacts with `'contained'` but NOT `'project:act-jh'` — must be zero. Add a bare-word rule to EXPAND before any delete. |
| 6 | **Contained launch publishes before the consent gate.** B12 is a broadcast; publishing before the `newsletter_consent=true` gate broadcasts to all `project:act-jh` contacts regardless of consent. | JusticeHub | Sequence: (a) re-point trigger → (b) add consent gate → (c) publish. Never skip (b). |
| 7 | **Shop Interest Receipt / Shop card fires on nobody.** Re-pointing to `interest:markets` before EXPAND wrote it leaves contacts with only the flat tag out of scope. | Harvest shop | Run EXPAND first; verify `interest:markets` on all `harvest-shop-interest` contacts; then re-point. |
| 8 | **The Shop pipeline empties.** Deleting `shop-prospect` before the card-creation workflow is re-pointed means new enquiries produce no cards, silently. | Harvest shop | Re-point, send a live test contact through (confirm card), THEN retire `shop-prospect`. |
| 9 | **Member Welcome / Follow Welcome miss existing members or go dark.** Triggers fire on tag-ADD, not existing tags; retiring a flat trigger tag before re-pointing kills the welcome silently. | Harvest members | Run EXPAND first (verify all 62 `harvest-member` also have `tier:member`). For Follow Welcome: read trigger in UI, re-point, test, THEN retire `harvest-newsletter`. |

---

## 4. Producing-script update spec

Five scripts touch GHL tags. Two are pass-through (no change), one is read/match (additive), two are writers (substitute canonical). All script edits are **Tier 1** (local) and must land before the matching flat tag is contract-deleted, so the script does not regenerate a tag you just deleted.

| Script | Tag operation | Change required |
|---|---|---|
| `project-notifications.mjs` | READ/MATCH only (no GHL write) | Add canonical alongside flat strings — do not remove flat |
| `clean-funder-ghl-contacts.mjs` | WRITE (`addTagToContact`) | Replace all flat tags in `defaultTags`/`funderTags` with canonical |
| `seed-goods-opps-from-xero.mjs` | WRITE (creates contact with tags) | Strip `goods` + `auto-created-from-xero`; keep `project:act-gd` + `source:xero` |
| `ghl-webhook-handler.mjs` | NONE (verbatim mirror to Supabase) | No change — stores whatever GHL sends |
| `sync-content-to-ghl.mjs` | NONE (social posts, no contact tags) | No change |

### 4.1 `project-notifications.mjs` — additive only

Extend the `PROJECTS` map (lines 32–47) and the two `contactTags.includes()` checks (lines 127–128) so already-migrated contacts still fire notifications. Add canonical, keep the flat strings.

| Project key | Add to `tags` array |
|---|---|
| `justicehub` | `project:act-jh`, `interest:justice-reform` |
| `goods` | `project:act-gd` |
| `empathy-ledger` | `project:act-el` |
| `picc` | `project:act-pi` |
| `harvest` | `project:act-hv`, `place:witta` |
| `contained` | `project:act-jh`, `interest:justice-reform` |
| `act-monthly` | `project:act-core` |
| `qfcc` | `project:act-el` — VERIFY IN UI |
| `first-nations` | `project:act-jh`, `interest:justice-reform` |
| `diagrama` | `project:act-jh` — VERIFY IN UI |
| `mingaminga`, `fishers-oysters`, `smart`, `confessional`, `maningrida` | no canonical code assigned — leave as-is, flag VERIFY IN UI |

Inline checks (additive):
```js
const isHighValue = contactTags.includes('partner') || contactTags.includes('funder')
  || contactTags.includes('role:partner') || contactTags.includes('role:funder');
const isResponsive = contactTags.includes('responsive'); // no canonical — unchanged
```

### 4.2 `clean-funder-ghl-contacts.mjs` — substitute canonical (lines 43–113)

| Flat | Canonical |
|---|---|
| `goods` | `project:act-gd` |
| `goods-newsletter` | `comms:goods-newsletter` |
| `act-gd` / `act-jh` | `project:act-gd` / `project:act-jh` |
| `funder` / `goods-funder` | `role:funder` (collapses) |
| `partner` / `goods-partner` | `role:partner` (collapses) |
| `contained` | `project:act-jh` + `interest:justice-reform` |
| `goods-supporter` | `role:supporter` |
| `justicehub` | `project:act-jh` |
| `paused` | no canonical — use `ops:needs-review` or omit; **VERIFY IN UI** which Minderoo workflows trigger on `paused` first |
| `qbe-catalysing-impact` | no canonical — use `source:qbe-catalysing-impact` if attribution wanted; **VERIFY IN UI** |

Per-funder concrete arrays (snow / minderoo / qbe / dusseldorp / jcf / centrecorp / streetsmart / rotary / paul-ramsay / tim-fairfax) as specified in the producing-script spec — each `defaultTags`/`funderTags` rewritten to the canonical equivalents above.

### 4.3 `seed-goods-opps-from-xero.mjs` — line 224

```js
// OLD
tags: ['goods', 'project:act-gd', 'auto-created-from-xero', 'source:xero'],
// NEW
tags: ['project:act-gd', 'source:xero'],
```
Remove `goods` (redundant) and `auto-created-from-xero` (junk, in the `canonicalize()` drop list). Keep `project:act-gd` + `source:xero`.

---

## 5. CONTRACT delete order

> Every delete is **Tier 3 — Ben's explicit go.** "VERIFY IN UI" = a human reads the trigger in the GHL builder; the API can't. Waves 1 and 2 can run in parallel once EXPAND is confirmed.

### WAVE 0 — delete immediately (pure junk, nothing depends on them)

Flagged `drop: 'junk'` in `canonicalize()`, covered by `scripts/delete-junk-ghl-tags.mjs`. Run the dry-run, eyeball, then `--apply`.

- `gone-from-ghl*` (all dated variants, ~656 instances / ~328 contacts) — EXPAND already skips these contacts.
- `test-submission` (×19), `codex-smoke-test` (×4), `test`, `webhook-test`, `test-delete-me`
- `context:*` (all variants), `route: /`, `auto-triage`
- `auto-created-from-xero` (×8) — confirm not in any Smart List filter first (30-sec VERIFY IN UI)
- `ai-flagged`, `no email` — confirm absence in Smart Lists, then delete
- `*-review-2026-*`, `needs-name-review`, `duplicate-review`, `migration-review`

**Gate:** none — provably inert. Eyeball the dry-run before `--apply`.

### WAVE 1 — after EXPAND (pipeline-stage duplicates + engagement namespace)

Flagged `drop: 'stage'`. The Goods pipeline stage column is source of truth; these duplicate it and have no canonical counterpart.

- `goods-stage-prospect` (×56) — Gate: Goods "Prospect" stage count ≥ 56 in UI
- `goods-tier-aware` (×34), `goods-tier-engaged` (×25), `goods-tier-champion` (×17), `goods-tier-active` (×12) — go together once Goods Journey stages verified
- `goods-stage-customer`, `goods-stage-active` — Gate: Customer/Active stage verified
- `goods-signal` — Gate: VERIFY no Goods workflow triggers on it
- `engagement:lead` (×14), `engagement:active` — retired namespace; Gate: VERIFY no workflow/Smart List references `engagement:*`

### WAVE 2 — stale canonical (wrong meaning, correct namespace)

EXPAND has already added the correct replacement to the same contacts.

**2a. `role:member` (×57)** — membership is `tier:member`. Gates: EXPAND confirmed (`tier:member` on the 57) · VERIFY no workflow triggers on `role:member` · VERIFY no Smart List filters on it · then delete the tag definition.

**2b. `interest:shop` (×32)** — canonical is `interest:markets`. Gates: EXPAND confirmed · B4 + B5 triggers re-pointed and tested · no Smart List on `interest:shop` (the send-ready list re-pointed) · then delete.

**2c. `temp:*` (×84)** — retired namespace, NOT migrated (intentional, surfaces as a CONTRACT signal). Variants: `temp:warm` (×41), `temp:cooling` (×13), `temp:hot` (×12), `temp:cold` (×11), `temp:steady` (×6), `temp:new` (×1). Gates: VERIFY no workflow triggers on any `temp:*` (if one does, it's a stale heat-model workflow — delete it or re-point to a `tier:` rung) · no Smart List references `temp:*` · optional one-off heat→tier map for contacts lacking any `tier:` (`hot`→`tier:active`, `warm`→`tier:connected`, `cold`/`cooling`→`tier:curious`) · then delete all six in one batch.

### WAVE 3 — flat legacy tags (one at a time, per-workflow re-point)

Each is a live trigger or filter until its re-point is tested. Delete order follows the build-spec RE-POINT order.

- `harvest-member` — Gate: Member Welcome (B1) + Member Question Receipt (B2) re-pointed + tested; "Harvest members" Smart List re-pointed; no script still emits it.
- `harvest-shop-interest` — Gate: B4 re-pointed + tested; producing script emits `interest:markets`.
- `shop-prospect` — Gate: B5 re-pointed + tested; producing script emits `interest:markets` + `role:buyer`.
- `goods`, `act-gd`, `project-goods` (synonyms, delete together) — Gate: B8 re-pointed + tested; `seed-goods-opps-from-xero.mjs` updated.
- `goods-inquiry` — Gate: B8 re-pointed + interest-side mapping (`interest:container`/`washer`) confirmed on contacts. After the synonyms above.
- `goods-newsletter` — Gate: Goods Newsletter Signup re-pointed to `comms:goods-newsletter`; `clean-funder-ghl-contacts.mjs` updated; send-ready Smart List re-pointed; gap = 0 (§3 risk 2).
- `newsletter`, `audience-brand` (both → `comms:act-newsletter`, delete together) — Gate: ACT Core Newsletter Signup re-pointed; sendable Smart List re-pointed.
- `harvest-newsletter` — Gate: Harvest Newsletter Signup re-pointed to `comms:harvest-newsletter`; send-ready Smart List re-pointed.
- `harvest`, `the harvest` — Gate: `ghl-webhook-handler.mjs` + `project-notifications.mjs` emit `project:act-hv`; VERIFY no workflow trigger on the flat strings.
- `justicehub`, then `act-jh` (synonyms — `justicehub` first) — Gate: B12 re-pointed + tested; `project-notifications.mjs` emits `project:act-jh`.
- `contained`, `contained-*` — Gate: B12 re-pointed; bare-word `contained` rule added to EXPAND (§3 risk 5).
- `audience-partner`, `partner`, `goods-partner` (→ `role:partner`) — Gate: `ghl-webhook-handler.mjs` emits `role:partner`; VERIFY no workflow filters on `audience-partner`.
- `audience-funder`, `goods-funder`, `funder`, `grant` (→ `role:funder`) — Gate: VERIFY no workflow triggers; re-point any Goods funder drip first.
- `audience-storyteller`, `storyteller` — Gate: VERIFY no send workflow fires on these (community line); add `consent:needed` to the ~37 `audience-storyteller` contacts (EXPAND should have — verify) before deleting.
- Past-event flat tags (`harvest-locals-day`, `eoi-gathering-march-2026`, Parliament House variants, `witta`) — Gate: VERIFY no live trigger; `source:event:*` attribution kept by EXPAND, only the standalone label retired.

**HOLD — needs Ben's decision before delete:**
- `harvest-inbox` (×13) — `ops:needs-review` vs junk (cleanup review §5B). Re-label or keep.
- `contact` (×5) — too vague; if it's a role signal, reclassify 5 contacts first.
- `project:act-ca` (×12), `project:act-gl`, `project:act-mr`, `project:act-rp`, `project:act-ra`, `project:act-cf` (×1 each) — stray/undocumented project codes. One may be real. Identify with Ben before deleting.
- `project:act-rs` (×15) → should map to `project:act-core` (Regen Studio folds into ACT Core). Verify EXPAND added `project:act-core`, then delete.
- `project:act-fa` (×1) → almost certainly a typo for `act-fm` (Farm). Add `project:act-fm` to the one contact, then delete.

| Wave | Act now? | Blocker |
|---|---|---|
| 0 — pure junk | YES (dry-run → `--apply`) | none |
| 1 — stage dupes | after EXPAND | EXPAND `--apply` |
| 2a `role:member` | after EXPAND + UI trigger check | workflow re-point check |
| 2b `interest:shop` | after EXPAND + B4/B5 re-pointed | shop re-point |
| 2c `temp:*` | after UI trigger check | no workflow on `temp:*` |
| 3 — flat legacy | one at a time | each tag's specific re-point + test |

---

## 6. Post-cleanup development roadmap

> **Prerequisite:** EXPAND → RE-POINT → CONTRACT complete; all 6 draft Harvest keeper workflows (B1–B7) re-pointed and re-published with the `newsletter_consent=true` gate; the 3 stale canonical classes (`role:member` ×57, `temp:*` ×84, `interest:shop` ×32) and 206 junk instances deleted. Each item's "depends on" must ship before its first task.

### 6.1 Per-project Journey boards + stage→`tier:` sync

One GHL Membership Journey pipeline per active project, five identical stages: **Curious → Connected → Member → Active → Steward.** Stage is source of truth; a stage-change automation writes the matching `tier:` tag so stage and tag never diverge.

| # | Board | Pipeline ID | Notes |
|---|---|---|---|
| 1a | Harvest Membership Journey | `ijPN2jEoEuMshXXKbQ4z` (live) | Verify 5 stages match canonical names. Run the ~170-contact seating sweep (safe while senders DRAFT). |
| 1b | ACT — Ecosystem Journey | New (VERIFY IN UI) | Step-0 intake rewrite; re-point "ACT — Intake" to branch by `projectCode`. Until built, ACT-IN contacts seat wrong on Harvest. |
| 1c | Goods Supporter Journey | `JvBFYpVpyKsw899lkFgj` (live) | Verify stages. Map the 3 Goods pipelines (Supporter/Buyer/Demand) to the belonging model — see §6.5. |
| 1d | JusticeHub Journey | New (parked) | Build only after CONTAINED unparked (mid-June). |
| 1e | ACT Core / Empathy Ledger | EL = `aRGmSaMh62wPO2R0Bt4g` (live) | EL: org-partners only, no storytellers, no `tier:`. ACT Core: VERIFY a board exists. |

**`System — Stage → Tier Sync` automation** (one, reused per pipeline): trigger on **Pipeline Stage Changed** → (1) read new stage name → (2) add matching `tier:<rung>` → (3) remove the other four `tier:` tags. Internal, no email, no consent gate. This is what makes the cross-project `tier:` rollup Smart Lists correct.

**Depends on:** EXPAND + RE-POINT + CONTRACT complete; seating sweep with all senders DRAFT. **Effort:** 1b ~2h; sync ~1h/pipeline; Harvest (1a+sync) ~3h; Goods (1c+sync) ~2h; JH + EL later ~2h each.

### 6.2 Ladder-lift workflows (A0–A4) driven by the value-exchange matrix

One A-series set per project, Harvest first. The value matrix (give/get per `role:` × `tier:` cell) drives the email subject, body, and CTA directly.

| Workflow | Trigger | Gate | Effort |
|---|---|---|---|
| A0-HV — Newsletter Signup | Form submitted (Harvest opt-in) | Sets `newsletter_consent=true` — this IS the consent act | 1h |
| A1-HV — Welcome (Curious→Connected) | Tag added `tier:connected` | consent gate first step | 1h |
| A2-HV — Nurture + Ask (Connected→Member) | Tag added `tier:connected` | consent gate; goal-exit if `tier:member` | 2h |
| A2b-HV — Member Conversion | Tag added `role:member` (CSA join) | internal rung-change; consent branch on welcome | 1h |
| A3-HV — Activation (Member→Active) | appointment booked/attended; OR `source:event:*`; OR `role:volunteer` | internal + consent branch + Ben task | 2h |
| A4-HV — Steward Nudge | Tag added `tier:active` + repeat-behaviour filter | internal task only, no email | 1h |

Then replicate A0–A4 for Goods with Goods copy; JH/ACT Core after Goods is proven.

**Depends on:** §6.1 boards + seating sweep; value-matrix ⚑ cells confirmed by Ben (§6.5); `newsletter_consent` field live (shipped). Senders stay DRAFT until the coordinated launch (§6.4). **Effort:** A0–A4 Harvest ~8h (incl. email copy); Goods ~5h; each subsequent project ~4h.

### 6.3 Project-site forms → four-part capture signature

Every site form handler stamps `project:<x>` + `tier:connected` + `comms:<x>-newsletter` + `source:<how>` (+ `consent:needed` if it captures a story/quote/photo), applied in code at the GHL-client chokepoint (testable, consistent).

| Site | Repo | Status | Task |
|---|---|---|---|
| act.place (ACT Core / ACT-IN) | `act-regenerative-studio` | DONE (PR #51 deployed) | Confirm `projectCode` default = `act-in` not `act-hv` |
| The Harvest | `The Harvest` (separate repo) | Not canonical | Emit `project:act-hv` + `tier:connected` + `comms:harvest-newsletter` + `source:harvest-website`; drop legacy flat tags. VERIFY current tags in UI. |
| Goods on Country | `Goods Asset Register/v2` | Not canonical | `project:act-gd` + `comms:goods-newsletter`; OCAP gate — add `consent:needed` if form captures storyteller content |
| JusticeHub | `justicehub.com.au` | Parked | Align when CONTAINED unparked |

**The check:** every entry point answers "where did this person come from?" — a GHL arrival with no `source:` tag is a capture-signature failure. **Depends on:** canonical tags EXPAND-ed; Harvest wiring couples with §6.4 (the wiring change and re-opt-in are the same moment). **Effort:** Harvest ~2h, Goods ~2h, each subsequent ~1.5h.

### 6.4 Harvest 20-June launch

The cluster that turns the structure into an emailable audience. Depends on §6.1–6.3 proven on Harvest.

**6 draft workflows to re-point + publish (in order):** B1 Member Welcome (fold into A2b) · B2 Member Question Receipt (transactional, form-submit) · B3 Follow Welcome (`tier:connected`; VERIFY trigger; may fold into A0/A1) · B4 Shop Interest Receipt (`interest:markets`, transactional) · B5 Shop prospect → card (`interest:markets` + `role:buyer`, internal) · B6/B7 Locals Day / EOI Gathering (`source:event:*`; REVIEW — delete if events are past).

**3 calendar-tag workflows (A3 Activation triggers for Harvest):** Cal-1 appointment booked/attended → `source:event:<name>` + Ben thank-you task · Cal-2 tag added `source:event:*` → rung-lift + recognition · Cal-3 tag added `role:volunteer` → rung-lift + consent-branched recognition email.

**Harvest code deploy:** merge + deploy `wip/harvest-launch-fixes-2026-06-02` (reconciled to `project:act-hv`, drop `role:member`, shop → `interest:markets`) after a green build · confirm `projectCode` defaults in `act-regenerative-studio` · **the 139 re-opt-in** (Harvest contacts with `comms:harvest-newsletter` but consent ≠ true) — one-time transactional confirm. This is the only thing that turns Harvest from 0 emailable people into a real audience. **Day-shift, human-in-loop, explicit Ben go. Never AFK, never queued.**

**Launch sequence:** all workflows DRAFT → pre-flight (every send-workflow reads DRAFT) → re-publish one at a time, watching each → run re-opt-in → send-ready lists populate as people click yes → first broadcast when `Harvest · Newsletter · send-ready` is non-empty. **Effort:** 6 re-points ~3h; 3 calendar triggers ~2h; code deploy ~1h; re-opt-in setup ~1h (running it is day-shift, not a code task).

### 6.5 Open value-matrix cells + community lane (need Ben + community)

⚑ cells block §6.2 email copy — nothing in §6.2 goes to DRAFT until the relevant cell is confirmed:
- `role:funder` × `tier:steward` GIVE — the specific Steward ask (board intro? co-investment?) is a relationship call. **Ben.**
- `role:buyer` purchase as `action:` — which tag records a purchase, and is buyer movement automated or manual. **Ben.**
- `role:partner` governance rung — what ACT offers/asks at Steward (advisory seat? MoU? governance role?). **Ben.**

**Community lane** (`role:community`, `role:community-controlled`, `role:storyteller`, `role:elder`): give/get is a PLACEHOLDER and must NOT be written by the model — co-authored with community, grounded in OCAP, reviewed against the consent-as-infrastructure framework. Until then: no `tier:` tag, no Journey pipeline, no ladder-lift, no automated send; human-touch only, managed via `consent:`. When co-authored, it becomes a section of `wiki/concepts/ecosystem-value-exchange.md` — documentation governing relationships, not a tag/workflow/field.

**Seeded `tier:` decision** (82 Curious / 4 Connected / 57 Member, from an import, not real `action:` gives): Ben decides (a) accept the seed and let ladder-lift govern forward, or (b) backfill `action:` evidence (e.g. tag the 57 Members `action:contributed`). Affects what "Stuck — Connected 30+ days" shows on day one; does not block §6.1–6.4.

### Dependency graph

```
TAG CLEANUP (EXPAND → RE-POINT → CONTRACT)
  └─▶ 6.1 Journey boards + stage→tier sync (Harvest first)
        └─▶ 6.2 Ladder-lift A0–A4 (Harvest first)
               (parallel) 6.3 Site form wiring (Harvest + Goods)
               └─▶ 6.4 Harvest 20-June launch
                     ├─ 6 draft re-points + publish
                     ├─ 3 calendar-tag A3 triggers
                     ├─ Harvest site code deploy
                     └─ 139 re-opt-in [DAY-SHIFT, explicit Ben go]
  6.5 ⚑ Ben + community inputs (unblocks 6.2 copy)
```
Goods replicates 6.1–6.3 after Harvest is proven; JusticeHub + ACT Core + EL follow Goods. The `tier:` tag is already the cross-project unifier — each project joining adds boards and workflows without changing the tag vocabulary.

---

## 7. Non-regression guarantee

**Three hard guarantees:**
1. **EXPAND is additive — it breaks nothing.** It only ADDS canonical tags alongside flat ones. No tag is removed, no workflow is touched, no contact loses a segment. After EXPAND, every workflow still fires exactly as before.
2. **No delete before a verified re-point.** A flat or stale tag is deleted only after every workflow trigger, every Smart List filter, and every producing script that fires on or emits it has been re-pointed to its canonical replacement and one-contact-tested. Per-tag gates are enumerated in §5.
3. **Publish only after re-point.** A workflow's trigger is re-pointed to its canonical tag (and, for marketing sends, the `newsletter_consent=true` gate is confirmed as step 1) BEFORE it is published. No send-workflow is published while still firing on a flat tag that is scheduled for deletion.

**The one principle:** the GHL API cannot read workflow triggers — so every re-point verification is a manual UI step, done one trigger at a time. When a step says VERIFY IN UI, that is a human reading the GHL workflow builder, never a script's assumption. A silently-empty send list and a silently-dead welcome are the expensive failures; the per-tag gate exists to catch them before the delete, not after.

---

## 8. What needs Ben

**Tier-3 go-points (explicit verb required, day-shift, human-in-loop):**
- **EXPAND** — `migrate-ghl-tags.mjs --apply` (live additive write to GHL). Run only after the dry-run is reviewed.
- **Every CONTRACT delete** — Waves 0–3, via `delete-junk-ghl-tags.mjs --apply` or scoped tag-delete calls. One gate per tag.
- **Every workflow publish** — each keeper workflow, only after its trigger is re-pointed and (for marketing) consent-gated.
- **The 139 Harvest re-opt-in send** — one-time transactional confirm. The single thing that creates an emailable audience. Never AFK, never queued.

**Open ⚑ decisions (block downstream build):**
- Value matrix: `role:funder`×`tier:steward` ask · `role:buyer` purchase `action:` tag · `role:partner` governance rung (§6.5) — blocks §6.2 email copy.
- Community lane give/get — co-authored with community + OCAP, not model-writable (§6.5).
- Seeded-`tier:` accept vs backfill `action:` evidence (§6.5).

**HOLD-for-identification stray tags (do not delete until Ben confirms):**
- `harvest-inbox` (×13) — ops tag or junk?
- `contact` (×5) — role signal or junk?
- `project:act-ca` (×12), `project:act-gl`, `project:act-mr`, `project:act-rp`, `project:act-ra`, `project:act-cf` (×1 each) — stray/undocumented codes; one may be a real project.
- `project:act-rs` (×15) → confirm folds to `project:act-core` before delete.
- `project:act-fa` (×1) → confirm typo for `act-fm`, add `project:act-fm` to the one contact, then delete.
