# Feature Plan: ACT Command Center V2

Created: 2026-01-26
Author: architect-agent

## Overview

A world-class dashboard for ACT (Art Craft Technology) that consolidates 21+ fragmented tabs into 5-6 essential views. Mobile-first, LCAA-aligned, designed for daily operations of a social enterprise founder. The system should embody ACT's core metaphor: "quiet systems create room for people to show up."

## Research Findings

### Current State (VERIFIED)
- **Current frontend**: 8+ HTML files (index.html, command-center.html, intelligence.html, infrastructure.html, projects.html, brain-center.html, goals-dashboard.html)
- **API server**: 272KB+ Express server on port 3456 with extensive endpoints
- **Navigation**: Fragmented across multiple pages with inconsistent UX
- **Mobile**: Not optimized, requires horizontal scrolling

### Available Data (VERIFIED from API endpoints)
| Endpoint | Data | Count |
|----------|------|-------|
| `/api/relationships/health` | Contacts with temperature scores | 867 |
| `/api/projects/notion` | Notion projects with LCAA tracking | 77 |
| `/api/goals` | 2026 Goals from Notion | 47 |
| `/api/agents/proposals` | AI agent proposals pending approval | 13+ |
| `/api/communications/recent` | Emails and comms | 8,500+ |
| `/api/frontends` | Vercel deployments | 20+ |
| `/api/infrastructure` | Claude Code layer (agents, hooks, MCPs) | varies |
| `/api/connectors` | External service connections | 15 |

### ACT Philosophy Requirements (VERIFIED from compendium)
- **PTO Metaphor**: System is the tractor, humans are farmers, community is harvest
- **LCAA Methodology**: Listen, Curiosity, Action, Art (loops back to Listen)
- **10 Principles**: Country Sets the Pace, Community Authority First, Tools Should Create Space
- **Make Space**: "The best systems are invisible. They create space for humans to be human."

---

## Requirements

### Functional
- [ ] Consolidate 21 tabs to 5-6 essential views
- [ ] Mobile-first responsive design (founder uses on phone daily)
- [ ] Real-time data updates (not stale syncs)
- [ ] Agent proposal approval/rejection workflow
- [ ] Quick actions for daily operations
- [ ] Relationship health visualization (hot/warm/cool)
- [ ] Goal tracking by LCAA stage
- [ ] Project health at a glance

### Non-Functional
- [ ] Load time < 2s on mobile
- [ ] Works offline for basic viewing
- [ ] Accessible (WCAG AA)
- [ ] ACT brand alignment (LCAA colors, regenerative feel)

---

## Design

### Information Architecture

```
                    ┌─────────────────────────────────────┐
                    │           ACT COMMAND CENTER         │
                    │   "Making space for what matters"    │
                    └─────────────────────────────────────┘
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        ▼             ▼               ▼               ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────┐
   │  TODAY  │  │  PEOPLE  │  │  PROJECTS  │  │  GOALS   │  │ SYSTEM  │
   │ (Home)  │  │(Relations)│  │  (Work)    │  │ (2026)   │  │(Internal)│
   └─────────┘  └──────────┘  └────────────┘  └──────────┘  └─────────┘
       │             │              │              │             │
       ▼             ▼              ▼              ▼             ▼
   - Agent Inbox  - Contacts     - By LCAA      - Yearly      - Agents
   - Calendar     - Hot/Warm     - Active       - Quarterly   - Infra
   - Urgent       - Cool/Overdue - Pipeline     - By Lane     - Connectors
   - Quick Stats  - By Project   - Finance      - Health      - Logs
```

### The 6 Core Views

| View | Purpose | Primary Data | Quick Actions |
|------|---------|--------------|---------------|
| **Today** | Morning dashboard, what needs attention | Proposals, calendar, urgent items | Approve/reject, reschedule |
| **People** | Relationship management | 867 contacts by temperature | Follow up, schedule, view comms |
| **Projects** | Active work tracking | 77 projects by LCAA stage | Add update, view timeline |
| **Goals** | 2026 strategic alignment | 47 goals with health scores | Mark progress, link projects |
| **Finance** | Budget and cash flow | Xero data, project budgets | Quick categorize, approve |
| **System** | Infrastructure health | Agents, connectors, logs | Run sync, view errors |

