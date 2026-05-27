---
title: Civic Operating System
status: Active
source_of_truth: wiki/concepts/soul.md
established_by: wiki/decisions/2026-05-25-civic-cerebellum-reframe.md
---

# Civic Operating System

> Three tools, one architecture. CivicGraph sees the field. JusticeHub supports the work. Empathy Ledger holds the trust. Together they form the civic cerebellum: the quiet reflex layer that helps communities, services, and social enterprises get the boring-but-essential work done reliably, ethically, and at scale.

> This concept sits downstream of [[soul|Soul]]. If anything in this page contradicts soul, soul is right. It is established by [[../decisions/2026-05-25-civic-cerebellum-reframe|the Civic Cerebellum Reframe ADR]] (signed off 2026-05-25).

## The Premise

Most AI being built for civil society is trying to become the CEO: planning, reasoning, agentic decision-making, "smarter strategy." There is real value in that work. It is not the work A Curious Tractor (ACT) is here to do.

Civic and social-impact systems do not only fail because they lack strategy. They fail because the basic reflexes break down. The follow-up does not happen. The consent is not logged. The referral gets lost. The evidence is not captured. The report is written too late. The community feedback never makes it back into the system.

ACT is building the **civic cerebellum**: the quiet reflex layer that helps the necessary things happen reliably. The point is not to replace human judgment. The point is to offload the boring, repetitive, essential work into trusted routines, so people can spend more time on care, relationships, strategy, and the complex decisions that AI should not make.

The Civic Operating System is the name for the technical and operational architecture that makes this real across all of ACT's product work.

## The Three Layers

| Layer | Tool | One-line role |
|---|---|---|
| **Intelligence** | [[civicgraph\|CivicGraph]] | Sees the civic field. Maps money, power, opportunities, deserts. |
| **Practice** | [[justicehub\|JusticeHub]] | Supports the work. Reflex layer for community-led justice and social-impact practice. |
| **Accountability** | [[empathy-ledger\|Empathy Ledger]] | Holds the trust. Consent, audit, AI-use ledger, human-in-the-loop, sovereignty primitives. |

The three layers are designed to be used together. They are also each individually useful. A community organisation can adopt Empathy Ledger without touching CivicGraph. A foundation can subscribe to CivicGraph briefs without using JusticeHub. The architecture rewards composition without demanding it.

### Intelligence — CivicGraph

CivicGraph is the **intelligence sensorium** of the civic OS. It holds the dataset of who funds whom, who lobbies whom, who contracts with whom, who sits on which board, where money flows and where it does not. It produces public-good artifacts (Funding Deserts Atlas, Revolving Door Explorer, quarterly State of Civic Money, open API) and commissioned intelligence (foundation deep-dive briefs, place-based intelligence packs, procurement watchlists, dependency-risk audits).

CivicGraph is **not** for sale as a vertical SaaS. It is **not** a strategic exit asset. It remains commercially active through three named flywheels: public-good legitimacy, commissioned intelligence, and ACT advisory. See [[../decisions/2026-05-25-civic-cerebellum-reframe|the Civic Cerebellum Reframe ADR]] for the full reasoning.

### Practice — JusticeHub

JusticeHub has two surfaces. **JusticeHub Atlas** is the public evidence map: the [[alma|Australian Living Map of Alternatives (ALMA)]] catalogue, triangulated claims, the Centre of Excellence reading view. **JusticeHub Practice** is the operational reflex layer for partner organisations: intake, referrals, case log, co-design log, evidence bundles for funders.

The Atlas tells you what works. Practice helps you do it. Practice is not a case management tool in the bureaucratic sense; it is infrastructure that supports community-led practice with reflex routines that make essential steps happen reliably.

### Accountability — Empathy Ledger

Empathy Ledger is the **trust layer**. It holds consent state, audit trails, AI-use ledger, human-in-the-loop checkpoints, cultural-safety enforcement, Guardian Checks against fabrication. It is the layer that makes the invisible visible: who saw what, when, with what permission, scored by what AI, reviewed by which human.

Empathy Ledger's accountability primitives are exposed as an open API (`/api/v1/accountability/*`) so that the other layers of the civic OS, and any partner organisation outside ACT, can call them. The trust contracts that govern the civic OS are public infrastructure, not a proprietary moat.

## The Shared Reflex Primitives

A single reflex loop runs through all three layers. The same six primitives, named the same way, produced and consumed by every product in the civic OS.

```
       intake  ─→  consent  ─→  triage  ─→  referral
          ↑                                      │
          │                                      ↓
       evidence  ←─  audit  ←─  follow-up  ←─────┘
```

| Primitive | What it is | Which layer typically writes it | Which layer typically reads it |
|---|---|---|---|
| **intake** | Capturing who is in the room, what they need, what they have agreed to | JusticeHub Practice | Empathy Ledger (consent state), CivicGraph (caseload anonymised) |
| **consent** | Granular, revocable, culturally-graded permission to use information | Empathy Ledger | All three layers verify it before any use |
| **triage** | Sorting and prioritising by need, risk, fit | JusticeHub Practice | CivicGraph (matched against opportunities) |
| **referral** | A warm handoff between programs, services, or organisations | JusticeHub Practice | Empathy Ledger (logs the handoff event) |
| **follow-up** | The reminder, the check-in, the loop that actually closes | JusticeHub Practice | Empathy Ledger (audit), CivicGraph (outcome data) |
| **audit** | The append-only record of what happened, who decided, what AI touched it | Empathy Ledger | All three layers write to it; storytellers and orgs read from it |

The loop is what most civic systems fail to complete. Intake happens; follow-up does not. Referral is logged; the audit trail is missing. Consent is captured once and then assumed forever. The civic OS exists to make each step of this loop happen reliably, with trust contracts attached, every time.

