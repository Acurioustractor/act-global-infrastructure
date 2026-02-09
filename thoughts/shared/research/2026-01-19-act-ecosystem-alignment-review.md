---
date: 2026-01-19T08:54:22Z
researcher: Claude Code
git_commit: b7ebe0db31ee4d7bda9bd420fa65dc259109c181
branch: main
repository: act-global-infrastructure
topic: "ACT Ecosystem - 7 Codebase Strategic Alignment Review"
tags: [research, codebase, alignment, ecosystem, architecture]
status: complete
last_updated: 2026-01-19
last_updated_by: Claude Code
---

# Research: ACT Ecosystem Strategic Alignment Review

**Date**: 2026-01-19T08:54:22Z
**Researcher**: Claude Code
**Git Commit**: b7ebe0db31ee4d7bda9bd420fa65dc259109c181
**Branch**: main
**Repository**: act-global-infrastructure

## Research Question

Review all 7 ACT ecosystem codebases to document current state and identify strategic alignment opportunities.

## Summary

The ACT ecosystem consists of **7 active codebases** with varying tech stacks, maturity levels, and purposes. The **ACT Intelligence Platform** serves as the central integration hub, while each project serves a distinct community or operational purpose.

### Ecosystem Overview

| Codebase | Tech Stack | Database | Purpose | Maturity |
|----------|------------|----------|---------|----------|
| ACT Regenerative Studio | Next.js 15, React 19 | Supabase | Operations hub, dashboard | High |
| Empathy Ledger | Next.js 14, React 18 | Supabase (207 tables) | Ethical storytelling | Production v2.0 |
| JusticeHub | Next.js (Auth0) | Supabase (476 tables) | Youth justice | High |
| The Harvest | React 19, Vite, tRPC | Drizzle/PostgreSQL | Community hub | Medium |
| Goods Asset Register | Static HTML/JS | Supabase (5 tables) | Asset tracking | Production |
| ACT Farm | Next.js 16, React 19 | Redis only | Marketing site | Medium |
| Intelligence Platform | React 19, Vite, Express | Dual Supabase | Central brain | High |

---

## Detailed Findings

### 1. ACT Regenerative Studio (Hub)
**Path**: `/Users/benknight/Code/act-regenerative-studio`

- **Tech**: Next.js 15, React 19, TypeScript, Tailwind
- **Database**: Supabase `tednluwflfhxyucgwigh.supabase.co`
- **Purpose**: Multi-project orchestrator, operations hub, dashboard
- **Key Features**:
  - Multi-provider AI orchestration (Claude, GPT-4, Perplexity, Ollama)
  - Living Wiki with automated knowledge extraction
  - ALMA impact measurement framework
  - "Ask ACT" AI assistant
  - Content registry aggregating multiple sources
- **Integrations**: Notion, GHL, Gmail, Webflow, Resend, GitHub
- **Auth**: Supabase Auth with role-based access

### 2. Empathy Ledger (Storytelling)
**Path**: `/Users/benknight/Code/empathy-ledger-v2`

- **Tech**: Next.js 14, React 18, TypeScript 5, Tailwind
- **Database**: Supabase (207 tables, 364 RLS policies, 296 functions)
- **Purpose**: Ethical Indigenous storytelling with OCAP principles
- **Key Features**:
  - Story preservation and cultural wisdom sharing
  - Multi-tenant organization support
  - Elder review workflows
  - Sacred content protection
  - SROI analytics
- **Scale**: v2.0.0 launched January 5, 2026
- **Auth**: Supabase Auth with roles (owner/admin/member/elder/viewer)

### 3. JusticeHub (Youth Justice)
**Path**: `/Users/benknight/Code/JusticeHub`

- **Tech**: Next.js, TypeScript, Tailwind
- **Database**: Supabase (476 tables, 87+ migrations)
- **Purpose**: Youth justice transformation platform
- **Key Features**:
  - ALMA intelligence system (73 tables)
  - Centre of Excellence network
  - Empathy Ledger integration
  - Cultural protocols (OCAP)
- **Auth**: Auth0 primary, Supabase Auth secondary
- **Integrations**: 15+ services (Anthropic, OpenAI, Firecrawl, Notion, Stripe)

### 4. The Harvest Website (Community Hub)
**Path**: `/Users/benknight/Code/The Harvest Website`

