---
title: ACT Site → Form → GoHighLevel Alignment Map
date: 2026-06-02
status: active
owner: Ben
related: [act-ghl-operating-strategy, act-belonging-model, newsletter-consent-signup-path]
provenance: Framework synthesized via background workflow (5 digests). The VERIFIED FORM REGISTRY below was hand-grounded against the act-regenerative-studio repo 2026-06-02 and SUPERSEDES the inferred registry in the framework's section 3. Other-site rows remain unconfirmed (framework section 7).
---

# ACT Site → Form → GoHighLevel Alignment Map

## ⭐ VERIFIED act.place form registry (grounded 2026-06-02 — supersedes inferred §3)

act.place (`act-regenerative-studio`) has **8 real forms**, each already declaring a `projectCode`. The routing key exists in code today — the CRM just has to obey it.

| Form component | formType | projectCode | Project | Should route to |
|---|---|---|---|---|
| NewsletterForm / NewsletterCTA | `newsletter` | `ACT-IN` (default; **overridable per embed**) | ACT ecosystem | **ACT — Ecosystem Journey / Connected** |
| CSAInterestForm | `csa` | `ACT-HV` | The Harvest (produce subscription) | Harvest Membership Journey |
| FarmStayForm | `farm-stay` | `ACT-BV` | Black Cockatoo Valley / ACT Farm | Farm pipeline (TBD) |
| ResidencyForm | `residency` | `ACT-AS` | Art / artist residency | Art/residency pipeline (TBD) |
| ContactForm | `contact` | `ACT-IN` (overridable) | general enquiry | Universal Inquiry → route |
| QuickInquiryForm (flagship) | `flagship-inquiry` | **per page**: ACT-BV / ACT-IN / ACT-EL / ACT-HV / ACT-JH / ACT-GD | the page's project | route by projectCode |
| FoundationContestForm | `payout-wall-contest` | `ACT-IN` | campaign | campaign holding |
| EnquiryExpectations | (helper) | ACT-IN default | general | — |

**projectCode taxonomy (canonical, from the code):**
`ACT-IN` ecosystem · `ACT-HV` Harvest · `ACT-BV` Black Cockatoo Valley/Farm · `ACT-AS` Art/residency · `ACT-EL` Empathy Ledger · `ACT-JH` JusticeHub · `ACT-GD` Goods.

**The real fix (bigger than "newsletter ≠ Harvest"):**
1. `newsletter` is NOT always ACT-IN — NewsletterForm accepts a `projectCode` prop, so a newsletter embedded on the Harvest page is ACT-HV. **The intake must route by `projectCode`, never by formType.**
2. The current `pushToGHL` code **hardcodes** `comms:act-newsletter` + fires the intake that seats on Harvest, *regardless of projectCode*. That is the bug. Derive `comms:<project>-newsletter` from projectCode, and route the intake on projectCode.
3. All 8 forms post through the one path (`/api/forms/submit` → `pushToGHL`), so the routing logic lives in two places only: the code (sets the right comms tag + passes projectCode) and the one intake workflow (routes on projectCode).

The framework below (forms-first principle, CRM-derivation, analytics, fix sequence, open questions) is sound; read §3's registry as illustrative — the table above is the verified one.

---

# ACT SITE → FORM → GoHighLevel ALIGNMENT MAP

*Location agzsSZWgovjwgpcoASWG · grounded in GHL state verified 2026-06-02 + the four research digests. Where a digest finding conflicts with ACT's consent/OCAP rules, the rules win.*

---

## 1. THE PRINCIPLE — forms-first

The form is the source of truth. Not the workflow, not the pipeline, not the tag. A person fills in a form on a site, and that form already knows three things the rest of the CRM has to obey: who the person is, what they just asked for, and which ACT project they were standing in front of when they asked. Everything downstream — the tags, the custom fields, the pipeline they land in, the workflow that greets them — derives from those three facts. It does not get to invent a fourth.

