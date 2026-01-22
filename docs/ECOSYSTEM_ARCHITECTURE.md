# ACT Ecosystem Architecture

## Overview

The ACT ecosystem consists of 7 codebases + 1 infrastructure repo, organized into tiers based on their primary function.

## Tier Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIER 1: PUBLIC HUB                                  │
│                                                                             │
│                      ┌─────────────────────────┐                           │
│                      │   ACT Regenerative      │                           │
│                      │       Studio            │                           │
│                      │   acurioustractor.com   │                           │
│                      │                         │                           │
│                      │   Main website, portal  │                           │
│                      │   Project showcase      │                           │
│                      └───────────┬─────────────┘                           │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                         TIER 2: PUBLIC PRODUCTS                             │
│                                  │                                          │
│    ┌─────────────┬───────────────┼───────────────┬─────────────┐           │
│    │             │               │               │             │           │
│    ▼             ▼               ▼               ▼             ▼           │
│ ┌────────┐  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐          │
│ │Empathy │  │Justice │    │  The   │    │  ACT   │    │ Goods  │          │
│ │Ledger  │  │  Hub   │    │Harvest │    │ Farm   │    │        │          │
│ │        │  │        │    │        │    │        │    │        │          │
│ │Story-  │  │Youth   │    │CSA &   │    │BCV     │    │Circular│          │
│ │telling │  │Justice │    │Events  │    │Estate  │    │Economy │          │
│ └────────┘  └────────┘    └────────┘    └────────┘    └────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                    TIER 3: SUPPORT INFRASTRUCTURE                           │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                │
│         │                        │                        │                │
│         ▼                        ▼                        ▼                │
│    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐            │
│    │ACT Placemat │       │   Goods     │       │   Global    │            │
│    │(Intelligence)       │  (Backend)  │       │Infrastructure            │
│    │             │       │             │       │             │            │
│    │• Dashboards │       │• Asset DB   │       │• 7 Skills   │            │
│    │• Analytics  │       │• Inventory  │       │• 110 Scripts│            │
│    │• AI Layer   │       │• CLI Tools  │       │• Ralph Agent│            │
│    │• Ecosystem  │       │• Delivery   │       │• Deployment │            │
│    │  Orchest.   │       │  Tracking   │       │             │            │
│    └─────────────┘       └─────────────┘       └─────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Project Details

### Tier 1: Public Hub

| Project | URL | Purpose |
|---------|-----|---------|
| **ACT Regenerative Studio** | acurioustractor.com | Main website, project showcase, partnership applications |

### Tier 2: Public Products

| Project | URL | Purpose | Audience |
|---------|-----|---------|----------|
| **Empathy Ledger** | empathyledger.com | Ethical storytelling platform | Storytellers, communities |
| **JusticeHub** | justicehub.org | Youth justice programs | Organizations, youth workers |
| **The Harvest** | theharvest.community | CSA programs, community events | Local community, CSA members |
| **ACT Farm** | farm.acurioustractor.com | BCV estate, regeneration | Visitors, residents, partners |
| **Goods** | goods.acurioustractor.com | Product catalog, orders | Community, customers |

### Tier 3: Support Infrastructure

| Project | Purpose | Users |
|---------|---------|-------|
| **ACT Placemat** | Intelligence layer, dashboards, ecosystem orchestration | Internal team, AI |
| **Goods (Backend)** | Asset tracking, inventory, delivery management | Internal operations |
| **Global Infrastructure** | Skills, scripts, automation, Ralph agent | Development, CI/CD |

## Dual-Purpose Projects

### Goods (Goods on Country)

Goods serves **both** public and internal functions:

```
┌─────────────────────────────────────────────────────────────┐
│                    GOODS ON COUNTRY                          │
├─────────────────────────────┬───────────────────────────────┤
│      PUBLIC STOREFRONT      │      INTERNAL OPERATIONS      │
├─────────────────────────────┼───────────────────────────────┤
│ • Product catalog           │ • Asset database (Supabase)   │
│ • Community orders          │ • Inventory management        │
│ • Delivery scheduling       │ • CLI tools for batch ops     │
│ • Support form              │ • Delivery tracking           │
│                             │ • Reporting & analytics       │
├─────────────────────────────┼───────────────────────────────┤
│ Stack: Static HTML (Netlify)│ Stack: Supabase, Node CLI     │
└─────────────────────────────┴───────────────────────────────┘
```

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Empathy    │────▶│  Content    │────▶│  ACT Studio │
│  Ledger     │     │  Hub API    │     │  (showcase) │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ ACT Placemat│
                    │ (aggregates)│
                    └─────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ Notion  │     │   GHL   │     │ Social  │
    │ (docs)  │     │  (CRM)  │     │ (posts) │
    └─────────┘     └─────────┘     └─────────┘
```

## Deployment Matrix

| Project | Platform | Domain |
|---------|----------|--------|
| ACT Studio | Vercel | acurioustractor.com |
| Empathy Ledger | Vercel | empathyledger.com |
| JusticeHub | Vercel | justicehub.org |
| The Harvest | Vercel | theharvest.community |
| ACT Farm | Vercel | farm.acurioustractor.com |
| Goods | **Netlify** | goods.acurioustractor.com |
| ACT Placemat | Vercel | placemat.acurioustractor.com |

## Technology Stack

### Shared Across Projects
- **Frontend**: Next.js (App Router), React 18
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Vercel (most), Netlify (Goods)

### Project-Specific
- **Empathy Ledger**: ALMA AI analysis, Content Hub API
- **Goods**: CLI tools, static HTML storefront
- **ACT Placemat**: Intelligence Layer, ecosystem dashboards

## Codebase Paths

See [CODEBASES.md](./CODEBASES.md) for authoritative paths.

---

**Last Updated**: 2026-01-17
