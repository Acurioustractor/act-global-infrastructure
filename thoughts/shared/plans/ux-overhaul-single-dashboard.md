# UX Overhaul: Single Dashboard

**Status:** Plan
**Created:** 2026-01-30
**Context:** Founder says system is "clunky, needs to be slick." Two separate dashboards confuse the daily workflow.

## Problem

Currently there are **3 UI surfaces**:

| Surface | Location | Port | Status |
|---------|----------|------|--------|
| Legacy HTML dashboards | `packages/act-dashboard/*.html` | 3456 | Legacy — DO NOT EXTEND |
| Command Center v2 | `apps/command-center-v2/` (Next.js) | 3001 | Active development |
| Intelligence Platform | `act-intelligence-platform/` (React) | 3999 | Separate repo |

The founder's daily workflow requires switching between ports, remembering which dashboard has what, and dealing with inconsistent UI patterns.

## Target State

**One dashboard at `localhost:3001`** (Command Center v2) that absorbs all Intelligence Platform features.

### What Command Center v2 Already Has (16 pages)

- `/today` — Daily briefing (KEEP — this becomes the home page)
- `/people` — Contact list + detail pages
- `/people/[id]` — Individual contact
- `/projects` — Project list
- `/projects/[code]` — Project detail
- `/pipeline` — GHL pipeline view
- `/finance` — Financial overview
- `/finance/subscriptions` — Subscription management
- `/finance/receipts` — Receipt matching
- `/finance/business` — Business dashboard
- `/finance/reports` — Financial reports
- `/reports` — General reports
- `/compendium` — Knowledge compendium
- `/knowledge` — Knowledge base + graph + meetings + actions + decisions
- `/wiki` — Wiki pages
- `/ecosystem` — Ecosystem overview
- `/system` — System health
- `/goals` — Goals tracking

### What Intelligence Platform Has (to migrate)

From the 80+ components in `act-intelligence-platform`:

| Feature | IP Component | CC v2 Equivalent | Action |
|---------|-------------|-------------------|--------|
| Agent Approvals | `AgentApprovals.tsx` | None | **MIGRATE** |
| Morning Brief | `MorningBrief.tsx` | `/today` page | **MERGE** — enrich /today |
| Contacts/CRM | `Contacts.tsx`, `EnhancedCRM.tsx`, `WorldClassCRM.tsx` | `/people` | Already covered |
| Communications | `CommunicationsLog.tsx` | `/people/[id]` | Already covered |
| Projects | `Projects.tsx`, `ProjectDetail.tsx` | `/projects` | Already covered |
| Opportunities | `Opportunities.tsx`, `OpportunitiesTab.tsx` | None | **MIGRATE** to `/pipeline` |
| Financial | `MoneyFlowDashboard.tsx`, `RealCashFlow.tsx` | `/finance` | Already covered |
| Business Agent | `AIBusinessAgent.tsx`, `BusinessAutopilot.tsx` | None | **MIGRATE** |
| Infrastructure | `InfrastructureDataCollector.tsx` | `/system` | Already covered |
| Storytelling | `StoryManagement.tsx` | None | **MIGRATE** to `/compendium` |
| Impact/ALMA | `ImpactFlow.tsx`, `CommunityLaborValueCard.tsx` | None | **MIGRATE** |
| Outreach | `OutreachTasks.tsx` | None | **MIGRATE** to `/people` |
| Community Network | `CommunityNetwork.tsx` | None | **MIGRATE** |

### Key Migrations (6 features)

1. **Agent Approvals** → `/system` page (add approvals panel)
2. **Morning Brief enrichment** → `/today` page (merge IP morning brief data)
3. **Opportunities** → `/pipeline` page (add opportunities sidebar)
4. **AI Business Agent** → `/` or `/agent` (new conversational interface)
5. **Impact/ALMA scoring** → `/projects/[code]` (add impact tab)
6. **Story Management** → `/compendium` (add stories section)

## Migration Strategy

### Phase 1: Feature Parity (no new features)
- Copy the 6 key components from IP into CC v2
- Adapt to use CC v2's API routes (not legacy api-server.mjs)
- Each migrated feature gets its own route or is added to existing page

### Phase 2: UX Polish
- Consistent design system (shadcn/ui already in CC v2)
- Unified navigation sidebar
- `/today` as default landing page with morning brief + agent approvals + alerts
- Dark mode support
- Mobile responsive

### Phase 3: Retire Intelligence Platform
- Update all docs/handoffs to reference CC v2 only
- Archive act-intelligence-platform repo
- Remove legacy `packages/act-dashboard/` HTML files
- Single `./dev start` launches one dashboard

## Navigation Structure

```
/today              — Morning brief, agent approvals, alerts (HOME)
/people             — Contacts, relationships, outreach tasks
/people/[id]        — Contact detail + communications + stories
/projects           — All projects with health scores
/projects/[code]    — Project detail + ALMA impact + stories
/pipeline           — GHL pipelines + opportunities
/finance            — Overview
  /subscriptions    — Subscription management
  /receipts         — Receipt matching
  /reports          — Financial reports
  /business         — Business dashboard
/knowledge          — Knowledge graph, episodes, meetings
  /meetings         — Meeting notes
  /actions          — Action items
  /decisions        — Decision log
  /graph            — Knowledge graph visualization
/compendium         — Project compendium + stories
/ecosystem          — Ecosystem overview + community network
/system             — Infrastructure health + agent management
/goals              — Goals tracking
/wiki               — Wiki pages
```

## API Consolidation

Currently CC v2 calls both:
- Its own API routes (`/api/...`)
- Legacy api-server.mjs on port 3456

Target: All data comes through CC v2's own `/api/` routes. Migrate any legacy endpoints that CC v2 depends on.

## Design Principles

1. **Daily ritual first** — `/today` is the 30-second morning check
2. **Progressive disclosure** — Summary → Detail → Action
3. **Agent-aware** — Pending approvals always visible in sidebar
4. **Relationship-centric** — People are first-class, not just contacts
5. **No dead pages** — Every page has live data or gets removed

## Depends On

- Mono-repo consolidation (if IP moves into this repo, migration is simpler)
- Real-time integration layer (for live data on dashboards)
