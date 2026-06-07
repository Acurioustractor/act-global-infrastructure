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
