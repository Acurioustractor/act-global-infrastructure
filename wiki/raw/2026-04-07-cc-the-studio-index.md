---
title: "ACT Regenerative Studio"
slug: "act-regenerative-studio"
website_path: /
excerpt: "Central hub and coordination point for the ACT ecosystem"
category: "core-platform"
status: "active"
last_updated: "2026-01-26"
shareability: "PUBLIC"

# Infrastructure
infrastructure:
  local_path: "/Users/benknight/Code/act-regenerative-studio"
  github_repo: "act-now-coalition/act-regenerative-studio"
  deployed_url: "https://act.place"
  alt_urls:
    - "https://act-regenerative-studio.vercel.app"
  tech_stack:
    framework: "Next.js 15.1.3"
    language: "TypeScript"
    runtime: "React 19"
    database: "Supabase (PostgreSQL)"
    ai: "Anthropic Claude, OpenAI"
    hosting: "Vercel"
  supabase_project: "tednluwflfhxyucgwigh"

# Data Connections
data_connections:
  key_tables:
    - wiki_pages
    - embeddings
    - gmail_integration
    - notifications
    - human_verification_system
    - ghl_contact_sync
    - media_items
    - descript_platform
    - enrichment_review
  external_apis:
    - notion
    - github
    - google
    - resend

# GHL Integration
ghl_integration:
  pipeline: "ACT Studio"
  tags: ["act", "studio", "farm", "retreat"]
  central_sync: true

# Xero Integration
xero_integration:
  tracking_category: "ACT"
  project_codes: ["ACT-CORE", "ACT-ADMIN"]

# Health Monitoring
health:
  status: "degraded"
  health_score: 67
  last_check: "2026-01-24"
  response_time_ms: 417

# Authority Check
authority:
  who_holds: "ACT Foundation"
  how_we_know: "Organizational governance"
  consent_status: "In place"
  handover_plan: "Open source, documentation"
---

# ACT Regenerative Studio

**Central hub and coordination point for the entire ACT ecosystem. Where technology serves community ownership.**

---

## Philosophy Alignment

The Studio embodies these ACT principles:

| Principle | How The Studio Embodies It |
|-----------|---------------------------|
| **Tools Should Create Space** | Infrastructure is quiet — reduces admin, holds context |
| **Build for Handover** | Open source, documentation, training materials |
| **Art Returns Us to Listen** | Technology serves storytelling and cultural expression |
| **Identity Before Product** | We start with who we serve, not what we build |

---

## LCAA in Practice

| Phase | Studio Application |
|-------|--------------------|
| **Listen** | Community needs assessments, partner conversations |
| **Curiosity** | Technology exploration, architecture decisions |
| **Action** | Platform development, deployment, operations |
| **Art** | Compendium, visual system, public communication |

---

## Quick Links

