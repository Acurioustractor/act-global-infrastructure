---
title: GHL Ecosystem Journey Architecture
status: Accepted
date: 2026-06-02
deciders: Ben Knight
relates_to: ecosystem-value-exchange.md · project-identity-and-tagging-system.md · handoffs/2026-06-02-act-ghl-build-spec.md
---

# GHL Ecosystem Journey Architecture — one board per project, `tier:` unifies

## Status
Accepted — 2026-06-02 (grill-with-docs alignment).

## Context
All ACT projects share one GHL location. The locked tag system makes the `tier:` ladder (curious → connected → member → active → steward) the ecosystem-wide belonging model — "the theory of change and the headline metric." A contact's *movement through that ladder* is the core theory; the value-exchange give/get is the engine that moves them up a rung ([[ecosystem-value-exchange]]).

The question: how does the ladder run as a workable GHL pipeline across many projects? The live state shows one "Harvest Membership Journey" board. Do we keep one board per project, or run a single ecosystem-wide Journey board?

## Decision
**One Journey pipeline per project** (e.g. Harvest Membership Journey, Goods Supporter Journey, JusticeHub Journey), each with the **same five `tier:` rungs as its stages**. The cross-project **`tier:` tag is the unifier**: it carries a contact's rung across the whole ecosystem so any "all Members everywhere" segment is one Smart List filter, independent of which project board they sit on.

- **Stage is the board you work** (the daily Kanban a project owner scrolls).
- **`tier:` tag is the cross-project status you segment on.**
- They must stay in sync; **the pipeline stage is the source of truth**, the `tier:` tag mirrors it.
- **The community line holds on every board:** `role:community` / `community-controlled` / `storyteller` / `elder` are **never** placed on a Journey board and never carry a `tier:`. The ladder is for supporters; community are co-owners by right, governed by `consent:`.

## Consequences
- Each project owner works their own board; audiences never mix on one giant board.
- Ecosystem rollups ("all Members", "all Stewards") come from the `tier:` tag, not the board.
- More boards to maintain, and a stage↔`tier:` sync step (automate: stage change writes the `tier:` tag).
- A `tier:` rung must be **earned through real `action:` gives**, not bulk-stamped on import — otherwise the ladder is decorative (the live Harvest board is currently seeded: 82 curious / 4 connected / 57 member / 0 active / 0 steward, which is import shape, not movement).

## Alternatives considered
- **One ecosystem-wide Journey board, `project:` as a filter.** Rejected: mixes Harvest members with Goods funders and JusticeHub leads on one board, makes daily ownership unclear, and the cross-project view is already solved by the `tier:` tag without the cost.
