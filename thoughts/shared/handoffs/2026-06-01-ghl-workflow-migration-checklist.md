---
title: GHL Workflow Re-point Checklist (Phase 2 of the tag migration)
date: 2026-06-01
status: ready to execute (GHL UI — manual)
companion: wiki/decisions/ghl-tag-taxonomy.md
scope: 26 workflows in location agzsSZWgovjwgpcoASWG
---

# Phase 2 — re-point workflow triggers (GHL UI)

> **Why manual:** the GHL API can list workflows but **cannot read or edit triggers** (`GET /workflows/{id}` → 404). So this is a UI job, and the "current trigger" column below is **inferred from the workflow name + the tag inventory** — *confirm each in the builder before changing it.*
>
> **Safety:** EXPAND already added the canonical tags **alongside** the old ones, so every workflow still fires today. Re-point at your pace; nothing breaks while old tags remain. Only after a workflow is on its new trigger does its old tag become a Phase-3 deletion candidate.
>
> **How to re-point:** open the workflow → Trigger → "Contact Tag" → change the tag → Save → Publish. For ones that fire on a **form/payment**, leave the trigger and instead make sure the form/action **adds** the canonical tags (so new contacts are born canonical).

## A. RE-POINT — tag-triggered (14)

| ✓ | Workflow | Inferred current trigger | Re-point to | Notes |
|---|---|---|---|---|
| ☐ | Goods Inquiry → Acknowledge | `goods-inquiry` | `source:inquiry` (+ ensure `project:act-gd`) | core Goods intake ack |
| ☐ | Goods media form submission | form / `goods-media` | keep form; add `role:media` + `project:act-gd` | |
| ☐ | Harvest - Member Welcome | `harvest-member` | `role:member` (+ `project:act-hv`) | |
| ☐ | Harvest - Member Question Receipt | `member-question` | `role:member` | |
| ☐ | Harvest - Follow Welcome | harvest signup | `project:act-hv` | confirm what distinguishes it from Member Welcome |
| ☐ | Harvest - Shop Interest Receipt | `harvest-shop-interest` | `interest:shop` | |
| ☐ | Shop prospect → create card | `shop-prospect` | `interest:shop` | also creates a Shop-pipeline opp |
| ☐ | Harvest Locals Day | `locals-day-march-2026` | `source:event:locals-day-2026` | event-specific; fine to leave if one-off |
| ☐ | Harvest — EOI Gathering Confirmation | `eoi-gathering-march-2026` | `source:event:eoi-gathering-2026` | event-specific |
| ☐ | Newsletter Signup | `newsletter` / form | `comms:newsletter` | the subscription gate — verify before changing |
| ☐ | Parliament House Welcome | `goods-src-parliament-house-demo` | `source:event:parliament-demo` | |
| ☐ | Volunteer Application | form / `interest-volunteer` | `interest:volunteer` | |
| ☐ | Witta Gathering Photos | `witta` | `place:witta` (+ `project:act-hv`) | |
| ☐ | **Contained launch 2025** *(draft)* | `contained` | `project:act-jh` + `interest:justice-reform` | **finish + publish** — the CONTAINED journey from the design |

## B. NO TAG CHANGE — form/payment/date triggered (5)
Leave the trigger; make the form/action **stamp canonical tags** so new contacts arrive correctly tagged.

| ✓ | Workflow | Trigger | Make it also add |
|---|---|---|---|
| ☐ | Contact Form to Universal Inquiry | form submit | `source:contact-form` + route by `role:` |
| ☐ | Contact → Universal Inquiry | form/inbound | `source:contact-form` |
| ☐ | Create Donor | payment / donor | `role:supporter` (or `role:funder`) |
| ☐ | New Order Notification | order placed | `role:buyer` |
| ☐ | Grant Deadline - 7 Day Reminder | opp deadline (date) | — (no tag) |

## C. SYSTEM — leave entirely (3)
| ✓ | Workflow | Why leave |
|---|---|---|
| ☑ | Gmail Email to Contact | system (gmail→contact sync) |
| ☑ | Sync to Supabase - Contact Updated | system mirror sync |
| ☑ | Sync to Supabase - New Contact | system mirror sync |

## D. DRAFTS — delete (4)
Empty auto-created stubs, safe to delete.
| ✓ | Workflow |
|---|---|
| ☐ | New Workflow : 1767654441340 |
| ☐ | New Workflow : 1768162771389 |
| ☐ | New Workflow : 1768162803581 |
| ☐ | New Workflow : 1770418806176 |

## Companion code task (I can do this part)
The 5 scripts that **produce** tags must emit canonical ones (additively) or they'll keep regenerating the old tags after Phase 3:
`scripts/project-notifications.mjs` · `scripts/clean-funder-ghl-contacts.mjs` · `scripts/seed-goods-opps-from-xero.mjs` · `scripts/ghl-webhook-handler.mjs` · `scripts/sync-content-to-ghl.mjs`.

## Then Phase 3 (destructive — explicit go)
Once a workflow + its producing scripts are on the new tags: delete its old tag. Junk (`gone-from-ghl*`, `*-test`, `*-review-*`) can be deleted now. Stale mirror rows via `clean-stale-ghl-contacts-from-manifest.mjs --apply` (deletes rows — needs an explicit "delete").
