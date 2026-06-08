---
title: Website forms → GHL tag-contract alignment (whole-system review)
date: 2026-06-08
status: OPEN — newsletter path fixed (branch pushed, undeployed); every other form still to align
type: review / mission-brief
owner: Ben (decisions) · fresh session (execution)
relates_to:
  - wiki/concepts/ghl-audience-comms-automation.md  (the canonical tag contract — §"Forms → tag contract")
  - wiki/concepts/ghl-crm-taxonomy.md                (tag/field audit + gated migration)
  - thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md
repos:
  - act-regenerative-studio  (act.place — THE public forms live here)
  - act-global-infrastructure (apps/website = internal/dashboard only; not public forms)
---

# Website forms → GHL tag-contract alignment

## Mission (the fresh session's job)
Review **every form across the whole website system** and align each one's GHL
tag-write to the canonical contract in
`wiki/concepts/ghl-audience-comms-automation.md` §"Forms → tag contract" —
BEFORE automations switch on. An automation is a tag-trigger that sends to a
human at scale with no one in the loop; a wrong tag = a wrong send. Get the tag
contract right at the source (every form) so the data stays clean and the
segments/automations are safe.

This started as decision #4 ("prove the live signup path") and revealed the
newsletter path had drifted from the contract. Fixing newsletter exposed that
the SAME drift exists across all the other forms. This brief is the whole-system
sweep.

## The canonical contract (target — from the taxonomy doc)
| Form | Must write |
|---|---|
| Newsletter signup | `source:website` · `role:supporter` · `newsletter_consent=Yes` · `comms:<project>-newsletter` |
| Goods inquiry | `source:website` · `project:act-gd` · `role:buyer`\|`supporter` · `interest:*` |
| Volunteer | `role:supporter` · `interest:volunteer` · Volunteer-Interests field |
| Event/EOI | `source:event:<slug>` · `project:*` |
| Partnership inquiry | `role:partner` · `partnership_type` field (NO auto-drip — routes to human) |

Golden rules: **namespaced tags only** (no ad-hoc flat tags) · **identity tags
never trigger a send** (only `comms:` membership does) · **consent explicit
only** (`newsletter_consent=Yes`, never implied from an inquiry) · **community-
line people get ZERO `comms:*`** (hand-written replies only).

## What's DONE (2026-06-08 PM session)
- **Newsletter path PROVEN + FIXED.** Live consent gate works end-to-end: a real
  signup lands `newsletter_consent=Yes` + `comms:act-newsletter` in GHL (verified
  on contact `spzexfNKtWDyktWC1bjb`). But the tag contract had drifted; fixed in:
  - regen-studio branch **`wip/newsletter-tag-contract-2026-06-08`** (commit
    `a807396`), **PUSHED to origin, NOT deployed, NO PR yet.**
  - Changes: `route.ts` FORM_RULES (added `role:supporter`, `source:website-form`
    → `source:website`, dropped raw `projectCode`/`formType` flat tags,
    `tier:connected` → `tier:curious`); `NewsletterForm.tsx` (flat
    `Newsletter`/`Context:`/`Route:`/`Source:` tags → namespaced
    `source:website-<placement>`; route/context provenance moved into the
    Supabase submission `fields`). tsc clean.