- **Tech**: React 19, Vite, Wouter, tRPC, Drizzle ORM
- **Database**: PostgreSQL via Drizzle (6 tables)
- **Purpose**: Community hub and CSA programs
- **Key Features**:
  - Events calendar
  - Local business directory
  - Community stories with AI enhancement
  - Wiki content-as-code system
  - Workshop bookings
- **Auth**: Supabase OAuth
- **Integrations**: Empathy Ledger Content Hub, GHL, AWS S3

### 5. Goods Asset Register (Circular Economy)
**Path**: `/Users/benknight/Code/Goods Asset Register`

- **Tech**: Static HTML/CSS/JavaScript (no framework)
- **Database**: Supabase (5 tables)
- **Purpose**: Real-time asset tracking for 389 assets across 8 communities
- **Key Features**:
  - QR code tracking (beds, washing machines)
  - Mobile check-in system
  - Automated alerts
  - CLI tool for management
- **Deployment**: Netlify (not Vercel)
- **Auth**: Supabase Auth (email/phone OTP)

### 6. ACT Farm (Marketing)
**Path**: `/Users/benknight/Code/act-farm`

- **Tech**: Next.js 16, React 19, TypeScript 5, Tailwind 4
- **Database**: Redis caching only (no Supabase tables active)
- **Purpose**: Marketing site for Black Cockatoo Valley estate
- **Key Features**:
  - Conservation R&D residencies
  - June's Patch healthcare program
  - Interactive drone photo map
  - Claude AI chatbot
- **Auth**: None (marketing site)
- **Integrations**: GHL, Claude AI, Redis

### 7. ACT Intelligence Platform (Central Brain)
**Path**: `/Users/benknight/Code/act-intelligence-platform`

- **Tech**: React 19, Vite, Express 5 (JavaScript ES Modules)
- **Database**: Dual Supabase (14,804 contacts + 8,289 emails)
- **Purpose**: Central intelligence layer connecting ALL codebases
- **Key Features**:
  - Data aggregation from 6+ sources
  - 14,804+ enriched contacts
  - Unified APIs for other ACT apps
  - 93 service files
  - 148 environment variables
- **Integrations**: Notion (9 databases), Gmail (4 accounts), Calendar, LinkedIn, Xero, GHL, Exa.ai
- **Auth**: API key-based for inter-service communication

---

## Alignment Findings

### Current State - What's Aligned

| Aspect | Status | Details |
|--------|--------|---------|
| **Supabase** | Mostly aligned | 6/7 use Supabase (Harvest uses Drizzle) |
| **React** | Aligned | All use React 18 or 19 |
| **Tailwind** | Aligned | All use Tailwind CSS |
| **TypeScript** | Mostly aligned | 6/7 use TypeScript (Intelligence Platform uses JS) |
| **Vercel** | Mostly aligned | 6/7 on Vercel (Goods on Netlify) |
| **GHL Integration** | Partial | 4/7 integrate with GoHighLevel |
| **AI Integration** | Partial | 5/7 have AI features (Claude/OpenAI) |

### Current State - What's Not Aligned

| Aspect | Variation | Impact |
|--------|-----------|--------|
| **Next.js Versions** | 14, 15, 16 | Inconsistent patterns |
| **Auth Approach** | Supabase Auth vs Auth0 | JusticeHub uses Auth0, others use Supabase |
| **API Patterns** | REST vs tRPC vs direct | No unified API approach |
| **Backend** | Next.js API vs Express vs none | Inconsistent server patterns |
| **Build Tool** | Next.js vs Vite vs static | Different build pipelines |
| **ORM** | Supabase JS vs Drizzle | Different database access patterns |
| **State Management** | Zustand vs SWR vs TanStack Query | Different state patterns |

---

## Architecture Documentation

### Hub-and-Spoke Model

```
                    ┌─────────────────────────────┐
                    │   ACT Intelligence Platform │
                    │   (Central Brain)           │
                    │   - 14,804 contacts         │
                    │   - Notion sync             │
                    │   - Gmail aggregation       │
                    │   - Unified APIs            │
                    └─────────────┬───────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌───────────────┐
│ ACT Studio    │       │ Empathy Ledger  │       │ JusticeHub    │
│ (Operations)  │◄─────►│ (Storytelling)  │◄─────►│ (Youth)       │
└───────────────┘       └─────────────────┘       └───────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌───────────────┐
│ ACT Farm      │       │ The Harvest     │       │ Goods         │
│ (Marketing)   │       │ (Community)     │       │ (Assets)      │
└───────────────┘       └─────────────────┘       └───────────────┘
```

