---
title: Harvest GHL System Map — pipelines, workflows, tags, newsletter
date: 2026-06-02
status: active reference
companion: wiki/decisions/ghl-operating-system.md · comms-architecture.md
---

# Harvest GHL System Map

> **The rule: 2 pipelines, not 5.** Harvest already has the boards it needs. Tags carry everything else. Build a new pipeline only when a real program has real volume.

## The spine: a membership pathway, not a newsletter list

The point is **belonging**, not subscribing. ACT treats community as co-owners, not an audience — so the goal for every Harvest contact is to move them up a **membership ladder** toward alignment, not just onto an email list. The newsletter is *one rung*, not the destination.

**The ladder (5 rungs):**

| Rung | What it means | Tag |
|---|---|---|
| **Curious** | knows Harvest, in the system, not engaged | `tier:curious` |
| **Connected** | opted in, getting the story, warming | `tier:connected` |
| **Member** | has joined — CSA / committed / contributing | `tier:member` |
| **Active** | shows up — gatherings, volunteering, events | `tier:active` |
| **Steward** | aligned, champions it, brings others, co-stewards | `tier:steward` |

This is the **same shape as the Goods Supporter Journey** — one ecosystem pattern. The newsletter (`comms:harvest-newsletter`) is how you move *Curious → Connected*; the gatherings, the CSA, the volunteering move *Connected → Member → Active → Steward*.

## Pipelines (3 — built around the pathway)

| Pipeline | Stages | What it's for | Volume |
|---|---|---|---|
| **Harvest Membership Journey** *(build this — the core)* | Curious → Connected → Member → Active → Steward | **The relationship.** Every current contact lives here; you move them up. This replaces "newsletter list" thinking. | (all ~170) |
| **The Shop pipeline** *(exists)* | New interest → In conversation → [Sampling → Stocking] | **Commercial trade** — produce buyers + the Witta/Maleny cafes. A member can also be a buyer. | 32 |
| **Harvest Inbox** *(exists)* | Resolved | Inbound triage. | 10 |

**Membership is the one new board worth building** — it's the core motion, not a niche. The Witta cafes still go in **The Shop pipeline** (commercial), and a person can be in both (a member who also stocks your produce). **Still don't build** separate Residency/Events boards — those stay as `role:chef`/`role:artist`/`interest:events` tags until a program has real volume.

## Workflows — what exists (6 Harvest automations)

All are inbound welcome/receipt flows. Keep them; re-point each trigger to its canonical tag (per `2026-06-01-ghl-workflow-cleanup-walkthrough.md`):

| Workflow | Trigger (old → canonical) |
|---|---|
| Harvest - Member Welcome | `harvest-member` → `role:member` |
| Harvest - Member Question Receipt | `member-question` → `role:member` |
| Harvest - Follow Welcome | Harvest signup → `project:act-hv` *(confirm vs Member Welcome)* |
| Harvest - Shop Interest Receipt | `harvest-shop-interest` → `interest:shop` |
| Harvest Locals Day | `locals-day-march-2026` → `source:event:locals-day-2026` |
| Harvest — EOI Gathering Confirmation | `eoi-gathering-march-2026` → `source:event:eoi-gathering-2026` |

## Tags — your real "categories" (the canonical set)

| Namespace | Harvest values |
|---|---|
| `project:` | `act-hv` |
| `role:` | `member` · `buyer` · `volunteer` · `maker` · `chef` · `artist` · `partner` |
| `interest:` | `membership` · `markets` · `events` · `workshops` · `garden` · `food` · `volunteer` · `sustainability` · `venue` · `community` · `shop` |
| `tier:` | `curious` · `connected` · `member` · `active` · `steward` *(the membership rung)* |
| `comms:` | `harvest-newsletter` |
| `source:` | `harvest-website` · `prospecting-witta` · `event:eoi-gathering-2026` · `event:locals-day-2026` |
| `place:` | `witta` · `maleny` |

**Duplication to retire (from the additive migration):** old flat tags (`harvest-member`, `interest-membership`, `harvest-shop-interest`, `shop-prospect`, `harvest-newsletter`) still sit alongside the canonical ones. They retire **after** each workflow re-points to the new tag — not before, or the workflow breaks.

## Newsletter — one rung, not the goal

`comms:harvest-newsletter`: **61 tagged · 0 opted-in.** The newsletter is *how you move someone Curious → Connected* — it is not the destination. The re-opt-in isn't "join our mailing list," it's **"come belong to Harvest"**: the email is the invitation onto the membership ladder, and the first yes moves them to `tier:connected`. From there the gatherings, the CSA, and the volunteering carry them to Member, Active, Steward. The metric that matters is **how many move *up***, not opens.

## The flow (the membership pathway)

```
  capture (form stamps source: + project:act-hv + interest:<x>)  →  tier:curious
        │
        │   re-opt-in / story / value ───────────────────────────▶ tier:connected
        │   joins CSA / commits ─────────────────────────────────▶ tier:member
        │   shows up: gatherings, volunteering, events ──────────▶ tier:active
        │   champions, brings others, co-stewards ───────────────▶ tier:steward
        │
        ├─ also a produce buyer? ──▶ THE SHOP PIPELINE (parallel, commercial)
        └─ inbound question? ──────▶ HARVEST INBOX (→ Resolved)
```

Membership and commerce are **parallel** — a person can be a `tier:member` *and* a Shop-pipeline buyer. Don't force one to be the other.

## What to do now

1. **Build the Harvest Membership Journey pipeline** (5 stages above). Put the existing ~170 contacts in at the right rung (most start `Curious`; the 64 `harvest-member`-tagged → `Member`).
2. **Reframe the re-opt-in as a belonging invitation**, not a newsletter ask — first yes = `tier:connected`.
3. **Witta cafes → The Shop pipeline** (commercial, parallel). Tag `project:act-hv` + `role:buyer` + `source:prospecting-witta`.
4. **Don't build Residency/Events boards** — tags until a program has volume.
5. **Re-point the 6 Harvest workflows** then retire the flat duplicates.

This is an **ecosystem principle, not just Harvest:** every project drives *membership + alignment*, with the newsletter as a rung. Goods has it (Supporter Journey), JusticeHub/CONTAINED should too. The list is never the goal; the depth of belonging is.
