---
title: Whole-system website forms → GHL tag-contract alignment (5 codebases, one account)
date: 2026-06-08
status: PROPOSED — awaiting Ben's per-form rulings (R1–R7) + verb to execute
type: plan
owner: Ben (rulings + Tier 2/3 verbs) · session (execution)
decision_locked: ONE GHL account ("A Curious Tractor" agzsSZWgovjwgpcoASWG) — all sites conform to ONE canonical contract (Ben, 2026-06-08)
relates_to:
  - thoughts/shared/reviews/website-forms-tag-contract-alignment-2026-06-08.md  (the review this plan executes)
  - wiki/concepts/ghl-audience-comms-automation.md   (THE contract — §"Forms → tag contract", 5-layer model)
  - wiki/concepts/ghl-crm-taxonomy.md                (THE vocabulary — §3 canonical namespaces)
  - thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md  (the gated tag-migration input)
repos:
  - act-regenerative-studio   (act.place — 7 formTypes)
  - JusticeHub                (justicehub.com.au — 5+ GHL routes, OWN flat vocab)
  - empathy-ledger-v2         (empathyledger.com — World Tour forms, OWN vocab; SCOPE conditional, see R7)
  - theharvest                (theharvestwitta.com.au — Supabase edge fns: contact-form/newsletter-subscribe/community-submit + server/gohighlevel.ts; LARGELY PRE-ALIGNED, see scope)
  - goods-asset-tracker       (goodsoncountry.com — Next v2: get-involved/canberra follow-form/bed contact-row/admin reach-out; mapping TODO)
---

# Whole-system forms → GHL tag-contract alignment

## Goal
Every public form across ACT's web surface writes a deterministic, namespaced
GHL tag/field set that conforms to the ONE canonical contract — at the source —
BEFORE automations switch on (a wrong tag = a wrong send; for community-line
people a wrong send is a relationship breach). Then migrate existing off-contract
tags in the one account, and confirm the lists + 4 newsletters are clean.

## Scope (revised 2026-06-08 PM — corrected from 3 to 5 codebases)
**Correction:** the original review marked the-harvest + goods as "no live GHL forms, OUT".
That was WRONG — it assessed two dead repos (`the-harvest`, `goods-on-country`). The LIVE
sites are served by different repos that BOTH have substantial live GHL integration:
`theharvest` (theharvestwitta.com.au) and `goods-asset-tracker` (goodsoncountry.com). Ben
2026-06-08: fold both in. **Five** live codebases write into the single "A Curious Tractor" account:
- **act-regenerative-studio** — 7 formTypes via `/api/forms/submit` (newsletter FIXED/undeployed; 5 unaligned).
- **JusticeHub** — 5+ `/api/ghl/*` + `/api/contact` + `/api/contained/nominations` routes, ENTIRELY flat vocab.
- **empathy-ledger-v2** — World Tour `EmailCaptureForm` + `ContactForm` (own vocab; multi-tenant — **R7 gates inclusion**).
- **theharvest** — Supabase edge fns (`contact-form`, `newsletter-subscribe`, `community-submit`, `ghl-webhook`) + `server/gohighlevel.ts`; GardenLaunch/GetInvolved forms. **LARGELY PRE-ALIGNED** already: PR #26 "tag taxonomy" + "Phase 3 code-flip" emit canonical-only (`project:act-hv` at the GHL chokepoint, `comms:harvest-newsletter`, `role:supplier`, `interest:markets`; dropped `role:member`/flat aliases). Action here is **verify against the contract**, not rebuild — see §D.
- **goods-asset-tracker** — Next `v2/`: `get-involved` (multi-form), `canberra/follow-form`, `bed/[id]/contact-row`, admin `reach-out/compose-form`. **Per-form CURRENT→TARGET mapping TODO** (fresh-context review of v2 form handlers) — see §E.

> §D (theharvest) and §E (goods-asset-tracker) per-form mappings are NOT YET WRITTEN — each is a focused fresh-context review per the plan's own "best in FRESH context per repo" rule. This turn corrected scope + inventory only.

