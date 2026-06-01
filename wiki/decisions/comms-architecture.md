---
title: ACT Comms Architecture — newsletters, drips, and the one consent model
date: 2026-06-01
status: active
owner: Ben
related: [newsletter-consent-policy, ghl-tag-taxonomy, ghl-operating-system, plans/2026-06-01-goods-drip-feed-content-plan]
---

# ACT Comms Architecture

> **One house, a few rooms, and drips (which are not newsletters).** A reader can live in several rooms at once; one legal consent gate covers whether we may email them at all; a preference centre lets them choose rooms without losing the whole relationship.

## The model

```
                    ┌─ Empathy Ledger ─ the CONTENT ENGINE (stories) + storyteller comms ─┐
                    │   (feeds every newsletter; NOT itself a marketing newsletter)        │
   THE HOUSE        ▼                                                                       │
   comms:act-newsletter ── the catch-all: ecosystem story, EL stories, links to every room │
        │  cross-promotes ▼                                                                 │
   THE ROOMS (one per project, deeper + narrower)                                           │
     comms:goods-newsletter · comms:harvest-newsletter · comms:justicehub-newsletter ───────┘
        │
   THE DRIPS (finite, role-based nurture SEQUENCES — not newsletters)
     comms:funder-drip · comms:supporter-drip · comms:buyer-drip · comms:partner-drip · comms:contained-drip
```

## The four newsletters (as they actually are, 2026-06-01)

| Newsletter | Tag | List = | Tagged | **Send-ready** | State |
|---|---|---|---:|---:|---|
| **ACT main** | `comms:act-newsletter` | the catch-all / ecosystem | 197 | **114** | live |
| **Goods** | `comms:goods-newsletter` | Goods supporters/community | 202 | **116** | live |
| **Harvest** | `comms:harvest-newsletter` | Harvest members/volunteers | 73 | **0** | needs opt-in |
| **JusticeHub** | `comms:justicehub-newsletter` | **the CONTAINED list** | 24 | **1** | needs opt-in |

**Reality:** ~116 consented people total, mostly double-tagged ACT-main + Goods. Harvest and JusticeHub/CONTAINED exist as **segments** but are not yet real (opted-in) newsletters. **Activating them = the Step-0 re-opt-in**, not spinning up new sends.

## The rule that prevents sprawl: newsletter ≠ drip

- **Newsletter** = recurring, project-based, opt-in **broadcast**. Lives forever. One per project.
- **Drip** = finite, role-based nurture **sequence**. Runs once per contact, then they're warm.

A funder gets **both**: the funder *drip* (`comms:funder-drip`, the warm-up) **and** the Goods *newsletter* (`comms:goods-newsletter`, ongoing). **"Goods funder newsletter" is NOT a separate newsletter** — it's a drip + a Smart List. This is how you avoid 8 newsletters no one can run.

## CONTAINED plays two roles (and they don't conflict)

- The **JusticeHub newsletter list** (`comms:justicehub-newsletter`) — ongoing broadcast.
- A **launch drip** (`comms:contained-drip` — the existing *"Contained launch 2025"* workflow, currently draft) — finite sequence.
Same people, one recurring + one finite. Exactly the split above.

## Empathy Ledger is not a marketing newsletter

EL is the **content engine** — the stories that make every newsletter human — plus its own *storyteller-facing* comms (relational, consent-bound, OCAP-gated). It **feeds** the rooms; it does not compete with them. Public EL stories surface inside the ACT-main newsletter and each project room as content, not as a separate marketing list.

## The tag standard

- **Newsletters:** `comms:<project>-newsletter` → `act` · `goods` · `harvest` · `justicehub`.
  - *Migration:* the legacy bare `newsletter` / `comms:newsletter` tags → standardise to **`comms:act-newsletter`** (additive enrol, like the Goods/CONTAINED enrolments).
- **Drips:** `comms:<role|campaign>-drip` → `funder` · `supporter` · `buyer` · `partner` · `contained`.
- A `comms:` tag is a **segment** (which room/drip), never consent.

## Consent model — one gate, many rooms

1. **One legal gate:** `newsletter_consent = true` (`+ newsletter_unsubscribed_at IS NULL`) = "we may email this person at all." This is the only send-permission signal (per [newsletter-consent-policy](newsletter-consent-policy.md)). Today: ~116 people.
2. **`comms:` tags = which rooms they want.** Someone can hold `comms:act-newsletter` + `comms:goods-newsletter`.
3. **A preference centre** (GHL email-preferences page) lets a reader tick rooms on/off. Unsubscribing from one room removes that `comms:` tag; it does **not** flip the global consent. A full unsubscribe sets `newsletter_unsubscribed_at`. This is the respectful model and it lowers total churn.
4. **Imported/other-list contacts are segments, not opt-ins** — they must pass re-opt-in before any send (a tag is not consent).

## Owner + cadence (don't launch a room before anyone's coming)

Each newsletter needs an **owner**, a **cadence**, and an **opted-in audience** before it launches — Croft's rule: get the medium-to-market right, don't build the room first.

| Newsletter | Cadence (target) | Launch when |
|---|---|---|
| ACT main | monthly | **live now** (114) |
| Goods | monthly | **live now** (116) |
| Harvest | monthly / as-news | after re-opt-in grows it past ~0 |
| JusticeHub (CONTAINED) | as-news / launch-led | after re-opt-in; pair with the Contained launch drip |
| *(CivicGraph, Custodian First Economy, others)* | — | only when each earns an opted-in list + an owner |

## Near-term activation

1. **Run ACT-main + Goods now** — real consented audiences.
2. **Step-0 re-opt-in** is the lever that turns Harvest (0) and CONTAINED (1) — and the 300+ segment-only contacts — into real subscribers.
3. **Standardise** `newsletter` → `comms:act-newsletter`.
4. **Preference centre** so multi-room readers self-manage.

This doc is the source of truth the GHL build (`ghl-operating-system.md`, the build sheet) and every site signup form follow.
