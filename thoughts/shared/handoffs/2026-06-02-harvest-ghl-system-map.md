---
title: Harvest GHL System Map — pipelines, workflows, tags, newsletter
date: 2026-06-02
status: active reference
companion: wiki/decisions/ghl-operating-system.md · comms-architecture.md
---

# Harvest GHL System Map

> **The rule: 2 pipelines, not 5.** Harvest already has the boards it needs. Tags carry everything else. Build a new pipeline only when a real program has real volume.

## Pipelines — what exists (keep these)

| Pipeline | Stages | What it's for | Volume |
|---|---|---|---|
| **The Shop pipeline** | New interest → In conversation | **Sales / trade** — shop customers, produce buyers, and the **Witta/Maleny cafes** (wholesale). This is your local-trade board. | 32 |
| **Harvest Inbox** | Resolved | Inbound triage — someone messages, you resolve. | 10 |

**So the Witta cafes go into *The Shop pipeline → New interest*.** Do not create a separate "Local Trade" board. *(Optional: rename it "Harvest — Shop & Trade" and add stages `Sampling → Stocking → Repeat` so a cafe's journey to wholesale customer is visible.)*

**Don't build yet (use tags instead):** Residencies (chefs/artists) and Events/Partners are *motions*, but with near-zero volume today they don't need boards. Tag people `role:chef` / `role:artist` / `interest:events` and filter a Smart List. Add a board **only when you actually run the program** and the list is too big to eyeball.

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
| `comms:` | `harvest-newsletter` |
| `source:` | `harvest-website` · `prospecting-witta` · `event:eoi-gathering-2026` · `event:locals-day-2026` |
| `place:` | `witta` · `maleny` |

**Duplication to retire (from the additive migration):** old flat tags (`harvest-member`, `interest-membership`, `harvest-shop-interest`, `shop-prospect`, `harvest-newsletter`) still sit alongside the canonical ones. They retire **after** each workflow re-points to the new tag — not before, or the workflow breaks.

## Newsletter — `comms:harvest-newsletter`

**61 tagged · 0 send-ready.** Nobody opted in. The Harvest newsletter is a segment, not a real list yet. **The Step-0 re-opt-in email is what activates it** — until then, no Harvest newsletter sends.

## The flow (how a Harvest contact moves)

```
  capture (form stamps source: + project:act-hv + interest:<x>)
        │
        ├─ buyer / shop interest ──▶ THE SHOP PIPELINE (New interest → In conversation → [Sampling → Stocking])
        ├─ inbound question ───────▶ HARVEST INBOX (→ Resolved)
        └─ everyone ──▶ tagged by interest: → nurtured → opts in → comms:harvest-newsletter → newsletter
```

## What to do now

1. **Witta cafes →** The Shop pipeline → New interest. Tag `project:act-hv` + `role:buyer` + `source:prospecting-witta`.
2. **Don't build new pipelines.** Use tags for chefs/artists/events; add a board only when a program has volume.
3. **Re-point the 6 Harvest workflows** to canonical tags (cleanup walkthrough), then retire the flat duplicates.
4. **Run the re-opt-in** to turn the 61 Harvest segment contacts into a real newsletter list.