### Home Dashboard (Today View)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Good morning, Ben                              26 Jan 2026  [8:42am]│
│ "Country sets the pace"                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ AGENT INBOX                                           [3 pending]│ │
│ │ ─────────────────────────────────────────────────────────────── │ │
│ │ 🔥 Scout: Research funding options for PICC         [✓] [✗] [→] │ │
│ │ ⚡ Cultivator: Follow-up email for Sarah (14d cold) [✓] [✗] [→] │ │
│ │ 📊 Ledger: Categorize 5 unmatched transactions      [✓] [✗] [→] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│ │   RELATIONSHIPS │  │     PROJECTS    │  │      GOALS      │      │
│ │   ─────────────  │  │   ─────────────  │  │   ─────────────  │      │
│ │   🔴 Hot:   234 │  │   Listen:   12  │  │   On Track:  31 │      │
│ │   🟠 Warm:  412 │  │   Curious:   8  │  │   At Risk:    9 │      │
│ │   🔵 Cool:  221 │  │   Action:   43  │  │   Blocked:    7 │      │
│ │   ⚠️ Overdue: 47│  │   Art:      14  │  │                 │      │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ TODAY'S CALENDAR                                                 │ │
│ │ ─────────────────────────────────────────────────────────────── │ │
│ │ 10:00  PICC Elders Room planning call                           │ │
│ │ 14:00  JusticeHub quarterly review                              │ │
│ │ 16:30  Harvest site walk with Nic                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ QUICK CAPTURE                          [🎤 Voice] [📝 Note]     │ │
│ │ ┌─────────────────────────────────────────────────────────────┐ │ │
│ │ │ What's on your mind?                                        │ │ │
│ │ └─────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Navigation Design

**Mobile (Bottom Tab Bar):**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        [Content Area]                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│   🏠        👥        📁        🎯        ⚙️                        │
│  Today    People   Projects   Goals    System                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Desktop (Sidebar):**
```
┌───────┬────────────────────────────────────────────────────────────┐
│ ACT   │                                                            │
│       │                                                            │
│ Today │                       [Content]                            │
│ People│                                                            │
│Projects│                                                           │
│ Goals │                                                            │
│ System│                                                            │
│       │                                                            │
│ ──────│                                                            │
│ [?]   │                                                            │
│ [Ben] │                                                            │
└───────┴────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Component Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with nav
│   ├── page.tsx            # Redirects to /today
│   ├── today/
│   │   └── page.tsx        # Home dashboard
│   ├── people/
│   │   ├── page.tsx        # Contacts list
│   │   └── [id]/page.tsx   # Contact detail
│   ├── projects/
│   │   ├── page.tsx        # Projects by LCAA
│   │   └── [code]/page.tsx # Project detail
│   ├── goals/
│   │   └── page.tsx        # Goals dashboard
│   └── system/
│       └── page.tsx        # Infrastructure
├── components/
│   ├── ui/                 # Shadcn/ui components
│   ├── charts/             # Tremor chart wrappers
│   ├── layouts/
│   │   ├── nav-mobile.tsx
│   │   └── nav-desktop.tsx
│   ├── agent-inbox/
│   │   ├── proposal-card.tsx
│   │   └── proposal-actions.tsx
│   ├── relationship/
│   │   ├── health-gauge.tsx
│   │   └── contact-card.tsx
│   ├── project/
│   │   ├── lcaa-stage-badge.tsx
│   │   └── project-card.tsx
│   └── goal/
│       ├── goal-card.tsx
│       └── lane-column.tsx
├── hooks/
│   ├── use-proposals.ts    # TanStack Query + WS
│   ├── use-relationships.ts
│   ├── use-projects.ts
│   └── use-goals.ts
├── lib/
│   ├── api.ts              # API client
│   ├── supabase.ts         # Supabase client
│   └── realtime.ts         # WebSocket manager
├── stores/
│   └── app-store.ts        # Zustand store
└── styles/
    └── globals.css         # Tailwind + ACT tokens
```

### Data Flow

