---
title: "The Harvest"
slug: "the-harvest"
website_path: /projects/the-harvest
excerpt: "Community hub for CSA programs and seasonal gatherings on Jinibara Country"
category: "core-platform"
status: "active"
last_updated: "2026-01-26"
shareability: "PUBLIC"

# Infrastructure
infrastructure:
  local_path: "/Users/benknight/Code/The Harvest Website"
  github_repo: "act-now-coalition/theharvest"
  deployed_url: "https://theharvestwitta.com.au"
  alt_urls:
    - "https://harvest.act.place"
  tech_stack:
    framework: "Vite + React"
    language: "TypeScript"
    runtime: "React 19.2.1"
    backend: "tRPC + Express"
    database: "Drizzle ORM + Supabase"
    storage: "AWS S3"
    hosting: "Vercel (frontend)"
  supabase_project: "custom-instance"

# Data Connections
data_connections:
  key_tables:
    - app_users
    - events
    - businesses
  edge_functions:
    - app-user-sync
    - admin-events
    - admin-businesses
    - business-claim
    - newsletter-subscribe

# GHL Integration
ghl_integration:
  pipeline: "Harvest"
  tags: ["harvest", "witta", "csa", "events"]
  location_tracking: true

# Xero Integration
xero_integration:
  tracking_category: "HARVEST"
  project_codes: ["HARVEST-CSA", "HARVEST-VENUE", "HARVEST-EVENTS"]

# Health Monitoring
health:
  status: "healthy"
  last_check: "2026-01-26"

# Linked Vignettes
linked_vignettes: []

# ALMA Aggregate
alma_aggregate:
  avg_evidence: 0
  avg_authority: 0
  total_vignettes: 0

# Authority Check
authority:
  who_holds: "ACT + Witta Community"
  how_we_know: "Land stewardship on Jinibara Country, community participation agreements"
  consent_status: "In place"
  handover_plan: "Community commons model - shared governance in development"
---

# The Harvest

**Local enterprise hub for makers, markets, and community connection in Witta, Queensland.**

An old nursery in Witta, now a small enterprise hub. Not just a venue — it is belonging tested in markets, meals, and shared work.

---

## Philosophy Alignment

The Harvest embodies these ACT principles:

| Principle | How The Harvest Embodies It |
|-----------|----------------------------|
| **Identity Before Product** | The Harvest is belonging, not just a venue |
| **Enterprise Funds the Commons** | Revenue supports land care and community value |
| **Country Sets the Pace** | Activity scaled to land capacity and season |
| **Make with Lived Experience** | Maker pathways for local enterprise |

---

## LCAA in Practice

| Phase | Harvest Application |
|-------|---------------------|
| **Listen** | Community conversations about what Witta needs |
| **Curiosity** | Testing market formats, workshop models, venue use |
| **Action** | Regular markets, workshops, venue hire operating |
| **Art** | Seasonal gatherings, community storytelling, shared meals |

---

## 2026 Focus

From the ACT Compendium:

1. **Support micro-enterprise** — Maker pathways and local business support in Witta
2. **Build repeatable operations** — Workshops, markets, venue use patterns established
3. **Testing ground** — Use enterprise as testing ground for sustainable practice
4. **Community connection** — Build relationships through practical enterprise and shared learning

> Field note: The Harvest is not just a venue; it is belonging tested in markets, meals, and shared work.

---

## Quick Links