### Database Relationships

```
Intelligence Platform DB
├── contacts (14,804) ─────► Notion sync
├── emails (8,289) ─────────► Gmail sync
└── API endpoints ──────────► All other apps

Empathy Ledger DB (207 tables)
├── stories ───────────────► Shared with JusticeHub, Harvest
├── organizations ─────────► Multi-tenant
└── cultural_protocols ────► OCAP compliance

JusticeHub DB (476 tables)
├── alma_* (73 tables) ────► ALMA intelligence
├── coe_* ─────────────────► Centre of Excellence
└── empathy_* ─────────────► Embedded Empathy Ledger

Goods DB (5 tables)
├── assets (389) ──────────► QR tracking
├── checkins ──────────────► Field visits
└── alerts ────────────────► Automated notifications
```

---

## Alignment Opportunities

### High Priority

1. **Unified Auth Strategy**
   - Current: Mix of Supabase Auth and Auth0
   - Opportunity: Standardize on Supabase Auth across all apps
   - Impact: Single sign-on, shared user profiles

2. **Shared Component Library**
   - Current: Each app has its own components
   - Opportunity: Extract shared components to `packages/act-ui`
   - Candidates: Footer, Navigation, Card patterns, Form components

3. **API Standardization**
   - Current: Each app has different API patterns
   - Opportunity: All apps consume Intelligence Platform APIs
   - Impact: Single source of truth for contacts, projects, stories

4. **TypeScript Alignment**
   - Current: Intelligence Platform uses JavaScript ES Modules
   - Opportunity: Migrate to TypeScript for consistency

### Medium Priority

5. **Build Tool Alignment**
   - Current: Next.js vs Vite vs static
   - Opportunity: Consider Vite for faster builds where Next.js SSR isn't needed

6. **State Management Standardization**
   - Current: Zustand, SWR, TanStack Query
   - Opportunity: Standardize on TanStack Query for data fetching

7. **Monorepo Consideration**
   - Current: 7 separate repositories
   - Opportunity: Monorepo with shared packages (turborepo/nx)
   - Note: May not be practical given team size

### Lower Priority

8. **Design System Unification**
   - Current: Each app has own Tailwind config
   - Opportunity: Shared Tailwind preset with ACT brand tokens

9. **CI/CD Alignment**
   - Current: No unified CI/CD
   - Opportunity: GitHub Actions templates for all repos

---

## Code References

### Key Integration Points

- Intelligence Platform API: `/Users/benknight/Code/act-intelligence-platform/server/routes/api/v1/`
- Empathy Ledger Content Hub: `/Users/benknight/Code/empathy-ledger-v2/src/app/api/`
- ClawdBot Integration: `/Users/benknight/Code/act-global-infrastructure/clawdbot-docker/scripts/intelligence-api.mjs`
- Studio Dashboard: `/Users/benknight/Code/act-regenerative-studio/src/app/`

### Shared Patterns Found

- **Supabase Client Pattern**: Similar in all Supabase-using apps
- **Environment Variables**: SUPABASE_URL, SUPABASE_ANON_KEY standard across all
- **Tailwind Config**: Similar structure, different brand values
- **API Route Structure**: `/api/v1/*` pattern emerging

---

## Open Questions

1. **Auth Strategy**: Should JusticeHub migrate from Auth0 to Supabase Auth?
2. **Monorepo**: Is a monorepo practical for a small team?
3. **Intelligence Platform**: Should it be TypeScript?
4. **The Harvest**: Should it migrate from Drizzle to Supabase?
5. **Component Library**: What's the minimum viable shared component set?
6. **API Gateway**: Should Intelligence Platform be the single API gateway?

---

## Next Steps

1. **Create packages/act-ui** - Shared React component library
2. **Standardize env vars** - Create shared .env template
3. **Document API contracts** - Define Intelligence Platform API spec
4. **Auth audit** - Document current auth flows in each app
5. **Create alignment roadmap** - Prioritize unification work

---

## Related Files

- `/Users/benknight/Code/act-global-infrastructure/config/CODEBASES.md` - Codebase registry
- `/Users/benknight/Code/act-global-infrastructure/config/act-core-repos.json` - Repo config
- `/Users/benknight/Code/act-global-infrastructure/clawdbot-docker/` - ClawdBot integration