```
                    ┌─────────────────────────────────────────┐
                    │              Command Center              │
                    │           (Next.js 15 App Router)        │
                    └─────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
           │  TanStack     │    │   Zustand     │    │   Supabase    │
           │  Query        │    │   Store       │    │   Realtime    │
           │  (Fetching)   │    │   (UI State)  │    │   (Live)      │
           └───────────────┘    └───────────────┘    └───────────────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │          API Server (port 3456)          │
                    │           /api/* endpoints               │
                    └─────────────────────────────────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           ▼                             ▼                             ▼
   ┌───────────────┐            ┌───────────────┐            ┌───────────────┐
   │   Supabase    │            │    Notion     │            │     Xero      │
   │  (Primary DB) │            │   (Projects)  │            │   (Finance)   │
   └───────────────┘            └───────────────┘            └───────────────┘
```

### Real-Time Update Strategy

```typescript
// 1. Supabase Realtime for agent_proposals
const proposalSubscription = supabase
  .channel('proposals')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'agent_proposals'
  }, (payload) => {
    queryClient.invalidateQueries(['proposals'])
  })
  .subscribe()

// 2. TanStack Query with stale-while-revalidate
const { data: proposals } = useQuery({
  queryKey: ['proposals', 'pending'],
  queryFn: fetchPendingProposals,
  staleTime: 30_000,      // Fresh for 30s
  refetchInterval: 60_000, // Poll every 60s as backup
})

// 3. Optimistic updates for approve/reject
const approveMutation = useMutation({
  mutationFn: approveProposal,
  onMutate: async (proposalId) => {
    await queryClient.cancelQueries(['proposals'])
    const previous = queryClient.getQueryData(['proposals'])
    queryClient.setQueryData(['proposals'], (old) =>
      old.filter(p => p.id !== proposalId)
    )
    return { previous }
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(['proposals'], context.previous)
  },
})
```

---

## Visual Design Direction

### ACT Brand Colors (LCAA-Aligned)

```css
:root {
  /* LCAA Stage Colors */
  --listen: #4F46E5;    /* Indigo - deep, receptive */
  --curiosity: #7C3AED; /* Violet - exploratory */
  --action: #10B981;    /* Emerald - growth, making */
  --art: #F59E0B;       /* Amber - warmth, expression */

  /* Temperature (Relationships) */
  --temp-hot: #EF4444;   /* Red - active, engaged */
  --temp-warm: #F97316;  /* Orange - maintaining */
  --temp-cool: #3B82F6;  /* Blue - needs attention */

  /* Backgrounds (Dark Mode Default) */
  --bg-primary: #0A0A0F;
  --bg-secondary: #12121A;
  --bg-card: #1A1A24;
  --bg-elevated: #252532;

  /* Accents (Regenerative feel) */
  --accent-primary: #6366F1;   /* Indigo */
  --accent-success: #22C55E;   /* Green */
  --accent-warning: #EAB308;   /* Yellow */
  --accent-error: #EF4444;     /* Red */

  /* Text */
  --text-primary: #F4F4F5;
  --text-secondary: #A1A1AA;
  --text-muted: #71717A;
}
```

### Typography

```css
/* Primary: Inter (readability) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Mono: JetBrains Mono (data, code) */
font-family: 'JetBrains Mono', 'SF Mono', monospace;

/* Scale */
--text-xs: 0.75rem;   /* 12px - labels */
--text-sm: 0.875rem;  /* 14px - body small */
--text-base: 1rem;    /* 16px - body */
--text-lg: 1.125rem;  /* 18px - headings */
--text-xl: 1.25rem;   /* 20px - page titles */
--text-2xl: 1.5rem;   /* 24px - section headers */
```

### Component Styles

**Cards:**
```css
.card {
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.2s ease;
}
.card:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
}
```

**LCAA Stage Badges:**
```css
.badge-listen { background: rgba(79, 70, 229, 0.15); color: #818CF8; }
.badge-curiosity { background: rgba(124, 58, 237, 0.15); color: #A78BFA; }
.badge-action { background: rgba(16, 185, 129, 0.15); color: #34D399; }
.badge-art { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
```

