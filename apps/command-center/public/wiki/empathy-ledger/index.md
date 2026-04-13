---
title: Empathy Ledger
status: Active
date: 2026-04-11
entity_type: project
tagging_mode: own-code
canonical_slug: empathy-ledger
canonical_code: ACT-EL
website_slug: empathy-ledger
website_path: /empathy-ledger
public_surface: project
cluster: empathy-ledger
empathy_ledger_key: empathy-ledger
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/projects/empathy-ledger.md`.
> Regenerated: `2026-04-13T13:08:22.637Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# Empathy Ledger

> Not your story... not my story... but a third reality we can only discover together.

**Status:** Active | **Code:** ACT-EL | **Tier:** Ecosystem

## What It Is

The Empathy Ledger is ACT's sovereign storytelling platform — the **narrative sovereignty layer** of [[third-reality|The Third Reality]]. It gives marginalized and Indigenous communities cryptographic ownership of their narratives, ensuring stories are never extracted but always owned.

## Key People

Empathy Ledger should only carry the people who are explanatory to the sovereign-story layer itself, not every storyteller moving through the platform.

- [[benjamin-knight|Benjamin Knight]] — co-founder and field practitioner shaping the story, media, and product infrastructure
- [[richard-cassidy|Richard Cassidy]] — Palm Island governance and "Our Story" framing that directly informs ACT's story-sovereignty practice
- [[rachel-atkinson|Rachel Atkinson]] — executive partner context for one of the clearest community-controlled implementations

The wider storyteller corpus should live in the platform, in EL exports, and in source-bridge notes until a person becomes structurally load-bearing in the canonical wiki.

## Primary Community Implementations

The clearest current community-controlled implementations in the ACT ecosystem are:

- [[picc|Palm Island Community Company (PICC)]] — community-controlled service, governance, and storytelling infrastructure on Palm Island
- [[oonchiumpa|Oonchiumpa]] — community-led youth, culture, and justice storytelling on Country in Mparntwe

These are named here because they explain how Empathy Ledger works in real places, not because EL needs to become a mirror of every deployment.

## Core Principles

1. **Storyteller as Sovereign** — absolute control and agency over how narrative is used
2. **Blockchain-secured ownership** — transparent, fair compensation flows back to storyteller
3. **Do no harm** — community members are active co-creators, not subjects
4. **Reject extractive metrics** — focus on agency, resilience, and truth, not passive victimhood

## The Central Role

Empathy Ledger is the **connective tissue** that ties all impact together across the ACT ecosystem:

| Platform | What It Provides | What Empathy Ledger Adds |
|----------|-----------------|-------------------------|
| CivicGraph | Systemic data (entities, funding, procurement) | Human faces behind the numbers |
| JusticeHub | Evidence base (what interventions work) | Stories of transformation |
| [[goods-on-country|Goods on Country]] | Place-based design outcomes | Community voice in design process |
| PICC | Service delivery data | Lived experience of services |

Without Empathy Ledger, you have data. With it, you have **The Third Reality**.

## How Stories Drive Capital

When individual narratives intersect with systemic data:
1. **AI-powered thematic analysis** safely pulls themes, trends, and quotes from narratives
2. **Funding applications** backed by undeniable weight of real-life impact
3. **Policy shifts** advocated using verified lived experience
4. **Identity always protected** — individual ownership and consent at every stage

## Technical Architecture

### Current (Supabase Instance)
- **EL v2 (active):** `yvnuayzslukamizrlhwb` — dedicated Supabase instance with 207 tables, 364 RLS policies, 296 functions, and pgvector for semantic search
- **EL unused:** `uaxhjzqrdotoahjnxmbj` — second instance, no credentials found in env files

### Future (Sovereign)
- Stories compiled into [[local-ai-architecture|Local AI Architecture]] vaults
- TK Labels as YAML frontmatter on every narrative
- Mukurtu CMS integration for institutional-grade cultural governance
- Federated learning across community models — share insights, never raw stories

## Platform Sections (empathyledger.com)

The live platform is organized around:
- **Stories** — individual narratives with community attribution
- **Storytellers** — profiles and consent management
- **Atlas / Map** — geographic view of stories
- **Projects** — contextual collections
- **Galleries** — curated visual collections
- **World Tour** — global story journey