## The canonical target (from the two wiki docs — do not re-derive)
- **5-layer model:** DESCRIBE (identity tags) · SEGMENT (smart-lists) · ENROL (`comms:`) · ACT (workflows) · GATE (consent + community-line). Golden rule: **identity tags never trigger a send; only `comms:` does, and `comms:` is granted by the consent-capturing form/workflow — never a hand-added flat tag.**
- **Namespaces (taxonomy §3):** `project:` (act-core/gd/hv/jh/el/…) · `role:` (funder/partner/buyer/supporter/storyteller/researcher/media/community/…) · `comms:` (act/goods/harvest/justicehub-newsletter · *-drip) · `interest:` (justice-reform/storytelling/volunteer/…) · `tier:` (curious→connected→member→active→steward) · `ring:` (5/15/50/150 — hand-set) · `place:` (state nt/qld/nsw…/community:*) · `source:` (website/event:<slug>/inbound/…) · `lane:community` (⇒ ZERO `comms:`).
- **Gates (Layer 5):** consent explicit only (`newsletter_consent=Yes`, never implied from inquiry — Spam Act 2003); community-line ⇒ no drips ever (OCAP).
- **4 newsletters (D1 locked):** `comms:act-newsletter` · `comms:goods-newsletter` · `comms:harvest-newsletter` · `comms:justicehub-newsletter`.

---

## Per-form contract mapping (CURRENT → TARGET)
Legend: ✅ resolved (obvious from taxonomy) · ⚠️ **needs Ben's ruling (Rn)**.

### A. act-regenerative-studio (act.place)
| formType | Current (flat / drift) | Target (canonical) | Note |
|---|---|---|---|
| `newsletter` | (FIXED on branch) | `source:website` · `role:supporter` · `newsletter_consent=Yes` · `comms:act-newsletter` | ✅ deploy + tracer pending (Tier 3) |
| `contact` | flat `Context:/Route:/Source:` | `source:website` · `role:supporter` · `project:*` (from context) · NO consent | ✅ namespace form tags; provenance → `fields` |
| `csa` | bare `source:website` default | `source:website` · `project:act-hv` · `role:supporter` · `interest:food`+`membership` | ⚠️ R1 (CSA = Harvest community-supported-agriculture? confirm project + interests) |
| `farm-stay` | none | `source:website` · `project:act-fa` · `role:supporter` · `interest:venue` | ⚠️ R1 |
| `residency` | none | `source:website` · `project:act-hv\|fa` · `role:supporter` · `interest:workshops` | ⚠️ R1 |
| `payout-wall-contest` | none | `source:website` · `interest:justice-reform` · `role:supporter` | ⚠️ R1 (Foundation Contest — which project/interest?) |
| `flagship-inquiry` | none | `source:website` · `role:partner` · `partnership_type` field · **NO auto-drip** | ⚠️ R1 (is flagship = partnership inquiry → human-routed?) |
| `volunteer` | `role:volunteer` | `role:supporter` · `interest:volunteer` · Volunteer-Interests field | ✅ taxonomy §3 |
| `event` | `source:event-signup` | `source:event:<slug>` · `project:*` | ✅ taxonomy §3 |

### B. JusticeHub (writes to A Curious Tractor — all flat, all to migrate)
| Route / formType | Current flat tags | Target (canonical) | Note |
|---|---|---|---|
| `/api/ghl/newsletter` | `Newsletter`,`JusticeHub`,`STEWARD`/`RESEARCHER` | `source:website` · `project:act-jh` · `role:supporter` · `newsletter_consent=Yes` · `comms:justicehub-newsletter` | ✅ (steward/researcher handled below) |
| `/api/ghl/signup` (steward) | `JusticeHub`,`STEWARD`, role tags, `STATE_*` | `project:act-jh` · `tier:steward` · `role:*` · `place:<state>` · opportunity in Steward pipeline (keep) | ⚠️ R2 (STEWARD → `tier:steward` vs a `role:`?) |
| signup role tags | `ROLE_ORGANIZATION/MEDIA/SUPPORTER/FUNDER/LIVED_EXPERIENCE` | `role:partner`(org) · `role:media` · `role:supporter` · `role:funder` · **`lane:community`** for lived-experience | ⚠️ **R3 (lived-experience youth = community-line? — OCAP/consent critical)** |
| `STATE_NSW…ACT` | flat states | `place:nsw…act` | ✅ taxonomy §3 |
| `/api/ghl/register` (event) | `EVENT`,`JusticeHub`,`CONTAINED`,`PUBLIC_VISITOR`, slug tags, role tags | `source:event:<slug>` · `project:act-jh` · role tags as above · `tier:curious`(visitor) | ⚠️ R4 (CONTAINED representation) |
| `/api/contact` | `JusticeHub`,`act-inquiry`,`project-justicehub`,`PARTNER`/`MEDIA`,`WANTS_TO_HELP`+`CONTAINED` | `source:website` · `project:act-jh` · `role:partner\|media\|supporter` · NO consent | ✅ (CONTAINED → R4) |
| `/api/contained/nominations` | `NOMINATED`,`CONTAINED`,`JusticeHub` | `project:act-jh` · `interest:justice-reform` · `nominated_person` field | ⚠️ R5 (NOMINATED as tag vs field) |
| `GHLForm.tsx` (embedded iframe) | configured in GHL UI | (audit the native form's tag-write in GHL UI; bring to contract) | ⚠️ R6 (native form — code can't fix; needs GHL-UI change) |