**Temperature Indicators:**
```css
.temp-hot::before {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--temp-hot);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--temp-hot);
  animation: pulse 2s infinite;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Files to create:**
- `package.json` - Next.js 15, Shadcn, Tremor, Zustand, TanStack Query
- `tailwind.config.ts` - ACT design tokens
- `src/app/layout.tsx` - Root layout with navigation
- `src/lib/api.ts` - API client wrapper
- `src/lib/supabase.ts` - Supabase client

**Acceptance:**
- [ ] Next.js 15 app scaffolded
- [ ] Tailwind with ACT tokens
- [ ] Navigation shell working
- [ ] API client connecting to port 3456

**Estimated effort:** 2-3 days

### Phase 2: Today View (Week 1-2)
**Files to create:**
- `src/app/today/page.tsx` - Home dashboard
- `src/components/agent-inbox/*.tsx` - Proposal components
- `src/hooks/use-proposals.ts` - Data fetching

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Agent inbox with approve/reject
- [ ] Calendar events display
- [ ] Quick stats cards
- [ ] Voice/note capture button

**Estimated effort:** 3-4 days

### Phase 3: People View (Week 2)
**Files to create:**
- `src/app/people/page.tsx` - Contacts list
- `src/components/relationship/*.tsx` - Contact components
- `src/hooks/use-relationships.ts`

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Filter by temperature (hot/warm/cool)
- [ ] Contact cards with last contact
- [ ] Quick actions (follow up, schedule)
- [ ] Search and filter

**Estimated effort:** 3-4 days

### Phase 4: Projects & Goals (Week 2-3)
**Files to create:**
- `src/app/projects/page.tsx` - Projects by LCAA
- `src/app/goals/page.tsx` - Goals dashboard
- `src/components/project/*.tsx`
- `src/components/goal/*.tsx`

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Projects grouped by LCAA stage
- [ ] Goals in lane columns (A/B/C)
- [ ] Progress indicators
- [ ] Link projects to goals

**Estimated effort:** 4-5 days

### Phase 5: System View (Week 3)
**Files to create:**
- `src/app/system/page.tsx` - Infrastructure dashboard
- Agent status, connector health, logs

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Agent status display
- [ ] Connector health indicators
- [ ] Recent audit log
- [ ] Manual sync triggers

**Estimated effort:** 2-3 days

### Phase 6: Mobile Polish & PWA (Week 3-4)
**Files to modify:**
- Navigation components for mobile
- PWA manifest and service worker

**Acceptance:**
- [ ] Works well on mobile
- [ ] Install as PWA
- [ ] Offline basic viewing

**Estimated effort:** 2-3 days

---

## Dependencies

| Dependency | Type | Version | Reason |
|------------|------|---------|--------|
| Next.js | Framework | 15.x | App Router, RSC |
| React | Library | 19.x | UI |
| Tailwind CSS | Styling | 4.x | Utility-first CSS |
| Shadcn/ui | Components | latest | Chrome/UI components |
| Tremor | Charts | 3.x | Data visualization |
| Zustand | State | 5.x | Client state |
| TanStack Query | Data | 5.x | Server state |
| Supabase | Backend | 2.x | Realtime + DB |
| date-fns | Utility | 4.x | Date formatting |
| Lucide | Icons | latest | Icon set |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API rate limits | High | Medium | Implement caching, batch requests |
| Mobile performance | High | Medium | Use RSC, lazy load, optimize images |
| Real-time complexity | Medium | Medium | Fall back to polling if WS fails |
| Scope creep | High | High | Strict MVP, defer nice-to-haves |
| Offline support | Medium | Low | PWA with basic cache, defer full offline |

---

## Open Questions

- [ ] Should Finance be a full view or a section within Projects?
- [ ] Voice capture: use browser API or integrate with existing voice notes system?
- [ ] Do we need user authentication or is this single-user (Ben only)?
- [ ] Should the system support light mode or dark mode only?

---

## Success Criteria

1. **Consolidation**: 21 tabs reduced to 6 views
2. **Speed**: Load time < 2s on mobile 4G
3. **Daily use**: Ben uses it every morning for 2+ weeks
4. **Agent workflow**: Can approve/reject proposals in < 3 taps
5. **Relationship clarity**: Can identify who needs follow-up in < 10s
6. **Goal alignment**: Can see 2026 progress at a glance

---

## ACT Philosophy Alignment Checklist

| Principle | How This Design Embodies It |
|-----------|----------------------------|
| Country Sets the Pace | No aggressive push notifications, respects natural rhythms |
| Community Authority First | Agent proposals require human approval |
| Tools Should Create Space | Minimal UI, focus on what matters today |
| Build for Handover | Clean architecture, documented, could be maintained by others |
| Evidence is Story, Not Surveillance | No individual profiling, system-level signals |
| Art Returns Us to Listen | LCAA visualization loops back, not linear funnel |

---

*"The best systems are invisible. They create space for humans to be human."*
