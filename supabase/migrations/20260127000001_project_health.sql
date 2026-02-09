-- Project Health System (BUNYA)
-- Purpose: Track project health scores and metrics
-- Named after Bunya pines - sentinels watching over the forest
-- Created: 2026-01-27

-- =============================================================================
-- PROJECT HEALTH TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project reference
    project_code TEXT NOT NULL,
    project_name TEXT,

    -- Health scores (0-100)
    overall_score INTEGER DEFAULT 50 CHECK (overall_score BETWEEN 0 AND 100),
    momentum_score INTEGER CHECK (momentum_score BETWEEN 0 AND 100),  -- Recent activity
    engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),  -- Team involvement
    financial_score INTEGER CHECK (financial_score BETWEEN 0 AND 100),  -- Budget health
    timeline_score INTEGER CHECK (timeline_score BETWEEN 0 AND 100),  -- On schedule?

    -- Status
    health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('thriving', 'healthy', 'attention', 'critical', 'dormant')),

    -- Metrics used for calculation
    metrics JSONB DEFAULT '{}',
    -- {
    --   commits_last_30d: number,
    --   tasks_completed: number,
    --   tasks_overdue: number,
    --   invoices_outstanding: number,
    --   days_since_last_update: number,
    --   team_members_active: number
    -- }

    -- Alerts
    alerts JSONB DEFAULT '[]',
    -- [{ type: 'stale', message: 'No updates in 14 days', severity: 'warning' }]

    -- Calculation metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_version TEXT DEFAULT '1.0',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_health_code ON project_health(project_code);
CREATE INDEX IF NOT EXISTS idx_project_health_status ON project_health(health_status);
CREATE INDEX IF NOT EXISTS idx_project_health_score ON project_health(overall_score DESC);

-- =============================================================================
-- PROJECT HEALTH HISTORY
-- Track health changes over time
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_code TEXT NOT NULL,

    -- Snapshot of scores
    overall_score INTEGER,
    momentum_score INTEGER,
    engagement_score INTEGER,
    financial_score INTEGER,
    timeline_score INTEGER,
    health_status TEXT,

    -- What changed
    score_delta INTEGER,  -- Change from previous
    alerts_count INTEGER,

    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_code, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_health_history_code ON project_health_history(project_code);
CREATE INDEX IF NOT EXISTS idx_health_history_date ON project_health_history(snapshot_date DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Projects needing attention
CREATE OR REPLACE VIEW v_projects_needing_attention AS
SELECT
    project_code,
    project_name,
    overall_score,
    health_status,
    momentum_score,
    alerts,
    calculated_at,
    CURRENT_TIMESTAMP - calculated_at as time_since_calculation
FROM project_health
WHERE health_status IN ('attention', 'critical')
   OR overall_score < 50
ORDER BY overall_score ASC;

-- Project health summary
CREATE OR REPLACE VIEW v_project_health_summary AS
SELECT
    health_status,
    COUNT(*) as project_count,
    ROUND(AVG(overall_score), 1) as avg_score,
    MIN(overall_score) as min_score,
    MAX(overall_score) as max_score
FROM project_health
GROUP BY health_status
ORDER BY
    CASE health_status
        WHEN 'critical' THEN 1
        WHEN 'attention' THEN 2
        WHEN 'healthy' THEN 3
        WHEN 'thriving' THEN 4
        WHEN 'dormant' THEN 5
    END;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate health status from score
CREATE OR REPLACE FUNCTION calculate_health_status(score INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN score >= 80 THEN 'thriving'
        WHEN score >= 60 THEN 'healthy'
        WHEN score >= 40 THEN 'attention'
        WHEN score >= 20 THEN 'critical'
        ELSE 'dormant'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_project_health_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.health_status = calculate_health_status(NEW.overall_score);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_health_updated ON project_health;
CREATE TRIGGER trigger_project_health_updated
    BEFORE UPDATE ON project_health
    FOR EACH ROW EXECUTE FUNCTION update_project_health_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE project_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_health_all ON project_health
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'pm', 'service_role'));

CREATE POLICY project_health_history_all ON project_health_history
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'pm', 'service_role'));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE project_health IS 'BUNYA: Project health monitoring - scores and alerts';
COMMENT ON TABLE project_health_history IS 'Historical snapshots of project health for trend analysis';
COMMENT ON COLUMN project_health.momentum_score IS 'Activity level - commits, updates, communications';
COMMENT ON COLUMN project_health.engagement_score IS 'Team involvement - active contributors, meetings';
COMMENT ON COLUMN project_health.financial_score IS 'Budget health - spend vs budget, invoice status';
COMMENT ON COLUMN project_health.timeline_score IS 'Schedule adherence - milestones, deadlines';
COMMENT ON VIEW v_projects_needing_attention IS 'Projects with attention or critical status';