- **DEPLOY + TRACER STILL PENDING (Tier 3, Ben's verb).** The corrected contract
  (incl. the still-never-seen-live `source:website` tag + consent-source field
  `HdnMUyXkZRPZG7l7cygG`) needs a prod deploy + ONE live tracer
  (`ben+nltracer-<date>@…`, also tag `test:tracer`) → verify in GHL → then decide
  on deleting the test contact (Tier 3).

## Forms inventory (regen-studio — the public surface)
All POST to `/api/forms/submit` → (prod) falls through to `pushToGHL` fallback in
`src/app/api/forms/submit/route.ts` (Command Center localhost unreachable from
Vercel; confirmed). Each carries a `formType`:

| Component | formType | In FORM_RULES? | Status |
|---|---|---|---|
| `forms/NewsletterForm.tsx` | `newsletter` | ✅ yes | **FIXED (undeployed)** |
| `forms/NewsletterCTA.tsx` | (wraps NewsletterForm) | — | inherits the fix |
| `forms/ContactForm.tsx` | `contact` | ✅ yes | route.ts source-slug fixed; **form still emits flat `Context:/Route:/Source:` tags** |
| `forms/CSAInterestForm.tsx` | `csa` | ❌ **NO** → bare `source:website` default | **unaligned** |
| `forms/FarmStayForm.tsx` | `farm-stay` | ❌ **NO** | **unaligned** |
| `forms/ResidencyForm.tsx` | `residency` | ❌ **NO** | **unaligned** |
| `confessions/FoundationContestForm.tsx` | `payout-wall-contest` | ❌ **NO** | **unaligned** |
| `flagship/QuickInquiryForm.tsx` | `flagship-inquiry` | ❌ **NO** | **unaligned** |

`forms/EnquiryExpectations.tsx` = supporting UI (verify it isn't a separate
submitter). `dashboard/GHLFormActivity.tsx` = read-only display of form types.

### The core gap
`FORM_RULES` (route.ts) defines only `newsletter / contact / donation /
volunteer / event`. **Five live formTypes** (`csa`, `farm-stay`, `residency`,
`payout-wall-contest`, `flagship-inquiry`) have **no namespaced contract** — they
fall to the bare default and seat no `role:`/`interest:`/`action:` identity. Each
needs: (a) a FORM_RULES entry, (b) its form component's `additionalTags`
namespaced (kill flat `Context:/Route:/Source:`), (c) a ruling on
role/interest/project/pipeline per the taxonomy.

## Systemic issues to fix (apply to ALL forms)
1. **FORM_RULES coverage** — add an entry for every live formType (the 5 above).
2. **Flat-tag pollution at the form layer** — `ContactForm`, `ResidencyForm`,
   `FarmStayForm`, `CSAInterestForm`, `FoundationContestForm`, `QuickInquiryForm`
   still build `Context:/Route:/Source:`-style flat additionalTags (same pattern
   NewsletterForm had). Namespace them (or move provenance to `fields`).
3. **Stale-tag accumulation** — GHL upsert ADDS, never replaces. Existing contacts
   keep tags from every retired code generation (test contact carries
   `comms:newsletter`, `project:act-core`, `tier:connected`). The taxonomy
   migration (`scripts/ghl-taxonomy-migrate.mjs`, dry-run-only) must clean these;
   they won't self-heal.
4. **`volunteer`** currently writes `role:volunteer` — taxonomy wants
   `role:supporter` + `interest:volunteer` + Volunteer-Interests field.
5. **`event`** writes `source:event-signup` — taxonomy wants `source:event:<slug>`.
6. **Partnership inquiry** — confirm which component/formType handles it; must
   write `role:partner` + `partnership_type`, NO auto-drip (routes to human;
   community-line risk).

## Other surfaces to map (don't assume regen-studio is the whole system)
- **Webflow ×2 (ACT + JusticeHub)** — where do their form submissions go? GHL
  native form? a webhook? Map the destination + tag-write for each. (CLAUDE.md
  Integration Rules: Webflow custom API, 2 sites.)
- **GHL native forms** — DEAD (0 submissions across all 4). Don't trigger
  workflows on `Form Submitted` for signups. Confirm none are silently wired.
- **`apps/website` (this repo)** — internal/dashboard only (newsletters display,
  `/api/dashboard/forms`, `/api/webhooks/ghl/contact-sync`). NOT public forms —
  but confirm no public form slipped in.
- **act-ecosystem `/api/forms/submit` (localhost:3456)** — the "primary" handler
  the studio forwards to in dev. Unreachable in prod (so fallback is the live
  path), but if it's ever deployed it must apply the SAME contract.

## Suggested method (per-form, same as newsletter)
1. Build ONE contract table: every formType → exact target tag/field set (ratify
   with Ben — role/interest/project/pipeline per form are HIS rulings).
2. Fix `route.ts` FORM_RULES (all formTypes) + each form component's
   `additionalTags` in regen-studio. `npx tsc --noEmit` after each.
3. One commit per logical group; branch off main; push (Tier 2); **PR/merge/deploy
   = Tier 3, Ben's verb.**
4. After deploy: ONE live tracer per representative form → verify the contract
   landed in GHL → then automations are safe to switch on.
5. Update memory `newsletter-consent-signup-path` once the deployed behaviour is
   confirmed (it still describes the pre-fix `tier:connected` write).

## Tier discipline
Form code edits + local commits = Tier 1. Branch push = Tier 2 (Ben's "push").
PR / merge / Vercel prod deploy = Tier 3 (explicit verb). Live tracer = Tier 2
(creates a GHL contact — flag + cleanup plan). Deleting the test contact = Tier 3.
GHL bulk tag migration (`--apply`) = Tier 2/3, gated on Ben's orphan-tag rulings.

---

# Whole-system Vercel review (2026-06-08 PM — EXECUTED)

> Step 1 of Ben's ask ("review all websites via Vercel MCP for the 5 main ACT
> projects, then align all forms + all tags, then review lists + newsletter").
> This section is the executed review. **It found the scope is ~3× the brief
> above** — three separate codebases write into ONE GHL account, each with its
> own ad-hoc tag vocabulary. Alignment is BLOCKED on one architectural decision
> (see "Decision needed").

## The 5 main projects — Vercel deployment status (VERIFIED via Vercel MCP)
Scope confirmed by Ben: act-regenerative-studio, justicehub, the-harvest,
goods-on-country, empathy-ledger-v2.

| Project | Framework | Prod domain | Latest deploy | Has live GHL forms? |
|---|---|---|---|---|
| act-regenerative-studio | Next.js | `act-regenerative-studio.vercel.app` (act.place NOT in its domain list — served as 3rd-party alias / elsewhere) | READY (prod) | **YES** — 7 formTypes → `/api/forms/submit` |
| justicehub | Next.js | `justicehub.com.au` + www | READY (prod) | **YES** — 5+ GHL API routes (own vocab) |
| empathy-ledger-v2 | Next.js | `empathyledger.com` + www + `picc.empathyledger.com` | READY (prod) | **YES** — World Tour forms (own vocab, multi-tenant) |
| the-harvest | **Vite** | `theharvestwitta.com.au` + www | latest deploy `target:null` (preview, not promoted) | **NO** — repo is docs-only; no GHL forms found |
| goods-on-country | Next.js | none (only `*.vercel.app` preview) | **readyState: ERROR**, no prod domain | **NO** — repo docs-only; build broken |

## The linchpin — ONE GHL account (VERIFIED via GHL MCP)
- `agzsSZWgovjwgpcoASWG` = **"A Curious Tractor"** (www.act.place,
  benjamin@act.place, single sub-account — `isAgencySubAccount: {}`).
- **JusticeHub repo `.env` → `GHL_LOCATION_ID=agzsSZWgovjwgpcoASWG`** (same as
  this canonical ACT repo). So JusticeHub forms write into the MAIN ACT account.
  VERIFIED.
- regen-studio has DISTINCT per-project envs (`GHL_ACT_HUB_LOCATION_ID`,
  `GHL_JUSTICEHUB_LOCATION_ID`, `GHL_FARM/GOODS/HARVEST_LOCATION_ID`; routing at
  `src/app/api/webhooks/ghl/contact-sync/route.ts:63-68`). Local values are
  PLACEHOLDERS (`your_location_id_here`) — real values live only in Vercel prod,
  unread. So the multi-sub-account model is LATENT in code but contradicted by
  JusticeHub's actual single-account config. **INFERRED: in practice everything
  lands in the one "A Curious Tractor" namespace.** (To VERIFY: read regen-studio
  Vercel env for the 5 GHL_*_LOCATION_ID values.)
- empathy-ledger-v2 is **multi-tenant** — writes to a per-tenant location from
  `ghl_integrations.api_key_encrypted` / `selectedLocationId`. The ACT/World-Tour
  tenant's location is UNVERIFIED (could be A Curious Tractor or a separate EL
  location). Needs a one-row DB check before its tags are deemed in/out of scope.

## Whole-system forms inventory — what each codebase ACTUALLY writes to GHL

### A. act-regenerative-studio (act.place) — per the brief above
7 formTypes → `/api/forms/submit` → `pushToGHL` fallback. Newsletter FIXED
(undeployed). 5 formTypes have no namespaced contract. (Full detail in brief.)

### B. justicehub (justicehub.com.au) — ENTIRELY off-contract (VERIFIED, file:line in agent report)
Writes to **A Curious Tractor** via its own `GHL_TAGS` constants
(`src/lib/ghl/client.ts:550-609`). All flat/capitalised, none namespaced:
| Route | formType | Tags written (flat) |
|---|---|---|
| `/api/ghl/newsletter` | newsletter | `Newsletter`, `JusticeHub`, `STEWARD`/`RESEARCHER` |
| `/api/ghl/signup` | steward/member | `JusticeHub`, `STEWARD`, `ROLE_ORGANIZATION/MEDIA/SUPPORTER/FUNDER/LIVED_EXPERIENCE`, `STATE_NSW…ACT`, legacy `MEDIA`/`PARTNER`/`WANTS_TO_HELP`; creates Steward opportunity |
| `/api/ghl/register` | event | `EVENT`, `JusticeHub`, role tags, `CONTAINED`, `PUBLIC_VISITOR`, event-slug tags |
| `/api/contact` | contact | `JusticeHub`, `act-inquiry`, `project-justicehub`, `PARTNER`/`MEDIA`, `WANTS_TO_HELP`+`CONTAINED` |
| `/api/contained/nominations` | nomination | `NOMINATED`, `CONTAINED`, `JusticeHub` |
| `GHLForm.tsx` | embedded | native GHL iframe (link.msgsndr.com) — tags configured in GHL, not code |
- **No Webflow forms** — Webflow refs are legacy content-migration scripts only.
- Consent: mostly implicit (newsletter checkbox optional, no explicit
  `newsletter_consent=Yes` field). **Off the consent contract.**

### C. empathy-ledger-v2 (World Tour) — partially namespaced, own vocab (VERIFIED)
| File | formType | Destination | Tags |
|---|---|---|---|
| `world-tour/EmailCaptureForm.tsx` | subscribe | `/api/subscribe` → GHL (non-blocking) | `empathy-ledger`, interest[], `world-tour`, `wt-stage:follow-along`, `wt-lane:{lane}`, `wt-stop:{slug}`, `partner-network` |
| `world-tour/ContactForm.tsx` | contact | `/api/world-tour/contact` → GHL | `empathy-ledger`, `world-tour`, `contact-form`, `act-inquiry`, `project-empathy-ledger`, `wt-*` |
| `admin/intake/IntakeForm.tsx` | intake | Supabase only | — (no GHL) |
- Uses `wt-stage:`/`wt-lane:`/`wt-stop:` (namespaced-ish) but also flat
  `empathy-ledger`/`world-tour`/`contact-form`. Consent via checkboxes.

### D. the-harvest / goods — NO live GHL forms (VERIFIED)
Both repos are docs-only locally; harvest deploys from elsewhere (Vite, witta)
with no GHL forms found; goods build is broken (ERROR). Out of forms scope for
now — revisit if/when they ship a real signup.

## The real gap (revised)
The brief assumed ONE codebase (regen-studio) to align. Reality: **three live
codebases** (regen-studio + JusticeHub + empathy-ledger-v2) write contacts/tags
into the **one "A Curious Tractor" GHL account**, each with a different ad-hoc
vocabulary. The canonical contract in `wiki/concepts/ghl-audience-comms-automation.md`
currently governs none of JusticeHub's or EL's writes. Cleaning regen-studio
alone leaves two other pollution sources active.

## Decision needed (BLOCKS all alignment) — Ben's call
1. **GHL account model.** Keep ONE "A Curious Tractor" account for ALL sites
   (then ALL 3 codebases must conform to the single canonical contract — bigger
   job), OR activate regen-studio's latent per-project sub-account model (each
   site gets its own GHL location + its own contract; JusticeHub/EL vocab stays
   local). Everything downstream (which tags are "violations", the migration
   scope, the lists/newsletter review) depends on this.
2. Per-codebase role/interest/project/consent rulings (Ben's), once #1 is set.

## Suggested next steps (after the decision)
- VERIFY the two unknowns: regen-studio Vercel `GHL_*_LOCATION_ID` values + EL's
  ACT-tenant location (one DB row). Confirms whether #1 is already half-built.
- File a proper multi-codebase alignment plan (`thoughts/shared/plans/`) — this
  is now a 3-repo, 3+-file, domain-decision job (grill-with-docs is the front door).
- Only then touch code (Tier 1) / push (Tier 2) / deploy + GHL migration (Tier 3).