| Resource | Link |
|----------|------|
| **Live Site** | [theharvestwitta.com.au](https://theharvestwitta.com.au) |
| **GitHub** | [theharvest](https://github.com/act-now-coalition/theharvest) |
| **Vercel** | [Deployment](https://vercel.com/act-now-coalition/theharvest) |

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│ THE HARVEST                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Vercel)          Backend (Supabase)              │
│  ┌───────────────┐          ┌──────────────────────┐       │
│  │ Vite + React  │          │ Supabase + Drizzle   │       │
│  │ React 19      │◄────────►│ Edge Functions       │       │
│  │ TypeScript    │  tRPC    │ PostgreSQL           │       │
│  │ Wouter Router │          │ Realtime             │       │
│  └───────────────┘          └──────────────────────┘       │
│                                                             │
│  External Services                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ AWS S3  │  │ GHL CRM │  │ Empathy │  │ Stripe  │       │
│  │ Media   │  │ Contacts│  │ Ledger  │  │ Payments│       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** The Harvest uses Vite + tRPC, not Next.js. Unique architecture in the ecosystem.

---

## Data Sources

### Database (Supabase)

**Tables:**
- `app_users` - User management with RLS
- `events` - Event calendar
- `businesses` - Local business directory

**Edge Functions:**
- `app-user-sync` - User synchronization
- `admin-events` - Event CRUD
- `admin-businesses` - Business CRUD
- `business-claim` - Business ownership claims
- `newsletter-subscribe` - Newsletter signups

### GHL (Contacts)

| Field | Value |
|-------|-------|
| Pipeline | Harvest |
| Tags | harvest, witta, csa, events |
| Location | Witta/Maleny |

### Xero (Finance)

| Tracking | Code |
|----------|------|
| Category | HARVEST |
| Projects | HARVEST-CSA, HARVEST-VENUE, HARVEST-EVENTS |

### Content (Empathy Ledger)

Blog content is served from Empathy Ledger Content Hub:
- `/blog/[slug]` pulls from EL syndication API

---

## Health Status

| Check | Status |
|-------|--------|
| Site | ✅ Live |
| Domain | theharvestwitta.com.au |
| SSL | Valid |

---

## Key Features

### Public Pages
| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/visit` | Visitor info |
| `/whats-on` | Events calendar |
| `/venue-hire` | Venue booking |
| `/about` | About |

### Community
| Route | Purpose |
|-------|---------|
| `/journey` | Experience journey |
| `/explore` | Exploration hub |
| `/stories` | Community stories |
| `/witta` | Area info |
| `/enterprises` | Local businesses |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard |
| `/admin/photos` | Photo management |
| `/my-business` | Business owner portal |

---

## Programs

### CSA (Community Supported Agriculture)
- Seasonal produce shares
- Member subscriptions
- Local farmer partnerships

### Events
- Seasonal gatherings
- Workshops
- Community markets
- Venue hire

### Enterprise Hub
- Local business directory
- Maker pathways
- Business owner portal

---

## Impact Evidence (ALMA Signals)

| Signal | Notes |
|--------|-------|
| **Evidence Strength** | Operational data — events, market attendance, venue bookings |
| **Community Authority** | ACT + Witta community governance in development |
| **Harm Risk** | Low (positive enterprise) |
| **Implementation Capability** | Venue operational, programs running |
| **Option Value** | Model for community enterprise hub |
| **Community Value Return** | Local makers supported, community gathering space |

## Story Opportunities

**Priority storytelling:**
- Monthly dinner conversations
- Farm working bee reflections
- Market stallholder experiences
- Visiting partner impressions

---

## Development

```bash
# Clone
git clone git@github.com:act-now-coalition/theharvest.git
cd "The Harvest Website"

# Install (uses pnpm)
pnpm install

# Environment
cp .env.example .env.local
# Add Supabase, AWS, GHL keys

# Run
pnpm dev
# → http://localhost:3004
```

---

## Unique Architecture

| Tech | Choice | Why |
|------|--------|-----|
| Framework | Vite (not Next.js) | Lightweight |
| API | tRPC | Type-safe |
| ORM | Drizzle | Modern |
| Router | Wouter | Lightweight |
| Storage | AWS S3 | Presigned URLs |
| Theming | Seasonal system | Custom |

---

## The Land

The Harvest sits on **Jinibara Country** in the Sunshine Coast Hinterland.

The site includes:
- Pasture under regenerative grazing
- Food forest and orchard
- Native corridor restoration
- Water catchment systems
- Studio and gathering buildings

---

## Authority Check

| Question | Answer |
|----------|--------|
| **Who holds authority?** | ACT as steward, community governance board in development |
| **How do we know?** | Land title and partnership agreements |
| **Consent in place?** | Jinibara acknowledgment, community participation agreements |
| **Handover plan?** | Commons model with community land trust structure |

---

## Partners

| Partner | Role |
|---------|------|
| Jinibara People | Traditional Custodians |
| Local producers | Market and supply network |
| Goods. team | Product development |
| ACT Dinner community | Regular gathering participants |

---

*See also: [ACT Farm](../../02-place/act-farm.md) | [Black Cockatoo Valley](../../02-place/black-cockatoo-valley.md) | [Goods](./goods.md)*
