---
title: Glossary
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/concepts/glossary.md`.
> Regenerated: `2026-06-07T01:07:42.547Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# Glossary

> Terms and concepts used across ACT. This is a living document — update as language evolves.

## Core Concepts

### A Curious Tractor (ACT)
A regenerative innovation studio based in Queensland, Australia. Named after the tractor's Power Take-Off (PTO) mechanism — we transfer power to communities driving their own futures, rather than driving the futures ourselves.

### Beautiful Obsolescence
The design principle of building toward our own irrelevance. We aim to transfer ownership, capability, and governance to communities so completely that ACT eventually becomes unnecessary. Not failure — success. See [[beautiful-obsolescence|Beautiful Obsolescence]].

### Empathy Ledger
ACT's platform for story sovereignty. Communities own their narratives, control who sees them, and receive 40% of any commercial value generated. The core consent and impact infrastructure across the ecosystem.

### LCAA (Listen, Curiosity, Action, Art)
ACT's methodology for ethical innovation:
- **Listen:** Sit with community voice before acting
- **Curiosity:** Ask "what if?" without assuming answers
- **Action:** Build, test, iterate based on listening
- **Art:** Make it visible, shareable, cultural

See [[lcaa-method|LCAA Method]].

### Australian Living Map of Alternatives (ALMA)
ACT's catalogue of community-led interventions that work, scored on six dimensions (evidence strength, community authority, harm risk, implementation capability, option value, community value return). The catalogue lives in the `alma_interventions`, `alma_evidence`, and `alma_outcomes` database tables. ALMA is the map, not a process, not an AI agent, not a ranking engine. See [[alma|ALMA]].

### Civic Operating System
The three-layer architecture for ACT's product work: [[civicgraph|CivicGraph]] (intelligence, sees the field), [[justicehub|JusticeHub]] (practice, supports the work), [[empathy-ledger|Empathy Ledger]] (accountability, holds the trust). The three call each other in code. See [[civic-operating-system|Civic Operating System]].

### Civic Reflex Automation
ACT's AI thesis: automate the boring (tagging, matching, syncing, reporting, reminders, audits), amplify the art (storytelling, design, engagement), never replace human judgment on relationships, consent, or creative direction. See [[civic-reflex-automation|Civic Reflex Automation]].

### Evidence as a By-Product of the Work
The principle that impact reporting composes from the existing layers (Empathy Ledger, ALMA, CivicGraph, Governed Proof) rather than running as a separate reporting workstream. Every intake, story, consent, referral, audit, and review writes to the evidence base; the report at the end of the quarter is generated from the ledger, not re-collected from memory. See [[evidence-as-by-product|Evidence as a By-Product of the Work]].

### Power Take-Off (PTO)
A tractor mechanism that transfers engine power to implements. ACT's founding metaphor: we provide power that communities direct, not the other way around.

---

## Data & Consent

### Consent Scope
The shareability level assigned to content:
- **INTERNAL ONLY:** Team only, not for external sharing
- **EXTERNAL-LITE:** System-level learnings, no identifiers
- **EXTERNAL:** Explicit consent, culturally reviewed, safe to share

### Elder Review
Required cultural review process for content touching Indigenous knowledge, stories, or protocols. Part of consent architecture, not optional. Elder decisions are final on cultural matters.

### OCAP Principles
Ownership, Control, Access, Possession — Indigenous data sovereignty principles developed by the First Nations Information Governance Centre:
- **Ownership:** Community owns data about them
- **Control:** Community controls how data is used
- **Access:** Community has right to access their data
- **Possession:** Data stays with community where possible

See [[consent-as-infrastructure|Consent as Infrastructure]].

### Sacred Content Protection
Technical and governance measures preventing sacred or culturally sensitive content from being shared without appropriate authority. Hard blocks, not soft warnings.

---

## Places

### Black Cockatoo Valley (BCV)
150-acre property on Jinibara Country near Witta, Queensland. Conservation-first land practice, Nature Refuge designation. Home to residencies, workshops, and habitat restoration.

### The Harvest
Enterprise hub in Witta supporting local makers, therapeutic horticulture, and community-led business. Tests sustainable enterprise models at human scale.

### ACT Farm
The studio practice — where methodology becomes action. Prototyping, learning, iteration, and handover preparation. The farm metaphor shapes daily operations.

### June's Patch
Healthcare worker wellbeing program at Black Cockatoo Valley. Therapeutic horticulture, "prescription to nature," research partnership with USC.

---

## Projects & Platforms

### JusticeHub
Network for community-led justice programs. Forkable models, cross-community learning, alternative approaches to youth justice and accountability. See [[justicehub|JusticeHub]].

### Goods on Country
Circular economy manufacturing for remote communities. Essential goods (beds, washing machines) built for local repair, maintenance, and ownership. 40% profit-sharing to communities. See [[goods-on-country|Goods on Country]].

