---
title: "Empathy Ledger"
slug: "empathy-ledger"
website_path: /projects/empathy-ledger
excerpt: "Consent-first storytelling platform for community voice"
category: "core-platform"
status: "active"
last_updated: "2026-01-26"
shareability: "PUBLIC"

# Infrastructure
infrastructure:
  local_path: "/Users/benknight/Code/empathy-ledger-v2"
  github_repo: "act-now-coalition/empathy-ledger-v2"
  deployed_url: "https://empathyledger.com"
  alt_urls:
    - "https://empathy-ledger-v2.vercel.app"
  tech_stack:
    framework: "Next.js 14.2.32"
    language: "TypeScript"
    runtime: "React 18.3.1"
    database: "Supabase (PostgreSQL + pgvector)"
    hosting: "Vercel"
  supabase_project: "yvnuayzslukamizrlhwb"

# Data Connections
data_connections:
  supabase_tables: 207
  rls_policies: 364
  functions: 296
  key_tables:
    - profiles
    - storytellers
    - stories
    - media_assets
    - consent_records
    - elder_reviews
    - organizations
    - content_hub_posts

# GHL Integration
ghl_integration:
  pipeline: "Storytellers"
  tags: ["storytelling", "empathy", "elder", "indigenous"]
  contact_field: "is_storyteller"

# Xero Integration
xero_integration:
  tracking_category: "EL"
  project_codes: ["EL-CORE", "EL-CONTENT"]

# Health Monitoring
health:
  status: "critical"
  health_score: 47
  last_check: "2026-01-24"
  response_time_ms: 206

# Linked Vignettes
linked_vignettes:
  - 01-building-empathy-ledger
  - 02-orange-sky-origins
  - 03-storytelling-data-sovereignty
  - 04-elders-speak
  - peggy-palm-island
  - brodie-germaine-journey
  - m-homelessness-to-independent
---

# Empathy Ledger

**Consent-centred, community-controlled storytelling. The core impact tool across the ACT ecosystem.**

---

## Philosophy Alignment

Empathy Ledger embodies these ACT principles:

| Principle | How Empathy Ledger Embodies It |
|-----------|-------------------------------|
| **Evidence is Story, Not Surveillance** | Stories as primary evidence with ALMA lens |
| **Community Authority Comes First** | OCAP enforced in code — communities own their data |
| **Share with Care** | Consent scope on every record, Elder review where required |
| **Build for Handover** | Full data export, platform designed for forking |

---

## LCAA in Practice

| Phase | Empathy Ledger Application |
|-------|---------------------------|
| **Listen** | Creating conditions for authentic storytelling |
| **Curiosity** | Learning what consent-first infrastructure looks like |
| **Action** | Building platform with 5-tier permissions, Elder review |
| **Art** | Community stories becoming cultural memory and evidence |

---

## 2026 Focus

From the ACT Compendium:

1. **Strengthen consent workflows** — Ongoing consent renewal, Elder review pathways
2. **Keep OCAP enforcement non-negotiable** — In code and in practice
3. **Improve story stewardship** — Community-led publishing and review
4. **Core impact tool** — Embed Empathy Ledger as common impact layer across all projects

---

## Linked Stories

| Story | Consent | Link |
|-------|---------|------|
| Building Empathy Ledger | INTERNAL ONLY | [View](/wiki/stories/building-empathy-ledger) |
| Storytelling, Data Sovereignty | EXTERNAL-LITE | [View](/wiki/stories/storytelling-data-sovereignty) |
| Origin of A Curious Tractor | EXTERNAL-LITE | [View](/wiki/stories/origin-curious-tractor) |
| Peggy Palm Island | EXTERNAL-LITE | [View](/wiki/stories/peggy-palm-island) |
| Uncle Alan Palm Island | EXTERNAL-LITE | [View](/wiki/stories/uncle-alan-palm-island) |

---

## Quick Links

