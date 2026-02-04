---
title: "JusticeHub"
slug: "justicehub"
website_path: /projects/justicehub
excerpt: "Youth justice platform connecting system-impacted youth with support services"
category: "core-platform"
status: "active"
last_updated: "2026-01-26"
shareability: "PUBLIC"

# Infrastructure
infrastructure:
  local_path: "/Users/benknight/Code/JusticeHub"
  github_repo: "act-now-coalition/justicehub-platform"
  deployed_url: "https://justicehub.com.au"
  alt_urls:
    - "https://justicehub.act.place"
  tech_stack:
    framework: "Next.js 14.2.35"
    language: "TypeScript"
    runtime: "React 18"
    database: "Supabase (PostgreSQL + ChromaDB)"
    hosting: "Vercel"
    ai: "Claude, OpenAI, Groq"
  supabase_projects:
    - "main"
    - "yjsf"
    - "qjt"

# Data Connections
data_connections:
  key_tables:
    - empathy_ledger_core
    - story_workspaces
    - services
    - organizations
    - organization_links
    - art_innovation

# GHL Integration
ghl_integration:
  pipeline: "Justice"
  tags: ["youth-justice", "justicehub", "contained"]

# Xero Integration
xero_integration:
  tracking_category: "JH"
  project_codes: ["JH-CORE", "JH-CONTAINED"]

# Health Monitoring
health:
  status: "critical"
  health_score: 47
  last_check: "2026-01-24"
  response_time_ms: 141

# Linked Vignettes
linked_vignettes:
  - brodie-germaine-journey
  - brodie-germaine-system-change
  - youth-voice
  - proud-pita-pita-wayaka-man
  - a-guarded-to-self-advocate
  - m-homelessness-to-independent
  - educational-transformation
  - operation-luna
  - collective-impact

# ALMA Aggregate
alma_aggregate:
  avg_evidence: 4.6
  avg_authority: 4.4
  total_vignettes: 9

# Authority Check
authority:
  who_holds: "Community justice practitioners and advocates"
  how_we_know: "Partnership agreements with justice organisations, lived experience advisors"
  consent_status: "In place"
  handover_plan: "Open-source platform designed for community ownership"
---

# JusticeHub

**Justice infrastructure centred on community authority and local solutions. Leading Australia into the next generation of justice innovation.**

---

## Philosophy Alignment

JusticeHub embodies these ACT principles:

| Principle | How JusticeHub Embodies It |
|-----------|---------------------------|
| **Community Authority Comes First** | Justice solutions designed by those most impacted |
| **Evidence is Story, Not Surveillance** | Consented stories as primary evidence, not profiling |
| **Build for Handover** | Open-source platform designed for community ownership |
| **Make with Lived Experience** | Pathways for lived-experience leadership |

---

## LCAA in Practice

| Phase | JusticeHub Application |
|-------|----------------------|
| **Listen** | Hearing from communities about what justice means locally |
| **Curiosity** | Learning from Diagrama (Spain), Oonchiumpa, and community-led alternatives |
| **Action** | Building research platform, service directory, network visualization |
| **Art** | Contained installation — making the case for change through art |

---

## 2026 Focus

From the ACT Compendium:

1. **Deepen ALMA alignment** — Every insight respects cultural sovereignty, avoids profiling
2. **Lead justice innovation** — Position for Australian next-generation justice practice
3. **Support lived-experience pathways** — Real roles and leadership for those who carry truth
4. **Strengthen story-justice connection** — Use Empathy Ledger as evidence infrastructure

---

## Linked Stories

| Story | Consent | Link |
|-------|---------|------|
| Origin of A Curious Tractor | EXTERNAL-LITE | [View](/wiki/stories/origin-curious-tractor) |
| Uncle Dale's Vision for Youth Justice | EXTERNAL-LITE | [View](/wiki/stories/uncle-dale-healing-path) |
| Jesús Teruel — Diagrama | EXTERNAL-LITE | [View](/wiki/stories/jesus-teruel-diagrama) |
| Young People Murcia | EXTERNAL-LITE | [View](/wiki/stories/young-people-murcia) |
| Operation Luna Success | EXTERNAL-LITE | [View](/wiki/stories/operation-luna-success) |
| Educational Transformation: 72% | EXTERNAL-LITE | [View](/wiki/stories/educational-transformation) |

---

## Quick Links

