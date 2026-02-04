---
title: Glossary
slug: glossary
website_path: null
excerpt: "Terms and concepts used across ACT"
status: published
last_updated: 2026-01-12
shareability: EXTERNAL
---

# Glossary

Terms and concepts used across ACT. This glossary supports consistent language across projects, documentation, and communication.

---

## Core Concepts

### A Curious Tractor (ACT)
A regenerative innovation studio based in Queensland, Australia. Named after the tractor's Power Take-Off (PTO) mechanism—we transfer power to communities driving their own futures, rather than driving the futures ourselves.

### Beautiful Obsolescence
The design principle of building toward our own irrelevance. We aim to transfer ownership, capability, and governance to communities so completely that ACT eventually becomes unnecessary. Not failure—success.

### Empathy Ledger
ACT's platform for story sovereignty. Communities own their narratives, control who sees them, and receive 40% of any commercial value generated. The core consent and impact infrastructure across the ecosystem.

### LCAA (Listen, Curiosity, Action, Art)
ACT's methodology for ethical innovation:
- **Listen:** Sit with community voice before acting
- **Curiosity:** Ask "what if?" without assuming answers
- **Action:** Build, test, iterate based on listening
- **Art:** Make it visible, shareable, cultural

### ALMA (Adaptive Learning for Meaningful Accountability)
ACT's impact model that reads system-level signals without profiling individuals. Uses six signal families to guide learning and decision-making. ALMA protects against extractive data practices while enabling genuine learning.

### Power Take-Off (PTO)
A tractor mechanism that transfers engine power to implements. ACT's founding metaphor: we provide power that communities direct, not the other way around.

---

## Data & Consent

### Consent Scope
The shareability level assigned to content:
- **INTERNAL:** Team only, not for external sharing
- **EXTERNAL-LITE:** System-level learnings, no identifiers
- **EXTERNAL:** Explicit consent, culturally reviewed, safe to share

### Elder Review
Required cultural review process for content touching Indigenous knowledge, stories, or protocols. Part of consent architecture, not optional.

### OCAP Principles
Ownership, Control, Access, Possession—Indigenous data sovereignty principles that govern how ACT handles community data:
- **Ownership:** Community owns data about them
- **Control:** Community controls how data is used
- **Access:** Community has right to access their data
- **Possession:** Data stays with community where possible

### Sacred Content Protection
Technical and governance measures preventing sacred or culturally sensitive content from being shared without appropriate authority. Hard blocks, not soft warnings.

---

## Places

### Black Cockatoo Valley (BCV)
150-acre property on Jinibara Country near Witta, Queensland. Conservation-first land practice, Nature Refuge designation. Home to residencies, workshops, and habitat restoration.

### The Harvest
Enterprise hub in Witta supporting local makers, therapeutic horticulture, and community-led business. Tests sustainable enterprise models at human scale.

### ACT Farm
The studio practice—where methodology becomes action. Prototyping, learning, iteration, and handover preparation. The farm metaphor shapes daily operations.

### June's Patch
Healthcare worker wellbeing program at BCV. Therapeutic horticulture, "prescription to nature," research partnership with USC.

---

## Projects & Platforms

### JusticeHub
Network for community-led justice programs. Forkable models, cross-community learning, alternative approaches to youth justice and accountability.

### Goods on Country
Circular economy manufacturing for remote communities. Essential goods (beds, washing machines) built for local repair, maintenance, and ownership. 40% profit-sharing to communities.

### ACT Studio / act.place
The public website and digital presence. Draws content from the compendium and project registries.

### Registry API
Standardized `/api/registry` endpoint exposed by each project. Enables ecosystem-wide content aggregation while each project maintains data sovereignty.

---

## ALMA Signals

### Evidence Strength
How well-supported is a learning? Ranges from anecdotal (1) to robust and triangulated (5).

### Community Authority
Who holds authority over this knowledge? How centered is their voice? Ranges from external perspective (1) to community-owned (5).

### Harm Risk (Inverted)
Potential for harm if shared. Inverted so higher = safer. Ranges from high risk (1) to no foreseeable harm (5).

### Implementation Capability
Can we act on this learning? Ranges from beyond capacity (1) to ready to implement (5).

### Option Value
Does this open or close future possibilities? Ranges from limiting (1) to creating significant new options (5).

### Community Value Return
How much value flows back to community? Ranges from extracted (1) to community-first (5).

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

### SSG/SSR/CSR
- **SSG (Static Site Generation):** Pages built at deploy time
- **SSR (Server-Side Rendering):** Pages built on each request
- **CSR (Client-Side Rendering):** Pages built in the browser

---

## Governance Terms

### Sunset Clause
Built-in endpoint for tools and systems. Every ACT product has a plan for when it should end or transfer to community ownership.

### Co-Stewardship
Shared governance between ACT and community partners. Pathway toward full community ownership and beautiful obsolescence.

### Community-Majority Governance
Decision-making structure where community members hold majority of seats/votes. The endpoint of governance handover.

### 40% Profit-Sharing
ACT's commitment to return 40% of commercial value from community stories and products to those communities. Tracked, auditable, distributed.

---

## Farm Metaphors

### Soil
The knowledge network, community wisdom, foundational relationships.

### Seeds
Projects, ideas, initiatives in early stages.

### Tending
Ongoing care, attention, maintenance work.

### Harvest
Impact, results, value returned to community.

### Compost
Learning from failure, turning setbacks into nutrients for next season.

### Seasons
Natural rhythms and timing. We don't force growth out of season.

### Farmhand
ACT's AI layer—infrastructure that reduces admin and holds context without replacing human judgment.

---

## Voice & Brand

### ACT Voice
Warm, grounded, humble, visionary, professional yet rebellious. Uses regenerative metaphors with restraint. Avoids corporate jargon and savior framing.

### Deficit Framing
Language that focuses on what communities lack rather than what they have. ACT avoids this—we center capability and agency.

### Extractive Language
Terms like "harvesting data," "capturing value," "mining insights" that treat people as resources. ACT doesn't use these.

---

## Acronyms

| Acronym | Meaning |
|---------|---------|
| ACT | A Curious Tractor |
| ALMA | Adaptive Learning for Meaningful Accountability |
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

*This glossary is a living document. Update as new terms emerge or definitions evolve.*

---

*See also: [Mission](../01-identity/mission.md) | [LCAA Methodology](../01-identity/lcaa-methodology.md) | [Principles](../01-identity/principles.md)*
