-- Grant Opportunities System (ALTA)
-- Purpose: Track grant opportunities and applications
-- Named after the Alta tree - reaching high for opportunities
-- Created: 2026-01-27

-- =============================================================================
-- GRANT OPPORTUNITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS grant_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name TEXT NOT NULL,
    provider TEXT NOT NULL,  -- Funding body
    program TEXT,  -- Specific program name

    -- Financial
    amount_min DECIMAL(12,2),
    amount_max DECIMAL(12,2),
    currency TEXT DEFAULT 'AUD',

    -- Dates
    opens_at DATE,
    closes_at DATE,
    decision_date DATE,

    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('upcoming', 'open', 'closed', 'applied', 'successful', 'unsuccessful', 'withdrawn')),

    -- Eligibility
    eligibility_criteria JSONB DEFAULT '[]',
    -- [{ criterion: 'NFP status', met: true }, ...]
    eligibility_score INTEGER CHECK (eligibility_score BETWEEN 0 AND 100),

    -- Fit assessment
    fit_score INTEGER CHECK (fit_score BETWEEN 0 AND 100),
    fit_notes TEXT,
    aligned_projects TEXT[],  -- Project codes this could fund

    -- Categories
    categories TEXT[],  -- ['arts', 'technology', 'indigenous', 'social-impact']
    focus_areas TEXT[],  -- ['digital-inclusion', 'first-nations', 'rural']

    -- Links
    url TEXT,
    guidelines_url TEXT,
    application_portal_url TEXT,

    -- Discovery
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    discovered_by TEXT,  -- 'manual', 'alta_agent', 'email_scan'

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grants_status ON grant_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_grants_closes ON grant_opportunities(closes_at);
CREATE INDEX IF NOT EXISTS idx_grants_fit ON grant_opportunities(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_grants_categories ON grant_opportunities USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_grants_provider ON grant_opportunities(provider);

-- =============================================================================
-- GRANT APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS grant_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    opportunity_id UUID REFERENCES grant_opportunities(id) ON DELETE SET NULL,

    -- Application details
    application_name TEXT NOT NULL,
    amount_requested DECIMAL(12,2),

    -- Status tracking
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'under_review', 'successful', 'unsuccessful', 'withdrawn')),

    -- Timeline
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    outcome_at TIMESTAMPTZ,

    -- Key dates
    milestones JSONB DEFAULT '[]',
    -- [{ name: 'First draft', due: '2026-02-01', completed: true }, ...]

    -- Documents
    documents JSONB DEFAULT '[]',
    -- [{ name: 'Budget', url: '...', status: 'complete' }, ...]

    -- Team
    lead_contact TEXT,
    team_members TEXT[],

    -- Outcome
    outcome_amount DECIMAL(12,2),
    outcome_notes TEXT,

    -- Project link
    project_code TEXT,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON grant_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON grant_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_project ON grant_applications(project_code);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Open opportunities with deadlines
CREATE OR REPLACE VIEW v_open_grant_opportunities AS
SELECT
    id,
    name,
    provider,
    program,
    amount_min,
    amount_max,
    closes_at,
    closes_at - CURRENT_DATE as days_until_close,
    fit_score,
    eligibility_score,
    aligned_projects,
    categories,
    url
FROM grant_opportunities
WHERE status = 'open'
  AND (closes_at IS NULL OR closes_at >= CURRENT_DATE)
ORDER BY
    CASE WHEN closes_at IS NULL THEN 1 ELSE 0 END,
    closes_at ASC;

-- Application pipeline
CREATE OR REPLACE VIEW v_grant_pipeline AS
SELECT
    ga.id,
    ga.application_name,
    ga.status,
    ga.amount_requested,
    ga.submitted_at,
    ga.project_code,
    go.name as opportunity_name,
    go.provider,
    go.closes_at
FROM grant_applications ga
LEFT JOIN grant_opportunities go ON ga.opportunity_id = go.id
WHERE ga.status NOT IN ('unsuccessful', 'withdrawn')
ORDER BY
    CASE ga.status
        WHEN 'draft' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'submitted' THEN 3
        WHEN 'under_review' THEN 4
        WHEN 'successful' THEN 5
    END,
    go.closes_at ASC;

-- Grant success metrics
CREATE OR REPLACE VIEW v_grant_metrics AS
SELECT
    COUNT(*) FILTER (WHERE status = 'successful') as successful_count,
    COUNT(*) FILTER (WHERE status = 'unsuccessful') as unsuccessful_count,
    COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress', 'submitted', 'under_review')) as active_count,
    COALESCE(SUM(outcome_amount) FILTER (WHERE status = 'successful'), 0) as total_awarded,
    COALESCE(SUM(amount_requested) FILTER (WHERE status IN ('submitted', 'under_review')), 0) as pending_amount,
    CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('successful', 'unsuccessful')) > 0
        THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'successful') /
             COUNT(*) FILTER (WHERE status IN ('successful', 'unsuccessful')), 1)
        ELSE 0
    END as success_rate
FROM grant_applications;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_grant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grants_updated ON grant_opportunities;
CREATE TRIGGER trigger_grants_updated
    BEFORE UPDATE ON grant_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_grant_timestamp();

DROP TRIGGER IF EXISTS trigger_applications_updated ON grant_applications;
CREATE TRIGGER trigger_applications_updated
    BEFORE UPDATE ON grant_applications
    FOR EACH ROW EXECUTE FUNCTION update_grant_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE grant_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY grants_all ON grant_opportunities
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'pm', 'finance', 'service_role'));

CREATE POLICY applications_all ON grant_applications
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'pm', 'finance', 'service_role'));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE grant_opportunities IS 'ALTA: Grant opportunity tracking and discovery';
COMMENT ON TABLE grant_applications IS 'Grant application tracking and pipeline';
COMMENT ON COLUMN grant_opportunities.fit_score IS 'How well this grant aligns with ACT mission (0-100)';
COMMENT ON COLUMN grant_opportunities.eligibility_score IS 'How well ACT meets eligibility criteria (0-100)';
COMMENT ON COLUMN grant_opportunities.aligned_projects IS 'ACT project codes that could benefit from this grant';
COMMENT ON VIEW v_open_grant_opportunities IS 'Currently open opportunities sorted by deadline';
COMMENT ON VIEW v_grant_pipeline IS 'Active grant applications in progress';
COMMENT ON VIEW v_grant_metrics IS 'Success rates and totals for grant applications';
