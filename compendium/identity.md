# ACT Infrastructure — Identity

> The operational backbone that powers ACT's ecosystem of community projects.

## Purpose

ACT Infrastructure is the tractor in "A Curious Tractor" — the power take-off that connects to every project in the ecosystem. It holds the Command Center dashboard, 110+ operational scripts, database migrations, finance automation, and the coordination layer that keeps everything running.

This is not a product. It is the invisible system that creates space for humans to be human. When it works well, nobody notices it. That's the goal.

## Philosophy Alignment

| Principle | How It Shows Up |
|-----------|----------------|
| **Tools should create space** | Command Center reduces admin. Scripts automate repetitive work. Dashboard surfaces what matters. |
| **Build for handover** | Everything documented. Scripts self-describing. Wiki explains the system. |
| **Evidence is story, not surveillance** | Data freshness monitoring, not people monitoring. System health, not individual tracking. |
| **Enterprise funds the commons** | Finance automation (Xero integration) ensures revenue flows correctly to community value. |
| **Share with care** | Shareability matrix respected in wiki. Internal/partner/public scopes throughout. |

## LCAA in Practice

| Stage | How It Manifests |
|-------|-----------------|
| **Listen** | Daily briefing script surfaces what needs attention. Data freshness monitor alerts on staleness. |
| **Curiosity** | Agent chat for natural-language queries. Knowledge pipeline for pattern discovery. |
| **Action** | 110+ scripts automate operations. PM2 cron scheduling. Finance sync. Communication tracking. |
| **Art** | The wiki itself — compendium content made navigable. Dashboard as a window into the living system. |

## What This Contains

### Apps
- **Command Center** (`apps/command-center/`) — Main dashboard, 23 pages, 96 API endpoints
- **Website** (`apps/website/`) — Public website

### Scripts (110+)
- Daily briefing, finance sync, knowledge pipeline
- Communication tracking, subscription discovery
- Data freshness monitoring, health checks

### Wiki System
- ACT philosophy pages (LCAA, ALMA, governance, principles)
- 28 story vignettes
- Project compendiums for all 6 core projects
- Appendices (glossary, roadmap, visual system)

### Database
- ~60 tables across 40 migrations
- Supabase with comprehensive RLS policies

## Technical Identity

| Element | Value |
|---------|-------|
| Structure | pnpm workspace monorepo |
| Dashboard | Next.js (port 3001) |
| Database | Supabase (PostgreSQL) |
| Cron | PM2 scheduling |
| Finance | Xero integration |
| CRM | GHL (GoHighLevel) |
| GitHub | [Acurioustractor/act-global-infrastructure](https://github.com/Acurioustractor/act-global-infrastructure) |