### C. empathy-ledger-v2 (World Tour) — **IN SCOPE** (R7 verified: writes to A Curious Tractor; 27 `world-tour` contacts)
| File | Current | Target (if in scope) | Note |
|---|---|---|---|
| `world-tour/EmailCaptureForm.tsx` | `empathy-ledger`,`world-tour`,interest[],`wt-stage:/wt-lane:/wt-stop:`,`partner-network` | `project:act-el` · `role:supporter` · `interest:storytelling` · `source:event:world-tour` · keep `wt-*` as approved EL sub-namespace? · `newsletter_consent` + `comms:*` only if explicit | ⚠️ R7 |
| `world-tour/ContactForm.tsx` | `empathy-ledger`,`world-tour`,`contact-form`,`act-inquiry`,`project-empathy-ledger`,`wt-*` | `project:act-el` · `role:supporter` · `source:website` · drop `contact-form` | ⚠️ R7 |

---

## Open rulings (Ben) — these gate the code edits
- **R1 — act.place 5 unaligned forms:** confirm project code + role + interest for `csa`, `farm-stay`, `residency`, `payout-wall-contest`, `flagship-inquiry`. (My proposals above.)
- **R2 — JusticeHub "Steward":** `tier:steward` (ladder top) or a distinct `role:`? (Stewards also get a Steward-pipeline opportunity regardless.)
- **R3 — Lived-experience / youth voice (OCAP):** do `LIVED_EXPERIENCE`/`YOUTH_VOICE` people get `lane:community` (zero automated drips, hand-only) — yes/no? **Default = yes (safer), pending your call.**
- **R4 — CONTAINED:** represent the CONTAINED campaign as `interest:justice-reform`, a `source:event:contained-*`, or its own sub-project code?
- **R5 — Nominations:** `NOMINATED` → keep as a tag, or move to a `nominated_person` custom field only?
- **R6 — JusticeHub embedded GHL form (`GHLForm.tsx`):** native GHL form — tags set in GHL UI, not code. OK to audit + fix in the GHL UI as part of this?
- **R7 — Empathy Ledger scope:** EL is multi-tenant — **verify the ACT/World-Tour tenant actually writes to "A Curious Tractor"** before aligning it. If it writes to a separate EL location, EL is out of THIS account's contract. (Verification step P0 below.)

## Lists + newsletter review (the last part of the ask)
Largely DECIDED in the contract doc; confirm at execution:
- **4 newsletters** = the four `comms:*-newsletter` streams. Each form enrols into exactly one: act.place newsletter → act-newsletter; JusticeHub newsletter → justicehub-newsletter; Goods inquiry (when live) → goods-newsletter; Harvest (when live) → harvest-newsletter.
- **Smart-lists (Layer 2)** are saved tag-queries — they self-correct once tags are namespaced. Confirm each audience query (taxonomy doc) returns sane counts AFTER the migration.
- **Consent gate** holds across all four: no `comms:*-newsletter` without `newsletter_consent=Yes`.

