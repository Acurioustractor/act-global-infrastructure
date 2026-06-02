---
title: Task 3 — Journey board wiring + stage↔tier sync (the "ladder-lift" layer)
status: Spec (build-ready; post-launch strategic build)
date: 2026-06-03
relates_to: ../decisions/ghl-ecosystem-journey-architecture.md · ../concepts/ecosystem-value-exchange.md · 2026-06-02-ghl-cleanup-execution-plan.md (§6)
---

# Task 3 — Journey board wiring + stage↔tier sync

> **The gap (proven live 2026-06-03):** a member signup tags the contact `tier:member` but does **not** create a Membership Journey *opportunity* — so the contact is correctly tagged yet **invisible on the board**. The 54 "Member" cards there were **bulk-seeded**, not fed by signups. Tags ≠ pipeline cards (different objects). This spec wires them together so the ladder reflects *real, earned movement*.

## The principle (from the ADR)
**Pipeline stage is the source of truth; the `tier:` tag mirrors it.** One contact = one Journey card at one stage = one `tier:` tag. They must stay in sync, both directions:
- **Seat / forward** (`tier:` → board): when a contact gains a `tier:` rung, their Journey card is created/moved to the matching stage.
- **Sync back** (board → `tier:`): when their Journey card moves stage (you drag it, or a workflow moves it), their `tier:` tag updates to match.

## Stage ↔ tier map (Harvest Membership Journey, pipeline `ijPN2jEoEuMshXXKbQ4z`)
| Stage | Stage ID | Tag |
|---|---|---|
| Curious | `85da97c5-7cdc-4500-95d7-7dbdaea0ee5c` | `tier:curious` |
| Connected | `571c3eab-ecca-47e6-a746-cafc04cd7c1c` | `tier:connected` |
| Member | `21e1dcb8-d674-4724-a8b0-5cb4cafba635` | `tier:member` |
| Active | `6173b52b-3396-4431-9f87-ba73f20e0e27` | `tier:active` |
| Steward | `ea084ff5-607e-49a8-a6d2-d087cec57c5d` | `tier:steward` |

## Build — reuse what exists, add the two sync workflows

**There's already a "Harvest Membership Journey" workflow** (`cadc781e…`) that does *Inbound Webhook → Find Contact → Create/Update Opportunity → Add Tag → Update field*. The Create-Opportunity action is the seating mechanism — it just isn't triggered by signups today (it's a webhook the seed script called). **Reuse that action; change what triggers it.**

### Workflow A — SEAT (tier: tag → Journey card)
- **Trigger:** Contact Tag Added = `tier:connected` / `tier:member` / `tier:active` / `tier:steward` (one trigger, or one workflow per rung).
- **Filter (the community line — non-negotiable):** skip if contact has `role:community` / `role:community-controlled` / `role:storyteller` / `role:elder`. These are co-owners, never laddered.
- **Action:** Create/Update Opportunity in `Harvest Membership Journey` at the stage matching the tag (use the map above). Use *Update* semantics so a contact who already has a card **moves** rather than duplicating.
- **Re-entry:** allow (a contact climbs rungs over time); but Create/Update (not Create) prevents duplicate cards.

### Workflow B — SYNC BACK (Journey stage → tier: tag)
- **Trigger:** Opportunity Stage Changed, pipeline = Harvest Membership Journey.
- **Branch by the new stage**, and for each: **add** the matching `tier:` tag **and remove the other four** `tier:` tags (so a contact carries exactly one rung). GHL: per-branch "Add Tag" + "Remove Tag ×4".
- This is what makes dragging a card up the board update the cross-project `tier:` status.

> Loop guard: Workflow A fires on tag-add, Workflow B fires on stage-change. A→B→A could loop. Prevent it: B only *adds the tag if missing* (GHL add-tag is idempotent, and A's Create/Update is idempotent on stage), and set A to not re-fire when the card is already at that stage. Test with one contact through a full climb before publishing.

## Ladder-lift (the value-exchange engine — the actual "lift")
Once contacts are seated, the nudge-to-next-rung workflows use the **give/get matrix** ([[../concepts/ecosystem-value-exchange]]) as the email copy:
- Per rung, a wait + a nudge that offers the next give/get (curious→connected: "come to a work day"; connected→member: the membership ask; member→active: "bring something / refer someone"; active→steward: advocacy/governance).
- A rung is **earned by a real `action:` give** (`action:volunteered`/`contributed`/`referred`), not by time alone — so the lift suggests, the action: tag (or a manual stage move) confirms.
- Consent gate on any marketing send (`newsletter_consent=true`), as everywhere.

## Data reconciliation (do FIRST — the seed is misaligned)
The 54 board "Members" were seeded independently of the `tier:member` tag (57 tagged). Before wiring, align them so the board = the tags:
1. **Audit (read-only, I can do via API):** for every Harvest Membership Journey opportunity, does its contact carry the matching `tier:` tag? For every `tier:member` contact, do they have a Member-stage card? Produce the mismatch list.
2. **Reconcile:** seat the tagged-but-not-on-board contacts (run Workflow A retroactively, or a one-off script), and tag the on-board-but-untagged ones.
3. **Community check:** remove any `role:community`-type contact that got seeded onto the board (e.g. PICC's Rachel Atkinson was in Connected — she shouldn't be laddered).

## Build order
1. **Reconcile the seed** (audit → align board ↔ tags → strip community from the board). ← do first; I can run the audit now.
2. **Build Workflow A** (seat) — reuse the existing Create-Opportunity action; add the community filter; test one contact.
3. **Build Workflow B** (sync back) — test a full climb (Curious→Steward) on one contact; confirm no loop.
4. **Ladder-lift nudges** — one per rung, give/get copy, consent-gated.
5. Repeat the pattern for other projects' Journey boards (Goods Supporter Journey, etc.) once Harvest is proven.

## Open items (need UI/Ben)
- ⚑ What currently triggers the existing `cadc781e` Journey workflow's Inbound Webhook (a seed script?) — confirm before repurposing its trigger.
- ⚑ The give/get matrix cells + community-lane content (still open from the value-exchange grill).
- ⚑ Whether to seat at `tier:connected` too (followers on the board) or only `tier:member`+ (members+). Recommendation: seat from `connected` up, so the board shows the whole supporter journey; `curious` stays a tag-only/segment (the board's bottom rung can be noisy).

## Why this is post-launch
For 20 June, members are **captured + welcomed + actionable** (contact + tags + welcome + Inbox card — all working). The Journey *board* is the management/visualisation + nurture-automation layer. It's the strategic build that makes the ladder real; it does not gate the launch.
