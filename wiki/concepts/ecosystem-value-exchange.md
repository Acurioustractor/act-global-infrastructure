---
title: Ecosystem Value-Exchange
status: Accepted — locked 2026-06-02; community lane resolved 2026-06-03 (OCAP-holds / CARE-owes frame). ⚑ supporter matrix cells still being worked out in flight
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
2. **Community lane** — `role:` ∈ {community, community-controlled, storyteller, elder}. **Never `tier:`. Never a Journey pipeline. Never give/get** — give/get is an *exchange*, and an exchange is the transactional logic OCAP refuses. This lane uses an **OCAP-holds / CARE-owes** frame instead (see *The community lane — holds / owes* below), governed by `consent:` as co-ownership and benefit-sharing. Stamping a ladder rung on a storyteller is the extraction ACT refuses (see [[consent-as-infrastructure]] and the build-spec community line).

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

## The community lane — holds / owes (resolved 2026-06-03)

The community lane **does not use give/get**. A story is never a thing community hands over for a benefit; under **Ownership** it never leaves their hands — ACT only ever custodies it under consent. So this lane has a deliberately different grammar: **what community holds (their OCAP rights) → what ACT owes (its CARE obligations).** Same model, opposite direction; the difference *is* the anti-extraction statement. It splits into two tiers, with the elder's authority standing above both as a **veto, not a preference.**

### Tier 1 — Individuals (`storyteller`, `elder`)

| Community holds (OCAP) | ACT owes (CARE) |
|---|---|
| Their story & data — owned by them, never ACT; custodied only under consent *(Ownership)* | Sovereign infrastructure — consent checked at query-time, revocation effective immediately, everywhere |
| Granular, revocable, per-use consent: collection · processing · sharing · attribution · syndication *(Control)* | Plain-language consent they genuinely understand; usage reported back per-partner on syndication |
| Attribution on their terms — legal name, preferred name, "Elder from Arrernte country", or anonymity *(Access)* | Benefit that flows back — the story serves them and their community, not just ACT's narrative or funding |
| To tell and be recorded **in language**; translation & AI processing of it is consent-gated *(Processing)* | Move at the speed of trust — relationship first, never extraction for a deadline |
| The right to change their mind — anytime, no permission, no penalty (*"Yes isn't a boolean"*) | — |
| Full export & deletion — walk away with their data intact *(Possession)* | — |
| **Elder only:** cultural authority — Sacred-tier review & **veto**, including over others' stories that touch their knowledge or Country | **Elder only:** the veto is honoured in the architecture, not just the policy — double-confirm on stale review |

### Tier 2 — Collectives (`community`, `community-controlled`)

| Community holds (OCAP) | ACT owes (CARE) |
|---|---|
| Collective ownership of data about the community — **supersedes individual consent** when something is attributed to the group | Benefit-sharing / procurement that flows to the community as the design goal, not a side effect (Goods on Country, IPP JV, PICC's 85% Indigenous / 78% local) |
| Collective control — research design, access, interpretive framing | Authority-to-control wired into the architecture (Mukurtu, local AI), not a policy overlay |
| **Language** — the community's language is collectively held cultural property | Never extract, translate, or train AI on language without the community's authority |
| **Country / place** — Country and the knowledge of it belong to the people of that Country | Operate as a *guest* on Country — places named correctly (the Oonchiumpa-not-"Ntumba" discipline), Country never mapped or represented without authority |
| Possession — retrieve, delete, fork, or move data onto community-controlled infrastructure, no lock-in | A genuine path to run it themselves — [[beautiful-obsolescence]]: built to hand over the keys, not create dependency |
| **The right to be forgotten — collectively:** all data about them erased, superseding any institutional interest in preservation | Honour collective erasure — cascade delete, no shadow "archive copy", confirm completion back to the community |
| Governance authority — the community directs; ACT doesn't decide on their behalf | A respectful, ongoing relationship *(Responsibility)* — not a one-time data grab |

### What this lane drives

The supporter give/get drives nurture copy and *the ask*. The community holds/owes drives the opposite: **ACT's accountability, not a sequence.**

- It is the **checklist ACT is answerable for** — benefit reported back, attribution honoured, syndication notices sent, deletion-on-request executed. The supporter lane defines what ACT *asks for*; this lane defines what ACT must *deliver*.
- It is **worked by a human, by hand** — never an automated `tier:` nudge, never a Journey workflow (community replies are written by hand, per the operating-system doc).
- The `action:` tags on this lane record **what ACT delivered to community** (`action:benefit-reported`, `action:consent-reviewed`, `action:attribution-confirmed`), not gives ACT extracted.

> The holds column is OCAP — a documented framework, ACT's to recognise. The owes column is ACT's own standing commitment, and because it is public it must be true.

## Open
- **Per-community benefit-share specifics** — the exact form benefit takes (procurement, employment, revenue-share, infrastructure) is defined *with each community*, not by this model. This section names the *obligation*; the *content* is co-authored with the community. (Was "the whole community lane"; resolved 2026-06-03 — this is the residue.)