## Execution phases (after rulings)
- **P0 — Verify (read-only):** EL tenant location (R7); regen-studio Vercel `GHL_*_LOCATION_ID` values (confirms one-account reality). 
- **P1 — act.place (regen-studio):** finish the 5 unaligned formTypes + namespace `ContactForm`'s flat tags. `npx tsc --noEmit`. Branch off main, commit per group. (Tier 1 → push Tier 2.)
- **P2 — JusticeHub:** rewrite `GHL_TAGS` constants (`src/lib/ghl/client.ts:550-609`) + the 5 routes to the canonical set. The single biggest pollution source. tsc. Branch + push.
- **P3 — Empathy Ledger (if R7 in-scope):** align the 2 World Tour forms.
- **P4 — Deploy + tracer (Tier 3, Ben's verb):** one live tracer per representative form per repo → verify in GHL → automations safe to switch on.
- **P5 — GHL tag migration (Tier 2/3, gated):** run `scripts/ghl-taxonomy-migrate.mjs --dry-run` worksheet → tracer → bucketed apply (one namespace at a time, re-assert community-line guard after each) per the taxonomy §6 path.
- **P6 — Lists/newsletter confirm:** re-check smart-list counts + the 4 newsletter enrolments + consent gate.

## Tier discipline
Code edits + local commits = Tier 1. Branch push = Tier 2. PR / merge / Vercel
prod deploy = Tier 3 (explicit verb). Live tracer = Tier 2 (creates a GHL contact;
flag + cleanup). GHL bulk migration `--apply` = Tier 2/3, tracer-first, gated on
rulings. **All of P4–P6 is day-shift, human-in-loop (external system-of-record
writes) — never AFK.**

## Decision log
- 2026-06-08 — ONE GHL account, ONE canonical contract for all codebases (Ben).
- 2026-06-08 PM — **SCOPE CORRECTED 3 → 5 codebases (Ben: "add both").** The original review's "the-harvest/goods = no live GHL forms, OUT" assessed two DEAD repos. Live sites are `theharvest` + `goods-asset-tracker`, both with substantial live GHL integration. Harvest found LARGELY PRE-ALIGNED (PR #26 + Phase-3 code-flip → canonical-only); Goods needs a per-form review. §D/§E mappings still to write (fresh context per repo).
- 2026-06-08 — **RULINGS LOCKED (Ben):**
  - **R3** ✅ lived-experience / youth-voice → `lane:community` + `role:storyteller` (zero `comms:*` ever; hand-only). OCAP guardrail.
  - **R7** ✅ VERIFY EL's tenant location first; align EL only if it writes to `agzsSZWgovjwgpcoASWG`, else out of scope.
  - **R2** ✅ JusticeHub Steward → `tier:steward` (+ Steward pipeline opp unchanged).
  - **R4** ✅ CONTAINED → `interest:justice-reform` + `source:event:contained-<slug>` + `project:act-jh` (no new namespace).
  - **R1/R5/R6** — proceed with plan defaults (Ben did not object): R1 proposed project/role/interest per act.place form; R5 nominations → `nominated_person` field, drop `NOMINATED` tag; R6 audit+fix the embedded JusticeHub GHL form in the GHL UI.

## Verification log
- VERIFIED: 5 sites' Vercel deploy status (Vercel MCP); `agzsSZWgovjwgpcoASWG`="A Curious Tractor" (GHL MCP); JusticeHub `.env`→same location; JusticeHub tag inventory (agent, file:line cited); EL tag inventory (agent, file:line).
- VERIFIED 2026-06-08 (R7): **EL World Tour writes to A Curious Tractor → EL IN SCOPE.** `ghl_contacts` mirror (shared DB tednluwflfhxyucgwigh): `world-tour`=27, `empathy*`=282 of 2588. NOTE: `wt-*`=0 and `partner-network`=0 in the mirror — the newer namespaced EL tags haven't landed (forms not yet exercised, or mirror lag). **Verify EL's live form path before its tracer (P3).**
- UNVERIFIED: regen-studio Vercel per-project `GHL_*_LOCATION_ID` values (moot now — one-account decided); JusticeHub `/api/booking` route's GHL writes; `GHLForm.tsx` native-form tags (R6 — audit in GHL UI).
- VERIFIED 2026-06-08 PM (scope correction): `theharvest` GHL surface — Supabase edge fns `contact-form`/`newsletter-subscribe`/`community-submit`/`ghl-webhook` + `server/gohighlevel.ts` (grep, repo `/Users/benknight/Code/The Harvest Website`); Harvest tag alignment confirmed via shipped commits (PR #26 "tag taxonomy", "Phase 3 code-flip" 3739915 — canonical-only). `goods-asset-tracker` GHL surface — `v2/src/app/get-involved`, `canberra/follow-form.tsx`, `bed/[id]/contact-row.tsx`, `admin/reach-out/compose-form.tsx` (grep, repo `/Users/benknight/Code/Goods Asset Register`). Goods per-form emitted tags NOT yet audited.

## Changelog
- 2026-06-08 — plan created from the whole-system Vercel review.