### Registry API
Standardized `/api/registry` endpoint exposed by each project. Enables ecosystem-wide content aggregation while each project maintains data sovereignty.

---

## ALMA Scoring Dimensions

The six dimensions every intervention in [[alma|ALMA]] is scored on. These dimensions **are** ALMA's methodology, not external supports for some other thing called ALMA. The catalogue plus the dimensions plus the scoring records together are the Map.

| Scoring Dimension | What It Checks |
|--------|-----------------|
| Evidence Strength | Is the claim sourced and reliable? |
| Community Authority | Who holds authority? Has cultural authority been verified? |
| Harm Risk | What could go wrong if this is acted on or shared? |
| Implementation Capability | Can this be acted on responsibly now? |
| Option Value | Does this open or close future possibilities? |
| Community Value Return | Does value flow back to the people or place involved? |

---

## Technical Terms

### Multi-Tenant Architecture
Shared database infrastructure with Row Level Security (RLS) ensuring data isolation between organizations while enabling cross-tenant analytics.

### Row Level Security (RLS)
PostgreSQL feature that enforces data access policies at the database level. Users can only see data they're authorized to access.

### Edge Functions
Serverless functions running at the network edge (close to users). Used for real-time processing without cold starts.

### pgvector
PostgreSQL extension enabling vector similarity search. Powers semantic search across stories and content.

### SSG / SSR / CSR
- **SSG (Static Site Generation):** Pages built at deploy time
- **SSR (Server-Side Rendering):** Pages built on each request
- **CSR (Client-Side Rendering):** Pages built in the browser

---

## Governance Terms

### Sunset Clause
Built-in endpoint for tools and systems. Every ACT product has a plan for when it should end or transfer to community ownership. See [[beautiful-obsolescence|Beautiful Obsolescence]].

### Co-Stewardship
Shared governance between ACT and community partners. Pathway toward full community ownership and beautiful obsolescence.

### Community-Majority Governance
Decision-making structure where community members hold majority of seats/votes. The endpoint of governance handover.

### 40% Profit-Sharing
ACT's commitment to return 40% of commercial value from community stories and products to those communities. Tracked, auditable, distributed.

---

## Farm Metaphors

| Metaphor | Meaning |
|---------|---------|
| Soil | The knowledge network, community wisdom, foundational relationships |
| Seeds | Projects, ideas, initiatives in early stages |
| Tending | Ongoing care, attention, maintenance work |
| Harvest | Impact, results, value returned to community |
| Compost | Learning from failure, turning setbacks into nutrients |
| Seasons | Natural rhythms and timing — don't force growth out of season |
| Farmhand | ACT's AI layer — infrastructure that reduces admin without replacing human judgment |

---

## Voice & Brand

### ACT Voice
Warm, grounded, humble, visionary, professional yet rebellious. Uses regenerative metaphors with restraint. Avoids corporate jargon and savior framing. See [[voice-guide|ACT Voice Guide]].

### Deficit Framing
Language that focuses on what communities lack rather than what they have. ACT avoids this — we center capability and agency.

### Extractive Language
Terms like "harvesting data," "capturing value," "mining insights" that treat people as resources. ACT doesn't use these.

---

## Acronyms

| Acronym | Meaning |
|---------|---------|
| ACT | A Curious Tractor |
| ALMA | Australian Living Map of Alternatives |
| BCV | Black Cockatoo Valley |
| CSA | Community Supported Agriculture |
| GHL | GoHighLevel (CRM platform) |
| LCAA | Listen, Curiosity, Action, Art |
| MCP | Model Context Protocol |
| OCAP | Ownership, Control, Access, Possession |
| PTO | Power Take-Off |
| RLS | Row Level Security |
| SSG | Static Site Generation |
| SSR | Server-Side Rendering |
| USC | University of the Sunshine Coast |

---

## Backlinks

- [[lcaa-method|LCAA Method]] — core methodology
- [[civic-operating-system|Civic Operating System]] — the three-layer architecture for ACT's product work
- [[civic-reflex-automation|Civic Reflex Automation]] — the AI thesis underneath the civic OS
- [[evidence-as-by-product|Evidence as a By-Product of the Work]] — the impact reporting principle
- [[alma|ALMA]] — the catalogue of community-led alternatives, evidence-graded with cultural authority
- [[governed-proof|Governed Proof]] — evidence, review, confidence, publication, and audit trail
- [[consent-as-infrastructure|Consent as Infrastructure]] — OCAP architecture
- [[beautiful-obsolescence|Beautiful Obsolescence]] — handover design principle
- [[voice-guide|ACT Voice Guide]] — language system
- [[custodian-economy|Custodian Economy]] — economic model referenced in co-stewardship and governance terms