The Harvest error happened because we built it the other way around. A workflow existed, it needed contacts, so it grabbed the newsletter signups whether or not the newsletter had anything to do with Harvest. The form said "ACT ecosystem newsletter" (project ACT-IN, act.place) and the plumbing heard "warm body, send to the nearest pipeline." Forms-first means the form's `projectCode` is load-bearing and non-negotiable: a contact only ever enters the journey its form declares. If no form declares a Harvest intent, no contact lands on the Harvest pipeline. Full stop.

Three guardrails bound every form on every site, and they are not advisory:

- **Consent-first.** No contact is ever marketed to without an explicit consent signal captured *at the form*. Newsletter consent is set in code on submit (`newsletter_consent=Yes`, plus `consent_source`), never inferred from "they filled in a form so they must want emails." A general-contact form is not a newsletter opt-in. If the consent field is blank, the contact is held and not sent to.
- **Commerce yes, community never.** Commercial forms (Goods buyers, the Shop, paid services) may carry the full sales/lifecycle machinery: pipelines, sequences, conversion tracking. Community and storyteller forms may not. A storyteller is not a lead, a deal, or a conversion. They enter a journey of belonging, never a sales funnel, and their record carries a consent state, not a deal value.
- **OCAP / storyteller gate.** Any form that touches storyteller content, a community member's name, a quote, a photo, or a place name does not auto-publish or auto-syndicate anything. It captures, it flags for the consent-check gate, and it stops. Verbal consent is a valid audit trail; a missing or unverified trail is a hard stop. No form fabricates a name or a date to fill a gap.

If a proposed tag, workflow, or pipeline cannot point back to a form field that justifies it, it does not get built.

---

## 2. THE SITE MAP

The hard correction first, because it is the reason this document exists: **act.place is the front door of the whole ACT ecosystem. Its main newsletter is project ACT-IN — the ACT ecosystem newsletter. It is NOT Harvest.** Harvest (ACT-HV) is the farm program and has its own membership journey (the "Harvest Membership Journey" pipeline, 143 seated). The act.place newsletter must never seat onto a Harvest pipeline. Its correct home is a new **"ACT — Ecosystem Journey"** pipeline (5 rungs), with Harvest left entirely separate.

| Site (domain) | Repo | Purpose | Audience | Public-brand or internal | Project(s) it fronts | CRM-connected? |
|---|---|---|---|---|---|---|
| **act.place** | `act-regenerative-studio` (likely — see §7) — NOT this repo | The ACT ecosystem front door + main newsletter | General public, supporters, partners | Public brand | **ACT-IN** (ecosystem) primarily; gateway to all sub-projects | Yes — site form → `/api/forms/submit` → upsert → "ACT — Intake" |
| **justicehub.com.au** | JusticeHub (Webflow-managed site, this repo syncs to Webflow) | JusticeHub project front door | Youth-justice sector, partners, supporters | Public brand | JusticeHub | Likely (form path unconfirmed — §7) |
| **civicgraph.app** | CivicGraph (separate product; invisible on act.place) | Civic intelligence product | Sector/civic users | Public product | CivicGraph | Unconfirmed — §7 |
| **Goods site(s)** | The Butterfly Movement / Goods (vehicle = The Butterfly Movement Ltd) | Goods supporter/buyer/demand capture | Supporters, buyers, demand-side | Public brand | Goods | Yes — multiple Goods pipelines already exist (Supporter Journey, Buyer, Demand Register) |
| **The Shop** | (storefront — platform unconfirmed, §7) | Commerce / product sales | Buyers | Public commerce | Goods/Shop | Yes — "The Shop pipeline" exists |
| **Empathy Ledger** | EL v2 (Supabase `yvnuayzslukamizrlhwb`) | Storyteller content platform | Storytellers, community | Internal + syndication | Empathy Ledger | Yes — "Empathy Ledger" pipeline exists (OCAP-bound) |
| **apps/website** (this repo) | `act-global-infrastructure` | Internal/staging site — NOT the brand site | Internal | Internal | n/a | Should not be the public form source |
| **apps/command-center** (this repo) | `act-global-infrastructure` | Ops dashboard + `/api/forms/submit` handler + analytics surface | Internal (Ben/Nic) | Internal | All (the receiver) | Yes — it *is* the form receiver + the analytics mirror target |

