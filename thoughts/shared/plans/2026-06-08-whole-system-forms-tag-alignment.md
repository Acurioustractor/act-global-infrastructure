---
title: Whole-system website forms → GHL tag-contract alignment (5 codebases, one account)
date: 2026-06-08
status: RULINGS RESOLVED 2026-06-16 (all R1–R11 decided; R8 = explicit override — see "Rulings RESOLVED" block) — ready for execution (form code + in-account migration)
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

### D. theharvest (theharvestwitta.com.au) — **LARGELY PRE-ALIGNED, verify-don't-rebuild**
Harvest already migrated to canonical via PR #26 ("tag taxonomy") + "Phase 3 code-flip" (`3739915`): `project:act-hv` added at the GHL chokepoint (`createGHLContact`+`upsertGHLContact`), `comms:harvest-newsletter`, `role:supplier`+`interest:markets` (shop EOI), dropped `role:member` and the flat `newsletter`/`harvest-*` aliases. **Action = a verify pass, not a rewrite:** confirm the live emit against the contract (newsletter consent gate, `lane:community` on the community-submit edge fn, no flat aliases reintroduced). Full per-form table still TODO (fresh-context pass — small).

### E. goods-asset-tracker (goodsoncountry.com) — **NOT aligned (flat vocab, like JusticeHub)**
Single GHL chokepoint: `src/lib/ghl/index.ts` → `createOrUpdateContact()` (`index.ts:546`, exposed `index.ts:1030`); base `services.leadconnectorhq.com`, `GHL_API_KEY`+`GHL_LOCATION_ID` (`index.ts:12-13`), gated by `GHL_ENABLED` (`index.ts:19`). All writes funnel here → **one place to enforce `project:act-gd`**. Today: flat `goods-*` tags + custom field `projectDesignation="Goods"`, no colon-namespaces. Full evidence: `thoughts/shared/reviews/goods-forms-tag-mapping-2026-06-08.md`.

| Form (file:line) | Collects | CURRENT GHL emit | Target (canonical) | Ruling/flag |
|---|---|---|---|---|
| Contact → `/api/contact/route.ts:14` | name,email,phone,subject,org,msg,subscribe | `goods-inquiry`+`goods-<subject>`,`act-inquiry`,`project-goods`; subscribe→`goods-newsletter`+`goods-src-contact-form` (`route.ts:65,73,84`) | `project:act-gd`+`role:` (media→`role:media`)+`source:website`; subscribe→`comms:goods-newsletter` **only w/ explicit consent** | DRIFT; ⚠️ R8 (verify `subscribe`=real opt-in) |
| Partnership/capital → `/api/partnership/route.ts:19` | org,name,email,phone,type,segment,tier,timeline | `goods-partner-lead`+`goods-segment-*`+`goods-tier-*`+`goods-timeline-*`,`act-inquiry`,`project-goods`; washer→`goods-washer-interest` (`index.ts:1272-96`) | `project:act-gd`+`role:funder/partner/buyer`+`source:website`; NO `comms:` | DRIFT; ⚠️ R10 (`goods-tier-*`=ticket-size, must NOT become belonging-ladder `tier:`) |
| Newsletter signup → `newsletter-signup.tsx:29`→`/api/newsletter/route.ts:4` | email(+tag) | `goods-newsletter`+`goods-src-<tag>`, fires Smart Router (`index.ts:1449-62`) | `project:act-gd`+`comms:goods-newsletter`+`source:website`+`newsletter_consent=Yes` | **⚠️ R8 FLAG** — grants send-tag, NO explicit consent capture (Spam Act) |
| Sponsor-interest → `sponsor/page.tsx:94`→`/api/newsletter` | email | `goods-newsletter`+`goods-src-sponsor-interest` | +`interest:beds`+consent field | **⚠️ R8** (same) |
| Canberra Airport → `canberra/follow-form.tsx:25`→`/api/newsletter` | name,email,phone | `goods-newsletter`+`goods-src-canberra-airport-2026` | +`source:event:canberra-airport-2026`+`place:act`+consent | **⚠️ R8** (same) |
| Order/sponsorship → `webhooks/stripe/route.ts:266` | email,name,phone,order,products | `goods-customer`(+`goods-bed-owner`/`goods-washer-owner`/`goods-sponsor`) (`index.ts:1147-62`) | `project:act-gd`+`role:buyer`/`role:supporter`+`interest:`+`source:website`; NO `comms:` | DRIFT; transactional≠marketing (no `comms:` = correct) |
| Support ticket → `/api/support/route.ts:156` | assetId,contact,issue,priority | `goods-support-request`+`goods-asset-<slug>`(+`goods-urgent`) (`index.ts:1215-16`) | +`role:community`+`place:community:`+**`lane:community`**; NO `comms:` | **⚠️ R9 OCAP** — community recipient, no protective `lane:community` |
| Recipient claim → `/api/claim/[asset_id]/route.ts:102` | phone,name,assetId,product,community | `goods-recipient`+`goods-asset-<slug>`(+`goods-claimed-*`) (`index.ts:1510-12`) | +`role:community`+**`lane:community`**+`place:community:`; no `comms:` from this path | **⚠️ R9 OCAP (highest)** — router fires on `goods-recipient`, no `lane:community` |
| Bed-story → `/api/bed/[id]/story/route.ts:233` | name,contact,story,consent flags | `goods-story-submitter`+(`goods-consent-to-contact`\|`goods-no-contact`)+`goods-asset-<slug>`+`goods-inquiry` (`route.ts:236-42`) | +`role:storyteller`+**`lane:community`**; NO `comms:` | **⚠️ R9+R11 OCAP** — `consent_to_contact`=reply-about-story, NOT marketing; never promote to `comms:` |
| Feedback widget → `/api/feedback/route.ts:13` | page,msg,email | `goods-feedback`+`goods-inquiry`,`act-inquiry`,`project-goods` | +`source:website`; NO `comms:` | DRIFT (low priority) |

