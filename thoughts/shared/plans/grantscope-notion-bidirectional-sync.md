# GrantScope ↔ Notion: Bidirectional Sync & Product Vision

## The Two-Space Problem

Right now the flow is one-way: **GrantScope → Notion**. But the real work happens in Notion — someone changes a grant's stage from "Researching" to "Drafting", marks actions as done, adds notes. That context is trapped in Notion and doesn't flow back to GrantScope.

## Three Approaches to Bidirectional Sync

### Option A: Webhook-Driven (Real-Time)
**Notion → GrantScope via Notion webhooks**

- Notion has no native webhooks for database changes (as of 2026)
- Workaround: Poll Notion every N minutes for changes (last_edited_time > last_sync)
- Compare `Stage` in Notion with `pipeline_stage` in GrantScope
- Push changes back to GrantScope Supabase

**Pros:** Near real-time, simple mental model
**Cons:** Polling is wasteful, conflict resolution needed, Notion API rate limits (3 req/sec)

### Option B: Event-Sourced (Audit Trail)
**Both sides write events, reconciler merges**

```
grant_pipeline_events table:
  id, grant_id, source (notion|grantscope), field, old_value, new_value, timestamp, user
```

- Each side writes events when things change
- Reconciler runs periodically, applies events in timestamp order
- Last-write-wins for conflicts, with optional manual resolution queue

**Pros:** Full audit trail, no data loss, debuggable
**Cons:** More complex, needs event capture on both sides

### Option C: Notion as UI, GrantScope as Source of Truth (Recommended)
**GrantScope owns the data. Notion is a rich workspace view.**

- GrantScope → Notion sync runs on cron (already built)
- Notion stage changes → detected by polling `last_edited_time`
- Only specific fields sync back: `stage`, `notes`, action completion status
- GrantScope is always authoritative for grant data (description, eligibility, amounts, deadlines)
- Notion is authoritative for workflow data (actions, notes, team assignments)

**Pros:** Clear ownership, simple conflict model, leverages each tool's strength
**Cons:** Small delay (cron-based), users need to understand which tool owns what

## Recommended Architecture (Option C)

```
┌─────────────┐     cron (every 15min)     ┌──────────────┐
│  GrantScope │ ──────────────────────────▶ │    Notion    │
│  (data hub) │                             │ (workspace)  │
│             │ ◀────────────────────────── │              │
│ • discovery │     cron (every 15min)      │ • actions    │
│ • matching  │     stage + notes only      │ • team work  │
│ • scoring   │                             │ • decisions  │
│ • deadlines │                             │ • documents  │
└─────────────┘                             └──────────────┘
```

### Sync Rules
| Field | Owner | Direction |
|-------|-------|-----------|
| Grant name, description, eligibility | GrantScope | GS → Notion |
| Amount, deadline, URL | GrantScope | GS → Notion |
| Fit score, categories | GrantScope | GS → Notion |
| Pipeline stage | Both | Bidirectional (last-write-wins) |
| Notes (user-added) | Notion | Notion → GS (append-only) |
| Action completion | Notion | Notion → GS (status tracking) |
| Team assignments | Notion | Notion-only (not synced) |

### Implementation Plan

**Phase 1: Notion → GrantScope stage sync** (2-3 hours)
1. Add `sync-notion-stages-to-grantscope.mjs` script
2. Query Notion Grant Pipeline Tracker for pages with `last_edited_time` > last sync
3. Compare stage with GrantScope `pipeline_stage`
4. Update GrantScope if Notion stage is newer
5. Store `last_synced_at` in a sync_state table or file

**Phase 2: Action completion tracking** (2 hours)
1. Query Actions DB for `[Grant]` actions with status changes
2. Calculate gate completion percentage per grant
3. Update GrantScope with progress metadata

**Phase 3: PM2 cron for both directions** (30 min)
```js
// ecosystem.config.cjs
{
  name: 'sync-grantscope-to-notion',
  script: 'scripts/sync-grantscope-to-notion.mjs',
  cron_restart: '*/15 5-22 * * *',  // Every 15min, 5am-10pm AEST
},
{
  name: 'sync-notion-to-grantscope',
  script: 'scripts/sync-notion-stages-to-grantscope.mjs',
  cron_restart: '7,22,37,52 5-22 * * *',  // Offset by 7min to avoid collision
}
```

## Product Vision: GrantScope + Notion as a Platform

### Why This Is Sellable

**The pain:** Every nonprofit manages grants in spreadsheets or basic CRMs. They discover grants on various portals, then manually track applications in their own systems. There's no connection between discovery and workflow.

**The product:** GrantScope finds and scores grants using AI. Notion provides the collaborative workspace. The sync bridge makes them one seamless system.

### Target Market
- **Tier 1:** Small nonprofits (1-10 staff) — $49/mo
  - GrantScope discovery + scoring
  - Notion template (Grant Pipeline + Actions)
  - One-way sync (GS → Notion)

- **Tier 2:** Mid-size nonprofits (10-50 staff) — $149/mo
  - Everything in Tier 1
  - Bidirectional sync
  - Playbook 6 gate automation
  - Team assignments + deadline alerts
  - Multiple project tracking

- **Tier 3:** Grant consultants / peak bodies — $499/mo
  - Multi-org management
  - Portfolio view across clients
  - Success rate analytics
  - Custom playbook gates
  - API access

### Competitive Advantage
1. **AI-powered discovery** — no one else does automated grant matching for AU market
2. **Notion-native** — meets teams where they already work (vs forcing another app)
3. **Open data** — GrantScope's database is Australia's 360Giving equivalent
4. **Playbook automation** — the gate system turns "we should apply" into structured action

### What Makes This Different from GrantHub/Submittable/etc
- Those are **application portals** (funder-side tools)
- GrantScope is **applicant-side** (helps the nonprofit find and win grants)
- Notion integration means it's a **workflow tool**, not just a database
- The AI matching is unique — no manual searching required

### Revenue Model
- SaaS subscription (above tiers)
- Notion template marketplace ($29 one-time for the template alone)
- Data licensing (anonymised grant success patterns → funders)
- Consulting add-on (grant writing review, powered by AI + human experts)

### MVP to Validate
1. Ship the current sync as a "GrantScope for Notion" template
2. 10 beta nonprofits (ACT network — PICC, Centrecorp, SMART, etc.)
3. Measure: Do they actually use it? Do they apply for more grants? Do they win more?
4. If yes → productise the sync as a paid connector

### Technical Scaling Path
- Current: Direct Supabase-to-Notion scripts
- Next: Edge function API (Supabase Edge Functions or Vercel)
- Scale: OAuth-based Notion integration (each org connects their own workspace)
- Platform: GrantScope API + Notion integration as separate installable products

## Open Questions
- Should GrantScope have its own lightweight UI for non-Notion users?
- Is Notion the right bet or should we also support Asana/Monday/Linear?
- How do we handle multi-org in Notion? (Shared workspace vs separate workspaces)
- Pricing: freemium with limited grants, or trial-based?
