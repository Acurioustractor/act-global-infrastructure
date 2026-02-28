-- Unified Opportunity Pipeline — Phase 3
-- Single pipeline combining grants, deals, investments, land equity, community capital
-- Plus 10-year revenue scenario modelling

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: opportunities_unified
-- Single table combining all opportunity types
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS opportunities_unified (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Type & source
  opportunity_type text NOT NULL CHECK (opportunity_type IN (
    'grant', 'deal', 'investment', 'land_equity', 'community_capital', 'donation', 'earned_revenue'
  )),
  source_system text NOT NULL, -- 'grant_opportunities', 'ghl_opportunities', 'fundraising_pipeline', 'manual'
  source_id text,              -- ID in source system (for dedup)

  -- Core fields
  title text NOT NULL,
  description text,
  contact_name text,           -- funder, client, investor name

  -- Value (supports range estimates)
  value_low numeric DEFAULT 0,
  value_mid numeric DEFAULT 0,
  value_high numeric DEFAULT 0,
  value_type text DEFAULT 'cash' CHECK (value_type IN ('cash', 'equity', 'in_kind', 'land_value', 'mixed')),

  -- Pipeline stage
  stage text NOT NULL DEFAULT 'identified' CHECK (stage IN (
    'identified', 'researching', 'pursuing', 'submitted', 'negotiating', 'approved', 'realized', 'lost', 'expired'
  )),
  probability numeric DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),

  -- Associations
  project_codes text[] DEFAULT '{}',
  contact_ids uuid[] DEFAULT '{}',

  -- Effort & ROI
  effort_hours numeric,        -- estimated effort to pursue
  expected_close date,         -- when we expect to realize value
  actual_close date,           -- when value was actually realized

  -- Metadata
  url text,
  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ou_type ON opportunities_unified(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_ou_stage ON opportunities_unified(stage);
CREATE INDEX IF NOT EXISTS idx_ou_projects ON opportunities_unified USING gin(project_codes);
CREATE INDEX IF NOT EXISTS idx_ou_source ON opportunities_unified(source_system, source_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: opportunity_stage_history
-- Audit trail for stage changes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS opportunity_stage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES opportunities_unified(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by text DEFAULT 'system',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osh_opportunity ON opportunity_stage_history(opportunity_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: revenue_scenarios
-- 10-year revenue models: conservative / moderate / aggressive
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS revenue_scenarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE, -- 'conservative', 'moderate', 'aggressive'
  description text,
  assumptions jsonb DEFAULT '{}', -- { "annual_growth": 0.10, "new_streams_year": 3, ... }
  annual_targets jsonb DEFAULT '{}', -- { "2026": 500000, "2027": 550000, ... }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: revenue_stream_projections
-- Per-stream per-year projections by scenario
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS revenue_stream_projections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id uuid NOT NULL REFERENCES revenue_scenarios(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES revenue_streams(id) ON DELETE CASCADE,
  year int NOT NULL,
  projected_annual numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),

  UNIQUE(scenario_id, stream_id, year)
);

CREATE INDEX IF NOT EXISTS idx_rsp_scenario ON revenue_stream_projections(scenario_id);
CREATE INDEX IF NOT EXISTS idx_rsp_year ON revenue_stream_projections(year);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEW: v_pipeline_value
-- Weighted value by type and stage
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW v_pipeline_value AS
SELECT
  opportunity_type,
  stage,
  count(*) AS opportunity_count,
  sum(value_mid) AS total_value,
  sum(value_mid * probability / 100) AS weighted_value,
  avg(probability) AS avg_probability
FROM opportunities_unified
WHERE stage NOT IN ('realized', 'lost', 'expired')
GROUP BY opportunity_type, stage
ORDER BY opportunity_type, stage;
