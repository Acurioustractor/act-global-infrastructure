---
title: ACT Regenerative Studio
status: Active
date: 2026-04-11
entity_type: cluster-hub
tagging_mode: own-code
canonical_slug: act-studio
canonical_code: ACT-CORE
website_slug: act-studio
website_path: /studio
public_surface: hub
cluster: act-studio
empathy_ledger_key: act-studio
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/projects/act-studio/act-studio.md`.
> Regenerated: `2026-04-13T12:18:15.129Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# ACT Regenerative Studio

> Central hub and coordination point for the entire ACT ecosystem. Where technology serves community ownership.

**Status:** Active | **Code:** ACT-CORE | **Tier:** Ecosystem

## What It Is

The ACT Regenerative Studio is the public-facing website and central infrastructure hub at [act.place](https://act.place). It is not just a website — it is the coordination layer that connects all ecosystem projects, manages contacts, holds the living knowledge base (Compendium), and provides the administrative backbone for ACT's operations.

It sits on the shared ACT Supabase instance (`tednluwflfhxyucgwigh`), which serves the Command Center, the Telegram bot, GrantScope, and most ACT scripts.

## Role in Ecosystem

The Studio acts as the hub connecting all five ecosystem projects:

```
                    ┌─────────────────────┐
                    │  ACT STUDIO (Hub)   │
                    │  act.place          │
                    └──────────┬──────────┘
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       │           │           │           │           │
  Empathy     JusticeHub   The Harvest    Goods      ACT Farm
  Ledger                                on Country
```

## Philosophy Alignment

| Principle | How The Studio Embodies It |
|-----------|---------------------------|
| **Tools Should Create Space** | Infrastructure is quiet — reduces admin, holds context |
| **Build for Handover** | Open source, documentation, training materials |
| **Art Returns Us to Listen** | Technology serves storytelling and cultural expression |
| **Identity Before Product** | We start with who we serve, not what we build |

## Studio Field

The Studio is not only the digital hub. It is also ACT's cultural production field. That means the public shell, the works line, and the innovation model belong together:

- [[art-projects|ACT Art Projects]] maps the Studio line of works
- [[art/philosophy/art-as-infrastructure|Art as Infrastructure]] explains why ACT treats art as a core field rather than a side portfolio
- [[art/innovation/studio-innovation-flow|Studio Innovation Flow]] shows how works feed strategy, products, campaigns, and invitations back into the ecosystem
- [[art/business/studio-business-model|Studio Business Model]] names how the Studio earns and what success looks like

This matters because ACT does not separate cultural production from innovation. The works are part of how ACT thinks, persuades, earns, and shifts power.

Two good examples of that overlap are [[gold-phone|Gold.Phone]] — communication infrastructure as a work — and [[cars-and-microcontrollers|Cars and Microcontrollers]] — practical making as a Studio-pathway into technical confidence.
The Studio line also carries [[uncle-allan-palm-island-art|Uncle Allan Palm Island Art]] as one of the clearest art-sovereignty works in the ecosystem: community-held culture made public without flattening authority.
The same Studio field also holds [[the-confessional|The Confessional]] as care infrastructure, [[regional-arts-fellowship|Regional Arts Fellowship]] as a repeatable support format, and [[treacher|Treacher]] as a place-memory work still in ideation.

## The Compendium (Living Wiki)

The Studio hosts a living Compendium at `/compendium/` containing:
- **7 sections**: Identity, Place, Ecosystem, Story, Operations, Roadmap, Appendices
- **~95 pages** of organisational knowledge
- **31 vignettes** across 7 categories
- **35 project pages** with ALMA signals

## Key Public Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/about` | About ACT |
| `/ecosystem` | Ecosystem overview |
| `/projects/[slug]` | Project portfolio |
| `/blog` | Content and updates |
| `/wiki` | Living knowledge base |
| `/art/*`, `/farm/*`, `/harvest/*` | Place portfolios |
| `/goods` | Goods on Country |
| `/lcaa` | LCAA method |

## Admin & Operations Dashboard

| Route | Purpose |
|-------|---------|
| `/admin/dashboard` | Main admin |
| `/admin/ecosystem` | Ecosystem management |
| `/admin/media-gallery` | Media library |
| `/admin/media-lab` | Media production |
| `/admin/content` | Content management |
| `/admin/wiki-scanner` | Automated wiki updates |
| `/admin/enrichment-review` | Content enrichment |
| `/admin/knowledge-review` | Knowledge curation |

## Infrastructure & Operations

### Deployed Platform

| Detail | Value |
|--------|-------|
| **Live URL** | [act.place](https://act.place) |
| **Alternate** | act-regenerative-studio.vercel.app |
| **GitHub** | [act-now-coalition/act-regenerative-studio](https://github.com/act-now-coalition/act-regenerative-studio) |
| **Hosting** | Vercel |
| **Framework** | Next.js 15.1.3, React 19, TypeScript |
| **Local dev** | `npm run dev` → http://localhost:3002 |

### Database

Runs on the shared ACT Supabase instance. Key tables:

- `wiki_pages` — living knowledge base with PMPP classification
- `embeddings` — vector search capabilities
- `gmail_integration` — email tracking across 4 mailboxes
- `notifications` — alert system
- `human_verification_system` — quality control
- `ghl_contact_sync` — GoHighLevel CRM sync
- `media_items` — media management
- `descript_platform` — video/audio integration
- `enrichment_review` — content enrichment workflow

### External Integrations

- **GHL CRM:** Pipeline "ACT Studio", tags: `act`, `studio`, `farm`, `retreat`. Central contact sync for the ecosystem.
- **Xero:** Tracking category `ACT`, project codes `ACT-CORE` and `ACT-ADMIN`.
- **Notion, GitHub, Google (Gmail), Resend:** Core external services for knowledge management, code, email, and notifications.
- **Claude AI, OpenAI:** AI services for content enrichment, knowledge review, and wiki scanning.

### API Endpoints

| Group | Prefix | Purpose |
|-------|--------|---------|
| Core | `/api/auth/*`, `/api/dashboard/*` | Authentication and dashboard data |
| Content | `/api/knowledge/*`, `/api/media/*`, `/api/projects/*` | Knowledge base and media |
| Integrations | `/api/notifications/*`, `/api/registry/*`, `/api/webhooks/*` | External integrations |

## LCAA in Practice

| Phase | Studio Application |
|-------|--------------------|
| **Listen** | Community needs assessments, partner conversations |
| **Curiosity** | Technology exploration, architecture decisions |
| **Action** | Platform development, deployment, operations |
| **Art** | Compendium, visual system, public communication |

## Key Source Bridges

These source notes now hold the strongest current bridge between raw capture and the Studio's canonical pages:

- [Source Summary — ACT Index](../../sources/2026-04-07-cc-act-index.md)
- [Source Summary — ACT LCAA](../../sources/2026-04-07-cc-act-lcaa.md)
- [Source Summary — ACT Mission](../../sources/2026-04-07-cc-act-identity-mission.md)
- [Source Summary — ACT Voice Guide](../../sources/2026-04-07-cc-act-identity-voice-guide.md)
- [Source Summary — ACT Governance](../../sources/2026-04-07-cc-act-governance.md)
- [Source Summary — The Studio Index](../../sources/2026-04-07-cc-the-studio-index.md)

## Backlinks

- [[index|ACT Wikipedia]]
- [[act-identity|A Curious Tractor (ACT)]] — the studio is the public coordination hub for the wider ecosystem
- [[lcaa-method|LCAA Method]]
- [[place-land-practice|Place & Land Practice]] — the studio’s digital layer is in service of the place cluster, not separate from it
- [[empathy-ledger|Empathy Ledger]] — core platform connected to Studio
- [[justicehub|JusticeHub]] — core platform connected to Studio
- [[goods-on-country|Goods on Country]] — core platform connected to Studio
- [[the-harvest|The Harvest]] — core platform connected to Studio
- [[act-farm|ACT Farm]] — operational home
- [[gold-phone|Gold.Phone]] — communication infrastructure held as Studio work
- [[cars-and-microcontrollers|Cars and Microcontrollers]] — maker-pathway project inside the Studio field
- [[uncle-allan-palm-island-art|Uncle Allan Palm Island Art]] — Palm Island cultural sovereignty work in the Studio line
- [[the-confessional|The Confessional]] — mobile care installation in the Studio line
- [[regional-arts-fellowship|Regional Arts Fellowship]] — repeatable support structure for art × technology × agriculture
- [[treacher|Treacher]] — place-memory work in ideation
- [[art-projects|ACT Art Projects]] — the Studio line of works
- [[art/philosophy/art-as-infrastructure|Art as Infrastructure]] — why art is a core field of ACT
- [[art/innovation/studio-innovation-flow|Studio Innovation Flow]] — how Studio work feeds the wider ecosystem
- [[art/business/studio-business-model|Studio Business Model]] — how the Studio sustains itself and funds the commons
- [[living-website-operating-system|Living Website Operating System]] — the public-shell rule for hub, spokes, wiki, and EL
- [[llm-knowledge-base|LLM Knowledge Base]] — the durable memory pattern the Compendium is intentionally following
