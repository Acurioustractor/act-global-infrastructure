---
title: GHL Audience · Comms · Automation Strategy
status: Draft (PROPOSED — decision points flagged for Ben)
date: 2026-06-08
type: concept
summary: The strategy the taxonomy serves — how ACT segments audiences, runs comms streams (newsletters + drips), triggers automated workflows, and writes form tags, with consent + community-line gates enforced before any send. Get this right BEFORE migrating tags or switching on automations.
relates_to: wiki/concepts/ghl-crm-taxonomy.md · wiki/concepts/the-field.md · wiki/concepts/ecosystem-value-exchange.md · wiki/decisions/notion-page-policy.md
---

# GHL Audience · Comms · Automation Strategy

> The taxonomy (`ghl-crm-taxonomy.md`) is the *vocabulary*. This is *how we speak* — who's in which audience, which automated streams may reach them, what fires the workflows, and what every form writes. **This must be right before automations switch on: an automation is a tag-trigger that sends to a human, at scale, without a person in the loop.** A wrong tag = a wrong send. For community-line people, a wrong send is a relationship breach.

## The five-layer model

Each layer does ONE job. Keeping them separate is what makes automation safe.

```
1. DESCRIBE   identity tags (role: project: place: interest: source:)  ← what's TRUE
2. SEGMENT    smart-lists = saved tag queries                          ← who's a GROUP
3. ENROL      comms: tags = membership of a sendable stream            ← who gets WHAT
4. ACT        workflows fire on triggers (form / tag-add / stage / date)← what HAPPENS
5. GATE       consent + community-line invariants checked before send  ← who must NOT
```

The golden rule: **identity tags never trigger a send.** Only `comms:` membership does, and `comms:` membership is *derived* (by automation) from segment + consent − community-line. You never hand-add a `comms:` drip tag; the workflow grants it once the gates pass.

## Layer 2 — Audiences (the segments / smart-lists)

Saved tag-queries. These are the lists Ben thinks in. Each is a query, not a hand-list:

| Audience | Smart-list definition (tag query) | Used for |
|---|---|---|
| Org supporters | `role:supporter` AND `newsletter_consent=Yes` AND NOT `lane:community` | act-newsletter |
| Goods supporters | `project:act-gd` AND `role:supporter` AND consent AND NOT community | goods-newsletter |
| Harvest members | `project:act-hv` AND `tier:member`+ | harvest updates |
| Active funders | `role:funder` AND NOT `lane:community` AND in a live opportunity | funder stewardship |
| Goods buyers | `role:buyer` | commercial nurture |
| Community / storytellers | `lane:community` OR `role:storyteller` | **never a segment for automation; comms is per-person explicit opt-in only (storyteller/Elder human-confirmed)** |
| Inner circle | `ring:5` / `ring:15` | Ben tends personally |

Note community/storytellers is listed so it's explicit: it exists to be *excluded* from every automated audience, never targeted.

## Layer 3 — Comms streams (the `comms:` namespace)

Each `comms:` tag = enrolment in one automated stream. Proposed canonical set:

| Stream | Who (derived) | Cadence | Consent required |
|---|---|---|---|
| `comms:act-newsletter` | org supporters | monthly | `newsletter_consent=Yes` |
| `comms:goods-newsletter` | Goods supporters/buyers opted-in | ~monthly | newsletter_consent |
| `comms:harvest-newsletter` | Harvest members/locals | event-driven | newsletter_consent |
| `comms:justicehub-newsletter` | JusticeHub audience | event-driven | newsletter_consent |
| `comms:funder-drip` | active funders (NOT community) | stewardship | relationship (not mass-consent) |
| `comms:buyer-drip` | Goods buyers | commercial | relationship |
| `comms:supporter-drip` | new supporters (first 30d) | onboarding | newsletter_consent |