| Resource | Link |
|----------|------|
| **Live Site** | [act.place](https://act.place) |
| **GitHub** | [act-regenerative-studio](https://github.com/act-now-coalition/act-regenerative-studio) |
| **Supabase** | [Dashboard](https://supabase.com/dashboard/project/tednluwflfhxyucgwigh) |
| **Vercel** | [Deployment](https://vercel.com/act-now-coalition/act-regenerative-studio) |

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│ ACT REGENERATIVE STUDIO                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Vercel)          Database (Supabase)             │
│  ┌───────────────┐          ┌──────────────────────┐       │
│  │ Next.js 15    │          │ PostgreSQL           │       │
│  │ React 19      │◄────────►│ Wiki pages           │       │
│  │ TypeScript    │          │ Media items          │       │
│  │ App Router    │          │ GHL sync             │       │
│  └───────────────┘          └──────────────────────┘       │
│                                                             │
│  External Integrations                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Notion  │  │ GitHub  │  │ Gmail   │  │ Resend  │       │
│  │ API     │  │ Octokit │  │ OAuth   │  │ Email   │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
│  AI Services                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │ Claude  │  │ OpenAI  │  │ Redis   │                    │
│  │ Anthrop │  │ GPT-4   │  │ Cache   │                    │
│  └─────────┘  └─────────┘  └─────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Role in Ecosystem

ACT Studio is the **central hub** connecting all ecosystem projects:

```
                    ┌─────────────────────┐
                    │  ACT STUDIO (Hub)   │
                    │  act.place          │
                    └──────────┬──────────┘
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       │           │           │           │           │
       ▼           ▼           ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Empathy   │ │ Justice   │ │   The     │ │  Goods    │ │   ACT     │
│ Ledger    │ │   Hub     │ │ Harvest   │ │ on Country│ │   Farm    │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

---

## Data Sources

### Database (Supabase)

**Key Tables:**
- `wiki_pages` - Living knowledge base with PMPP classification
- `embeddings` - Vector search capabilities
- `gmail_integration` - Email tracking
- `notifications` - Alert system
- `human_verification_system` - Quality control
- `ghl_contact_sync` - GoHighLevel CRM sync
- `media_items` - Media management
- `descript_platform` - Video/audio integration
- `enrichment_review` - Content enrichment workflow

### GHL (Central Sync)

| Field | Value |
|-------|-------|
| Pipeline | ACT Studio |
| Tags | act, studio, farm, retreat |
| Role | Central contact sync |

### Xero (Finance)

| Tracking | Code |
|----------|------|
| Category | ACT |
| Projects | ACT-CORE, ACT-ADMIN |

---

## Health Status

| Check | Status |
|-------|--------|
| Site Reachable | ⚠️ Degraded |
| Health Score | 67/100 |
| Response Time | 417ms |
| Last Check | 2026-01-24 |
| SSL Expires | 2026-04-04 |

---

## Key Features

### Public Pages
| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/about` | About ACT |
| `/ecosystem` | Ecosystem overview |
| `/projects/[slug]` | Project portfolio |
| `/blog` | Content/updates |
| `/wiki` | Living knowledge base |
| `/contact` | Contact form |

### Portfolio
| Route | Purpose |
|-------|---------|
| `/art/*` | Art programs |
| `/farm/*` | Farm programs |
| `/harvest/*` | Harvest programs |
| `/goods` | Goods on Country |
| `/lcaa` | LCAA project |
| `/media-lab` | Media production |

### Admin Dashboard
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

---

## Compendium (Living Wiki)

The compendium at `/compendium/` contains:
- **7 sections**: Identity, Place, Ecosystem, Story, Operations, Roadmap, Appendices
- **~95 pages** of organizational knowledge
- **31 vignettes** across 7 categories
- **35 project pages** with ALMA signals

---

## Development

```bash
# Clone
git clone git@github.com:act-now-coalition/act-regenerative-studio.git
cd act-regenerative-studio

# Install
npm install

# Environment
cp .env.example .env.local
# Add Supabase, API keys

# Run
npm run dev
# → http://localhost:3002
```

---

## API Endpoints

### Core
- `/api/auth/*` - Authentication
- `/api/dashboard/*` - Dashboard data
- `/api/ecosystem/*` - Ecosystem data

### Content
- `/api/knowledge/*` - Knowledge base
- `/api/media/*` - Media operations
- `/api/projects/*` - Project management
- `/api/enrichment-review/*` - Content enrichment

### Integrations
- `/api/notifications/*` - Notifications
- `/api/registry/*` - Service registry
- `/api/webhooks/*` - External integrations

---

## Authority Check

| Question | Answer |
|----------|--------|
| **Who holds authority?** | ACT Foundation board |
| **How do we know?** | Organizational governance |
| **Consent in place?** | Standard policies |
| **Handover plan?** | Open source, comprehensive documentation |

---

*See also: [Ecosystem Overview](../overview.md) | [Infrastructure](../../05-operations/infrastructure.md)*