**Content Advisory:** Some materials may be subject to cultural protocols.
**Community Guidelines** and transparent data principles are published on the platform.

## Current Needs

To demonstrate the model at scale:
- Beta platform with **10+ community participants**
- Published ethical framework
- Measurable policy impact demonstrated

## Content Hub

Photography, videography, and storytelling with AI-powered tagging and ecosystem syndication:
- Photographer/videographer metadata
- Community attribution
- TK Labels for cultural protocols
- Syndication to CivicGraph, JusticeHub, project articles

## Vision: Changing the Face of the World

The Empathy Ledger becomes pervasive when:
- Stories **change minds** — policymakers can't dismiss what they've felt
- Ownership **creates agency** — communities control their narrative, not NGOs
- Resources **follow stories** — Third Reality assessments direct funding to ground truth
- Impact compounds — every story adds to the knowledge base, strengthening all future advocacy

## Platform Architecture

### Technology Stack

- **Frontend:** Next.js 15 with TypeScript — responsive, Progressive Web App with offline capabilities
- **Backend:** Supabase (PostgreSQL) with real-time capabilities and edge computing for global delivery
- **Media:** Cloud storage with CDN distribution, AI-powered transcription, and automatic format conversion
- **AI Tools:** Automatic transcription, translation, content tagging, and theme extraction from narratives

### Multi-Tenant Model

The platform uses a multi-tenant architecture: a single platform instance supports unlimited organizations, each with their own dashboards, member directories, project management, and media galleries. Organizations can have complex hierarchies — sub-groups, roles, elder review boards — while sharing the same underlying infrastructure.

Tiers of access:
- **Individual storytellers** — personal dashboard, story portfolio, consent management
- **Community organizations** — up to 500 members, project tracking, custom cultural protocols
- **Enterprise / government** — unlimited members, on-premise deployment options, SLA guarantees

### Integration Ecosystem

- Social media sharing with granular storyteller controls
- Grant management system integration with automated funder reporting
- SAML/OAuth single sign-on for enterprise environments
- Full REST API and webhook support for partner platforms (e.g. [[justicehub|JusticeHub]], [[the-harvest|The Harvest]])

## Cultural Protocols & Consent Infrastructure

The platform treats consent not as a checkbox but as ongoing infrastructure. Informed by two years of work with Aboriginal communities in Central Australia and Queensland, the consent model reflects [[ocap-principles|OCAP principles]] (Ownership, Control, Access, Possession).

### Five Consent Types

Each storyteller manages five distinct consent relationships:

| Type | Question | Key Feature |
|------|----------|-------------|
| **Collection** | Can we record your story? | Separate from account creation, covers recording method |
| **Processing** | Can AI analyze your story? | Model-specific permissions, training data excluded by default |
| **Sharing** | Who can see your story? | Four-tier: public / community / restricted / sacred |
| **Attribution** | How do you want to be named? | Legal name, preferred name, community attribution, or anonymity |
| **Syndication** | Can your story appear on partner platforms? | Per-partner approval, revocable, with usage reporting |

All five types are revocable at any time from the storyteller's consent dashboard — no admin approval required. Consent changes take effect immediately across all systems.

For a full technical treatment, see [[consent-as-infrastructure|Consent as Infrastructure]].

### Elder Review Workflows

Traditional knowledge can be flagged for elder review before publication. The platform supports multi-level content moderation including community elder approval, with cultural warnings attached to sensitive content.

### Permission Levels

Stories are assigned one of four permission levels:
- **Public** — discoverable and accessible to all
- **Community** — visible to members of the associated organization
- **Restricted** — limited to specific individuals or roles
- **Sacred** — protected with the highest cultural protocols; access requires explicit authorization

## Real-World Scale

From the Snow Foundation implementation:
- **226 active storytellers** sharing health and wellness journeys
- **550+ community stories** including an Elder Teaching Library of traditional heart health knowledge
- 95% elder approval rate for traditional knowledge sharing
- 40% increase in grant application success for partnered organizations

Platform-wide benchmarks:
- Average story reach: 150+ community members per narrative
- 85% of stories receive meaningful responses
- 10,000+ concurrent users supported
- 99.9% uptime with global CDN

