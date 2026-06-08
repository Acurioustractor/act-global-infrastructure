---
session: general
date: 2026-06-09
status: ready-for-build
outcome: ALIGNMENT-SPEC
owner: Ben (rulings + Tier 2/3 verbs) · session (doc + config + dry-run scaffold)
relates_to:
  - thoughts/shared/plans/2026-06-08-contained-adelaide-campaign-crm.md   # the durable campaign-CRM module plan (P0-P4) this extends
  - thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md  # the canonical contract + R1-R11 rulings (R4 = CONTAINED representation)
  - thoughts/shared/handoffs/general/2026-06-08_contained-crm-p0-complete-build-handoff.yaml
  - wiki/concepts/ghl-audience-comms-automation.md   # the 5-layer model + consent/community gates
  - wiki/concepts/ghl-crm-taxonomy.md                # the canonical namespaces (§3)
  - /Users/benknight/Code/JusticeHub/thoughts/shared/handoffs/contained-cta-ghl-inventory.md  # full 24-CTA audit (source evidence)
  - /Users/benknight/Code/JusticeHub/output/contained-ghl-ui-build-spec.md  # the GHL UI build spec (to be re-based onto canonical)
  - /Users/benknight/Code/JusticeHub/output/ghl-contained-adelaide-audit/eligibility-verification-2026-06-09.md  # 113 eligible / 2916 blocked
produces:
  - config/campaigns/contained-adelaide-2026.json   # canonical campaign config (P1 of the campaign-CRM plan)
  - scripts/campaign-preflight.mjs                   # dry-run config validator/printer (no GHL calls)
---

# CONTAINED → GHL: full CTA / form / calendar alignment to the canonical contract

> **What this is.** The cross-repo alignment between the CONTAINED website (JusticeHub: forms, CTAs, signup, calendar) and the durable GoHighLevel system being built here in act-global-infrastructure. It executes the campaign-CRM plan's P1 (campaign config) under one locked ruling, maps every CONTAINED CTA to the canonical contract, specs the self-serve booking calendar, and lists the build sequence to the 16 Jun go/no-go.
>
> **Tier discipline.** Everything in this handoff and the files it produces is Tier 1-2 (docs, config, dry-run code). **Zero live GHL writes.** The actual tag migration, the calendar creation, the pipeline build, and any send are Tier 3 / day-shift / human-in-loop, gated to the 16 Jun go/no-go. Never queue them AFK.

## The decision that unblocks everything (Ben, 2026-06-09)

CONTAINED carried **two incompatible tag vocabularies**:

| | Live merged register route + GHL UI build spec | Canonical contract (forms-plan R4, locked 2026-06-08) |
|---|---|---|
| project | `project:contained` + `project:contained-adelaide-2026` | `project:act-jh` |
| source | `source:form` | `source:event:contained-adelaide` |
| interest | (none) | `interest:justice-reform` |
| newsletter | `newsletter-stream:contained-adelaide-invite` (+ 5 more) | `comms:justicehub-newsletter` (consent-gated) |
| state | `state:<x>` | `place:<x>` |
| lifecycle | `engagement:<x>`, `cohort:<x>`, `campaign-stage:<x>` | segment layer (see below) |

**RULING — Canonical R4 wins.** CONTAINED conforms to the one-account canonical contract. The register route, the GHL UI build spec, and the ~260 already-tagged live contacts migrate to canonical. No new top-level namespace for CONTAINED.