Explicit mapping (site = project = journey/pipeline):

- act.place newsletter = **ACT-IN** = **ACT — Ecosystem Journey** (new, 5 rungs). *Was wrongly mapped to Harvest. Fix in §6.*
- Harvest = **ACT-HV** = **Harvest Membership Journey** (Curious→Connected→Member→Active→Steward). Separate, untouched.
- Goods supporters/buyers/demand = **Goods** = the three Goods pipelines.
- Empathy Ledger storytellers = **Empathy Ledger** pipeline (OCAP-gated, belonging not sales).

---

## 3. THE FORM REGISTRY — the core deliverable

This is the table the rest of the CRM derives from. Each row is a form; its `projectCode` is the load-bearing field. "Consent set in code" means the `/api/forms/submit` → `pushToGHL` upsert writes the consent field on the server, because GHL triggers are unreliable on API-created/updated contacts (Digest 4: the "Contact Created" trigger does not fire on upsert-update).

Status legend: ✅ wired correctly · ⚠️ mis-wired (fix needed) · ◻️ unwired / not yet built · ❓ existence/path unconfirmed (→ §7).

| FORM | Site | Purpose | Fields captured | formType | projectCode | Tags / custom-fields / consent it SHOULD write | Journey / pipeline it feeds | Status |
|---|---|---|---|---|---|---|---|---|
| **ACT Main Newsletter** | act.place | Join the ACT ecosystem newsletter | name, email, (optional interest) | `newsletter` | **ACT-IN** | `newsletter_consent=Yes` (id aVnqmajnysMtGYhLD0oA, **in code**) · `tier:connected` · `comms:act-newsletter` · `source:website-form` · `consent_source` (id HdnMUyXkZRPZG7l7cygG) · `consent:newsletter-explicit` · `project:act-in` · `first_action_date` (id JovUpJTwrhctE85adcSV) | **ACT — Ecosystem Journey / Connected rung** (NOT Harvest) | ⚠️ currently seats to Harvest — repoint |
| **General Contact** (native) | act.place / GHL | General enquiry | name, email, message | `contact` | ACT-IN (default) or routed by page | `source:website-form` · `project:act-in` · `action:enquiry` · NO `newsletter_consent` unless box ticked | **Universal Inquiry** pipeline | ⚠️ ensure it does NOT set newsletter_consent by default |
| **Volunteer Application** (native) | act.place / GHL | Volunteer signup | name, email, availability, interest | `volunteer` | ACT-IN or specific project | `role:volunteer` · `action:volunteer-apply` · `source:website-form` · `project:<code>` · consent only if opted in | **Universal Inquiry** → routed | ⚠️ confirm routing + consent |
| **Donation Form** (native) | act.place / GHL | One-off / recurring donation | name, email, amount | `donation` | ACT-IN / Goods (DGR = Butterfly) | `role:donor` · `action:donate` · `tier:connected` · `source:website-form` · `project:<code>` · consent if box ticked | **Supporters & Donors** pipeline | ⚠️ confirm DGR routing (charity vs Pty) |
| **Newsletter Signup** (native GHL form) | GHL | (dead) | — | — | — | — | — | ◻️ DEAD — 0 submissions, real signups are API-driven. Retire or document as decommissioned |
| **Goods Supporter signup** | Goods site | Become a Goods supporter | name, email, support type | `goods-supporter` | Goods | `project:goods` · `role:supporter` · `source:website-form` · consent if opted · `comms:goods-updates` | **Goods Supporter Journey** | ❓ form path unconfirmed |
| **Goods Buyer enquiry** | Goods / Shop | Commercial buyer interest | name, email/org, demand detail | `goods-buyer` | Goods | `project:goods` · `role:buyer` · `action:buyer-enquiry` · `source:website-form` (commerce: full lifecycle OK) | **Goods — Buyer Pipeline** | ❓ form path unconfirmed |
| **Goods Demand Register** | Goods | Register demand signal | org, product, volume | `goods-demand` | Goods | `project:goods` · `interest:demand-signal` · `source:website-form` | **Goods — Demand Register** (Signal→Buyer Matched→Converted→Dormant) | ❓ form path unconfirmed |
| **The Shop checkout/lead** | The Shop | Product purchase / lead | buyer details, order | `shop` | Goods/Shop | `project:goods` · `role:buyer` · `action:purchase` · commerce lifecycle OK | **The Shop pipeline** | ❓ platform/path unconfirmed |
| **JusticeHub contact / signup** | justicehub.com.au | JusticeHub enquiry / updates | name, email, interest | `contact` / `newsletter` | JusticeHub | `project:justicehub` · `source:website-form` · `comms:justicehub-updates` (if newsletter) · `consent_source` in code if newsletter | **ACT — Ecosystem Journey** (sub-segment) or JusticeHub-specific | ❓ form path unconfirmed — likely unwired |
| **Empathy Ledger storyteller intake** | EL v2 | Storyteller onboarding / story submission | name, story, media, **consent fields** | `storyteller` | Empathy Ledger | `project:empathy-ledger` · `role:storyteller` · `consent:<state>` · `care:ocap-gated` · **NO marketing tags, NO sales pipeline** | **Empathy Ledger** pipeline (belonging) — **consent-check gate before any external use** | ❓ wiring unconfirmed — OCAP rules override any auto-syndication |
| **Grants / partner enquiry** | act.place | Funder/partner enquiry | org, contact, ask | `partner` / `grant` | ACT-IN or specific | `project:<code>` · `role:funder`/`role:partner` · `action:grant-enquiry` · `source:website-form` | **Grants** pipeline | ❓ form existence unconfirmed |