| Resource | Link |
|----------|------|
| **Live Site** | [empathyledger.com](https://empathyledger.com) |
| **GitHub** | [empathy-ledger-v2](https://github.com/act-now-coalition/empathy-ledger-v2) |
| **Supabase** | [Dashboard](https://supabase.com/dashboard/project/yvnuayzslukamizrlhwb) |
| **Vercel** | [Deployment](https://vercel.com/act-now-coalition/empathy-ledger-v2) |

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│ EMPATHY LEDGER v2                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Vercel)          Database (Supabase)             │
│  ┌───────────────┐          ┌──────────────────────┐       │
│  │ Next.js 14    │          │ PostgreSQL + pgvector│       │
│  │ React 18      │◄────────►│ 207 tables           │       │
│  │ TypeScript    │          │ 364 RLS policies     │       │
│  │ TipTap Editor │          │ 296 functions        │       │
│  └───────────────┘          └──────────────────────┘       │
│                                                             │
│  External Integrations                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Claude  │  │ GHL CRM │  │ Inngest │  │ Mapbox  │       │
│  │ AI      │  │ Sync    │  │ Jobs    │  │ Maps    │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### Database (Supabase)

| Metric | Value |
|--------|-------|
| Tables | 207 |
| RLS Policies | 364 |
| Functions | 296 |
| Vector Search | pgvector enabled |

**Key Tables:**
- `profiles` - User accounts
- `storytellers` - Storyteller profiles with consent
- `stories` - Story content with cultural permissions
- `media_assets` - Photos, videos, audio
- `consent_records` - Granular consent tracking
- `elder_reviews` - Cultural safety approvals
- `organizations` - Multi-tenant orgs
- `content_hub_posts` - Syndicated content

### GHL (Contacts)

| Field | Value |
|-------|-------|
| Pipeline | Storytellers |
| Tags | storytelling, empathy, elder, indigenous |
| Sync | `ghl_contact_sync` table |

### Xero (Finance)

| Tracking | Code |
|----------|------|
| Category | EL |
| Projects | EL-CORE, EL-CONTENT |

---

## Key Features

### Cultural Safety (OCAP Compliant)
- **5-tier permission levels**: sacred → restricted → community_only → educational → public
- **Elder Review Workflow**: Sacred content requires Elder approval
- **Ongoing Consent**: 6-12 month renewal cycles
- **AI Opt-In Only**: No analysis without explicit consent

### Storytelling
- Rich text editor (TipTap)
- Video/audio transcription
- Photo galleries
- Cultural tagging
- Consent management per story

### Content Hub
- Syndication to external sites (The Harvest blog)
- API for content aggregation
- Featured content curation

---

## Health Status

| Check | Status |
|-------|--------|
| Site Reachable | ⚠️ Critical |
| Health Score | 47/100 |
| Response Time | 206ms |
| Last Check | 2026-01-24 |

**Actions Needed:**
- [ ] Investigate site status
- [ ] Check SSL certificate
- [ ] Verify Supabase connection

---

## Linked Stories

These vignettes connect to Empathy Ledger:

1. **Building Empathy Ledger** - Platform origin story
2. **Orange Sky Origins** - Listening methodology
3. **Storytelling, Data Sovereignty** - Palm Island voices
4. **Elders Speak** - Consultation protocols

[View all 21 linked vignettes →](../../04-story/vignettes/)

---

## Contacts

Query GHL for contacts tagged with:
- `storytelling`
- `empathy`
- `elder`
- `indigenous`

**Dashboard:** `/people?tag=storytelling`

---

## Development

```bash
# Clone
git clone git@github.com:act-now-coalition/empathy-ledger-v2.git
cd empathy-ledger-v2

# Install
npm install

# Environment
cp .env.example .env.local
# Add Supabase keys

# Run
npm run dev
# → http://localhost:3001
```

---

## Authority Check

| Question | Answer |
|----------|--------|
| **Who holds authority?** | Each storyteller owns their story. ACT stewards the platform. |
| **How do we know?** | Consent captured per recording. Revocable anytime. |
| **Consent in place?** | Granular: internal, partners, public, media, research |
| **Handover plan?** | Communities can export stories. Platform designed for obsolescence. |

---

*See also: [Ecosystem Overview](../overview.md) | [ALMA Model](../../04-story/alma-model.md)*