## How the Layers Call Each Other

The civic OS is not a marketing line. It is enforced in code by three cross-product APIs:

1. **CivicGraph → Empathy Ledger.** Every public CivicGraph artifact (Funding Deserts Atlas page, Revolving Door Explorer query, API call) writes a provenance event to Empathy Ledger's accountability log. This is how CivicGraph claims are made traceable.
2. **JusticeHub → Empathy Ledger.** Before JusticeHub surfaces a story, an evidence bundle, or a co-designed artifact, it verifies the consent token against Empathy Ledger. Consent is not assumed; it is checked at use.
3. **JusticeHub → CivicGraph.** When a partner organisation is using JusticeHub Practice, it fetches relevant opportunities, grants, and funder intelligence from CivicGraph. Practice does not reinvent intelligence; it consumes it.

The three APIs are defined in the per-codebase build prompts at [[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|the FY27 Launch Operations Plan]] §7. They are the technical proof that the civic OS exists as one system, not three products that happen to be sold together.

## The Public-Good Non-Negotiable

Every layer produces public-good outputs on a published cadence. Those outputs are not gated, not paywalled, not redacted for commercial customers. Commissioned customers accept this before any engagement begins.

The rule cascades:

- CivicGraph's Funding Deserts Atlas publishes even when foundations who pay for commissioned briefs are named as funding deserts.
- Empathy Ledger's accountability API is open infrastructure that any organisation can call.
- JusticeHub Atlas (the evidence map) is never sold. Commissioned work is JusticeHub Practice (operational reflex layer for partner orgs) and program evidence-bundles, not the map itself.

The rule filters customers. The customers it filters out were not going to fund the work ACT exists to do. The customers it lets through fund it well and trust it more for the public commitment.

See [[../decisions/2026-05-25-civic-cerebellum-reframe|the Civic Cerebellum Reframe ADR]] §"The Public-Good Non-Negotiable Rule" for the formal statement.

## Fundable Build Areas

The civic OS is built and funded along five named build areas. Each one is grant-fundable on its own; together they form the architecture.

1. **Civic reflex automation** — the cerebellum thesis directly. Intake, referral, follow-up, documentation, reporting, consent, risk flags. See [[civic-reflex-automation|Civic Reflex Automation]] (forthcoming) for the longer treatment.
2. **Ethical AI infrastructure** — audit trails, consent records, human-in-the-loop checkpoints, explainability notes, risk registers, AI-use ledger. Empathy Ledger's domain.
3. **Justice and early-intervention practice systems** — practical, co-designed workflows for youth justice, diversion, restorative approaches, social enterprise pathways, place-based support. JusticeHub Practice's domain.
4. **Civic intelligence and opportunity mapping** — turning fragmented civic information into usable intelligence. CivicGraph's domain.
5. **Evidence, learning, and reporting as a by-product** — every intake, workshop, referral, decision, consent process, and follow-up becomes part of a living evidence base. Cross-cutting across all three layers.

## How the Civic OS Becomes Visible

Three coordinated launches in 2026/27 make the civic OS visible from three different angles:

| Launch | Date | The angle |
|---|---|---|
| **JusticeHub at the Reintegration Conference** | Week of 22 June 2026 | "The practice system for community-led justice work" |
| **Empathy Ledger Field Trip + Africa/Europe witness work** | 29 June to 9 August 2026 | "What communities already know — and the trust layer that lets us learn from them" |
| **CivicGraph at Philanthropy Australia** | September 2026 | "The intelligence layer that makes the rest of the civic OS funded and accountable at scale" |
| **Empathy Ledger × [[../decisions/2026-04-18-oonchiumpa-story-approval\|Oonchiumpa]] × Flinders University launch** | Q1 2027 | "The accountability layer proven with the most cultural-safety-demanding partner possible" |

Each launch reads as one civic operating system becoming visible from a different angle. The launches compound because they share one narrative. Full operational detail at [[../../thoughts/shared/plans/2026-05-25-fy27-launch-operations-plan|the FY27 Launch Operations Plan]].

## Sibling Concepts

The Civic OS sits alongside, not above, the other load-bearing ACT concepts:

- [[soul|Soul]] — the why behind all of it
- [[lcaa-method|LCAA Method]] — Listen, Curiosity, Action, Art as the operating practice
- [[alma|Australian Living Map of Alternatives (ALMA)]] — the cultural authority and methodology layer
- [[governed-proof|Governed Proof]] — the accountability and verification stack
- [[ai-ethics|AI Ethics]] — the principles that constrain every AI choice in the civic OS
- [[beautiful-obsolescence|Beautiful Obsolescence]] — the design discipline (note: applies to JusticeHub, Empathy Ledger, Goods on Country, The Harvest; CivicGraph is infrastructure-inherited, not infrastructure-obsoleted, per the [[../decisions/2026-05-25-civic-cerebellum-reframe|reframe ADR]])
- [[four-lanes|The Four Lanes]] — how money flows through the entities supporting all of this
- [[consent-as-infrastructure|Consent as Infrastructure]] — the principle Empathy Ledger operationalises

## Cross-links to Add

This concept page is new (2026-05-25). The following pages should be updated to link to it as a sibling concept once their next edit cycle comes around:

- [[soul|soul.md]] — add Civic Operating System to the list of load-bearing concepts
- [[act-identity|act-identity.md]] — reference under "How ACT Builds" or similar
- [[act-ecosystem|act-ecosystem.md]] — name the three-layer architecture explicitly
- [[civic-world-model|civic-world-model.md]] — needs rewriting per the [[../decisions/2026-05-25-civic-cerebellum-reframe|reframe ADR]] (drop "replacement for top-down hierarchy" framing; reframe as "intelligence sensorium feeding the civic reflex layer")
