---
title: Harvest GHL — Tier-1 safe build checklist + the 7 decisions resolved
date: 2026-06-02
status: active
owner: Ben
type: build-checklist (scaffolding — archive once shipped)
related: [act-ghl-operating-strategy, act-ghl-master-operating-system, newsletter-consent-signup-path]
---

# Harvest GHL — Tier-1 safe build

> Tier-1 = structure only, **zero sends**. Every workflow stays Draft; no one is emailed.
> Strategy this implements: `wiki/decisions/act-ghl-operating-strategy.md`.

## The 7 decisions — resolved / recommended / deferred

| # | Decision | Resolution |
|---|---|---|
| **1** | GHL native limits (max tags, smart-list depth) | **RESOLVED (practical):** not binding at our scale — GHL tags scale to thousands; our namespaced scheme is a few hundred. The real risk is *sprawl*, not a cap. Control = Ben-only tag creation + quarterly audit. No build blocker. |
| **2** | Engagement-score band for "ready to climb" | **RESOLVED (v1):** do NOT auto-promote on score. Use score only as a *surface-to-human* signal ("ready to climb" list). Promote on concrete `action:` events, not score thresholds. Set a real band later once we have data. |
| **3** | How much promotion is auto vs human | **PROPOSED (confirm):** Curious→Connected = AUTO on first `action:*`. Connected→Member = AUTO on 2+ contributions in 90d OR recurring commitment. Member→Active = HUMAN (surfaced). Active→Steward = HUMAN-only (by design). Bottom two automated, top two human. |
| **4** | Re-opt-in scope (the 143 seated) | **RESOLVED with data:** 143 seated, all have email, **only 4 have clean consent → 139 need re-opt-in.** The launch IS the re-permission campaign. Reachable list starts ~4, grows as people confirm. |
| **5** | Recipient-track authority (Butterfly board) | **DEFERRED to Goods phase — does NOT block Harvest** (Harvest has no recipients). Needs a named Butterfly board person for `collective_authority_ref` before the Goods recipient track is built. Ben/board governance call. |
| **6** | Where Empathy Ledger ends / GHL begins | **DEFERRED to Goods/storyteller phase — does NOT block Harvest.** Confirm the pointer field (`el_record_id`) against EL v2's live schema before Goods. |
| **7** | Upsert→tag-added timing race | **RESOLVED (design + test):** tags that DRIVE workflows are applied by GHL workflow *actions* (native, reliably fire tag-added), NOT relied on from the API upsert. The webhook-triggered **intake workflow is the spine** — it seats at Curious + applies `tier:curious` via a native Add-Tag action, so downstream welcome fires reliably. Confirm with a tracer when we build it. |

Only **#3** needs your yes/no. #5 and #6 are Goods-phase, not Harvest blockers.

## Build checklist — three lanes, all Tier-1 (no sends)

### Lane A — API-automatable now (I can run this; reversible GHL config writes)
- [ ] **Create the new Harvest tags** (idempotent — script checks existence first):
  - `action:volunteered` `action:attended` `action:contributed` `action:referred`
  - `interest:garden` `interest:events` `interest:repair`
  - `comms:email-ok` `comms:reduced-frequency` `comms:paused`
  - `consent:newsletter-yes` `consent:withdrawn`
- [ ] **Create the new custom fields** (in the right folders; creating a field is safe):
  - `first_action_date` (DATE → Engagement & AI) — powers the "listen before we ask" 90-day rule
  - `last_ask_date` (DATE → Engagement & AI) — blocks re-asks inside a window
  - `consent_timestamp` (DATE → Consent & Culture) — consent provenance
  - `consent_source` (TEXT → Consent & Culture) — where the opt-in came from

### Lane B — GHL UI (you build; all Draft / saved-view only, nothing sends)
- [ ] **Intake workflow** — Trigger = **Inbound Webhook** (the `/api/forms/submit` path POSTs to it). Steps: ensure the contact, seat at **Curious** on the Membership Journey, apply `tier:curious` via a native **Add Tag** action, set `first_action_date`. DRAFT.
- [ ] **Tier-sync workflow** — Trigger = **Pipeline Stage Changed** → remove old `tier:` tag, add new one. DRAFT. (Native event = reliable.)
- [ ] **Smart-lists** (saved views, no send): `Harvest · Members`, `Harvest · Volunteers`, `Harvest · Ready-to-climb`. Each carries the baseline filter `newsletter_consent = Yes AND NOT comms:paused`.
- [ ] **Event Signup form** (new) — writes `source:event-signup`, `action:attended`, `interest:events`, `tier:connected` + an **unticked** opt-in checkbox.
- [ ] **Add unticked opt-in checkboxes** to General Contact + Donation forms (no pre-checked boxes — the anti-extractive rule).
- [ ] **Leave every send-workflow (welcome, nurture) in DRAFT.** Do not publish.

### Lane C — Code (regen-studio / API path)
- [x] Newsletter consent stamped in code at signup — **LIVE** (`270d3b6`).
- [ ] Extend `/api/forms/submit` so the other Harvest forms also write `source:`, `first_action_date`, and `action:` tags where applicable (mirror the newsletter stamp pattern).
- [ ] **Archive/unpublish the dead native Newsletter Signup form** so no one wires a future workflow to a dead trigger.

## Explicitly NOT Tier-1 (needs the launch sequence + your explicit go)
- Publishing any send-workflow.
- The **re-opt-in campaign to the 139** (Tier-3 external send — day-shift, human-in-loop).
- Any Goods build (the recipient wall gets verified first).

## The guarantee (why this is safe to start now)
Consent is set only in code on real opt-in; every send-workflow stays Draft; the consent gate goes on every send *before* anything is published. Nothing in Lanes A/B/C can email a person. The reachable audience is 4 until the re-opt-in runs, and that's a deliberate, separate, gated step.