Why this is the right call (and cheaper than it looks): `GHL_CANONICAL` already exists in JusticeHub `src/lib/ghl/client.ts` (added by PR #38), and **4 of the 5 GHL routes already emit canonical** (`signup`, `newsletter`, `contact`, nominations). Only `/api/ghl/register` (the CONTAINED branch) and two legacy routes (`reaction`, `tour-stories`) still emit off-contract tags. Today `project:` is split (register → `project:contained`; everything else → `project:act-jh`), so "all CONTAINED contacts" segmentation is already broken. R4 fixes the split at the root: the campaign is identified by `source:event:contained-adelaide` over a `project:act-jh` base.

## The canonical CONTAINED contract (target)

Layer model (from `ghl-audience-comms-automation.md`): **DESCRIBE** (identity, never triggers a send) · **SEGMENT** (smart-lists) · **ENROL** (`comms:`, consent-granted only) · **ACT** (workflows) · **GATE** (consent + community-line).

**Every CONTAINED contact, regardless of which form they came through:**
- `project:act-jh` (identity)
- `source:event:contained-adelaide` (campaign membership = the "all CONTAINED contacts" segment key; use `source:event:contained-<city>` per stop)
- `interest:justice-reform` (identity)
- `role:<x>` (canonical role set, see role rulings below)
- `place:<state>` (from `STATE_TO_PLACE`, not `state:<x>`)
- `lane:community` + `role:storyteller` for lived-experience / youth voice (R3 OCAP: never auto-enrolled into `comms:*`; automation suppressed; explicit opt-in human-confirmed)

**Newsletter / sends:** `comms:justicehub-newsletter` is the single enrolment tag, granted **only** with `newsletter_consent=Yes` captured at the form. The "6 CONTAINED streams" in the build spec are **NOT** six new `comms:` tags. They become **smart-list segments** inside justicehub-newsletter, keyed on canonical tags (see config `newsletter.segments`). A send to "media pack" = justicehub-newsletter recipients who also have `role:media`; "funder brief" = `role:funder`; "Adelaide invite" = `source:event:contained-adelaide` + `place:sa`; etc.

**Campaign lifecycle (SEGMENT layer):** the build spec's `engagement:*` and `campaign-stage:*` are existing operational namespaces already on hundreds of live contacts. Keep them as the campaign lifecycle, keyed to CONTAINED by `source:event:contained-adelaide`. (`cohort:<x>` and `newsletter-stream:<x>` are dropped / migrated.) NOTE: whether `engagement:`/`campaign-stage:` are formal-taxonomy keepers or themselves migrate is an open item for the taxonomy worksheet; this config treats them as the lifecycle layer pending that ruling.

## CTA → canonical mapping (all 24, from the JusticeHub inventory)

Status: ✅ already canonical · 🔧 migrate to canonical · ➕ build (capture gap) · ⬜ out of scope / local-only.

### Register / book
- **#1 `/register` (CONTAINED branch)** 🔧 the one big migration. `project:contained`→`project:act-jh`; `source:form`→`source:event:contained-adelaide`; drop `project:contained-adelaide-2026`; `state:<x>`→`place:<x>`; add `interest:justice-reform`; `newsletter-stream:contained-adelaide-invite`→`comms:justicehub-newsletter` (consent-gated); align `role:<x>` to canonical; lived-experience→`lane:community`+`role:storyteller`+suppress. `cohort:<x>` → drop the tag, keep cohort in the `cohort` custom field for views.
- **#2 `/adelaide`, #3 tour-stop CTAs** ✅ redirect into #1, inherit its (migrated) contract.
- **#4 `/register-interest`** 🔧 rides `/api/ghl/signup` (already `project:act-jh`) but injects underscore tags `contained`, `contained_<role>` via customTags. Drop those; add `source:event:contained-adelaide` + `interest:justice-reform`.
- **#5 `/join` signup** ✅ canonical via `/api/ghl/signup`; add `source:event:contained-adelaide` when the signup originates on a CONTAINED page.
- **#6 `/enroll` (on-site device)** ⬜ anonymous device session by design (no contact). Product decision: offer a CRM opt-in at kiosk? (open item, low priority).

### Experience (inside-container)
- **#7 `/reaction`** 🔧 legacy `GHL_TAGS` (`Reacted`,`CONTAINED`,`contained_adelaide`,`public_visitor`,`youth_remand`). Migrate to `project:act-jh`+`source:event:contained-adelaide`+`interest:justice-reform`+`role:supporter`+`tier:curious`; reflection text → custom field; **no `comms:` without explicit consent**.
- **#8 reflection widget, #9 story widget, #12 tour-stop story** ➕ rich first-party content to Supabase, **no GHL contact**. Build: when a name/email is attached, upsert a canonical contact (`source:event:contained-adelaide`, `role:storyteller`, `lane:community` if lived-experience, no `comms:`).
- **#10 enrollment recommender** ⬜ recommendation engine, not a contact CTA.

### Activate / share / nominate
- **#11 `/share` story-form** 🔧 legacy `GHL_TAGS` on email; migrate as #7.
- **#13 `/help`, #14 `/canberra`** ✅ canonical via `/api/contact` (already `project:act-jh`+`source:event:contained`); fix `source:event:contained`→`source:event:contained-adelaide` where city is known; keep `help_options` field.
- **#15 tour newsletter footer** 🔧 canonical newsletter wiring but missing the campaign source; add `source:event:contained-adelaide` + `interest:justice-reform`.
- **#16 "Nominate a Leader"** ➕ **biggest gap.** CTA links to an empty `<section id="nominate" />`; a working backend (`/api/projects/[slug]/nominations`) exists but nothing renders a form. Build: render the nomination form → canonical tags `project:act-jh`+`source:event:contained-adelaide`+`interest:justice-reform`+`nominated_person` field (R5: field not tag).

### Host / fund
- **#18 "Back the Tour", #21 "Host the Container"** ➕ anchor / static card, no capture. Build a host/backer form → `project:act-jh`+`source:event:contained-adelaide`+`role:partner` (host) / `role:supporter` (backer)+`interest:justice-reform`; host offers → opportunity in the campaign pipeline. (Host/sponsor pricing ladder $5K-$75K is conversation-led → opportunity → Xero ACT-CN, not e-commerce.)
- **#20 funder/partner/media mailto** ➕ high-value outreach with **zero CRM capture**. Build: replace `mailto:` with a routed form (or a GHL form) that upserts `role:funder|partner|media` + opens an opportunity; reply-to stays `benjamin@act.place`.
- **#19 Donate `/back-this`** ⬜ outside contained scope; verify GHL capture separately.
- **#22 social kit, #23 passcode gates, #24 vip-dinner redirect** ⬜ not lead-capture.

## Self-serve booking calendar (chosen 2026-06-09) — this un-defers the pipeline

The campaign-CRM plan's **D1 deferred the GHL pipeline "until booking/open-viewing forms exist."** Choosing a self-serve calendar **creates that precondition**, so the "CONTAINED Adelaide 2026" pipeline moves from DEFERRED to scoped (still Tier-3 to build live).

Spec:
1. **GHL Calendar** "CONTAINED Adelaide Walkthroughs" (Tandanya, 24-25 Jun), slot length 30 min, capacity per slot, ops as owner. (Create in GHL UI/API = Tier 3, gated to go/no-go.)
2. **Website CTA**: the "Book a walkthrough" CTA (today `/contained/register?cohort=...`) points to the GHL calendar booking URL after (or instead of) the register step. Keep register as the identity-capture; calendar as the slot-capture.
3. **On booking confirmed** (GHL calendar event created): workflow sets `slot_confirmed` (date custom field, to be created) and moves the opportunity to **Booked**. This replaces the build spec's manual `engagement:booked` tag with a real booking signal.
4. **No-show / cancel**: workflow handles re-offer; never auto-drips a community-line contact.
5. **Consent**: the booking form captures `newsletter_consent` so a `comms:justicehub-newsletter` enrolment is lawful (Spam Act).

## Pipeline (now scoped) — canonical triggers

The build spec's 11 stages, re-based onto canonical triggers (replacing `project:contained-adelaide-2026` / `cohort:` / `engagement:booked` tag triggers):

| # | Stage | Canonical entry signal |
|---|-------|------------------------|
| 1 | Captured | `source:event:contained-adelaide` added |
| 2 | Needs enrichment | no `role:*` OR no org |
| 3 | Warm - review | has `role:*` + inbound signal |
| 4 | Personal invite | `role:funder` OR `role:media` OR VIP segment |
| 5 | Booking link sent | calendar link sent |
| 6 | Booked | calendar booking confirmed → `slot_confirmed` set |
| 7 | Experienced | check-in (`engagement:experienced` or check-in field) |
| 8 | Activated | journal / story / pledge captured |
| 9 | Post-week nurture | +7d after activated |
| 10 | Future city / partner | `source:event:contained-<next-city>` interest |
| 11 | Closed / no contact | done or `lane:community` no-contact |

Suppression guard (A8 in the build spec) is unchanged and must be built FIRST: DND / unsubscribe / `consent_status=No consent` / `lane:community` → strip from all `comms:*`.

## Build sequence to 16 Jun go/no-go

**Phase A — alignment (this handoff + config, Tier 1, done):** R4 ruling recorded; canonical contract defined; CTA map; config + dry-run validator scaffolded.

**Phase B — JusticeHub code migration (Tier 1 code, Tier 2 push, Tier 3 deploy):** migrate `/register` CONTAINED branch + `reaction` + `share`/tour-stories to canonical; build the 3 capture gaps that are launch-relevant (nominate form #16, host/backer #18/#21, funder/partner form #20). Wire the self-serve calendar CTA. `npm run type-check`; branch + PR. (This is JusticeHub-repo work; spec lives here, code lands there.)

**Phase C — GHL system (act-global, P1-P3 of the campaign-CRM plan):** finalize `config/campaigns/contained-adelaide-2026.json`; build the generalized dry-run preflight module (P2) on `GHLService`; derived `campaign_crm_segments` view + read-only command-center dashboard (P3, schema-verify first).

**Phase D — gated live build (Tier 3, day-shift, 16 Jun go/no-go):** create the 2 missing custom fields (`cohort`, `slot_confirmed`); create the calendar; create the pipeline + 11 stages; build A1-A8 automations on canonical triggers; **run the off-contract → canonical tag migration on the ~260 contacts** (additive-then-strip, conflict-guarded, re-assert community-line guard after each bucket); resolve the 9 multi-way duplicate contacts in the GHL UI (Kristy Bloomfield = community line). First send of every stream = preview to Ben, then enable.

## Locked rulings (Ben, 2026-06-09)

- **RC1 — role mapping → LOCKED (Professional→partner).** researcher/media/funder/community map 1:1; lived_experience→`lane:community`+`role:storyteller` (R3); **service_org + practitioner + policymaker → `role:partner`**; **advocate + artist + student → `role:supporter`** (artist also `interest:storytelling`).
- **RC2 — `engagement:`/`campaign-stage:` → LOCKED (keep).** They remain the CONTAINED lifecycle layer, keyed by `source:event:contained-adelaide`. No migration of these namespaces for this campaign.
- **RC3 — the ~260 `project:contained-adelaide-2026` contacts → LOCKED (strip).** Gated migration adds canonical, then strips the off-contract tag (additive-then-strip).
- **RC4 — booking → LOCKED (GHL native Calendar).** GHL Calendars, not an embedded form; a confirmed booking sets `slot_confirmed` and moves the opportunity to Booked.

## Decision + verification log

- 2026-06-09 — **R4 wins (Ben, AskUserQuestion):** CONTAINED conforms to canonical; register route + build spec + ~260 contacts migrate. Self-serve calendar chosen (un-defers pipeline). All CTAs in scope.
- 2026-06-09 — **RC1-RC4 locked (Ben, AskUserQuestion):** RC1 Professional→partner (service_org/practitioner/policymaker→`role:partner`; advocate/artist/student→`role:supporter`); RC2 keep `engagement:`/`campaign-stage:` lifecycle; RC3 strip legacy tag after canonical; RC4 GHL native Calendar.
- 2026-06-09 VERIFIED (read-only, live GHL, loc `agzsSZWgovjwgpcoASWG`): custom fields present except `cohort`+`slot_confirmed` (to create); no "CONTAINED Adelaide 2026" pipeline yet; eligibility gate 113 eligible / 2916 blocked; `newsletter-stream:contained-adelaide-invite`=28; `project:contained-adelaide-2026`=260. Evidence: JusticeHub `eligibility-verification-2026-06-09.md`.
- 2026-06-09 VERIFIED (read-only, JusticeHub): 24 CTAs mapped, 9 capture gaps, `GHL_CANONICAL` exists, 4/5 routes already canonical, `project:` split. Evidence: `contained-cta-ghl-inventory.md`.
- 2026-06-09 FLAGGED: a colon→underscore `tag-normalize` dry-run artifact in JusticeHub `output/ghl-contained-adelaide-audit/` is wrong-direction (would orphan the register form's colon tags); do NOT apply it.

## Changelog
- 2026-06-09 — alignment handoff created; R4 ruling recorded; canonical contract + CTA map + calendar spec + build sequence; config + dry-run scaffold produced.
- 2026-06-09 — RC1-RC4 locked; config role_map finalized (practitioner→`role:partner`), lifecycle/migration/calendar rulings recorded; status → rulings-locked.
