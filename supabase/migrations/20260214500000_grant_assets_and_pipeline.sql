-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Grant Assets & Auto-Pipeline
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. grant_assets: Reusable documents/info that many grants need
-- 2. grant_requirement_types: What categories of docs grants commonly need
-- 3. grant_application_requirements: Links requirements to specific applications
-- 4. Adds auto-pipeline columns to grant_applications

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Grant Assets: Reusable documents and information
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS grant_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of asset
  category TEXT NOT NULL, -- 'financial', 'legal', 'organisational', 'support', 'personnel', 'project'
  asset_type TEXT NOT NULL, -- specific type within category

  -- Details
  name TEXT NOT NULL,
  description TEXT,

  -- The actual content or reference
  file_url TEXT,           -- link to stored document (Google Drive, etc)
  content_text TEXT,       -- inline text content (for short items like ABN)

  -- Validity
  valid_from DATE,
  expires_at DATE,         -- when this document expires (e.g., insurance cert)
  is_current BOOLEAN DEFAULT true,

  -- Metadata
  project_code TEXT,       -- null = org-wide, set = project-specific
  last_verified_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with common grant requirement types
INSERT INTO grant_assets (category, asset_type, name, description, is_current) VALUES
  -- Financial
  ('financial', 'annual_report', 'Annual Financial Statements', 'Audited or reviewed financial statements (last 2 years)', false),
  ('financial', 'budget_template', 'Project Budget Template', 'Detailed project budget with line items', false),
  ('financial', 'bank_statement', 'Organisation Bank Statement', 'Recent bank statement showing account details', false),
  ('financial', 'audit_report', 'Independent Audit Report', 'Most recent audit report if revenue > $250K', false),

  -- Legal / Registration
  ('legal', 'abn', 'ABN', 'Australian Business Number', false),
  ('legal', 'acn', 'ACN / Certificate of Incorporation', 'Company registration certificate', false),
  ('legal', 'nfp_status', 'NFP Status Confirmation', 'DGR / ACNC registration proof', false),
  ('legal', 'constitution', 'Constitution / Rules', 'Organisation governing document', false),
  ('legal', 'insurance_public_liability', 'Public Liability Insurance', 'Certificate of currency - public liability', false),
  ('legal', 'insurance_professional', 'Professional Indemnity Insurance', 'Certificate of currency - PI', false),
  ('legal', 'insurance_workers_comp', 'Workers Compensation Insurance', 'Certificate of currency - workers comp', false),

  -- Organisational
  ('organisational', 'capability_statement', 'Capability Statement', 'Organisation profile, track record, and capabilities', false),
  ('organisational', 'org_chart', 'Organisation Chart', 'Board and staff structure', false),
  ('organisational', 'strategic_plan', 'Strategic Plan', 'Current strategic plan or business plan', false),
  ('organisational', 'annual_report_narrative', 'Annual Report (Narrative)', 'Non-financial annual report with achievements', false),
  ('organisational', 'risk_management', 'Risk Management Plan', 'Organisational risk assessment and mitigation', false),

  -- Support
  ('support', 'letter_of_support_template', 'Letter of Support Template', 'Template for partners/community to provide support letters', false),
  ('support', 'partnership_agreement', 'Partnership Agreement Template', 'MOU or partnership agreement for collaborators', false),
  ('support', 'community_endorsement', 'Community Endorsement', 'Endorsement from community leaders / Elders', false),

  -- Personnel
  ('personnel', 'cv_benjamin', 'Benjamin Knight - CV', 'Founder/Director CV and bio', false),
  ('personnel', 'cv_nicholas', 'Nicholas Knight - CV', 'Co-Director CV and bio', false),
  ('personnel', 'referee_details', 'Referee Contact Details', 'Professional and community referees', false),

  -- Project-specific (templates)
  ('project', 'project_plan_template', 'Project Plan Template', 'Gantt chart / timeline template for project delivery', false),
  ('project', 'evaluation_framework', 'Evaluation Framework', 'M&E framework for measuring impact', false),
  ('project', 'theory_of_change', 'Theory of Change', 'Logic model / theory of change diagram', false),
  ('project', 'impact_measurement', 'Impact Measurement Plan', 'How outcomes will be measured and reported', false)
ON CONFLICT DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Grant Application Requirements: What each application needs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS grant_application_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES grant_applications(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES grant_assets(id),

  -- What's needed
  requirement_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,  -- matches grant_assets.asset_type

  -- Status
  status TEXT DEFAULT 'needed', -- 'needed', 'in_progress', 'ready', 'submitted', 'not_applicable'

  -- Notes
  notes TEXT,
  due_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Auto-pipeline columns on grant_applications
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Add auto_created flag and assigned contact
ALTER TABLE grant_applications
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS estimated_effort TEXT;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- View: Grant readiness (how ready we are to apply)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW v_grant_readiness AS
SELECT
  ga.id as application_id,
  go.name as grant_name,
  go.provider,
  go.fit_score,
  go.amount_max,
  go.closes_at,
  ga.status as application_status,
  ga.lead_contact,
  ga.assigned_to,
  ga.priority,
  -- Requirement counts
  COALESCE(req.total_requirements, 0) as total_requirements,
  COALESCE(req.ready_count, 0) as ready_count,
  COALESCE(req.needed_count, 0) as needed_count,
  CASE
    WHEN COALESCE(req.total_requirements, 0) = 0 THEN 0
    ELSE ROUND(COALESCE(req.ready_count, 0)::numeric / req.total_requirements * 100)
  END as readiness_pct,
  -- Milestone counts
  COALESCE(ms.total_milestones, 0) as total_milestones,
  COALESCE(ms.completed_milestones, 0) as completed_milestones
FROM grant_applications ga
JOIN grant_opportunities go ON ga.opportunity_id = go.id
LEFT JOIN (
  SELECT
    application_id,
    COUNT(*) as total_requirements,
    COUNT(*) FILTER (WHERE status = 'ready' OR status = 'submitted') as ready_count,
    COUNT(*) FILTER (WHERE status = 'needed') as needed_count
  FROM grant_application_requirements
  GROUP BY application_id
) req ON req.application_id = ga.id
LEFT JOIN LATERAL (
  SELECT
    jsonb_array_length(ga.milestones) as total_milestones,
    (SELECT COUNT(*) FROM jsonb_array_elements(ga.milestones) m WHERE (m->>'completed')::boolean = true) as completed_milestones
) ms ON true
WHERE ga.status NOT IN ('withdrawn', 'unsuccessful')
ORDER BY go.closes_at ASC NULLS LAST;
