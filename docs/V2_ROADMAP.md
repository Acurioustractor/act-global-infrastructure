# ACT Ecosystem V2 Roadmap

**Generated:** 2026-01-26
**Source:** Founder Interview
**Status:** Draft for Review

---

## Executive Summary

V2 focuses on three pillars:
1. **Unified Architecture** - Consolidate repos, rebuild integration layer
2. **Learning System** - System learns from mistakes, outcomes, outputs
3. **Slick UX** - Real-time data, intuitive interface, fewer dashboards

---

## Founder Interview Key Insights

### What's Working
- Ralph as central orchestrator
- Supabase/PostgreSQL foundation
- LCAA framework embedded in culture
- Relationship tracking concept (depth + recency + alignment)
- Weekly approval rhythm

### What Needs Fixing
- **Claude broke backend** - Need safeguards against AI overwrites
- **Clunky UX** - Design not quite right, needs polish
- **Data staleness** - Not real-time enough
- **Integration layer** - Rebuild priority #1
- **Multi-repo confusion** - Unclear why separate, may need merge

### V2 Priorities (Founder-Defined)
1. Rebuild integration layer
2. Add Email/Calendar AI extraction
3. Add social media monitoring (LinkedIn, Twitter)
4. Deeper Xero (bank feeds, real-time)
5. Project management integration (Asana/Linear)
6. ALMA measurement everywhere

---

## Architecture Decision: Mono-repo vs Multi-repo

### Current State
```
act-global-infrastructure/   (Backend, agents, scripts)
act-intelligence-platform/   (React dashboard)
act-regenerative-studio/     (Next.js public site)
```

### Analysis Required

| Factor | Mono-repo | Multi-repo |
|--------|-----------|------------|
| Deployment | Single deploy | Independent deploys |
| Team scale | Works for 1-3 devs | Better for larger teams |
| Code sharing | Easy | Requires packages |
| Claude Code safety | Single context | Isolated contexts |
| Complexity | Lower | Higher |

### Recommendation

**Merge into mono-repo** with clear boundaries:
```
act-ecosystem/
├── apps/
│   ├── command-center/    (Express API - port 3456)
│   ├── intelligence/      (React dashboard - port 3999)
│   └── studio/            (Next.js public - port 3000)
├── packages/
│   ├── shared/            (Types, utilities)
│   ├── supabase/          (Database client, migrations)
│   └── integrations/      (GHL, Xero, Notion, etc.)
├── agents/                (Agent definitions)
└── scripts/               (Automation, syncs)
```

**Rationale:**
- Founder is primary developer (team of 1)
- Shared Supabase already couples systems
- Claude Code context would be unified
- Easier to maintain consistency
- Deploy independently via workspace configs

---

## V2 Technical Priorities

### 1. Integration Layer Rebuild

**Current Problems:**
- Sync scripts scattered across directories
- No unified error handling
- Staleness detection manual
- No retry/backoff logic

**V2 Design:**
```typescript
// packages/integrations/core.ts
interface Integration {
  id: string;
  name: string;
  healthCheck(): Promise<HealthStatus>;
  sync(options: SyncOptions): Promise<SyncResult>;
  subscribe?(callback: EventCallback): Unsubscribe;
}

// Real-time where possible
const integrations = {
  xero: new XeroIntegration({ realtime: true }),
  ghl: new GHLIntegration({ webhooks: true }),
  notion: new NotionIntegration({ polling: '5m' }),
  gmail: new GmailIntegration({ pushNotifications: true }),
  calendar: new CalendarIntegration({ sync: true }),
};
```

### 2. Learning System

**Goal:** System learns from mistakes, outcomes, outputs

**Implementation:**
```
agents/
├── memory/
│   ├── outcomes.ts       # Track what worked/didn't
│   ├── corrections.ts    # Human corrections to agent outputs
│   └── patterns.ts       # Learned patterns
└── learning/
    ├── feedback-loop.ts  # Capture outcomes
    ├── improvement.ts    # Apply learnings
    └── safeguards.ts     # Prevent Claude overwrites
```