**Fully specified: the act.place main newsletter (the one that broke).**

- **Trigger:** site form submit on act.place.
- **Path:** form → `POST /api/forms/submit` → attempts `ACT_ECOSYSTEM_API_URL` (localhost:3456, unreachable in prod) → falls through to `pushToGHL` upsert (the live path).
- **On upsert, code sets:** `newsletter_consent=Yes` (id aVnqmajnysMtGYhLD0oA) · `consent_source` (id HdnMUyXkZRPZG7l7cygG) · tag `tier:connected` · tag `comms:act-newsletter` · tag `source:website-form` · tag `project:act-in` · stamp `first_action_date` (id JovUpJTwrhctE85adcSV).
- **Then POSTs:** the Inbound-Webhook that fires the **"ACT — Intake"** workflow, which seats the contact.
- **The fix:** "ACT — Intake" must read `projectCode` and route `ACT-IN` to the new **"ACT — Ecosystem Journey"** pipeline, **Connected** rung. It must NOT seat to the Harvest Membership Journey.

Every ⚠️/◻️/❓ row above is either mis-wired, dead, or unconfirmed. The ⚠️ rows get fixed in §6; the ❓ rows need Ben to confirm site/form existence and path before wiring (§7) — they are not invented as live.

---

## 4. DERIVE THE CRM FROM THE FORMS

Now the CRM is read *out of* the registry, not designed independently. Every artefact below traces to a form column.

### 4a. The consolidated tag set (which forms produce which tags)

Namespaced, lowercase, colon-delimited — matching the existing ~390-tag convention (`project: role: tier: interest: comms: source: place: action: care: consent:`).

| Tag | Written by which form(s) | Meaning |
|---|---|---|
| `project:act-in` | ACT Main Newsletter, General Contact (default) | ACT ecosystem |
| `project:goods` | all Goods forms, Shop | Goods |
| `project:justicehub` | JusticeHub forms | JusticeHub |
| `project:empathy-ledger` | EL storyteller intake | Empathy Ledger |
| `project:act-hv` | Harvest forms only (none from act.place newsletter) | Harvest |
| `tier:connected` | Newsletter, Donation | belonging rung reached |
| `role:volunteer` / `role:donor` / `role:supporter` / `role:buyer` / `role:storyteller` / `role:funder` | respective forms | what the person is |
| `comms:act-newsletter` / `comms:goods-updates` / `comms:justicehub-updates` | the matching newsletter forms | which list (drives sends) |
| `source:website-form` | every site form via upsert | lead source |
| `action:enquiry` / `action:volunteer-apply` / `action:donate` / `action:buyer-enquiry` / `action:purchase` | per form intent | the first action |
| `consent:newsletter-explicit` | any form where the consent box was ticked | proof of opt-in |
| `care:ocap-gated` | EL storyteller intake | do not publish without consent-check |

