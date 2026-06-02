---
title: ACT CRM — Strategy & Method Map
status: Active
date: 2026-06-03
summary: One-page visual of how the ACT ecosystem CRM works (the strategy) and how we clean it up safely (the method). The belonging ladder is the theory of movement; the value-exchange give/get is the engine; canonical tags are the spine; the community line is never crossed.
relates_to: ecosystem-value-exchange.md · decisions/ghl-ecosystem-journey-architecture.md · decisions/ghl-tag-taxonomy.md · handoffs/2026-06-02-act-ghl-build-spec.md
---

# ACT CRM — Strategy & Method Map

> The whole system in one page. **Strategy** = how a person moves through ACT. **Method** = how we migrate the live CRM onto it without breaking anything.

## The strategy in one line

**A person arrives → gets canonical tags → climbs the belonging ladder → each rung is earned by a real value-exchange (give/get) → per-project workflows nudge the next rung — and community are co-owners, never moved through a funnel.**

## The model (strategy)

```mermaid
flowchart TD
  A["Someone arrives<br/>(site form · event · inbound)"] -->|"capture stamps canonical tags"| B["project: · tier:connected · comms: · source:"]
  B --> Q{"role: — who are they to us?"}
  Q -->|"supporter · funder · buyer · supplier · partner"| LAD
  Q -->|"community · storyteller · elder"| CO["Co-owners<br/>consent:-governed<br/><b>never on the ladder</b> (no extraction)"]

  subgraph LAD["The Belonging Ladder — the theory of moving through the system"]
    direction LR
    L1["tier:curious"] --> L2["tier:connected"] --> L3["tier:member"] --> L4["tier:active"] --> L5["tier:steward"]
  end

  V["<b>Value-exchange</b> — give/get per role<br/>the engine that earns the next rung<br/>(realised gives = action: tags)"] --> LAD
  LAD --> WF["Per-project Journey board<br/>(tier: = the stages)<br/>+ ladder-lift workflows using give/get as the copy"]
  WF --> S["Sends — only if comms: opt-in<br/>AND newsletter_consent = true"]
```

**The five tag namespaces that drive it** (one fact = one tag):
`project:` (which project) · `role:` (who they are) · `tier:` (their rung) · `interest:` (what they want) · `comms:`/`consent:` (whether we may send). Plus `source:`/`place:` (report only) and `action:` (gives that actually happened).

## The method (safe migration)

```mermaid
flowchart LR
  P0["0 · ALIGN<br/>lock the vocabulary"] --> P1["1 · EXPAND<br/>add canonical (additive)<br/>★ breaks nothing"]
  P1 --> P2["2 · RE-POINT<br/>triggers + smart lists + scripts<br/>one at a time, TEST each"]
  P2 --> P3["3 · CONTRACT<br/>delete flat/stale tags<br/>★ only after re-point is verified"]
  P3 --> P4["4 · PUBLISH + BUILD<br/>re-point triggers first, then go live"]
```

**The one rule that makes it safe:** a flat tag is deleted only after every workflow trigger, smart-list filter, and script that fires on it has been re-pointed to the canonical tag **and tested** — one at a time. EXPAND only adds, so it can never break a live drip, list, or pipeline.

## At a glance (plain text)

```
ARRIVE ──► CANONICAL TAGS ──► role? ──► supporter ──► LADDER ──► workflows ──► send (if consent)
                                  └────► community ──► co-owner (consent:, no ladder)

LADDER:  curious → connected → member → active → steward
ENGINE:  value-exchange (give / get), per role, deepening up the rungs
         the rung is EARNED (action: gives), never seeded

MIGRATION:  ALIGN → EXPAND(+) → RE-POINT(test each) → CONTRACT(gated) → PUBLISH
            EXPAND adds-only · nothing deleted before its trigger is re-pointed
```

## How to read it
- **Tags say who/where; the ladder says how far; the value-exchange says what passes between us.** Three layers, one model.
- **Per project, one Journey board** (Harvest, Goods, JusticeHub…), unified by the cross-project `tier:` tag — see [[../decisions/ghl-ecosystem-journey-architecture]].
- **The community line is non-negotiable** — `role:community`/`storyteller`/`elder` are co-owners by right, governed by `consent:`, and never laddered.