## System Position

Empathy Ledger is not only a product. It is one of ACT's load-bearing stack layers:

- the wiki holds the durable framing for story sovereignty, consent, and identity
- Empathy Ledger holds the live story, photo, video, and editorial layer
- the websites compose EL material into project pages, journals, and partner surfaces

That architecture is the point, not an implementation detail. See [[living-website-operating-system|Living Website Operating System]] for the full operating model and [[art/business/studio-business-model|Studio Business Model]] for how EL strengthens ACT's public surface, media quality, and ecosystem earning power.

## Key Source Bridges

These are the strongest current source-bridge notes for keeping the canonical page tied to real material rather than memory:

- [Source Summary — ACT Project Page / Empathy Ledger](../sources/2026-04-07-scrape-act-place-empathy-ledger.md)
- [Source Summary — Empathy Ledger Strategy Synthesis](../sources/2026-04-09-empathy-ledger-strategy-synthesis.md)
- [Source Summary — EL Consent as Infrastructure](../sources/2026-04-07-el-consent-as-infrastructure.md)
- [Source Summary — EL Platform Prospectus](../sources/2026-04-07-el-platform-prospectus.md)
- [Source Summary — EL Unified Storyteller Analysis](../sources/2026-04-07-el-unified-storyteller-analysis.md)

## Implementation Approach

Deployments follow four phases:
1. **Discovery** (2–6 weeks) — story inventory, cultural protocol documentation, community needs assessment
2. **Configuration** (2–16 weeks) — platform setup, branding, content migration, or custom feature development
3. **Onboarding** (2–8 weeks) — staff training, community member onboarding, cultural protocol training
4. **Launch & Optimisation** (ongoing) — community engagement, performance monitoring, grant reporting

## Infrastructure & Operations

### Deployed Platform

