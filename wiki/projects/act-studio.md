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

## Backlinks

- [[index|ACT Wikipedia]]
- [[lcaa-method|LCAA Method]]
- [[empathy-ledger|Empathy Ledger]] — core platform connected to Studio
- [[justicehub|JusticeHub]] — core platform connected to Studio
- [[goods-on-country|Goods on Country]] — core platform connected to Studio
- [[the-harvest|The Harvest]] — core platform connected to Studio
- [[act-farm|ACT Farm]] — operational home
