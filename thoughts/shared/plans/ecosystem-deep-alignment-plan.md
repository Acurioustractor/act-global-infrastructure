# Feature Plan: Ecosystem Deep Alignment
Created: 2026-02-09
Author: architect-agent

## Overview

Connect ACT's financial (Xero), CRM (GHL), and project systems so that every dollar, every opportunity, and every contact can be attributed to a specific project code. The current state has 0% GHL opportunity tagging, 0% subscription tagging, 28% transaction tagging, and an empty project_health table. This plan creates the data backfill infrastructure, a data quality dashboard, a Harvest deep dashboard, and Claude Code skills for ongoing maintenance.

## Requirements

- [ ] GHL opportunities get project_code column and backfill from project-codes.json keyword matching
- [ ] GHL tags table populated from contact tag arrays
- [ ] Subscriptions backfilled with project_codes
- [ ] Data quality dashboard at /finance/data-quality
- [ ] Harvest deep dashboard at /harvest
- [ ] Project detail page enhanced with GHL + subscription data (already partially wired)
- [ ] Project health computed from real data (Xero + GHL + comms) instead of empty table
- [ ] Claude Code skills for ongoing alignment maintenance

## Design

### Architecture

```
project-codes.json (source of truth)
        |
        v
+-------------------+     +--------------------+     +------------------+
| /api/alignment/   |---->| ghl_opportunities  |     | xero_transactions|
| suggest           |     | + project_code col |     | (28% tagged)     |
+-------------------+     +--------------------+     +------------------+
        |                         |                          |
        v                         v                          v
+-------------------+     +--------------------+     +------------------+
| /api/alignment/   |     | ghl_tags           |     | subscriptions    |
| apply             |     | (populated)        |     | + project_code   |
+-------------------+     +--------------------+     +------------------+
        |                         |                          |
        +------------+------------+-----------+--------------+
                     |                        |
                     v                        v
          +------------------+     +---------------------+
          | project_health   |     | /finance/data-quality|
          | (computed)       |     | Dashboard            |
          +------------------+     +---------------------+
```

### Data Model Changes

```sql
-- 1. Add project_code to ghl_opportunities
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code_confidence REAL;
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code_source TEXT; -- 'auto', 'manual', 'skill'
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_project ON ghl_opportunities(project_code);

-- 2. Add project_code to subscriptions (check if exists first)
-- subscriptions table already has project_codes TEXT[] per the financials route
-- Verify: the route uses .contains('project_codes', [projectCode])
-- So project_codes column exists as TEXT[], just needs backfill

-- 3. Computed data quality view
CREATE OR REPLACE VIEW v_data_quality_scores AS
SELECT
  'xero_transactions' as source,
  COUNT(*) as total,
  COUNT(project_code) as tagged,
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as pct_tagged
FROM xero_transactions
UNION ALL
SELECT
  'ghl_opportunities',
  COUNT(*),
  COUNT(project_code),
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM ghl_opportunities
UNION ALL
SELECT
  'subscriptions',
  COUNT(*),
  COUNT(CASE WHEN project_codes IS NOT NULL AND array_length(project_codes, 1) > 0 THEN 1 END),
  ROUND(COUNT(CASE WHEN project_codes IS NOT NULL AND array_length(project_codes, 1) > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM subscriptions
UNION ALL
SELECT
  'xero_invoices',
  COUNT(*),
  COUNT(project_code),
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM xero_invoices;

-- 4. Monthly tagging trend view
CREATE OR REPLACE VIEW v_monthly_tagging_trend AS
SELECT
  date_trunc('month', date)::date as month,
  COUNT(*) as total,
  COUNT(project_code) as tagged,
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as pct_tagged
FROM xero_transactions
WHERE date >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', date)
ORDER BY month;

-- 5. Top untagged transactions view
CREATE OR REPLACE VIEW v_top_untagged_transactions AS
SELECT
  COALESCE(contact_name, description, 'Unknown') as vendor,
  COUNT(*) as tx_count,
  SUM(ABS(total)) as total_value,
  MIN(date) as earliest,
  MAX(date) as latest
FROM xero_transactions
WHERE project_code IS NULL
GROUP BY COALESCE(contact_name, description, 'Unknown')
ORDER BY tx_count DESC
LIMIT 50;
```

