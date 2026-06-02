---
title: Ecosystem Value-Exchange
status: Accepted — locked 2026-06-02 (build phase; ⚑ matrix cells + community lane still being worked out in flight)
date: 2026-06-02
summary: The give/get relationship model that sits on top of the locked GHL tag system. For each role, what a contact GIVES ACT and what they GET back — the layer that drives nurture content and the ask. Not a money metric, not a per-contact score.
relates_to: project-identity-and-tagging-system.md · decisions/ghl-tag-taxonomy.md · consent-as-infrastructure.md · four-lanes.md · act-business-architecture.md
---

# Ecosystem Value-Exchange

> The fifth layer of the ecosystem CRM, alongside tags, site, tagging, and workflows. The locked tag system says *who someone is* (`role:`) and *where they are* (`tier:`). The value-exchange says *what passes between us* — what they give, what they get — at that position. It is the reason a workflow sends what it sends and the human makes the ask they make.

## Definition

**Value (in this CRM) = the give/get exchange per audience.** For each relationship, name:
- **GIVE** — what the contact gives ACT: money, time, story, produce, advocacy, cultural authority, introductions.
- **GET** — what they get back: belonging, evidence, goods, income, a platform, consent-governed control.

It is a **relationship model, not a money metric** and **not a per-contact score**. (Those were considered and rejected in the 2026-06-02 grill.)

## The unit: per `role:`, with `tier:` as depth

The give/get is defined **per `role:`** (the locked vocabulary: funder, supporter, buyer, supplier, partner, …). The **`tier:` ladder is the depth gradient** — the GIVE deepens as someone climbs:

> curious (gives attention) → connected (gives contact + interest) → member (gives money/time/produce) → active (gives repeat + referral) → steward (gives advocacy + governance)

So the model is a `role: × tier:` matrix, but **`role:` is the organising axis** and `tier:` is how far the exchange has matured.

## Two lanes (mirrors the locked spec's community line)

1. **Supporter lane** — `role:` ∈ {funder, supporter, buyer, supplier, partner} × the `tier:` ladder. Give/get deepens up the rungs. These people enter Journey pipelines.
2. **Community lane** — `role:` ∈ {community, community-controlled, storyteller, elder}. **Never `tier:`. Never a Journey pipeline.** Their give/get is governed by `consent:`, framed as co-ownership and benefit-sharing. Stamping a ladder rung on a storyteller is the extraction ACT refuses (see [[consent-as-infrastructure]] and the build-spec community line).

## What it drives

- **Workflow content** — the give/get at a role×tier position is what the nurture email/text actually says and offers.
- **The ask** — it tells the human (or the workflow) what to ask for next, and what to give first.
- It does **not** add contact data the tags don't already hold.

## Where it lives (resolved 2026-06-02)
The model is a **reference matrix** — a `role: × tier:` give/get table held as documentation — that drives workflow copy and the human ask. It adds **no new tag namespace** (that would duplicate `role:`+`tier:` and break "one fact = one tag") and **no per-contact custom fields**.

**Gives that actually happen are recorded with the existing `action:` namespace** (`action:volunteered`, `action:contributed`, `action:referred`, `action:meeting-held` — extend values as needed). So the matrix is the *expected* exchange (reference); `action:` tags are the *realised* exchange (data). A contact's move up a `tier:` rung is **justified by the `action:` gives they've actually made** — not seeded by import.

## The ladder is the theory of movement (Ben, 2026-06-02)
The `tier:` ladder (curious → connected → member → active → steward) is **the theory of moving through the system** — the ecosystem's theory of change, not a per-project funnel. `tier:` says *where on the journey*; the value-exchange give/get is **the engine that moves someone to the next rung** (complete the next give/get → climb). The two are one mechanism: position + the force that changes it.

## Architecture (resolved 2026-06-02)
One Journey pipeline **per project**, unified by the cross-project `tier:` tag — see [[../decisions/ghl-ecosystem-journey-architecture]]. Stage is the board you work; `tier:` is what you segment across the ecosystem; the rung must be earned through real `action:` gives, not seeded on import.

## Open
- The community-lane give/get content — anti-extraction wording, grounded in OCAP/[[consent-as-infrastructure]]. **Ben + community define this, not the model.** Placeholder until then.