Rule: a form may only write tags that its fields justify. The newsletter form may write `comms:act-newsletter` because it captured a consent box; the General Contact form may NOT, because it didn't.

### 4b. The custom-value / custom-field set

| Field | id | Written by | Set where |
|---|---|---|---|
| `newsletter_consent` | aVnqmajnysMtGYhLD0oA | all newsletter forms | **in code** (server upsert) |
| `consent_source` | HdnMUyXkZRPZG7l7cygG | all consenting forms | in code |
| `first_action_date` | JovUpJTwrhctE85adcSV | every form (first touch) | in code, only if empty |
| `projectCode` (drives routing) | (new custom field — §7) | every form | in code — **this is the routing key** |
| `utm_source/medium/campaign/term/content` | native GHL fields | every form (hidden fields) | client → upsert |
| `lead_site` (e.g. `act.place`, `justicehub`) | (new — §7) | every form, hard-coded per site | in code |

The single most important new field is **`projectCode`**, set in code on every submit. It is what the one intake workflow routes on. It is the thing that was missing when Harvest grabbed the newsletter.

### 4c. Per-project pipelines / journeys

| Project | Journey/pipeline | Rungs |
|---|---|---|
| **ACT-IN** | **ACT — Ecosystem Journey** (NEW) | 5 rungs — proposed: Newcomer → **Connected** → Participant → Contributor → Advocate (Ben to confirm names, §7). Belonging, not sales. |
| **ACT-HV** | Harvest Membership Journey (exists) | Curious → Connected → Member → Active → Steward (143 seated) — **left untouched** |
| **Goods** | Goods Supporter Journey · Goods — Buyer Pipeline · Goods — Demand Register | as configured (commerce lifecycle allowed) |
| **Empathy Ledger** | Empathy Ledger | belonging + consent state, OCAP-gated |
| **Donors (cross-project)** | Supporters & Donors | donation lifecycle |
| **Grants/partners** | Grants | partner/funder lifecycle |
| — | Universal Inquiry · Harvest Inbox | triage inboxes (route out by projectCode, never a terminal home for ACT-IN) |
| — | "A Curious Tractor" pipeline | farming metaphor (Germination→Growth→Harvest→Composting→Graduation→Not Yet) — **NOT belonging rungs; don't conflate with the Ecosystem Journey** |

### 4d. The workflow set — ONE intake per project, routed by projectCode

This is the architectural fix. Instead of many workflows each grabbing contacts off "Contact Created," there is **one intake workflow** that reads `projectCode` and routes. Per Digest 4, it must NOT trigger on "Contact Created" (fails on upsert-update for returning contacts) — it triggers on a deterministic signal the code sets every time.

| Workflow | Reliable trigger | Routes by | Seats to |
|---|---|---|---|
| **ACT — Intake** (the one router) | **Inbound Webhook** POSTed by `/api/forms/submit` (deterministic, fires for new AND returning), OR "Contact Tag added = `source:website-form`" as backup | `projectCode` custom field | ACT-IN → Ecosystem Journey/Connected · ACT-HV → Harvest · Goods → Goods pipelines · Empathy Ledger → EL (OCAP) · donor → Supporters & Donors |

**How this prevents the Harvest-vs-ACT class of error:** the workflow no longer guesses. It cannot seat a contact to Harvest unless the *form* declared `projectCode=ACT-HV`. The act.place newsletter form declares `projectCode=ACT-IN`, so the router sends it to the Ecosystem Journey, every time, deterministically. There is no path by which a community newsletter signup reaches a Harvest pipeline, because no form produces the input that would route it there. The error class is closed by construction, not by vigilance.

---

## 5. CONNECTING + ANALYZING WEBSITE DATA IN GHL