**Safeguards Against AI Overwrites:**
- Git hooks to block bulk file changes
- Approval required for backend modifications
- Staged rollouts with rollback
- Snapshot before any Claude Code session

### 3. Real-time Data

**Current:** Syncs run at 6 AM AEST (daily)
**V2 Goal:** Sub-minute freshness for critical data

| Data Type | Current | V2 Target |
|-----------|---------|-----------|
| GHL Contacts | Daily | Webhook (instant) |
| Xero Transactions | Daily | Bank feed (hourly) |
| Calendar | Daily | Push notification (instant) |
| Gmail | Manual | Push notification (instant) |
| Notion | Daily | Polling (5 min) |

### 4. UX Overhaul

**Current Issues:**
- Multiple dashboards (Command Center, Intelligence, Studio)
- Information scattered
- Design inconsistent

**V2 Vision:**
- Single entry point with role-based views
- Mobile-first responsive design
- Real-time updates via SSE/WebSocket
- Quick actions from any view
- Consistent design system

---

## Missing Integrations (V2 Scope)

### Email/Calendar AI (High Priority)
- Auto-extract action items from emails
- Identify relationship signals
- Schedule follow-ups automatically
- Knowledge extraction for Living Wiki

### Social Media Monitoring (Medium Priority)
- LinkedIn activity tracking
- Twitter/X mentions
- Brand sentiment analysis
- Engagement opportunities

### Project Management (Medium Priority)
- Linear/Asana/Notion sync
- Task assignment to agents
- Progress tracking unified
- Milestone alerting

### Xero Deeper (High Priority)
- Bank feed integration (real-time transactions)
- Invoice payment status
- Cash flow forecasting
- Expense categorization AI

---

## ALMA Measurement Everywhere

**Current:** ALMA exists in Empathy Ledger v2
**V2 Goal:** ALMA scores on everything

| Entity | ALMA Metric |
|--------|-------------|
| Projects | Impact score based on outcomes |
| Relationships | Engagement depth + mission alignment |
| Content | Reach + resonance + action |
| Agents | Accuracy + helpfulness + learning rate |

---

## Beautiful Obsolescence Principles

### Exit Strategy
- System can be handed to new stewards
- No single point of failure
- All credentials in Bitwarden (not code)

### Community Ownership
- Storytellers own their data (EL v2)
- Open protocols where possible
- Transparent decision making

### Documentation First
- Every component documented
- Handoff guides maintained
- Runbooks for operations

---

## V2 Milestones

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create mono-repo structure
- [ ] Migrate all 3 codebases
- [ ] Unified CI/CD pipeline
- [ ] Safeguards against AI overwrites

### Phase 2: Integration Layer (Weeks 3-4)
- [ ] Design new integration architecture
- [ ] Implement webhook receivers
- [ ] Add real-time for GHL, Calendar
- [ ] Bank feed integration for Xero

### Phase 3: Learning System (Weeks 5-6)
- [ ] Outcome tracking
- [ ] Feedback loops
- [ ] Pattern recognition
- [ ] Agent memory persistence

### Phase 4: UX Overhaul (Weeks 7-8)
- [ ] Single dashboard design
- [ ] Mobile-responsive
- [ ] Real-time updates
- [ ] Design system unification

### Phase 5: New Integrations (Weeks 9-12)
- [ ] Email AI extraction
- [ ] Social media monitoring
- [ ] Project management sync
- [ ] ALMA scoring everywhere

---

## Next Steps

1. **Review this roadmap** - Validate priorities with founder
2. **Architecture decision** - Confirm mono-repo approach
3. **V2 kickoff** - Start Phase 1 after approval

---

*V2 Roadmap Draft - Ready for Review*