**Four newsletters (D1 DECIDED 2026-06-08):** ACT main · Goods · Harvest members · JusticeHub — each a distinct opt-in list, a person can hold several. **Retire (D2 DECIDED):** `comms:partner-drip` (community-line risk — partners are hand-only) and `comms:nurture` (vague — replaced by the specific drips).

## Layer 4 — Automations (the workflows we're getting ready for)

| Trigger | Workflow | Writes |
|---|---|---|
| Newsletter form submit | stamp consent → enrol → welcome sequence | `newsletter_consent=Yes`, `source:website`, `role:supporter`, `comms:act-newsletter` |
| Goods inquiry form | route + tag | `project:act-gd`, `role:buyer\|supporter`, `interest:*`, `source:website` |
| `role:funder` added (+ not community) | flag for stewardship (manual enrol to funder-drip) | (no auto-send — funder cadence is human-paced) |
| Behaviour: opened/clicked 2× | advance `tier:curious`→`connected` | `tier:connected` |
| Behaviour: donated / bought / attended | advance →`tier:member` | `tier:member` |
| **`lane:community` added** | **STRIP `comms:*` LACKING consent evidence (the guard)** | removes auto-enrolled drips; KEEPS a `comms:` paired with `newsletter_consent=Yes` (a genuine opt-in) |
| Xero invoice paid | mark buyer/funder, capital tracking | `role:buyer\|funder` |

## Layer 5 — The gates (checked before ANY enrolment or send)

Two hard invariants. Every workflow asserts both; the migration script verifies them; a nightly check re-asserts them.

1. **Consent gate** — no `comms:*-newsletter` unless `newsletter_consent=Yes`. (Australian Spam Act 2003 — explicit consent, no implied-from-inquiry.) Drips need a documented relationship, not mass consent.
2. **Community-line gate (agency model)** — `lane:community` OR community-context `role:storyteller` is **never AUTO-enrolled** into a `comms:*-drip` / newsletter. A `comms:*` may sit on them **only** with explicit consent evidence (`newsletter_consent=Yes`); storyteller/Elder opt-ins are **human-confirmed**. This is **not exclusion** — they are out of the *funnel*, not out of *communication*: operational messages (their own action) and human-written replies always flow. OCAP = control rests with the person. (2026-06-07 strip removed auto-enrolments, not opt-ins; see `strip-community-line-tags.mjs`.)

## Forms → tag contract

Every form writes a deterministic, namespaced set — no more ad-hoc flat tags (`harvest-website`, `eoi-gathering-march-2026`). Each ACT form gets a documented tag-write spec so the data stays clean at the source:

| Form | Writes |
|---|---|
| Newsletter signup | `source:website` · `role:supporter` · `newsletter_consent=Yes` · `comms:act-newsletter` |
| Goods inquiry | `source:website` · `project:act-gd` · `role:buyer`\|`supporter` · `interest:*` |
| Volunteer | `role:supporter` · `interest:volunteer` · Volunteer-Interests field |
| Event/EOI | `source:event:<slug>` · `project:*` |
| Partnership inquiry | `role:partner` · `partnership_type` field (NO auto-drip — routes to human) |

## Decision points — DECIDED 2026-06-08

- **D1 — Newsletters:** ✅ FOUR distinct lists — `comms:act-newsletter` · `comms:goods-newsletter` · `comms:harvest-newsletter` · `comms:justicehub-newsletter`. A contact can hold several.
- **D2 — Partner drip:** ✅ Retire `comms:partner-drip` — partners are hand-only (community-line risk).
- **D3 — Tier:** ✅ `tier:` auto-advances on behaviour (opens/donations/purchases); `ring:` stays hand-set (Field closeness).
- **D4 — Consent:** ✅ Explicit only — `newsletter_consent=Yes` required before any newsletter enrol; inquiry/purchase never implies consent (Spam Act 2003 + OCAP).

The comms streams + triggers above are now locked. The migration worksheet (`thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md`) is the gated input to the apply step.