| Detail | Value |
|--------|-------|
| **Live URL** | [empathyledger.com](https://empathyledger.com) |
| **Alternate** | empathy-ledger-v2.vercel.app |
| **GitHub** | [act-now-coalition/empathy-ledger-v2](https://github.com/act-now-coalition/empathy-ledger-v2) |
| **Hosting** | Vercel |
| **Framework** | Next.js 14 + TypeScript + React 18 |
| **Editor** | TipTap rich text |
| **Local dev** | `npm run dev` → http://localhost:3001 |

### External Integrations

- **GHL CRM:** Pipeline "Storytellers", tags: `storytelling`, `empathy`, `elder`, `indigenous`. Contact field: `is_storyteller`.
- **Xero:** Tracking category `EL`, project codes `EL-CORE` and `EL-CONTENT`.
- **Inngest:** Background job processing (transcription, consent renewal, sync).
- **Mapbox:** Geographic story atlas.
- **Claude AI:** Consented story analysis and theme extraction.

### Key Database Tables

The active Supabase instance (`yvnuayzslukamizrlhwb`) holds: `profiles`, `storytellers`, `stories`, `media_assets`, `consent_records`, `elder_reviews`, `organizations`, `content_hub_posts`. Content Hub posts syndicate to The Harvest blog via the EL syndication API.

## Public Voice

*How Empathy Ledger describes itself on act.place (act.place/act-projects/empathy-ledger, captured 2026-04-07)*

### The Third Reality as Public Tagline

> In the space where individual narratives intersect with systemic understanding, a transformative potential emerges — not your story... not my story... but a third reality we can only discover together.

This is the only ACT platform whose public-facing page leads with the [[third-reality|Third Reality]] concept by name. The internal wiki uses this as methodology; the public site uses it as identity.

### The Framing Contrast (How They Explain What's Different)

The public page sets up a two-column contrast:

**Traditional Impact Methodology (Extractive)**
- Researcher as Central Authority
- Information flows one direction: researcher → subjects
- Subjects as data points; value accumulates at institutional level

**Transformative Exchange Methodology (EL)**
- Storyteller as Sovereign Center
- Network ecosystem with dynamic, living relationships
- Value Reciprocity: benefits flow to all participants

This is the most direct public explanation of ACT's critique of conventional research and impact measurement.

### Four Steps (Public-Facing Process)

1. **Share Your Story** — voice, video, text, or photos; set privacy controls
2. **Maintain Control** — edit, update, or remove anytime; change who sees it as comfort grows
3. **Create Value** — stories contribute to funding applications; community patterns emerge
4. **Benefit Fairly** — direct compensation when story drives funding; recognition as knowledge holder

The "Benefit Fairly" step — direct compensation — is not prominently featured in the internal wiki. This is a significant public commitment that deserves more documentation.

### Principles Attribution

> *These aren't our rules. They're community-set principles we've built technology to honour.*

This framing — principles set by communities, not tech companies — is load-bearing for funder communications. It addresses the "who has power over the platform?" question before it's asked.

### What the Public Site Omits

The public act.place page does not mention: blockchain ownership, TK Labels, Mukurtu integration, OCAP principles, or the five consent types. These are internal technical/governance details — the public page is purely relational and values-based. This is correct framing for a general audience but may leave sophisticated Indigenous governance partners wanting more. The internal wiki fills that gap.

## Backlinks

- [[benjamin-knight|Benjamin Knight]] — co-founder and primary field practitioner for the sovereign-story stack
- [[richard-cassidy|Richard Cassidy]] — "Our Story" philosophy and Palm Island governance context
- [[rachel-atkinson|Rachel Atkinson]] — executive context for PICC as a major implementation partner
- [[three-circles|The Three Circles]] — the canonical 3-year, $2.9M Minderoo pitch. Empathy Ledger v2 is the **story sovereignty layer** running underneath Circle One; every consented narrative across the ten anchor communities and the international tour carries an Empathy Ledger consent envelope.
- [[staying|Staying — Country & Council]] — methodology layer; the per-young-person Journals draw their voice transcripts and consent flows from EL
- [[mount-isa|Mount Isa]] — field context where story sovereignty and justice evidence began converging in practice
- [[lcaa-method|LCAA Method]] — Listen and Art are most visible here, with story work feeding back into the full ACT practice loop
- [[third-reality|The Third Reality]] — the methodology EL enables
- [[civicgraph|CivicGraph]] — the systemic data layer EL completes
- [[justicehub|JusticeHub]] — evidence layer EL humanizes
- [[ai-ethics|AI Ethics & Agent Strategy]] — consent and guardrail model for any AI touching stories
- [[alma|ALMA Framework]] — the shared signal model reading consented stories at system level
- [[beautiful-obsolescence|Beautiful Obsolescence]] — platform design discipline for exportability, handover, and community control
- [[governance-consent|Governance & Consent (Operational)]] — the operational shareability and review model applied around stories and syndication
- [[place-land-practice|Place & Land Practice]] — stories are grounded in Country, place, and community-held context
- [[picc|PICC]] — primary community implementation
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — governance framework
- [[local-ai-architecture|Local AI Architecture]] — sovereign hosting
- [[consent-as-infrastructure|Consent as Infrastructure]] — the technical essay behind the consent model
- [[ocap-principles|OCAP Principles]] — Ownership, Control, Access, Possession
- [[transcript-analysis-method|Transcript Analysis Method]] — the story-to-signal method that governs transcript analysis without collapsing storyteller voice
- [[visual-system|ACT Visual System]] — the shared visual language that frames EL stories, journals, and public-facing artefacts
- [[2026-04-founder-lanes-and-top-two-bets|Founder Lanes and Top Two Bets]] — the founder decision that keeps Empathy Ledger in ACT's drive lane as the most productizable stack layer
- [[continuous-pipeline|Continuous Pipeline Architecture]] — the maintenance layer that keeps EL-linked people, story, and wiki surfaces refreshed without mirroring the full platform
- [[living-website-operating-system|Living Website Operating System]] — where EL sits as the live editorial and media layer
- [[art/business/studio-business-model|Studio Business Model]] — why EL media and story quality matter economically as well as ethically
- [[y1-release-program|Y1 Art Release Program]] — EL as media source for the Year 1 art release schedule
- [[2026-04-act-farm-repositioning|Act-Farm Repositioning]] — EL referenced in the regenerative capital pivot
- [[five-year-cashflow-model|Five-Year Cashflow Model]] — EL revenue assumptions in the five-year projection
- [[rdti-claim-strategy|R&D Tax Incentive Claim Strategy]] — EL development as eligible R&D activity
