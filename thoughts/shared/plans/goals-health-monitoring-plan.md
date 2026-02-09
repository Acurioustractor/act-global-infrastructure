# Feature Plan: ACT Goals & Health Monitoring System
Created: 2026-01-24
Author: architect-agent

## Overview

This plan designs a comprehensive goals management and ecosystem health monitoring system for ACT. It transforms Supabase from a Notion mirror into the authoritative source of truth for goals, while implementing multi-layer health checks across HTTP, Vercel deployments, and GitHub repositories with aggregate scoring.

## Requirements

- [ ] Make Supabase authoritative for goals (bi-directional sync or Supabase-primary)
- [ ] Track goal progress updates, history, and metrics over time
- [ ] Support manual dashboard updates alongside Notion sync
- [ ] Multi-layer health monitoring (HTTP, Vercel, GitHub, Aggregate)
- [ ] Historical health data storage and trend analysis
- [ ] Real-time deployment status from Vercel API
- [ ] GitHub repository health metrics
- [ ] Alerting on health degradation
- [ ] Expand from 7 monitored sites to all 28 Vercel projects

---

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACT Dashboard Frontend                        │
│         (Goals Tab + Ecosystem Health Tab + Alerts Panel)           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Server (Express)                          │
│  /api/goals/* (CRUD + history)  │  /api/ecosystem/* (health + deploy)│
└─────────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────────┐                  ┌────────────────────────────────┐
│  Supabase Tables │                  │    External APIs               │
│  - goals_2026    │                  │    - Vercel API                │
│  - goal_updates  │                  │    - GitHub API                │
│  - goal_metrics  │                  │    - HTTP Health Checks        │
│  - site_health   │                  └────────────────────────────────┘
│  - site_deploys  │
│  - ecosystem_... │
└──────────────────┘
          ▲
          │
┌──────────────────┐
│  Scheduled Jobs  │
│  - Health Check  │  ← GitHub Actions (every 5-15 min)
│  - Notion Sync   │  ← Daily sync (optional)
│  - Vercel Sync   │
└──────────────────┘
```

### Data Flow

**Goals Updates:**
1. User updates goal in dashboard → POST /api/goals/:id/update
2. API creates `goal_updates` record with old/new values
3. API updates `goals_2026` with new status/progress
4. Optional: Trigger webhook to update Notion (bi-directional)

**Health Checks:**
1. Scheduler triggers health check job (every 5-15 min)
2. Layer 1: HTTP HEAD requests to all site URLs
3. Layer 2: Vercel API → deployment status per project
4. Layer 3: GitHub API → repo activity, CI status
5. Calculate aggregate score (0-100)
6. Store results in `site_health_checks`
7. Update `ecosystem_sites.status` with latest
8. Alert if score drops below threshold

---

## Database Schema Design

### Migration: `20260125000000_goals_health_system.sql`

```sql
-- ============================================================================
-- ENHANCED GOALS SYSTEM
-- ============================================================================

-- Goal Updates History (track all changes over time)
CREATE TABLE IF NOT EXISTS goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals_2026(id) ON DELETE CASCADE,
  
  -- What changed
  field_changed TEXT NOT NULL,  -- 'status', 'progress', 'key_results', etc.
  old_value JSONB,
  new_value JSONB,
  
  -- Who/what made the change
  source TEXT NOT NULL DEFAULT 'dashboard',  -- 'dashboard', 'notion_sync', 'api', 'agent'
  updated_by TEXT,  -- 'ben', 'system', agent name
  comment TEXT,     -- Optional note about the update
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goal_updates_goal_id ON goal_updates(goal_id);
CREATE INDEX idx_goal_updates_created_at ON goal_updates(created_at DESC);

-- Goal Metrics (KPI tracking for key results)
CREATE TABLE IF NOT EXISTS goal_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals_2026(id) ON DELETE CASCADE,
  
  -- Metric definition
  metric_name TEXT NOT NULL,       -- 'contacts_engaged', 'stories_collected', etc.
  metric_type TEXT DEFAULT 'number',  -- 'number', 'percentage', 'currency', 'boolean'
  target_value NUMERIC,            -- Target to hit
  current_value NUMERIC,           -- Current value
  unit TEXT,                       -- 'contacts', '%', 'AUD', etc.
  
  -- Progress tracking
  progress_percentage INTEGER GENERATED ALWAYS AS (
    CASE WHEN target_value > 0 THEN ROUND((current_value / target_value) * 100)
    ELSE 0 END
  ) STORED,
  
  -- History (store snapshots)
  value_history JSONB DEFAULT '[]',  -- [{date, value}, ...]
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goal_metrics_goal_id ON goal_metrics(goal_id);
CREATE UNIQUE INDEX idx_goal_metrics_unique ON goal_metrics(goal_id, metric_name);

-- Add progress_percentage to goals_2026 if not exists
ALTER TABLE goals_2026 
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS last_update_source TEXT DEFAULT 'notion_sync';

-- ============================================================================
-- HEALTH MONITORING SYSTEM
-- ============================================================================

-- Site Health Checks (historical data)
CREATE TABLE IF NOT EXISTS site_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES ecosystem_sites(id) ON DELETE CASCADE,
  
  -- Layer 1: HTTP Health
  http_status INTEGER,           -- 200, 404, 500, 0 (timeout)
  http_response_time_ms INTEGER,
  ssl_valid BOOLEAN,
  ssl_expires_at TIMESTAMPTZ,
  
  -- Layer 2: Vercel Health
  vercel_deployment_status TEXT,  -- 'READY', 'BUILDING', 'ERROR', 'CANCELED'
  vercel_deployment_id TEXT,
  vercel_build_time_seconds INTEGER,
  vercel_error_count INTEGER DEFAULT 0,
  
  -- Layer 3: GitHub Health
  github_last_commit_at TIMESTAMPTZ,
  github_open_prs INTEGER,
  github_failed_checks INTEGER,
  github_security_alerts INTEGER,
  
  -- Aggregate Score
  health_score INTEGER,  -- 0-100
  health_status TEXT,    -- 'healthy', 'degraded', 'offline', 'unknown'
  
  -- Details
  check_errors JSONB,    -- Any errors during check
  raw_data JSONB,        -- Full response data for debugging
  
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_site_health_checks_site_id ON site_health_checks(site_id);
CREATE INDEX idx_site_health_checks_checked_at ON site_health_checks(checked_at DESC);
-- Partition-friendly index for time-series queries
CREATE INDEX idx_site_health_checks_site_time ON site_health_checks(site_id, checked_at DESC);

-- Site Deployments (Vercel deployment history)
CREATE TABLE IF NOT EXISTS site_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES ecosystem_sites(id) ON DELETE CASCADE,
  
  -- Vercel deployment info
  vercel_deployment_id TEXT UNIQUE NOT NULL,
  vercel_project_id TEXT,
  deployment_url TEXT,
  production_url TEXT,
  
  -- Status
  status TEXT NOT NULL,  -- 'READY', 'BUILDING', 'ERROR', 'CANCELED', 'QUEUED'
  ready_state TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ,
  building_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  build_duration_seconds INTEGER,
  
  -- Git info
  git_commit_sha TEXT,
  git_commit_message TEXT,
  git_branch TEXT,
  git_repo TEXT,
  
  -- Meta
  environment TEXT DEFAULT 'production',  -- 'production', 'preview'
  creator TEXT,  -- Who triggered deployment
  
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_site_deployments_site_id ON site_deployments(site_id);
CREATE INDEX idx_site_deployments_created_at ON site_deployments(created_at DESC);
CREATE INDEX idx_site_deployments_vercel_id ON site_deployments(vercel_deployment_id);

-- Enhance ecosystem_sites table
ALTER TABLE ecosystem_sites
  ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
  ADD COLUMN IF NOT EXISTS vercel_project_name TEXT,
  ADD COLUMN IF NOT EXISTS github_repo TEXT,
  ADD COLUMN IF NOT EXISTS github_owner TEXT DEFAULT 'Acurioustractor',
  ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_score_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS last_deployment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_deployment_status TEXT,
  ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 70;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate health score
CREATE OR REPLACE FUNCTION calculate_health_score(
  p_http_status INTEGER,
  p_http_response_time_ms INTEGER,
  p_ssl_valid BOOLEAN,
  p_vercel_status TEXT,
  p_github_days_since_commit INTEGER,
  p_github_failed_checks INTEGER,
  p_github_security_alerts INTEGER
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  max_score INTEGER := 100;
BEGIN
  -- Layer 1: HTTP Health (40 points max)
  IF p_http_status = 200 THEN
    score := score + 25;
    -- Response time bonus
    IF p_http_response_time_ms < 500 THEN score := score + 10;
    ELSIF p_http_response_time_ms < 1000 THEN score := score + 7;
    ELSIF p_http_response_time_ms < 2000 THEN score := score + 4;
    END IF;
  ELSIF p_http_status BETWEEN 300 AND 399 THEN
    score := score + 20;  -- Redirects are okay
  ELSIF p_http_status BETWEEN 400 AND 499 THEN
    score := score + 5;   -- Client errors
  -- 500+ or 0 (timeout) = 0 points
  END IF;
  
  -- SSL bonus
  IF p_ssl_valid THEN score := score + 5; END IF;
  
  -- Layer 2: Vercel (30 points max)
  IF p_vercel_status = 'READY' THEN
    score := score + 30;
  ELSIF p_vercel_status = 'BUILDING' THEN
    score := score + 20;
  ELSIF p_vercel_status = 'QUEUED' THEN
    score := score + 15;
  ELSIF p_vercel_status = 'ERROR' THEN
    score := score + 0;
  ELSIF p_vercel_status IS NULL THEN
    score := score + 15;  -- No Vercel = neutral
  END IF;
  
  -- Layer 3: GitHub (30 points max)
  -- Recent commits
  IF p_github_days_since_commit IS NOT NULL THEN
    IF p_github_days_since_commit < 7 THEN score := score + 15;
    ELSIF p_github_days_since_commit < 30 THEN score := score + 10;
    ELSIF p_github_days_since_commit < 90 THEN score := score + 5;
    END IF;
  ELSE
    score := score + 10;  -- No GitHub = neutral
  END IF;
  
  -- CI health
  IF p_github_failed_checks IS NOT NULL THEN
    IF p_github_failed_checks = 0 THEN score := score + 10;
    ELSIF p_github_failed_checks < 3 THEN score := score + 5;
    END IF;
  ELSE
    score := score + 5;
  END IF;
  
  -- Security
  IF p_github_security_alerts IS NOT NULL THEN
    IF p_github_security_alerts = 0 THEN score := score + 5;
    -- Penalties for security issues
    ELSIF p_github_security_alerts > 5 THEN score := score - 10;
    ELSIF p_github_security_alerts > 0 THEN score := score - 5;
    END IF;
  ELSE
    score := score + 5;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get health status from score
CREATE OR REPLACE FUNCTION health_status_from_score(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score >= 80 THEN RETURN 'healthy';
  ELSIF score >= 50 THEN RETURN 'degraded';
  ELSIF score > 0 THEN RETURN 'offline';
  ELSE RETURN 'unknown';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update ecosystem_sites when health check is inserted
CREATE OR REPLACE FUNCTION update_site_health_on_check()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ecosystem_sites
  SET 
    status = health_status_from_score(NEW.health_score),
    health_score = NEW.health_score,
    response_time_ms = NEW.http_response_time_ms,
    last_check_at = NEW.checked_at,
    ssl_expires_at = NEW.ssl_expires_at,
    updated_at = now()
  WHERE id = NEW.site_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_site_health
  AFTER INSERT ON site_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_site_health_on_check();

-- Trigger to log goal updates
CREATE OR REPLACE FUNCTION log_goal_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'status', to_jsonb(OLD.status), to_jsonb(NEW.status), 
            COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;
  
  -- Log progress changes
  IF OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'progress_percentage', to_jsonb(OLD.progress_percentage), to_jsonb(NEW.progress_percentage),
            COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_goal_update
  AFTER UPDATE ON goals_2026
  FOR EACH ROW
  EXECUTE FUNCTION log_goal_update();

-- RLS Policies
ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON goal_updates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON goal_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON site_health_checks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON site_deployments FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## Scripts to Create

### 1. `scripts/health-check-service.mjs`
Multi-layer health check runner

**Functions:**
- `checkHttpHealth(url)` - HEAD request with timeout, SSL check
- `checkVercelHealth(projectId)` - Vercel API deployment status
- `checkGitHubHealth(owner, repo)` - Last commit, CI status, alerts
- `calculateAggregateScore(layers)` - Combine into 0-100
- `runFullHealthCheck()` - Run all checks, store results
- `checkAndAlert(site, score)` - Alert if below threshold

**Estimated LOC:** ~350

### 2. `scripts/vercel-sync.mjs`
Sync all Vercel projects to ecosystem_sites

**Functions:**
- `listAllVercelProjects()` - Get all 28+ projects
- `syncProjectToSite(project)` - Create/update ecosystem_sites
- `syncDeployments(projectId)` - Store deployment history
- `getLatestDeployment(projectId)` - Get current status

**Estimated LOC:** ~200

### 3. `scripts/goals-service.mjs`
Enhanced goals management

**Functions:**
- `updateGoalProgress(goalId, progress, source)` - Update with history
- `addGoalMetric(goalId, metric)` - Add KPI to goal
- `updateMetricValue(metricId, value)` - Record metric change
- `getGoalHistory(goalId)` - Full change history
- `syncFromNotion()` - Pull from Notion
- `syncToNotion(goalId)` - Push to Notion (optional)

**Estimated LOC:** ~250

---

## API Endpoints to Add

### Goals Endpoints (in `api-server.mjs`)

```javascript
// Update goal progress (creates history record)
app.post('/api/goals/:id/update', async (req, res) => {
  // Body: { status?, progress?, comment?, updated_by? }
});

// Get goal with full history
app.get('/api/goals/:id/history', async (req, res) => {
  // Returns goal + goal_updates + goal_metrics
});

// Add metric to goal
app.post('/api/goals/:id/metrics', async (req, res) => {
  // Body: { metric_name, metric_type, target_value, unit }
});

// Update metric value
app.post('/api/goals/:id/metrics/:metricId', async (req, res) => {
  // Body: { current_value }
});

// Manual sync from Notion
app.post('/api/goals/sync-notion', async (req, res) => {
  // Triggers notion sync script
});
```

### Ecosystem Health Endpoints

```javascript
// Get health history for a site
app.get('/api/ecosystem/:slug/health-history', async (req, res) => {
  // Query params: days=7, limit=100
  // Returns: site_health_checks records
});

// Get detailed site info (health + deployments)
app.get('/api/ecosystem/:slug/details', async (req, res) => {
  // Returns: site + recent health checks + recent deployments
});

// Get all deployments for a site
app.get('/api/ecosystem/:slug/deployments', async (req, res) => {
  // Query params: limit=20, environment=production
});

// Trigger manual health check
app.post('/api/ecosystem/:slug/check', async (req, res) => {
  // Runs health check for single site
});

// Trigger full ecosystem health check
app.post('/api/ecosystem/check-all', async (req, res) => {
  // Runs health check for all sites
});

// Get ecosystem health summary
app.get('/api/ecosystem/health-summary', async (req, res) => {
  // Returns: { total, healthy, degraded, offline, avgScore, trend }
});
```

---

## Dashboard Components to Update

### 1. GoalsTab Enhancement

**New Features:**
- Progress slider/input per goal
- "Update Progress" button with comment field
- History timeline showing changes
- KPI metrics display with sparklines
- Sync status indicator (last sync from Notion)

**Files:**
- `apps/frontend/src/components/goals/GoalCard.tsx` (new)
- `apps/frontend/src/components/goals/GoalHistory.tsx` (new)
- `apps/frontend/src/components/goals/GoalMetrics.tsx` (new)

### 2. EcosystemTab Enhancement

**New Features:**
- Health score badges (0-100) with color coding
- Trend indicators (up/down/stable)
- Deployment status badges
- Last deployment time
- Click to expand: health history chart
- Alert indicators

**Files:**
- `apps/frontend/src/components/ecosystem/SiteCard.tsx` (update)
- `apps/frontend/src/components/ecosystem/HealthChart.tsx` (new)
- `apps/frontend/src/components/ecosystem/DeploymentHistory.tsx` (new)

### 3. Alerts Panel (new)

**Features:**
- Real-time health degradation alerts
- Deployment failure notifications
- Goal deadline reminders
- Dismissible alerts with actions

**Files:**
- `apps/frontend/src/components/alerts/AlertsPanel.tsx` (new)
- `apps/frontend/src/components/alerts/AlertItem.tsx` (new)

---

## Implementation Phases

### Phase 1: Database Foundation
**Duration:** 2-3 hours
**Files to create:**
- `supabase/migrations/20260125000000_goals_health_system.sql`

**Acceptance Criteria:**
- [ ] Migration runs without errors
- [ ] All tables created with indexes
- [ ] Triggers function correctly
- [ ] RLS policies in place

**Dependencies:** None

---

### Phase 2: Health Check Service
**Duration:** 3-4 hours
**Files to create:**
- `scripts/health-check-service.mjs`
- `scripts/vercel-sync.mjs`

**Acceptance Criteria:**
- [ ] HTTP health checks work for all sites
- [ ] Vercel API integration returns deployment data
- [ ] GitHub API returns repo health metrics
- [ ] Aggregate score calculation is accurate
- [ ] Results stored in database

**Dependencies:** Phase 1

**Environment Variables Required:**
- `VERCEL_TOKEN` (already configured)
- `GITHUB_TOKEN` (already configured)

---

### Phase 3: Goals Service
**Duration:** 2-3 hours
**Files to create:**
- `scripts/goals-service.mjs`

**Files to modify:**
- `scripts/sync-notion-goals.mjs` (add history logging)

**Acceptance Criteria:**
- [ ] Goal updates create history records
- [ ] Metrics can be added and tracked
- [ ] Notion sync continues to work
- [ ] Dashboard can update goals

**Dependencies:** Phase 1

---

### Phase 4: API Endpoints
**Duration:** 3-4 hours
**Files to modify:**
- `packages/act-dashboard/api-server.mjs`

**Acceptance Criteria:**
- [ ] All new endpoints return correct data
- [ ] Error handling works
- [ ] Rate limiting for external API calls
- [ ] Endpoint documentation updated

**Dependencies:** Phase 2, Phase 3

---

### Phase 5: GitHub Actions Automation
**Duration:** 1-2 hours
**Files to create:**
- `.github/workflows/health-check.yml` (new, replaces daily-health-check.yml)

**Acceptance Criteria:**
- [ ] Runs every 15 minutes
- [ ] Stores results in Supabase
- [ ] Creates GitHub issue on degradation
- [ ] Sends Discord alert on failure

**Dependencies:** Phase 2

**Example Workflow:**
```yaml
name: Ecosystem Health Check

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run Health Checks
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/health-check-service.mjs
      - name: Alert on Failure
        if: failure()
        run: node scripts/discord-notify.mjs "Health check failed"
```

**Dependencies:** Phase 2

---

### Phase 6: Dashboard Updates
**Duration:** 4-5 hours
**Files to create:**
- Multiple React components (see Dashboard Components section)

**Acceptance Criteria:**
- [ ] Goals show progress with history
- [ ] Sites show health scores and trends
- [ ] Alerts panel displays issues
- [ ] All interactions work

**Dependencies:** Phase 4

---

## Expand Ecosystem Sites

Currently 7 sites monitored. Need to add remaining Vercel projects:

```javascript
const ADDITIONAL_SITES = [
  // From Vercel projects list
  { name: 'ACT Placemat', slug: 'act-placemat', url: 'https://act-placemat.vercel.app' },
  { name: 'Diagrama Starter', slug: 'diagrama-starter', url: 'https://diagrama-starter.vercel.app' },
  { name: 'Bail Act Reform', slug: 'bail-act-reform', url: 'https://bail-act-reform.vercel.app' },
  { name: 'Wilya Janta', slug: 'wilya-janta', url: 'https://wilya-janta.vercel.app' },
  // ... add all 28 projects
];
```

**Script:** `scripts/seed-ecosystem-sites.mjs` to populate from Vercel API

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel API rate limits | Medium | Cache responses, batch requests, 15-min intervals |
| GitHub API rate limits | Medium | Use authenticated requests (5000/hr), cache aggressively |
| Large health_checks table | Low | Add retention policy (90 days), consider partitioning |
| Notion sync conflicts | Medium | Make Supabase authoritative, log conflicts |
| False positive alerts | Medium | Add hysteresis (3 consecutive failures before alert) |

---

## Open Questions

- [ ] **Bi-directional Notion sync?** Should dashboard updates push back to Notion, or make Supabase fully authoritative?
  - **Recommendation:** Start with Supabase authoritative, Notion as read-only sync. Add push-back later if needed.

- [ ] **Alert channels?** Discord + GitHub Issues, or add Slack/Email?
  - **Recommendation:** Discord primary, GitHub Issues for tracking.

- [ ] **Health check frequency?** 5 min vs 15 min?
  - **Recommendation:** 15 min to stay within API limits, with manual check option.

---

## Success Criteria

1. Goals can be updated from dashboard with full history tracking
2. All 28 Vercel projects have health scores
3. Health checks run automatically every 15 minutes
4. Dashboard shows health trends over 7 days
5. Alerts fire when health drops below 70%
6. Deployment history visible for each site

---

## Estimated Total Effort

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Phase 1: Database | 2-3 hours | 2-3 hours |
| Phase 2: Health Service | 3-4 hours | 5-7 hours |
| Phase 3: Goals Service | 2-3 hours | 7-10 hours |
| Phase 4: API Endpoints | 3-4 hours | 10-14 hours |
| Phase 5: GitHub Actions | 1-2 hours | 11-16 hours |
| Phase 6: Dashboard | 4-5 hours | 15-21 hours |

**Total: 15-21 hours** (2-3 days of focused work)