### Interfaces

```typescript
// src/types/alignment.ts

export interface DataQualityScore {
  source: string
  total: number
  tagged: number
  pctTagged: number
}

export interface MonthlyTaggingTrend {
  month: string
  total: number
  tagged: number
  pctTagged: number
}

export interface UntaggedVendor {
  vendor: string
  txCount: number
  totalValue: number
  earliest: string
  latest: string
  suggestedProject?: string
  confidence?: number
}

export interface AlignmentSuggestion {
  entityType: 'opportunity' | 'transaction' | 'subscription'
  entityId: string
  entityName: string
  entityValue?: number
  suggestedProjectCode: string
  suggestedProjectName: string
  confidence: number
  reason: string
}

export interface ProjectHealthComputed {
  projectCode: string
  projectName: string
  overallScore: number
  financialScore: number
  engagementScore: number
  momentumScore: number
  healthStatus: 'thriving' | 'healthy' | 'attention' | 'critical' | 'dormant'
  metrics: {
    xeroTransactionCount: number
    xeroRevenue: number
    xeroExpenses: number
    ghlOpportunityCount: number
    ghlOpportunityValue: number
    ghlContactCount: number
    subscriptionCount: number
    subscriptionMonthly: number
    emailCount: number
    daysSinceLastTransaction: number
    taggingCompleteness: number
  }
}

export interface HarvestDashboard {
  financials: {
    revenue: number
    expenses: number
    net: number
    grants: Array<{ name: string; amount: number; status: string }>
    monthlyTrend: Array<{ month: string; income: number; expenses: number }>
  }
  pipeline: {
    opportunities: Array<{
      name: string
      value: number
      stage: string
      contact: string
    }>
    totalValue: number
  }
  events: Array<{
    name: string
    date: string
    type: string
    revenue?: number
  }>
  infrastructure: {
    containers: number
    structures: string[]
    vehicles: string[]
    equipment: string[]
  }
  grants: Array<{
    name: string
    provider: string
    amount: number
    status: string
    deadline?: string
  }>
}
```

### Data Flow

**Alignment Suggestion Flow:**
1. API loads project-codes.json with ghl_tags + xero_tracking keywords
2. Fetches untagged entities (opportunities, transactions, subscriptions)
3. Fuzzy-matches entity names/descriptions against project keywords
4. Returns ranked suggestions with confidence scores
5. User confirms/overrides via dashboard or Claude skill
6. API applies project_code to confirmed entities
7. Data quality scores update automatically via views

**Project Health Computation Flow:**
1. Cron/on-demand triggers health calculation for each active project
2. Queries Xero transactions, GHL opportunities, subscriptions, comms for that project_code
3. Computes sub-scores (financial, engagement, momentum, timeline)
4. Upserts into project_health table
5. Inserts snapshot into project_health_history

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| project-codes.json | Config | Source of truth for project-to-system mappings |
| dext-supplier-rules.json | Config | Vendor-to-project rules for auto-suggestion |
| ghl_opportunities table | Database | Needs project_code column added |
| subscriptions table | Database | Has project_codes[] but 0% populated |
| xero_transactions table | Database | 28% tagged, needs suggestion engine |
| project_health table | Database | Exists but empty, needs computation logic |
| ghl_tags table | Database | Exists but empty, needs population |
| Tremor charts | UI | Already in use on finance pages |
| @tanstack/react-query | UI | Already in use for data fetching |

## Implementation Phases

### Phase 1: Database Foundation
**Migration + schema changes**

**Files to create:**
- `supabase/migrations/20260210000000_ecosystem_alignment.sql`