| Resource | Link |
|----------|------|
| **Live Site** | [justicehub.com.au](https://justicehub.com.au) |
| **GitHub** | [justicehub-platform](https://github.com/act-now-coalition/justicehub-platform) |
| **Vercel** | [Deployment](https://vercel.com/act-now-coalition/justicehub) |

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│ JUSTICEHUB                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Vercel)          Databases (Supabase)            │
│  ┌───────────────┐          ┌──────────────────────┐       │
│  │ Next.js 14    │          │ Main DB              │       │
│  │ React 18      │◄────────►│ YJSF DB              │       │
│  │ TypeScript    │          │ QJT DB               │       │
│  │ TipTap/Novel  │          │ ChromaDB (vectors)   │       │
│  └───────────────┘          └──────────────────────┘       │
│                                                             │
│  AI Integration               External                      │
│  ┌─────────┐  ┌─────────┐   ┌─────────┐  ┌─────────┐      │
│  │ Claude  │  │ OpenAI  │   │Firecrawl│  │ Notion  │      │
│  │ Research│  │ GPT-4   │   │ Scraper │  │  API    │      │
│  └─────────┘  └─────────┘   └─────────┘  └─────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### Databases (Multiple Supabase)

| Instance | Purpose |
|----------|---------|
| Main | Core platform data |
| YJSF | Youth Justice Support Foundation |
| QJT | Queensland Justice Taskforce |

**Key Tables:**
- `empathy_ledger_core` - Story integration
- `story_workspaces` - Collaborative editing
- `services` - Support service directory
- `organizations` - Service providers
- `art_innovation` - Art programs (Contained)

### GHL (Contacts)

| Field | Value |
|-------|-------|
| Pipeline | Justice |
| Tags | youth-justice, justicehub, contained |

### Xero (Finance)

| Tracking | Code |
|----------|------|
| Category | JH |
| Projects | JH-CORE, JH-CONTAINED |

---

## Health Status

| Check | Status |
|-------|--------|
| Site Reachable | ⚠️ Critical |
| Health Score | 47/100 |
| Response Time | 141ms |
| Last Check | 2026-01-24 |

**Actions Needed:**
- [ ] Investigate site status
- [ ] Check deployment logs
- [ ] Verify database connections

---

## Key Features

### Research Platform
- **AI Research Chat** - Policy research assistant
- **Evidence Library** - Indexed research findings
- **Inquiry Database** - Youth justice inquiries
- **International Comparisons** - Global best practices
- **Recommendations Engine** - Policy recommendations

### Service Directory
- **Automated Discovery** - Firecrawl web scraping
- **Queensland Services** - Batch scraped database
- **Organization Profiles** - Service provider details
- **Network Visualization** - D3/Force Graph connections

### Key Routes

| Section | URL |
|---------|-----|
| Research Hub | `/youth-justice-report/*` |
| Intelligence | `/intelligence/*` |
| Services | `/services` |
| Programs | `/community-programs/*` |
| Contained | `/contained/*` |

---

## Linked Stories

These vignettes demonstrate what JusticeHub aims to amplify:

### 1. Brodie Germaine's Journey
> From housing commission kid to national advocate - transformation through connection.

### 2. Operation Luna Success
> 72% reduction in offending, 85% school return rate - community-led approaches work.

### 3. Youth Voice
> Young people speaking directly about what they need.

[View all 9 linked vignettes →](../../04-story/vignettes/)

---

## Impact Evidence (ALMA Signals)

| Signal | Score | Notes |
|--------|-------|-------|
| Evidence Strength | 4.6/5 | Quantitative outcomes documented |
| Community Authority | 4.4/5 | Indigenous-led programs |
| Implementation Capability | 4.0/5 | Multiple sites demonstrating replicability |
| Option Value | 4.7/5 | Highly scalable model |

---

## Special Programs

### Contained
Art installation and advocacy for youth justice reform.
- `/contained/launch-event`
- `/contained/register`
- `/contained/vip-dinner`

### Art Innovation
Programs connecting art with justice advocacy.

---

## Development

```bash
# Clone
git clone git@github.com:act-now-coalition/justicehub-platform.git
cd JusticeHub

# Install
npm install

# Environment
cp .env.example .env.local
# Add Supabase keys, API keys

# Run
npm run dev
# → http://localhost:3003
```

---

## Authority Check

| Question | Answer |
|----------|--------|
| **Who holds authority?** | Community justice practitioners, lived experience advisors |
| **How do we know?** | Partnership agreements with Oonchiumpa, Diagrama, MMEIC |
| **Consent in place?** | Case studies shared with explicit organisational consent |
| **Handover plan?** | Open-source platform, community governance structure in development |

---

## Partners

| Partner | Role |
|---------|------|
| Oonchiumpa | Youth justice evidence, NT partnerships |
| Diagrama | International therapeutic justice |
| MMEIC | Cultural authority |
| BG Fit | Mount Isa youth wellbeing |

---

*See also: [Empathy Ledger](./empathy-ledger.md) | [Contained](./contained.md) | [Oonchiumpa](./oonchiumpa.md)*