**Not direct writers:** `bed/[id]/contact-row.tsx`, `bed/[id]/help-chooser.tsx` = `wa.me`/`sms:`/`tel:` deep links (CRM write happens off-codebase via inbound SMS to the GHL number). **Out of scope (not public lead forms):** `admin/reach-out/compose-form.tsx` (internal dispatch — but it's the surface where a wrong drip would actually fire), `createStrategicTargetContact` (CivicGraph prospecting), `sendSms` cron. **Static/non-GHL (checked):** `get-involved/page.tsx`, `funders/[slug]`, `communities/[slug]`, `press/page.tsx`.

**UNCONFIRMED (next pass):** (1) the `/contact` + `/partner` client form components weren't opened → the `subscribe` opt-in checkbox default (load-bearing for R8) and the `partnershipType`/`partnerSegment` option values are unverified; (2) live `GHL_LOCATION_ID` env value — inferred (not verified) to be `agzsSZWgovjwgpcoASWG`; confirm against deployed Vercel env.

---

## Open rulings (Ben) — these gate the code edits
- **R1 — act.place 5 unaligned forms:** confirm project code + role + interest for `csa`, `farm-stay`, `residency`, `payout-wall-contest`, `flagship-inquiry`. (My proposals above.)
- **R2 — JusticeHub "Steward":** `tier:steward` (ladder top) or a distinct `role:`? (Stewards also get a Steward-pipeline opportunity regardless.)
- **R3 — Lived-experience / youth voice (OCAP):** `LIVED_EXPERIENCE`/`YOUTH_VOICE` people get `lane:community`. ✅ LOCKED (Ben 2026-06-08) — **agency model**: never auto-enrolled into `comms:*`; an explicit, consent-evidenced opt-in is honored (storyteller/Elder opt-ins human-confirmed). See OCAP note below.
- **R4 — CONTAINED:** represent the CONTAINED campaign as `interest:justice-reform`, a `source:event:contained-*`, or its own sub-project code?
- **R5 — Nominations:** `NOMINATED` → keep as a tag, or move to a `nominated_person` custom field only?
- **R6 — JusticeHub embedded GHL form (`GHLForm.tsx`):** native GHL form — tags set in GHL UI, not code. OK to audit + fix in the GHL UI as part of this?
- **R7 — Empathy Ledger scope:** EL is multi-tenant — **verify the ACT/World-Tour tenant actually writes to "A Curious Tractor"** before aligning it. If it writes to a separate EL location, EL is out of THIS account's contract. (Verification step P0 below.)
- **R8 — Goods newsletter consent (Spam Act gap):** every Goods newsletter path (`/api/newsletter`, contact `subscribe`, sponsor, Canberra) grants the `goods-newsletter` send-trigger tag with only *implied* consent — no captured `newsletter_consent` field. Add explicit consent capture before any `comms:goods-newsletter` is granted — yes? **Default = yes (legally required); needs the form-UI opt-in checkbox verified/added.**
- **R9 — Goods OCAP `lane:community` (highest priority):** ✅ LOCKED (Ben 2026-06-08). Add `lane:community` to the recipient-claim, support, and bed-story paths (these forms grant no `comms:`). **Agency model** (see OCAP note): the lane means never auto-enrolled into `comms:*` and never an automation segment — NOT "can never be communicated with". An explicit, consent-evidenced opt-in is honored; storyteller/Elder opt-ins human-confirmed.
- **R10 — Goods `goods-tier-*` collision:** the capital-partnership form's `goods-tier-*` encodes *ticket size*, which must NOT be migrated into the belonging-ladder `tier:` namespace (curious→steward). Move to a custom field (`capital_tier`) or an `interest:`/`source:` value? **Proposal: `capital_tier` field, drop the tag.**
- **R11 — Goods bed-story `consent_to_contact`:** this flag means "ok to reply about *this story*", NOT marketing consent. ✅ LOCKED — never promoted to `comms:`.

> **OCAP agency model for `lane:community` (Ben, 2026-06-08).** The lane is the relationship lane, not the funnel. A community-line contact is **never auto-enrolled** into any `comms:*` drip/newsletter and is never an automation segment. A `comms:*` may sit on them **only** with explicit consent evidence (`newsletter_consent=Yes` + source) — their own choice; storyteller/Elder opt-ins are **human-confirmed**, not a checkbox. The guard strips `comms:*` lacking that evidence (auto-enrolments), never a genuine opt-in. This is **NOT exclusion** — community stays reachable by operational messages (their own action), human-deliberate 1:1, and anything they opt into; they are only out of the *machine*. OCAP = control rests with the person: default off, never grabbed, their explicit choice honored. Canon: `wiki/concepts/ghl-audience-comms-automation.md` §5 + `wiki/concepts/ghl-crm-taxonomy.md` §7.

## Rulings RESOLVED — decision session 2026-06-16 (Ben, grounded in LIVE GHL data)
Live evidence pulled this session via `scripts/ghl-smartlist-live-gapcheck.mjs` (POST /contacts/search filters DSL; the mirror was found stale on counts, so all figures below are live).

- **R1 — act.place 5 forms:** ✅ ACCEPT all 5 proposed mappings (csa→`project:act-hv`+`interest:food`/`membership`; farm-stay→`project:act-fa`+`interest:venue`; residency→`project:act-hv|fa`+`interest:workshops`; payout-wall-contest→`interest:justice-reform`+`role:supporter`; flagship-inquiry→`role:partner`+**NO auto-drip**).
- **R2 — JusticeHub Steward:** ✅ `tier:steward` (top of belonging ladder). Steward-pipeline Opportunity unchanged.
- **R4 — CONTAINED:** ✅ `source:event:contained-adelaide-2026` + `interest:justice-reform` (event/campaign under act-jh, reusable per future city). NOT its own project sub-code.
- **R5 — Nominations:** ✅ `nominated_person` custom field; **DROP** the `NOMINATED` tag (hard-rule-2: record data is not a tag).
- **R6 — JH native form (`GHLForm.tsx`):** ✅ YES — audit + align it in the GHL UI (code can't reach it).
- **R7 — Empathy Ledger scope:** ✅ **IN SCOPE** — resolved by live data: the `newsletter-stream:*` World-Tour tags exist live in `agzsSZWgovjwgpcoASWG`, so EL World Tour writes to "A Curious Tractor". Align its forms (`newsletter-stream:*` → `comms:`/`source:event:world-tour`).
- **R8 — Goods newsletter consent:** ⚠️ **EXPLICIT OVERRIDE (Ben, twice-confirmed against the evidence): GRANDFATHER all 79 bare-`goods-newsletter` contacts into `comms:goods-newsletter` as consented.** This **OVERRIDES** operating-model hard-rule-4 ("no `comms:*-newsletter` without `newsletter_consent=Yes` — no exceptions") and the Spam Act 2003 stance. **Live evidence at decision time: 0/79 have consent provenance; 47/79 are the phantom-consent pattern the gate exists to exclude; 51/79 already double-carry `comms:goods-newsletter`.** Going-forward the fixed Goods forms MUST still capture explicit consent. **🚩 REFLAG at execution** — confirm again before any marketing send fires to the grandfathered 79.
- **R10 — Goods ticket-size:** ✅ `capital_tier` custom field; **DROP** `goods-tier-*` tags (`tier:` namespace stays the belonging ladder only).
- **R3 / R9 / R11:** already LOCKED 2026-06-08 (OCAP agency model; `lane:community` on Goods recipient-claim/support/bed-story paths; `consent_to_contact` never promoted to `comms:`).

**Next = EXECUTION (separate, Tier 2/3, day-shift, Ben's verbs):** (1) form code at source per repo — goods-asset-tracker (biggest: namespace `goods-*`→canonical, add consent capture, `capital_tier`, OCAP `lane:community`), JusticeHub (flat→canonical, `tier:steward`, `source:event:contained-*`, `nominated_person`), act.place (5 forms + deploy fixed newsletter), EL World Tour (`newsletter-stream:*`→canonical), Harvest (verify + `harvest-website`/`inbox`→`source:`); plus R6 GHL-UI form. (2) In-account tag migration of existing drift (incl. R8 grandfather). (3) Re-run `ghl-smartlist-live-gapcheck.mjs` to confirm clean.

## Form-code status — VERIFIED 2026-06-17 (the "execution" was mostly already shipped)
Investigated the live repos before assuming work (the "PROPOSED/awaiting execution" framing above was stale by ~8 days). **Form→GHL alignment is DONE and merged to main in all four front-line repos.** Evidence = agent investigation 2026-06-17 with cited commits + file:line.

- **Goods (goods-asset-tracker):** ✅ `canonical-tags.ts` module + chokepoint (`54b0c5e`); R8/R9/R10/R11 wired. Last gap — the newsletter opt-in checkbox the R8 backend gate was waiting on — shipped 2026-06-17 (**PR #126**, `15f880d`). Live-corroborated (`comms:goods-newsletter` written live).
- **JusticeHub:** ✅ `GHL_CANONICAL` in `src/lib/ghl/client.ts:743-790`; all public form routes canonical (newsletter/signup/contact/all CONTAINED/justice-matrix); consent gate + `lane:community` + `tier:steward` (R2) + `source:event:contained` (R4). PRs #38/#44/#48/#51 (`c7697707`, `f16db31e`). **Residual (non-public, dormant):** non-CONTAINED branch of `register/route.ts:171-186` + `hub/actions` engagement tags still flat; legacy `GHL_TAGS` const retained for them.
- **act.place (act-regenerative-studio):** ✅ `/api/forms/submit` FORM_RULES + PROJECT_REGISTRY emit namespaced tags only; newsletter consent gate (`newsletter_consent='Yes'` field `aVnqmajnysMtGYhLD0oA` + `consent_source`); defense-in-depth `.includes(':')` flat-tag drop-guard. Newsletter fix IS on main (`496e826`/`a807396`). **Residual (out of scope):** inbound `webhooks/ghl/route.ts` writes flat tags on NATIVE-GHL-form postbacks.
- **Harvest:** ✅ already aligned 2026-06-08 (PR #26 + phase-3 flip).

**GENUINELY REMAINING:**
1. **EL World Tour (empathy-ledger-v2)** — ✅ CHECKED 2026-06-17 = **FLAT, the lone un-migrated repo** (R7 confirmed: writes to shared `agzsSZWgovjwgpcoASWG`, location DB-driven not env). 3 flat write paths: `/api/subscribe` (`route.ts:29-35`), `/api/world-tour/contact` (`route.ts:36-40`), `/api/world-tour/opt-in` (`route.ts:31`) — emit `empathy-ledger`/`world-tour`/`wt-stage:`/`wt-lane:`/`wt-stop:`/`act-inquiry`/`project-empathy-ledger`/`contact-form`/raw interests. ⚠️ **NO consent gate — every submit pushed to GHL with no `newsletter_consent`/`comms:`; a LIVE Spam-Act/OCAP exposure (tour active 27 Jun–7 Aug).** Last touch `aa2afff7` (2026-05-29, introduced the flat `wt-*` scheme); canonical alignment ABSENT. **Needs EL-specific rulings before coding:** (a) the comms stream identity — is there a `comms:el-newsletter`? (the `newsletter-stream:*` are tour/CONTAINED streams, not one of the 4 D1 newsletters); (b) `wt-*` treatment — keep as an approved EL sub-namespace vs fold into `source:event:world-tour` (preserving stop/lane segmentation); (c) `partner-network` → `role:` or `interest:`. **This is the real remaining form-code execution.**
2. **Minor residuals** above (JH dormant register branch + flat inbound webhooks) — low priority.
3. **Tier-3 in-account migration (P5):** re-key the Smart Router branches to canonical in the GHL UI → then remove the flat `goods-*` / `newsletter-stream:*` tags; + the R8 grandfather of the 79. Day-shift, Ben's verbs.
4. **R6** — JusticeHub embedded native GHL form (GHL UI).

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
- **P3b — Harvest (verify-only):** confirm the live emit still matches the contract (PR #26/Phase-3 already canonical) — consent gate on `newsletter-subscribe`, `lane:community` on `community-submit` edge fn, no flat aliases reintroduced. Fix only gaps found.
- **P3c — Goods (align, after R8–R11):** at the `index.ts:546` chokepoint, add `project:act-gd` to every write; map flat `goods-*`→canonical per §E; add `lane:community` to claim/support/bed-story (R9); add explicit consent capture before `comms:goods-newsletter` (R8); move `goods-tier-*`→`capital_tier` field (R10). `npx tsc --noEmit` (whole `v2`). Branch off main, commit per group. First open `/contact`+`/partner` client components to close the UNCONFIRMED items.
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
  - **R3** ✅ lived-experience / youth-voice → `lane:community` + `role:storyteller`. **Agency model (refined 2026-06-08):** never auto-enrolled into `comms:*`; explicit consent-evidenced opt-in honored (storyteller/Elder human-confirmed). NOT exclusion. OCAP guardrail.
  - **R7** ✅ VERIFY EL's tenant location first; align EL only if it writes to `agzsSZWgovjwgpcoASWG`, else out of scope.
  - **R2** ✅ JusticeHub Steward → `tier:steward` (+ Steward pipeline opp unchanged).
  - **R4** ✅ CONTAINED → `interest:justice-reform` + `source:event:contained-<slug>` + `project:act-jh` (no new namespace).
  - **R1/R5/R6** — proceed with plan defaults (Ben did not object): R1 proposed project/role/interest per act.place form; R5 nominations → `nominated_person` field, drop `NOMINATED` tag; R6 audit+fix the embedded JusticeHub GHL form in the GHL UI.

## Verification log
- VERIFIED: 5 sites' Vercel deploy status (Vercel MCP); `agzsSZWgovjwgpcoASWG`="A Curious Tractor" (GHL MCP); JusticeHub `.env`→same location; JusticeHub tag inventory (agent, file:line cited); EL tag inventory (agent, file:line).
- VERIFIED 2026-06-08 (R7): **EL World Tour writes to A Curious Tractor → EL IN SCOPE.** `ghl_contacts` mirror (shared DB tednluwflfhxyucgwigh): `world-tour`=27, `empathy*`=282 of 2588. NOTE: `wt-*`=0 and `partner-network`=0 in the mirror — the newer namespaced EL tags haven't landed (forms not yet exercised, or mirror lag). **Verify EL's live form path before its tracer (P3).**
- UNVERIFIED: regen-studio Vercel per-project `GHL_*_LOCATION_ID` values (moot now — one-account decided); JusticeHub `/api/booking` route's GHL writes; `GHLForm.tsx` native-form tags (R6 — audit in GHL UI).
- VERIFIED 2026-06-08 PM-4 (P4 act.place tracer): live GHL contact from a newsletter POST to `act-regenerative-studio.vercel.app/api/forms/submit` seated EXACTLY `project:act-in·source:website·role:supporter·tier:curious·comms:act-newsletter` + `newsletter_consent=Yes`(`aVnqmajnysMtGYhLD0oA`) + consent-source(`HdnMUyXkZRPZG7l7cygG`) in loc `agzsSZWgovjwgpcoASWG`; contract guard dropped all flat tags. Tracer contact deleted (re-query total:0). The two "never-seen-live" items (`source:website`, consent-source field) = CONFIRMED working.
- VERIFIED 2026-06-08 PM-4: **www.act.place is Webflow/Cloudflare, not this Vercel app** — `curl` shows act.place→301→www.act.place (server: cloudflare, Webflow pageId surrogate-keys), 404 on `/api/forms/submit`; regen deploy aliases to `act-regenerative-studio.vercel.app` (server: Vercel, 405/POST-only endpoint present). The plan's "regen = act.place" assumption is WRONG for the public domain.
- VERIFIED 2026-06-08 PM-4 (ACT-FM keeper): `config/project-codes.json` has BOTH ACT-FM "The Farm" + ACT-BV "Black Cockatoo Valley" (ACT-BV claims `act-farm`/`the-farm` as slug_aliases = the collision). Xero usage: ACT-FM 138 inv + 84 txn = 222; ACT-BV 1 inv + 8 txn = 9 → keep ACT-FM.
- VERIFIED 2026-06-08 PM (scope correction): `theharvest` GHL surface — Supabase edge fns `contact-form`/`newsletter-subscribe`/`community-submit`/`ghl-webhook` + `server/gohighlevel.ts` (grep, repo `/Users/benknight/Code/The Harvest Website`); Harvest tag alignment confirmed via shipped commits (PR #26 "tag taxonomy", "Phase 3 code-flip" 3739915 — canonical-only). `goods-asset-tracker` GHL surface — `v2/src/app/get-involved`, `canberra/follow-form.tsx`, `bed/[id]/contact-row.tsx`, `admin/reach-out/compose-form.tsx` (grep, repo `/Users/benknight/Code/Goods Asset Register`). Goods per-form emitted tags NOT yet audited.

## Changelog
- 2026-06-08 — plan created from the whole-system Vercel review.
- 2026-06-08 PM — scope corrected 3→5 codebases; §D (Harvest, pre-aligned) + §E (Goods, full per-form map) added; Goods rulings R8–R11 + phases P3b/P3c added. §E evidence: `thoughts/shared/reviews/goods-forms-tag-mapping-2026-06-08.md`.
- 2026-06-08 PM-4 — **P4 act.place DONE** (PR #52 merged→Vercel prod; newsletter tracer verified the full contract incl. never-seen-live `source:website` + consent-source field, tracer deleted). **Two findings: (1) www.act.place = Webflow/Cloudflare, NOT the regen deployment** (forms live at `act-regenerative-studio.vercel.app`; act.place 404s on the endpoint) — investigate whether regen is a pending cutover or a 6th (Webflow) GHL surface is uncounted. **(2) ACT-FM ≡ ACT-BV ruling (Ben): merge to one, keep ACT-FM** (222 Xero money recs vs ACT-BV 9); regen `PROJECT_REGISTRY` farm→`act-bv` is the wrong keeper → fix in the merge.
