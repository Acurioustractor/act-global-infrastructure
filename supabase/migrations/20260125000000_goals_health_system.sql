-- ACT Goals & Ecosystem Health Monitoring System
-- Migration for comprehensive goal tracking and multi-layer health monitoring

-- ============================================================================
-- GOAL UPDATES TABLE - Track all changes to goals
-- ============================================================================

CREATE TABLE IF NOT EXISTS goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals_2026(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  source TEXT NOT NULL DEFAULT 'dashboard', -- 'dashboard', 'notion_sync', 'api', 'agent'
  updated_by TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_updates_goal_id ON goal_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_updates_created_at ON goal_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_updates_source ON goal_updates(source);

-- Enable RLS
ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON goal_updates
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- GOAL METRICS TABLE - KPI tracking for key results
-- ============================================================================

CREATE TABLE IF NOT EXISTS goal_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals_2026(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'number', -- 'number', 'percentage', 'currency', 'boolean'
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- 'users', 'dollars', 'stories', '%', etc.
  value_history JSONB DEFAULT '[]', -- Array of {value, timestamp}
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN target_value IS NULL OR target_value = 0 THEN 0
      ELSE LEAST(100, ROUND((current_value / target_value) * 100, 2))
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_metrics_goal_id ON goal_metrics(goal_id);

-- Enable RLS
ALTER TABLE goal_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON goal_metrics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER goal_metrics_updated_at
  BEFORE UPDATE ON goal_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_2026_updated_at();

-- ============================================================================
-- SITE HEALTH CHECKS TABLE - Historical health check results
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES ecosystem_sites(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT now(),

  -- Layer 1: HTTP Health
  http_status INTEGER,
  http_response_time_ms INTEGER,
  http_error TEXT,
  ssl_valid BOOLEAN,
  ssl_expires_at TIMESTAMPTZ,

  -- Layer 2: Vercel Health
  vercel_deployment_status TEXT, -- 'READY', 'BUILDING', 'ERROR', 'QUEUED', 'CANCELED'
  vercel_deployment_id TEXT,
  vercel_build_time_seconds INTEGER,
  vercel_error TEXT,

  -- Layer 3: GitHub Health
  github_last_commit_at TIMESTAMPTZ,
  github_last_commit_sha TEXT,
  github_open_prs INTEGER DEFAULT 0,
  github_failed_checks INTEGER DEFAULT 0,
  github_security_alerts INTEGER DEFAULT 0,

  -- Aggregate Score
  health_score INTEGER DEFAULT 0, -- 0-100
  health_status TEXT DEFAULT 'unknown', -- 'healthy', 'degraded', 'critical', 'offline', 'unknown'

  -- Raw data storage
  raw_data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_site_health_checks_site_id ON site_health_checks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_health_checks_checked_at ON site_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_health_checks_health_status ON site_health_checks(health_status);

-- Enable RLS
ALTER TABLE site_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON site_health_checks
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- SITE DEPLOYMENTS TABLE - Vercel deployment history
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES ecosystem_sites(id) ON DELETE CASCADE,
  vercel_deployment_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- 'READY', 'BUILDING', 'ERROR', 'QUEUED', 'CANCELED'
  environment TEXT DEFAULT 'production', -- 'production', 'preview', 'development'
  git_commit_sha TEXT,
  git_commit_message TEXT,
  git_branch TEXT,
  build_duration_seconds INTEGER,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_deployments_site_id ON site_deployments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_deployments_deployed_at ON site_deployments(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_deployments_vercel_id ON site_deployments(vercel_deployment_id);

-- Enable RLS
ALTER TABLE site_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON site_deployments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- HEALTH ALERTS TABLE - Track health degradation events
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES ecosystem_sites(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'degraded', 'critical', 'offline', 'recovered', 'ssl_expiring'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  previous_score INTEGER,
  current_score INTEGER,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_alerts_site_id ON health_alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_health_alerts_created_at ON health_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_alerts_resolved ON health_alerts(resolved);

-- Enable RLS
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON health_alerts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- ENHANCE GOALS_2026 TABLE
-- ============================================================================

-- Add progress tracking fields
ALTER TABLE goals_2026
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS last_update_source TEXT DEFAULT 'notion_sync';

-- ============================================================================
-- ENHANCE ECOSYSTEM_SITES TABLE
-- ============================================================================

-- Add health monitoring fields
ALTER TABLE ecosystem_sites
  ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
  ADD COLUMN IF NOT EXISTS vercel_project_name TEXT,
  ADD COLUMN IF NOT EXISTS github_repo TEXT, -- Format: 'owner/repo'
  ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_trend TEXT DEFAULT 'stable', -- 'up', 'down', 'stable'
  ADD COLUMN IF NOT EXISTS last_deployment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMPTZ;

-- ============================================================================
-- TRIGGER: Auto-log goal updates
-- ============================================================================

CREATE OR REPLACE FUNCTION log_goal_update()
RETURNS TRIGGER AS $$
DECLARE
  field_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Track changes to key fields
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'title', OLD.title, NEW.title, COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;

  IF OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'progress_percentage', OLD.progress_percentage::TEXT, NEW.progress_percentage::TEXT, COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;

  IF OLD.lane IS DISTINCT FROM NEW.lane THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'lane', OLD.lane, NEW.lane, COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;

  IF OLD.key_results IS DISTINCT FROM NEW.key_results THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'key_results', OLD.key_results, NEW.key_results, COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;

  IF OLD.owner IS DISTINCT FROM NEW.owner THEN
    INSERT INTO goal_updates (goal_id, field_changed, old_value, new_value, source, updated_by)
    VALUES (NEW.id, 'owner', OLD.owner::TEXT, NEW.owner::TEXT, COALESCE(NEW.last_update_source, 'unknown'), NEW.last_updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS goal_update_logger ON goals_2026;
CREATE TRIGGER goal_update_logger
  AFTER UPDATE ON goals_2026
  FOR EACH ROW
  EXECUTE FUNCTION log_goal_update();

-- ============================================================================
-- TRIGGER: Update ecosystem_sites status from health checks
-- ============================================================================

CREATE OR REPLACE FUNCTION update_site_health_from_check()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ecosystem_sites
  SET
    status = NEW.health_status,
    health_score = NEW.health_score,
    last_check_at = NEW.checked_at,
    response_time_ms = NEW.http_response_time_ms,
    ssl_expires_at = NEW.ssl_expires_at,
    updated_at = now()
  WHERE id = NEW.site_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_health_check_update ON site_health_checks;
CREATE TRIGGER site_health_check_update
  AFTER INSERT ON site_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_site_health_from_check();

-- ============================================================================
-- TRIGGER: Create alert on health degradation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_health_alert()
RETURNS TRIGGER AS $$
DECLARE
  prev_score INTEGER;
  site_name TEXT;
BEGIN
  -- Get previous health score
  SELECT health_score INTO prev_score
  FROM site_health_checks
  WHERE site_id = NEW.site_id AND id != NEW.id
  ORDER BY checked_at DESC
  LIMIT 1;

  -- Get site name
  SELECT name INTO site_name FROM ecosystem_sites WHERE id = NEW.site_id;

  -- Create alert if score dropped significantly (20+ points) or status is critical/offline
  IF prev_score IS NOT NULL AND (prev_score - NEW.health_score) >= 20 THEN
    INSERT INTO health_alerts (site_id, alert_type, severity, message, previous_score, current_score)
    VALUES (
      NEW.site_id,
      'degraded',
      CASE
        WHEN NEW.health_score < 50 THEN 'critical'
        ELSE 'warning'
      END,
      site_name || ' health dropped from ' || prev_score || ' to ' || NEW.health_score,
      prev_score,
      NEW.health_score
    );
  END IF;

  -- Create critical alert
  IF NEW.health_status IN ('critical', 'offline') THEN
    INSERT INTO health_alerts (site_id, alert_type, severity, message, current_score)
    VALUES (
      NEW.site_id,
      NEW.health_status,
      'critical',
      site_name || ' is ' || NEW.health_status || ' (score: ' || NEW.health_score || ')',
      NEW.health_score
    );
  END IF;

  -- Create recovery alert
  IF prev_score IS NOT NULL AND prev_score < 70 AND NEW.health_score >= 70 THEN
    INSERT INTO health_alerts (site_id, alert_type, severity, message, previous_score, current_score)
    VALUES (
      NEW.site_id,
      'recovered',
      'info',
      site_name || ' recovered from ' || prev_score || ' to ' || NEW.health_score,
      prev_score,
      NEW.health_score
    );

    -- Resolve previous unresolved alerts for this site
    UPDATE health_alerts
    SET resolved = true, resolved_at = now()
    WHERE site_id = NEW.site_id AND resolved = false AND alert_type != 'recovered';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_alert_trigger ON site_health_checks;
CREATE TRIGGER health_alert_trigger
  AFTER INSERT ON site_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION create_health_alert();

-- ============================================================================
-- FUNCTION: Calculate health trend
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_health_trend(p_site_id UUID)
RETURNS TEXT AS $$
DECLARE
  recent_avg NUMERIC;
  older_avg NUMERIC;
BEGIN
  -- Get average of last 4 checks
  SELECT AVG(health_score) INTO recent_avg
  FROM (
    SELECT health_score FROM site_health_checks
    WHERE site_id = p_site_id
    ORDER BY checked_at DESC
    LIMIT 4
  ) recent;

  -- Get average of previous 4 checks
  SELECT AVG(health_score) INTO older_avg
  FROM (
    SELECT health_score FROM site_health_checks
    WHERE site_id = p_site_id
    ORDER BY checked_at DESC
    LIMIT 4 OFFSET 4
  ) older;

  IF older_avg IS NULL THEN
    RETURN 'stable';
  ELSIF recent_avg > older_avg + 5 THEN
    RETURN 'up';
  ELSIF recent_avg < older_avg - 5 THEN
    RETURN 'down';
  ELSE
    RETURN 'stable';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Latest health check per site
-- ============================================================================

CREATE OR REPLACE VIEW site_latest_health AS
SELECT DISTINCT ON (site_id)
  shc.*,
  es.name as site_name,
  es.slug as site_slug,
  es.url as site_url
FROM site_health_checks shc
JOIN ecosystem_sites es ON es.id = shc.site_id
ORDER BY site_id, checked_at DESC;

-- ============================================================================
-- VIEW: Goal progress summary
-- ============================================================================

CREATE OR REPLACE VIEW goal_progress_summary AS
SELECT
  g.id,
  g.title,
  g.type,
  g.lane,
  g.status,
  g.progress_percentage,
  g.owner,
  g.due_date,
  (SELECT COUNT(*) FROM goal_updates WHERE goal_id = g.id) as update_count,
  (SELECT MAX(created_at) FROM goal_updates WHERE goal_id = g.id) as last_update_at,
  (SELECT COUNT(*) FROM goal_metrics WHERE goal_id = g.id) as metric_count,
  (SELECT AVG(progress_percentage) FROM goal_metrics WHERE goal_id = g.id) as avg_metric_progress
FROM goals_2026 g;