**SQL contents:**
```sql
-- Add project_code to ghl_opportunities
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code_confidence REAL DEFAULT 0;
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code_source TEXT DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_ghl_opp_project ON ghl_opportunities(project_code);

-- Data quality scoring view
CREATE OR REPLACE VIEW v_data_quality_scores AS ...  (see above)

-- Monthly tagging trend view  
CREATE OR REPLACE VIEW v_monthly_tagging_trend AS ...  (see above)

-- Top untagged vendors view
CREATE OR REPLACE VIEW v_top_untagged_transactions AS ...  (see above)

-- Function: compute project health from live data
CREATE OR REPLACE FUNCTION compute_project_health(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  tx_count INT;
  tx_revenue NUMERIC;
  tx_expenses NUMERIC;
  opp_count INT;
  opp_value NUMERIC;
  contact_count INT;
  sub_count INT;
  email_count INT;
  days_since_tx INT;
  tagging_pct NUMERIC;
  financial_score INT;
  engagement_score INT;
  momentum_score INT;
  overall INT;
BEGIN
  -- Xero
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN type='RECEIVE' THEN ABS(total) ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN type='SPEND' THEN ABS(total) ELSE 0 END), 0)
  INTO tx_count, tx_revenue, tx_expenses
  FROM xero_transactions WHERE project_code = p_code;

  -- Days since last transaction
  SELECT COALESCE(EXTRACT(DAY FROM NOW() - MAX(date::timestamp)), 999)
  INTO days_since_tx
  FROM xero_transactions WHERE project_code = p_code;

  -- GHL opportunities
  SELECT COUNT(*), COALESCE(SUM(monetary_value), 0)
  INTO opp_count, opp_value
  FROM ghl_opportunities WHERE project_code = p_code;

  -- GHL contacts  
  SELECT COUNT(*) INTO contact_count
  FROM ghl_contacts WHERE tags @> ARRAY[LOWER(p_code)];

  -- Subscriptions
  SELECT COUNT(*) INTO sub_count
  FROM subscriptions WHERE project_codes @> ARRAY[p_code];

  -- Communications
  SELECT COUNT(*) INTO email_count
  FROM communications_history WHERE project_codes @> ARRAY[p_code];

  -- Scores
  financial_score := LEAST(100, GREATEST(0,
    CASE WHEN tx_revenue > 0 THEN 40 ELSE 0 END +
    CASE WHEN opp_value > 0 THEN 30 ELSE 0 END +
    CASE WHEN tx_count > 10 THEN 30 ELSE tx_count * 3 END
  ));

  engagement_score := LEAST(100, GREATEST(0,
    CASE WHEN contact_count > 5 THEN 40 ELSE contact_count * 8 END +
    CASE WHEN email_count > 10 THEN 30 ELSE email_count * 3 END +
    CASE WHEN opp_count > 0 THEN 30 ELSE 0 END
  ));

  momentum_score := LEAST(100, GREATEST(0,
    CASE WHEN days_since_tx < 7 THEN 50
         WHEN days_since_tx < 30 THEN 35
         WHEN days_since_tx < 90 THEN 20
         ELSE 5 END +
    CASE WHEN tx_count > 20 THEN 50 ELSE tx_count * 2.5 END
  ));

  overall := (financial_score * 0.4 + engagement_score * 0.3 + momentum_score * 0.3)::INT;

  RETURN jsonb_build_object(
    'overall_score', overall,
    'financial_score', financial_score,
    'engagement_score', engagement_score,
    'momentum_score', momentum_score,
    'health_status', calculate_health_status(overall),
    'metrics', jsonb_build_object(
      'xero_transaction_count', tx_count,
      'xero_revenue', tx_revenue,
      'xero_expenses', tx_expenses,
      'ghl_opportunity_count', opp_count,
      'ghl_opportunity_value', opp_value,
      'ghl_contact_count', contact_count,
      'subscription_count', sub_count,
      'email_count', email_count,
      'days_since_last_transaction', days_since_tx
    )
  );
END;
$$ LANGUAGE plpgsql;
```