### How site data flows in reliably

The live path is already the right shape; it needs three hardenings.

1. **The submit path:** site form → `POST /api/forms/submit` → (tries `ACT_ECOSYSTEM_API_URL`, unreachable in prod, fine) → falls through to `pushToGHL` **upsert** (Digest 4 rec #3: always upsert by email, never plain create — it dedupes on the location's email-primary setting).
2. **Consent + projectCode set in code** on the upsert payload via the `customFields` array by field id (Digest 4 rec #12) — because GHL's "Contact Created" trigger does not fire on upsert-update for returning contacts (Digest 4 rec #2). We do not trust GHL triggers to set consent; the code sets it.
3. **Intake fired by Inbound Webhook**, not by "Contact Created." Deterministic for new and returning. Backup trigger: tag `source:website-form` added (Digest 4 rec #2: trigger on a tag you control, not on creation).

**Source / UTM capture (Digest 4 recs #6–#10):** because ACT forms are external (Next.js, not native GHL forms), GHL's native attribution does NOT fire — external events capture no attribution (Digest 5 rec #2). So ACT must own it:

- Add **hidden UTM fields** to every form (`utm_source/medium/campaign/term/content`), populated client-side from the querystring, plus `document.referrer`, persisted in a cookie/localStorage so they survive multi-page navigation (recs #6, #8).
- Hard-code a **`lead_site` hidden field per site** (`act.place`, `justicehub`, `goods`) — never rely on referrer alone to tell sites apart (rec #10).
- Pass all of it through the upsert `customFields`.

### How to analyze it

- **In GHL:** custom sub-account dashboards (Digest 5 rec #3) with widgets for contacts created, pipeline value, and lead source; add **first/last attribution + UTM as filters** (rec #4). Note GHL's native "conversion rate = WON ÷ opt-ins" is a sales definition and does not fit a belonging org — redefine it (rec #5).
- **The durable layer — Supabase mirror → command-center.** Mirror GHL into the shared Supabase via **outbound webhooks** on contact create/update and **Pipeline Stage Changed** (Digest 5 recs #6, #10), storing `contact.id` as the key so no search step is needed. This is where belonging metrics get defined — GHL's sales math can't express them. The command-center then reads the mirror (it already is the form receiver + analytics surface).
- **Web layer per site:** GA4 native connector (Digest 5 rec #7) or **Plausible** for the public site — cookieless, privacy-friendly, better optics for a community org wary of surveillance (rec #9). Plausible parses the same UTMs.

### What to track (belonging-driven, not sales)

From Digest 5's mission-driven section:

- **First touch** — which story/event/channel brought someone in (not "which ad converted").
- **Engagement depth** — touches/replies/RSVPs/returns per contact over time, not WON/lost.
- **Journey stage + time-in-stage** — movement along the Ecosystem Journey rungs, logged event-by-event via the Pipeline Stage Changed webhook, so it's a real timeline not a snapshot.
- **Re-engagement / return rate** — who comes back (Plausible goals + GHL last-touch).
- **Source → outcome equity** — which communities/channels lead to deeper participation, so outreach isn't skewed.
- **Consent state as a tracked field** — mirrored to Supabase; central to ACT's OCAP posture, and the thing that gates every external use of a storyteller record.

---

## 6. FIX LIST + SAFE SEQUENCE

Order matters. Each step is reversible and adds no sends without consent. Tier-2 GHL writes (workflow/pipeline config, field updates) get a one-line "about to do X — proceed?" before execution; nothing here sends a message.

1. **Build "ACT — Ecosystem Journey" pipeline (5 rungs).** Names Ben-confirmed (§7). No contacts moved yet. *(Tier 2 — confirm rung names first.)*
2. **Add the `projectCode` custom field** (and `lead_site`) to the location. No behaviour change yet.
3. **Repoint "ACT — Intake."** Change it to route on `projectCode`: `ACT-IN → Ecosystem Journey / Connected`; remove the path that seats ACT-IN to Harvest. Leave the Harvest Membership Journey pipeline itself untouched. *(This is the core fix.)*
4. **Set `projectCode=ACT-IN` in code** in `/api/forms/submit` → `pushToGHL` for the newsletter formType. Verify the upsert writes it (Digest 4: round-trip-test the custom field before any bulk run).
5. **Switch the intake trigger** from any "Contact Created" reliance to the **Inbound Webhook** (already POSTed) + backup tag-trigger on `source:website-form`. Confirms returning contacts route too.
6. **Migrate the already-mis-seated act.place newsletter contacts** off Harvest onto the Ecosystem Journey/Connected rung. Query first (how many are wrongly seated), move deliberately, do not delete. *(Tier 2 — confirm count first.)*
7. **Add source/UTM capture** — hidden UTM fields + `lead_site` + cookie persistence on the act.place form, mapped through the upsert.
8. **Wire each remaining site/form** from the registry, one at a time, only after Ben confirms its existence and path (§7): JusticeHub, Goods forms, Shop, EL storyteller intake (OCAP-gated — consent-check before any external use), Grants/partner.
9. **Decommission the dead native "Newsletter Signup"** (0 submissions) — document it as retired so no one re-points to it.
10. **Stand up the Supabase mirror + dashboards** once the flow is correct, so analytics measure the fixed pipeline, not the broken one.

Hard rule throughout: **no send to any contact without an explicit consent field set at the form.** Steps 1–10 change routing and capture, never outbound. The EL storyteller path stays behind the consent-check gate at every step.

---

## 7. OPEN QUESTIONS / DECISIONS FOR BEN

Unknowns from the digests + GHL state. Not invented — these block specific registry rows.

1. **act.place repo + form source.** Memory says the brand site is likely `act-regenerative-studio`, served via Vercel as "Third Party," NOT this repo's `apps/website`. Confirm the actual repo and where the live newsletter form HTML lives, so steps 4/7 edit the right place.
2. **ACT — Ecosystem Journey rung names.** I proposed Newcomer → Connected → Participant → Contributor → Advocate (5 rungs, "Connected" matching the existing tier). Confirm or replace. These are belonging rungs, deliberately distinct from the "A Curious Tractor" farming-metaphor pipeline and from Harvest's Curious→Steward.
3. **JusticeHub form path.** Is justicehub.com.au's contact/newsletter form wired to `/api/forms/submit`, or is it Webflow-native and unconnected? Determines whether it's ⚠️ or ◻️.
4. **Goods forms (Supporter / Buyer / Demand) and The Shop.** The pipelines exist; do the *forms* feeding them route through `/api/forms/submit`, or are they GHL-native / Shop-platform forms? Platform for "The Shop" is unconfirmed.
5. **Empathy Ledger storyteller intake wiring.** How does a storyteller record actually enter GHL today (EL v2 → GHL sync exists as a skill)? Whatever the path, OCAP rules override: no auto-syndication, consent-check gate first. Confirm the current path so we can put the gate in front of it.
6. **Donation routing — charity vs Pty.** Donations may need DGR routing to The Butterfly Movement Ltd (the endorsed DGR/PBI) rather than ACT Pty. Confirm which entity owns the donor relationship for tax-receipting before wiring the Donation form's projectCode.
7. **Grants/partner form** — does a public grants/partner enquiry form exist, or is the Grants pipeline fed manually? If manual, drop that registry row.
8. **`ACT_ECOSYSTEM_API_URL` (localhost:3456).** It's unreachable in prod and the system correctly falls through to GHL. Decision: is that fall-through the intended permanent design, or should this be a real deployed service? If it's meant to be live, the whole capture path changes.
9. **Native vs external forms strategically.** Digest 4/5 both note native GHL forms get attribution/triggers "for free," external forms don't. ACT runs external Next.js forms. Confirm we accept owning UTM capture + the tag-trigger workaround (recommended, keeps design control), rather than migrating to embedded native GHL forms.
10. **`projectCode` taxonomy authority.** Confirm the canonical projectCode list (ACT-IN, ACT-HV, Goods, Empathy Ledger, JusticeHub, etc.) so the routing key has one source of truth and forms can't emit a code the intake router doesn't know.