---
title: GHL Tag Taxonomy & Pipeline Movement Model
date: 2026-06-01
status: proposed
owner: Ben
supersedes: the ad-hoc 291-tag sprawl in the GHL location agzsSZWgovjwgpcoASWG
related: comms-crm-operating-system, ghl-money-alignment, consent-check (OCAP)
---

# GHL Tag Taxonomy & Pipeline Movement Model

> **One-line:** Collapse 291 ad-hoc tags into ~9 namespaced "folders", make the **pipeline stage** the single source of truth for *where someone is*, and let **tags** carry the cross-cutting facts (*who they are, what they want, where they're from, how they arrived*) — migrated **additively** so no live automated message breaks.

## Context — the current state (audited 2026-06-01)

- **2,472 contacts · 1,203 tagged (49%) · 291 distinct tags · 12 pipelines · 26 workflows.**
- The problem is not tag *count*, it's **5 competing conventions for the same fact**:
  - "Goods contact" = `goods` (281) · `act-gd` (480) · `project:act-gd` (244) · `project-goods` (10)
  - "storyteller" = `storyteller` (287) · `Storyteller` (87) · `audience-storyteller` (34)
  - "funder" = `funder` (35) · `audience-funder` (85) · `goods-funder` (48) · `goods-gmail-funder` (7)
- **~700 junk/system tags** that should never have been durable: `gone-from-ghl*` (656 across 3 dated variants), `*-test` / `codex-smoke-test` / `webhook-test`, `*-review-2026-*`, `context: opp-fix-*`.
- **Consent gap:** 287+ storytellers, almost none carry a consent tag (only one `goods-story-consent-needed`). Given OCAP this must become first-class.
- The **Goods sub-system** (`goods-role-*`, `goods-src-*`, `goods-tier-*`, `goods-state-*`, `goods-community-*`) is the most mature pattern in the account and is the **model** the rest generalises from.

## Decision 1 — "Folders" = `namespace:value` prefixes

GHL has no literal tag folders. But every tag picker sorts alphabetically, so a **`namespace:` prefix is the folder** — `project:act-gd` and `project:act-hv` cluster; `role:funder` and `role:supplier` cluster. Combined with **Smart Lists** (saved filters on tag combos) you get actionable "folders". Pick **one** separator: `:` (colon), never `-` for the namespace boundary.

### The canonical namespaces (9)

| Folder | Answers | Canonical values | Replaces |
|---|---|---|---|
| `project:` | which ACT project | `act-gd, act-hv, act-jh, act-el, act-ce, act-oo, act-core, act-cn, act-ca, act-bg…` (the system-wide project codes) | `goods`, `act-gd`, `project-goods`, `harvest`, `the harvest`, `justicehub`, `empathy ledger` |
| `role:` | what they **are** to us | `funder, supporter, buyer, supplier, partner, storyteller, community, community-controlled, council, health-service, land-council, media, gov, vendor, elder, advisory` | `goods-role-*`, `funder`/`audience-funder`/`goods-funder`, `goods-supplier`, `goods-supporter`, `storyteller`/`audience-storyteller`, `partner`, `elder` |
| `temp:` | engagement heat (nurture) | `hot, warm, steady, cooling, cold, new` | `goods-hot/warm/cold/cooling/steady/new` |
| `interest:` | what they **want** | `membership, events, markets, workshops, garden, food, volunteer, washer, container, justice-reform, venue` | `interest-*`, `goods-washer-interest`, `container-request`, `harvest-shop-interest` |
| `place:` | geography | states `nt, qld, sa…`; communities `community:mount-liebig…`; cities `adelaide, brisbane…` | `goods-state-*`, `goods-community-*`, bare city tags |
| `source:` | how they arrived (attribution) | `website, footer, contact-form, linkedin, xero, grantscope, gmail-discovery, event:naidoc-2026, event:canberra-airport-2026, event:parliament-demo…` | `goods-src-*`, `goods-gmail-*`, `harvest-website`, `website-signup`, `auto-created-from-xero`, `world-tour` |
| `comms:` | what they're subscribed to | `goods-newsletter, harvest-newsletter, newsletter, nurture` | `goods-newsletter`, `harvest-newsletter`, `newsletter`, `goods-nurture` |
| `consent:` | OCAP / story consent | `full, limited, needed, none` | (mostly missing — **fill this**), `goods-story-consent-needed` |
| `ops:` | system / lifecycle-of-record | `gone, test, needs-review, auto-triage, duplicate` → then **delete most** | `gone-from-ghl*`, `*-test`, `*-review-*`, `auto-triage`, `context:*` |
| `priority:` | manual priority flag | `high, medium, urgent` | `priority-medium`, `goods-priority-high/medium`, `goods-key-partner` |
| `action:` | behavioural milestone | `meeting-held, quiz-completed, attended:<event>` | `meeting-held`, `quiz-completed` |

(11 namespaces total — `priority:` and `action:` are supplementary to the 9 core. The migration script `scripts/migrate-ghl-tags.mjs` reaches 97% coverage; 6 low-count triage/1-off tags are intentionally left as-is.)

## Decision 2 — `audience-*` folds into `role:` (chosen 2026-06-01)

`audience-funder → role:funder`, `audience-storyteller → role:storyteller`, `audience-partner → role:partner`. `audience-brand` (the "brand/general audience" segment) → `comms:newsletter` (it's a subscription segment, not an identity). One source of truth for "who someone is".

## Decision 3 — a tag must never duplicate a pipeline stage

This single rule removes ~50 tags. `goods-stage-prospect`, `goods-stage-customer`, `goods-signal`, and the whole `goods-tier-aware/engaged/active/champion` ladder all re-encode **where someone sits in a pipeline** — which the **pipeline stage already owns**.

- **Pipeline stage** = *where they are* in **one** journey (the source of truth; one per opp).
- **Tags** = *cross-cutting facts* true regardless of stage (who/what/where/how-arrived).

So `goods-tier-champion` dies — the Supporter Journey's `Stewarding/Renewing` stages carry it. `goods-stage-prospect` dies — the Buyer pipeline's `Qualified/In Conversation` carry it.

## Decision 4 — the migration is ADDITIVE-first (this is how we protect live messages)

**The hard constraint: do not break any of the 26 live workflows.** The GHL API can *list* workflows but **cannot read or edit their trigger config** (`GET /workflows/{id}` → 404) — so which tag fires which message is **UI-only** knowledge, and a tag rename can silently kill a running sequence.

Therefore the migration follows **expand → migrate → contract**:

1. **EXPAND (safe, automatable):** the migration script *adds* the canonical `namespace:value` tag(s) derived from each contact's existing tags. **It never removes the old tags.** All 26 workflows keep firing on the old tags exactly as today — **zero breakage**.
2. **MIGRATE (manual, GHL UI):** re-point each workflow's trigger from the old tag to the new canonical tag, **one workflow at a time, verified**. Also update the **tag-producing scripts** (below) to emit canonical tags.
3. **CONTRACT (gated):** only once a workflow + its producing scripts are confirmed on the new tag does its old tag become a deletion candidate. Junk (`ops:gone`, `*-test`) can be deleted immediately — nothing depends on it.

### Load-bearing tags — DO NOT auto-remove (workflow triggers, inferred from the 26 workflows)

`goods-inquiry` (Goods Inquiry → Acknowledge) · `goods-media` (Goods media form) · `newsletter`/`goods-newsletter`/`harvest-newsletter` (Newsletter Signup) · `harvest-member` (Harvest Member Welcome/Question) · `harvest-shop-interest` (Shop Interest Receipt) · `shop-prospect` (Shop prospect → create card) · `interest-volunteer` (Volunteer Application) · `eoi-gathering-march-2026` (EOI Gathering Confirmation) · `locals-day-march-2026` (Harvest Locals Day) · `goods-src-parliament-house-demo` (Parliament House Welcome) · `witta` (Witta Gathering Photos) · `contained` (Contained launch 2025, draft). **Confirm exact triggers in the GHL UI before contracting any of these.**

### Tag-producing scripts — must be updated in the MIGRATE phase (else old tags regenerate)

`scripts/project-notifications.mjs` (writes `justicehub`, `goods`, `harvest`, `contained`, `empathy-ledger`, `picc`…) · `scripts/clean-funder-ghl-contacts.mjs` (`goods-newsletter`) · `scripts/seed-goods-opps-from-xero.mjs` (`goods`, `auto-created-from-xero`) · `scripts/ghl-webhook-handler.mjs` (`Partner`, `ACT Farm`) · `scripts/sync-content-to-ghl.mjs`.

## The pipelines (12) and how tags route into them

7 real journeys + triage holding-pens. `project:` + `role:` is the **router**; the rest drive movement.

```
                       role:community / community-controlled
   source:* ─▶ NEW ──▶ ─────────────────────────────────▶ GOODS — DEMAND REGISTER (Signal ▶ Buyer Matched)
   (capture sets       role:buyer / customer / supplier               │ a matched Signal spawns ▼
   source: project:    ├──────────────────────────────────▶ GOODS — BUYER PIPELINE (Outreach ▶ Qualified ▶
   role: + consent:)   │                                       In Conversation ▶ Proposed ▶ Invoiced ▶ Paid)
                       │   role:funder / supporter                     │ a Paid/repeat buyer who keeps giving ▼
                       └──────────────────────────────────▶ GOODS SUPPORTER JOURNEY (Identified ▶ Qualified ▶
                                                              Cultivating ▶ Ask made ▶ Delivering ▶
                                                              Stewarding/Reporting ▶ Renewing)

   Other pipelines: A Curious Tractor (portfolio/venture) · Grants · Empathy Ledger · Festivals ·
   ACT Events · Mukurtu Node Activation · The Shop · Harvest Inbox + Universal Inquiry (triage → route out)
```

- **`project:` + `role:`** decide *which* pipeline on capture.
- **`temp:` + `interest:`** drive *which* nurture content runs and *when* to nudge the next stage.
- **`source:` + `place:`** are reporting/attribution (which channel, which community produces demand) — they don't move anyone.
- **`consent:`** is a hard gate before any storyteller content leaves the building (ties to the consent-check OCAP rule).

## How people move (the lifecycle)

1. **Enter** → capture sets `source:` + `project:` + `role:` (+ `consent:needed` for storytellers); router drops them into the right pipeline at stage 1.
2. **Nurture** → `temp:` + `interest:` drive automation; engagement warms `temp:cold → warm → hot`.
3. **Progress** → stage advances are tag/action-triggered (e.g. `interest:container` + `role:community` → Demand Register *Signal*; a Signal that finds a buyer → *Buyer Matched* → **spawns a Buyer-pipeline opp**).
4. **Convert** → Buyer hits *Paid*; the Xero invoice flows into the Grant Tranches / money work.
5. **Cross-pollinate** (highest-value, currently manual) → a *Paid* buyer or repeat funder gets `role:supporter` → enters **Supporter Journey** at *Cultivating*; a Champion supporter → advisory/board; a consented storyteller → funder deck. **These referrals should be automated, not left to memory.**

## Automation design — the 3 priority journeys

Designed to **layer onto the existing 26 workflows, not duplicate them**. Every send respects `comms:` opt-in and (for stories) `consent:`.

### A. Goods products (Demand → Buyer → Supporter)
- **Demand Register (community need):** `interest:container`/`interest:washer` + `role:community` → existing *Goods Inquiry → Acknowledge* fires; then a **2-step nurture** (what Goods is / how on-Country production works) on `temp:new`. On *Buyer Matched*, notify the Goods team + spawn the Buyer opp.
- **Buyer pipeline:** on *Proposed*, a quote-follow-up sequence; on *Invoiced*, payment reminder (tie to Xero `Invoiced` status); on *Paid*, a thank-you + **auto-add `role:supporter`** to open the Supporter Journey (the cross-pollinate move).
- **Supporter Journey:** *Ask made* → tailored ask by `temp:`; *Stewarding/Reporting* → the per-tranche acquittal reporting we just built (Grant Tranches) → *Renewing* nudge 60 days before cycle end.

### B. JusticeHub CONTAINED experience
- Tags in play today: `contained-hot-lead` (18), `contained-original-requester` (8), `contained-personal-outreach` (5), `contained-leader/advocate/nominee` (taxonomy ref). Workflow *Contained launch 2025* is **draft** — finish it here.
- Flow: `interest:justice-reform` + CONTAINED form → `role:contained-nominee` → welcome + what-CONTAINED-is → on engagement, `role:contained-advocate` → invite to the experience → post-experience story-capture **gated on `consent:`**.

### C. The Harvest
- Richest existing automation set (Member Welcome/Question, Shop Interest, EOI Gathering, Locals Day, Volunteer). Keep these; just re-point triggers to `project:act-hv` + `interest:*` in the MIGRATE phase.
- Add: a single **Harvest welcome** keyed on `project:act-hv` + first `interest:*`, branching by interest (`membership` → CSA path, `volunteer` → Volunteer Application, `workshops`/`events` → event nurture) so the four current receipts converge into one maintainable tree.

## Migration phases (execution)

1. **Phase 0 — this doc** (proposed → Ben approves).
2. **Phase 1 — EXPAND**: `scripts/migrate-ghl-tags.mjs --dry-run` (additive map 291→~60, lists every add + count; nothing removed). Approve dry-run → run live.
3. **Phase 2 — MIGRATE**: Ben (or me, per-workflow with explicit go) re-points the 26 workflow triggers in the GHL UI; update the 5 tag-producing scripts.
4. **Phase 3 — CONTRACT**: delete junk immediately; retire each old load-bearing tag only after its workflow + scripts are confirmed migrated.

## Consequences

- **Positive:** one fact = one tag; Smart Lists become reliable; movement is automatable; consent becomes first-class; reporting by `source:`/`place:` actually works.
- **Cost:** Phase 2 is manual UI work (GHL API can't edit workflow triggers). Worth it once.
- **Risk if skipped:** the sprawl compounds, Smart Lists stay unreliable, and every new automation guesses which of 4 synonyms to trigger on.