**Acceptance:**
- [ ] Migration applies cleanly
- [ ] Views return data
- [ ] compute_project_health('ACT-HV') returns valid JSON

**Estimated effort:** Small (1 migration file)

---

### Phase 2: Alignment Engine API
**Backend suggestion + apply endpoints**

**Files to create:**
- `apps/command-center/src/app/api/alignment/suggest/route.ts` - Suggestion engine
- `apps/command-center/src/app/api/alignment/apply/route.ts` - Apply confirmed tags
- `apps/command-center/src/app/api/alignment/scores/route.ts` - Data quality scores
- `apps/command-center/src/app/api/alignment/backfill-tags/route.ts` - Populate ghl_tags from contacts

**Files to modify:**
- `apps/command-center/src/lib/api.ts` - Add alignment API functions

**Key logic for `/api/alignment/suggest/route.ts`:**
```typescript
// 1. Load project-codes.json
// 2. Build keyword index: { keyword: projectCode } from ghl_tags + xero_tracking + name
// 3. Also load dext-supplier-rules.json for vendor→project mappings
// 4. Query untagged entities based on ?type= parameter
// 5. For each entity, score against keyword index:
//    - Exact name match in ghl_tags → confidence 0.95
//    - Vendor match in dext rules → confidence 0.90
//    - Keyword in name/description → confidence 0.70
//    - Fuzzy partial match → confidence 0.40
// 6. Return sorted suggestions
```

**Key logic for `/api/alignment/apply/route.ts`:**
```typescript
// POST body: { suggestions: [{ entityType, entityId, projectCode }] }
// For each:
//   opportunity → UPDATE ghl_opportunities SET project_code = X, project_code_source = 'manual'
//   transaction → UPDATE xero_transactions SET project_code = X
//   subscription → UPDATE subscriptions SET project_codes = array_append(project_codes, X)
```

**Key logic for `/api/alignment/backfill-tags/route.ts`:**
```typescript
// 1. SELECT DISTINCT unnest(tags) as tag FROM ghl_contacts WHERE array_length(tags, 1) > 0
// 2. For each unique tag, classify category using project-codes.json ghl_tags
// 3. UPSERT into ghl_tags (ghl_location_id, name, category)
// 4. Return count of tags populated
```

**Key logic for `/api/alignment/scores/route.ts`:**
```typescript
// Query v_data_quality_scores view
// Query v_monthly_tagging_trend view
// Compute overall "ecosystem alignment score" = weighted average of source pct_tagged
// Return { scores, trend, overallAlignment }
```

**Acceptance:**
- [ ] GET /api/alignment/suggest?type=opportunities returns suggestions with confidence
- [ ] POST /api/alignment/apply updates database
- [ ] GET /api/alignment/scores returns quality metrics
- [ ] POST /api/alignment/backfill-tags populates ghl_tags table

**Estimated effort:** Medium (4 route files + api.ts additions)

---

### Phase 3: Data Quality Dashboard
**New page at /finance/data-quality**

**Files to create:**
- `apps/command-center/src/app/finance/data-quality/page.tsx`

**Layout:**
```
+-------------------------------------------------------+
| Ecosystem Alignment Score: 34%          [Refresh]      |
+-------------------------------------------------------+
| Score Cards (4 across):                                |
| [Xero: 28%] [GHL Opps: 0%] [Subs: 0%] [Invoices: ?%]|
+-------------------------------------------------------+
| Monthly Tagging Trend (BarChart - 12 months)           |
| Bars: tagged vs untagged per month                     |
+-------------------------------------------------------+
| Top Untagged Items          | Suggested Fixes          |
| Uber (282 txns, $12.8K)    | [Suggest] → ACT-IN?     |
| Unknown (140, $8.2K)       | [Suggest] → varies       |
| Qantas (90, $95K)          | [Suggest] → ASK_USER     |
| Nicholas Marchesi (61...)   | [Suggest] → ACT-IN?     |
+-------------------------------------------------------+
| GHL Opportunity Alignment                               |
| Pipeline | Count | Tagged | % | [Tag All]              |
| Events   | 12    | 0      | 0 | [Suggest]              |
| Grants   | 8     | 0      | 0 | [Suggest]              |
+-------------------------------------------------------+
```

**UI Pattern:** Follow existing 'use client' + useQuery + Tremor charts pattern (same as /finance/page.tsx).

**Acceptance:**
- [ ] Page loads with live data quality scores
- [ ] Monthly trend chart renders
- [ ] "Suggest" buttons trigger /api/alignment/suggest and show modal
- [ ] "Apply" in modal calls /api/alignment/apply and refreshes scores

**Estimated effort:** Medium (1 page, follows existing patterns)

---

### Phase 4: Subscription & GHL Backfill
**One-time + ongoing tagging**

**Files to create:**
- `scripts/backfill-subscription-projects.mjs` - One-time subscription backfill
- `scripts/backfill-ghl-tags.mjs` - Populate ghl_tags + opportunity project_codes
- `scripts/compute-project-health.mjs` - Calculate and upsert project_health for all active projects

**Subscription backfill logic:**
```javascript
// Load dext-supplier-rules.json
// For each subscription:
//   Match vendor_name against dext rules
//   If match found → set project_codes = [rule.tracking]
//   Default for SaaS subscriptions → ACT-IN
// Specific overrides:
//   Webflow → ACT-IN (infrastructure, hosts ACT + JusticeHub)
//   Descript → ACT-EL (video editing for Empathy Ledger)
```

**GHL tags backfill logic:**
```javascript
// 1. Extract all unique tags from ghl_contacts
// 2. Categorize against project-codes.json ghl_tags
// 3. Insert into ghl_tags table
// 4. For opportunities: name-match against project keywords
//    "Harvest Event" → ACT-HV, "Goods Wholesale" → ACT-GD, etc.
```

**Project health computation logic:**
```javascript
// For each project in project-codes.json where status = 'active':
//   Call compute_project_health(code) SQL function
//   Upsert result into project_health table
//   Insert snapshot into project_health_history
```

**Acceptance:**
- [ ] All 10 subscriptions have project_codes after backfill
- [ ] ghl_tags table populated (was 0, now reflects actual tags)
- [ ] 57 GHL opportunities have suggested project_codes (auto + manual review)
- [ ] project_health has rows for all active projects

**Estimated effort:** Medium (3 scripts)

---

### Phase 5: Harvest Deep Dashboard
**New page at /harvest**

**Files to create:**
- `apps/command-center/src/app/harvest/page.tsx`
- `apps/command-center/src/app/api/harvest/route.ts`

**API route aggregates:**
```typescript
// 1. Financial summary: Xero transactions where project_code = 'ACT-HV'
// 2. Pipeline: GHL opportunities where project_code = 'ACT-HV'
// 3. Grants: grant_applications where project_code = 'ACT-HV'
// 4. Events: calendar_events tagged Harvest (or from GHL pipeline)
// 5. Knowledge: knowledge_entries for ACT-HV
// 6. Infrastructure: from project_health metrics or hardcoded config
```

**Page layout (tab-based like /goods):**
```
Tabs: [Overview] [Financials] [Pipeline] [Events] [Grants] [Farm]

Overview Tab:
+-------------------------------------------------------+
| Harvest Witta                    Health: 65/100        |
| Regenerative farm & community hub                     |
+-------------------------------------------------------+
| Revenue: $X    Expenses: $Y    Net: $Z                |
| Pipeline: $V across N opportunities                   |
| Grants: RAA $45K (submitted), Target $100K            |
+-------------------------------------------------------+
| Monthly Income vs Expenses (BarChart)                  |
+-------------------------------------------------------+
| Key Contacts (from GHL)        | Recent Activity      |
+-------------------------------------------------------+

Grants Tab:
| Grant | Provider | Amount | Status | Deadline |
| RAA   | RAA SA   | $45K   | submitted | ... |

Pipeline Tab:
| Opportunity | Value | Stage | Contact |
| (from GHL opportunities with project_code = ACT-HV) |

Farm Tab:
| CSA Members | Produce | Seasonal Planning |
| (future: connect to farm-specific data) |
```

**Acceptance:**
- [ ] /harvest loads with real financial data
- [ ] Pipeline tab shows GHL opportunities (once tagged)
- [ ] Grants tab shows grant applications for ACT-HV
- [ ] Monthly trend chart works

**Estimated effort:** Medium-Large (mirroring /goods complexity)

---

### Phase 6: Enhanced Project Detail Page
**Improve /projects/[code] with connected data**

**Files to modify:**
- `apps/command-center/src/app/projects/[code]/page.tsx`
- `apps/command-center/src/app/api/projects/[code]/financials/route.ts`

**Enhancements to financials route:**
```typescript
// Already fetches: transactions, invoices, grants, subscriptions, contacts, fundraising
// ADD:
// - GHL opportunities with project_code match (not just tag match)
// - Computed health score from compute_project_health()
// - Data completeness score for this project
// - Budget computed from grant amounts if project_health.budget is null
```

**Enhancements to page:**
```typescript
// ADD to financials tab:
// - "Data Completeness" badge showing % of data tagged for this project
// - GHL Opportunities section (currently only shows tag-matched contacts)
// - Health score gauge (from project_health, computed if empty)
// - "Untagged items that might belong here" section with suggest/apply
```

**Acceptance:**
- [ ] Project page shows GHL opportunities linked by project_code
- [ ] Health score displayed even when project_health table row is computed on-the-fly
- [ ] Budget vs actual works from Xero data when project_health.budget is null

**Estimated effort:** Small-Medium (modify 2 existing files)

---

### Phase 7: Claude Code Skills
**Ongoing maintenance skills**

**Files to create:**
- `.claude/skills/align-ghl/SKILL.md`
- `.claude/skills/tag-transactions/SKILL.md`
- `.claude/skills/ecosystem-health/SKILL.md`

**align-ghl skill:**
```markdown
# /align-ghl
Trigger: "align ghl", "tag opportunities", "ghl alignment"

Steps:
1. Query untagged GHL opportunities via Supabase MCP
2. Load project-codes.json for keyword matching
3. For each opportunity, suggest project code with reasoning
4. Present table: Opportunity | Value | Suggested Code | Confidence
5. Ask for confirmation (confirm all / review each / skip)
6. Apply confirmed codes via Supabase MCP update
7. Report: "Tagged X of Y opportunities. Data quality now Z%"
```

**tag-transactions skill:**
```markdown
# /tag-transactions
Trigger: "tag transactions", "tag untagged", "categorize spending"

Steps:
1. Query v_top_untagged_transactions view
2. Load dext-supplier-rules.json + project-codes.json
3. For each vendor group:
   - Check dext rules for exact match
   - Check project keywords for fuzzy match
   - For ASK_USER vendors (Uber, Qantas): ask which project
4. Present suggestions for batch approval
5. Apply via Supabase MCP: UPDATE xero_transactions SET project_code = X WHERE contact_name = Y AND project_code IS NULL
6. Report improvement in tagging %
```

**ecosystem-health skill:**
```markdown
# /ecosystem-health
Trigger: "ecosystem health", "data quality", "alignment score"

Steps:
1. Query v_data_quality_scores
2. Run compute_project_health for top 10 active projects
3. Present:
   - Overall alignment score
   - Per-source breakdown
   - Projects needing attention (health < 50)
   - Top actions to improve score
4. Offer to run /align-ghl or /tag-transactions for quick wins
```

**Acceptance:**
- [ ] Skills trigger correctly from Claude Code
- [ ] Each skill produces actionable output
- [ ] Skills use Supabase MCP for reads/writes (not API routes)

**Estimated effort:** Small (3 markdown files)

---

### Phase 8: Testing & Documentation

**Files to create:**
- `docs/ECOSYSTEM_ALIGNMENT.md` - System overview + maintenance guide

**Documentation contents:**
- How project codes flow through the system
- How to add a new project code (update project-codes.json, run skills)
- How health scores are computed
- Monthly maintenance checklist (run /ecosystem-health, review suggestions)
- Data quality targets (80% tagged across all sources)

**Acceptance:**
- [ ] Documentation covers all alignment flows
- [ ] Maintenance checklist is actionable

**Estimated effort:** Small

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| project_code column doesn't exist on ghl_opportunities | Blocks Phase 2-7 | Phase 1 adds it via migration; verify with schema query before proceeding |
| Keyword matching produces false positives | Wrong project attribution | Require confidence > 0.7 for auto-apply; all others need manual review |
| ghl_contacts tags column format varies | Tags backfill fails | Query actual data format first; tags is TEXT[] per schema |
| subscriptions.project_codes column might not exist | Backfill fails | Financials route already uses .contains('project_codes', ...) so it exists; verify |
| Health score computation is slow for 61 projects | API timeout | Use SQL function (server-side), compute in background script not API |
| Travel transactions (Uber, Qantas) need per-trip project codes | Can't auto-tag | Flag as ASK_USER in dext rules; skill presents each for review |
| Existing /projects/[code] page uses tag matching for GHL contacts | Project_code column matching would be better | Phase 6 adds project_code matching; keep tag matching as fallback |

## Open Questions

- [ ] Should travel transactions be tagged to the project traveled FOR, or to ACT-IN as overhead? (Dext rules say ASK_USER)
- [ ] Should Nicholas Marchesi's personal transactions be tagged ACT-IN or excluded?
- [ ] Is there a calendar_events table for Harvest events, or should events come from GHL pipeline stages?
- [ ] Should the /harvest page replace /projects/ACT-HV or complement it? (Recommend: complement, like /goods complements /projects/ACT-GD)
- [ ] Target data quality score: 80%? 90%? What's realistic given travel/variable expenses?

## Success Criteria

1. GHL opportunity tagging goes from 0% to 90%+ (some may be genuinely unclassifiable)
2. Subscription tagging goes from 0% to 100%
3. Transaction tagging goes from 28% to 60%+ (travel/variable vendors need human review)
4. ghl_tags table populated with categorized tags
5. project_health table has computed scores for all active projects
6. /finance/data-quality dashboard shows live alignment scores
7. /harvest page shows Harvest-specific financial, pipeline, and grant data
8. Three Claude Code skills enable ongoing maintenance without developer intervention
9. Overall ecosystem alignment score visible and improving month-over-month

## Implementation Order & Dependencies

```
Phase 1 (DB) ──────┬──> Phase 2 (API) ──> Phase 3 (Dashboard)
                    │
                    ├──> Phase 4 (Backfill) ──> Phase 5 (Harvest)
                    │
                    └──> Phase 6 (Project Detail Enhancement)

Phase 2 + Phase 4 ──> Phase 7 (Skills)

All Phases ──> Phase 8 (Docs)
```

Phases 2, 4, 5, 6 can be worked in parallel after Phase 1.
Phase 3 needs Phase 2 APIs.
Phase 7 needs the data to be populated (Phase 4).

## Estimated Total Effort

| Phase | Effort | Files |
|-------|--------|-------|
| 1. DB Foundation | Small | 1 migration |
| 2. Alignment API | Medium | 4 routes + api.ts |
| 3. Data Quality Dashboard | Medium | 1 page |
| 4. Backfill Scripts | Medium | 3 scripts |
| 5. Harvest Dashboard | Medium-Large | 1 page + 1 route |
| 6. Project Detail Enhancement | Small-Medium | 2 file modifications |
| 7. Claude Skills | Small | 3 skill files |
| 8. Documentation | Small | 1 doc file |

**Total: ~15 files to create/modify across 8 phases.**
