-- Strategic Alignment Layer
-- Connects purpose → money → action across all projects

-- Table: project_strategic_profile
-- Per-project strategic metadata bridging static config and dynamic financials
CREATE TABLE IF NOT EXISTS project_strategic_profile (
  project_code text PRIMARY KEY REFERENCES projects(code),
  revenue_model text CHECK (revenue_model IN ('saas', 'grant_funded', 'fee_for_service', 'internal', 'hybrid')),
  time_to_revenue text,
  product_readiness_pct int CHECK (product_readiness_pct BETWEEN 0 AND 100),
  rd_eligible boolean DEFAULT false,
  rd_category text CHECK (rd_category IN ('core', 'supporting', 'not_eligible')),
  tam_annual numeric,
  sam_annual numeric,
  one_liner text,
  biggest_blocker text,
  fastest_win text,
  independence_score int CHECK (independence_score BETWEEN 0 AND 100),
  contributes_to text[] DEFAULT '{}',
  depends_on text[] DEFAULT '{}',
  feeds_into text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: strategic_objectives
-- Hierarchical goals with financial targets and measurable key results
CREATE TABLE IF NOT EXISTS strategic_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  objective_type text NOT NULL CHECK (objective_type IN ('north_star', 'annual_target', 'quarterly_goal', 'milestone')),
  parent_id uuid REFERENCES strategic_objectives(id),
  project_codes text[] DEFAULT '{}',
  revenue_target numeric,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'blocked', 'completed')),
  progress_pct int DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  target_quarter text,
  target_date date,
  owner text,
  flywheel_segment text CHECK (flywheel_segment IN ('community_impact', 'evidence_stories', 'funding', 'platform_dev', 'revenue', 'rd_refund')),
  key_results jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_strategic_objectives_parent ON strategic_objectives(parent_id);
CREATE INDEX idx_strategic_objectives_type ON strategic_objectives(objective_type);
CREATE INDEX idx_strategic_objectives_status ON strategic_objectives(status);
CREATE INDEX idx_strategic_objectives_quarter ON strategic_objectives(target_quarter);

-- View: v_project_strategic_summary
-- Single query for the strategy page — joins strategic profile + projects + budgets + opportunity counts
CREATE OR REPLACE VIEW v_project_strategic_summary AS
SELECT
  p.code,
  p.name,
  p.tier,
  p.status AS project_status,
  p.category,
  sp.revenue_model,
  sp.time_to_revenue,
  sp.product_readiness_pct,
  sp.rd_eligible,
  sp.rd_category,
  sp.tam_annual,
  sp.sam_annual,
  sp.one_liner,
  sp.biggest_blocker,
  sp.fastest_win,
  sp.independence_score,
  sp.contributes_to,
  sp.depends_on,
  sp.feeds_into,
  COALESCE(bud.expense_budget, 0) AS annual_budget,
  COALESCE(bud.revenue_budget, 0) AS annual_revenue_target,
  COALESCE(fin.total_revenue, 0) AS fy_revenue,
  COALESCE(fin.total_expenses, 0) AS fy_expenses,
  COALESCE(fin.total_revenue, 0) + COALESCE(fin.total_expenses, 0) AS fy_net,
  COALESCE(opp.opp_count, 0) AS pipeline_count,
  COALESCE(opp.weighted_value, 0) AS pipeline_weighted
FROM projects p
LEFT JOIN project_strategic_profile sp ON sp.project_code = p.code
LEFT JOIN (
  SELECT
    project_code,
    SUM(CASE WHEN budget_type = 'expense' THEN budget_amount ELSE 0 END) AS expense_budget,
    SUM(CASE WHEN budget_type IN ('revenue', 'grant') THEN budget_amount ELSE 0 END) AS revenue_budget
  FROM project_budgets
  WHERE fy_year = 'FY26'
  GROUP BY project_code
) bud ON bud.project_code = p.code
LEFT JOIN (
  SELECT
    project_code,
    SUM(revenue) AS total_revenue,
    SUM(expenses) AS total_expenses
  FROM project_monthly_financials
  WHERE month >= '2025-07-01'
  GROUP BY project_code
) fin ON fin.project_code = p.code
LEFT JOIN (
  SELECT
    unnest(project_codes) AS project_code,
    COUNT(*) AS opp_count,
    SUM(value_mid * probability / 100) AS weighted_value
  FROM opportunities_unified
  WHERE stage NOT IN ('lost', 'expired')
  GROUP BY unnest(project_codes)
) opp ON opp.project_code = p.code
WHERE p.status = 'active' OR sp.project_code IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_strategic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_strategic_profile_updated
  BEFORE UPDATE ON project_strategic_profile
  FOR EACH ROW EXECUTE FUNCTION update_strategic_updated_at();

CREATE TRIGGER trg_strategic_objectives_updated
  BEFORE UPDATE ON strategic_objectives
  FOR EACH ROW EXECUTE FUNCTION update_strategic_updated_at();

-- ============================================================
-- SEED DATA: Project Strategic Profiles (7 core ecosystem projects)
-- ============================================================

INSERT INTO project_strategic_profile (
  project_code, revenue_model, time_to_revenue, product_readiness_pct,
  rd_eligible, rd_category, tam_annual, sam_annual,
  one_liner, biggest_blocker, fastest_win,
  independence_score, contributes_to, depends_on, feeds_into
) VALUES
  ('ACT-EL', 'saas', '4-6 weeks', 95,
   true, 'core', 30000000, 10000000,
   '95% complete — needs Stripe billing + pricing tiers to launch',
   'No billing integration yet', 'Launch pilot with 3 partner orgs at $500/mo',
   35, ARRAY['revenue', 'rd_evidence', 'community_impact'], ARRAY['ACT-IN'], ARRAY['ACT-HV', 'ACT-GD']),

  ('ACT-GD', 'fee_for_service', '2-4 weeks', 80,
   true, 'supporting', 5000000, 2000000,
   '80% ready — fleet telemetry live, needs marketplace + pricing',
   'Marketplace feature incomplete', 'Expand laundry service contracts to 3 new communities',
   45, ARRAY['revenue', 'rd_evidence', 'community_impact'], ARRAY[]::text[], ARRAY['ACT-EL']),

  ('ACT-JH', 'saas', '8-12 weeks', 70,
   true, 'supporting', 20000000, 5000000,
   '70% ready — justice data platform needs court integration + user testing',
   'Court system API access pending', 'Partner with 2 legal aid orgs for pilot',
   25, ARRAY['rd_evidence', 'community_impact', 'funding_leverage'], ARRAY['ACT-IN'], ARRAY['ACT-EL']),

  ('ACT-IN', 'internal', NULL, 60,
   true, 'core', NULL, NULL,
   'AI infrastructure & bot intelligence — R&D vehicle, not revenue-generating',
   'Capacity — only 2 engineers', 'R&D tax registration by Apr 30 ($407K refund)',
   10, ARRAY['rd_evidence'], ARRAY[]::text[], ARRAY['ACT-EL', 'ACT-JH', 'ACT-GD']),

  ('ACT-HV', 'grant_funded', '6-8 weeks', 75,
   false, 'not_eligible', NULL, NULL,
   'Studio events + harvest gatherings — strong grant pipeline, needs recurring model',
   'Grant-dependent revenue cycle', 'Catalysing Impact pool application (closing soon)',
   30, ARRAY['community_impact', 'evidence_stories', 'funding_leverage'], ARRAY[]::text[], ARRAY['ACT-EL']),

  ('ACT-FM', 'grant_funded', NULL, 30,
   false, 'not_eligible', NULL, NULL,
   'Regenerative land project — early stage, land acquisition in progress',
   'Land acquisition funding', 'Black Cockatoo Valley partnership agreement',
   10, ARRAY['community_impact'], ARRAY[]::text[], ARRAY['ACT-HV']),

  ('ACT-PI', 'grant_funded', NULL, 65,
   false, 'not_eligible', NULL, NULL,
   'PICC partnership — $3.6M NIAA contract (Year 1 $1.2M active)',
   'NIAA reporting requirements', 'Q3 milestone report for next tranche release',
   20, ARRAY['community_impact', 'funding_leverage', 'evidence_stories'], ARRAY[]::text[], ARRAY['ACT-EL', 'ACT-GD'])
ON CONFLICT (project_code) DO NOTHING;

-- ============================================================
-- SEED DATA: Strategic Objectives Tree
-- ============================================================

-- North Star
INSERT INTO strategic_objectives (id, title, objective_type, flywheel_segment, status, progress_pct, owner, key_results)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Communities own their narratives, land, and economic futures',
  'north_star', 'community_impact', 'in_progress', 15, 'Ben',
  '[{"metric": "communities_with_data_sovereignty", "current": 2, "target": 10},
    {"metric": "community_owned_platforms", "current": 1, "target": 5}]'::jsonb
);

-- FY26 Annual Targets
INSERT INTO strategic_objectives (id, title, objective_type, parent_id, flywheel_segment, revenue_target, status, progress_pct, target_quarter, owner, project_codes, key_results)
VALUES
  ('a0000000-0000-0000-0000-000000000010',
   '$300K earned revenue by June 30',
   'annual_target', 'a0000000-0000-0000-0000-000000000001',
   'revenue', 300000, 'in_progress', 25, 'FY26', 'Ben',
   ARRAY['ACT-EL', 'ACT-GD', 'ACT-HV', 'ACT-CP'],
   '[{"metric": "earned_revenue_aud", "current": 284000, "target": 300000},
     {"metric": "paying_customers", "current": 0, "target": 5}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000011',
   '$407K R&D tax refund secured',
   'annual_target', 'a0000000-0000-0000-0000-000000000001',
   'rd_refund', 407000, 'in_progress', 40, 'FY26', 'Ben',
   ARRAY['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'],
   '[{"metric": "rd_registration_submitted", "current": 0, "target": 1},
     {"metric": "eligible_rd_spend", "current": 458000, "target": 937000}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000012',
   'First paying Empathy Ledger customer',
   'annual_target', 'a0000000-0000-0000-0000-000000000001',
   'revenue', 50000, 'not_started', 0, 'FY26', 'Ben',
   ARRAY['ACT-EL'],
   '[{"metric": "billing_integration_live", "current": 0, "target": 1},
     {"metric": "pilot_customers_onboarded", "current": 0, "target": 3}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000013',
   'GrantScope SaaS launch',
   'annual_target', 'a0000000-0000-0000-0000-000000000001',
   'platform_dev', 100000, 'in_progress', 60, 'FY26', 'Ben',
   ARRAY['ACT-IN'],
   '[{"metric": "foundations_enriched", "current": 9874, "target": 13000},
     {"metric": "grants_indexed", "current": 14119, "target": 20000},
     {"metric": "beta_users", "current": 0, "target": 50}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000014',
   'PICC Year 1 delivery + Year 2 negotiation',
   'annual_target', 'a0000000-0000-0000-0000-000000000001',
   'community_impact', 1200000, 'in_progress', 50, 'FY26', 'Nic',
   ARRAY['ACT-PI'],
   '[{"metric": "year1_milestones_delivered", "current": 3, "target": 6},
     {"metric": "year2_contract_signed", "current": 0, "target": 1}]'::jsonb);

-- Q3 FY26 Quarterly Goals (Jan-Mar 2026)
INSERT INTO strategic_objectives (id, title, objective_type, parent_id, flywheel_segment, revenue_target, status, progress_pct, target_quarter, target_date, owner, project_codes, key_results)
VALUES
  ('a0000000-0000-0000-0000-000000000020',
   'Google.org application submitted',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000010',
   'funding', 500000, 'in_progress', 70, 'FY26-Q3', '2026-03-31', 'Ben',
   ARRAY['ACT-EL', 'ACT-JH'],
   '[{"metric": "application_submitted", "current": 0, "target": 1},
     {"metric": "impact_metrics_documented", "current": 8, "target": 10}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000021',
   'R&D registration preparation complete',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000011',
   'rd_refund', NULL, 'in_progress', 50, 'FY26-Q3', '2026-03-31', 'Ben',
   ARRAY['ACT-EL', 'ACT-IN', 'ACT-JH'],
   '[{"metric": "activity_logs_complete", "current": 6, "target": 12},
     {"metric": "technical_reports_drafted", "current": 2, "target": 4},
     {"metric": "advisor_engaged", "current": 0, "target": 1}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000022',
   'Catalysing Impact pool strategy finalized',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000010',
   'funding', 200000, 'in_progress', 40, 'FY26-Q3', '2026-03-31', 'Nic',
   ARRAY['ACT-HV', 'ACT-CP'],
   '[{"metric": "pool_partners_confirmed", "current": 1, "target": 3},
     {"metric": "strategy_document_complete", "current": 0, "target": 1}]'::jsonb);

-- Q4 FY26 Quarterly Goals (Apr-Jun 2026)
INSERT INTO strategic_objectives (id, title, objective_type, parent_id, flywheel_segment, revenue_target, status, progress_pct, target_quarter, target_date, owner, project_codes, key_results)
VALUES
  ('a0000000-0000-0000-0000-000000000030',
   'R&D registration submitted to AusIndustry',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000011',
   'rd_refund', 407000, 'not_started', 0, 'FY26-Q4', '2026-04-30', 'Ben',
   ARRAY['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'],
   '[{"metric": "registration_lodged", "current": 0, "target": 1},
     {"metric": "rd_advisor_signed_off", "current": 0, "target": 1}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000031',
   'Empathy Ledger billing live with 3 pilots',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000012',
   'revenue', 50000, 'not_started', 0, 'FY26-Q4', '2026-06-30', 'Ben',
   ARRAY['ACT-EL'],
   '[{"metric": "stripe_integration_live", "current": 0, "target": 1},
     {"metric": "pricing_tiers_published", "current": 0, "target": 1},
     {"metric": "pilot_customers", "current": 0, "target": 3}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000032',
   'QLD Social Enterprise grant application',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000010',
   'funding', 100000, 'not_started', 0, 'FY26-Q4', '2026-05-15', 'Nic',
   ARRAY['ACT-GD', 'ACT-HV'],
   '[{"metric": "application_submitted", "current": 0, "target": 1}]'::jsonb),

  ('a0000000-0000-0000-0000-000000000033',
   'BAS Q3 lodged + FY26 tax planning',
   'quarterly_goal', 'a0000000-0000-0000-0000-000000000010',
   'revenue', NULL, 'not_started', 0, 'FY26-Q4', '2026-04-28', 'Ben',
   ARRAY['ACT-IN'],
   '[{"metric": "bas_q3_lodged", "current": 0, "target": 1},
     {"metric": "accountant_review_complete", "current": 0, "target": 1}]'::jsonb);

-- Grant RLS policies (match existing patterns)
ALTER TABLE project_strategic_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for service role" ON project_strategic_profile FOR ALL USING (true);
CREATE POLICY "Allow all access for service role" ON strategic_objectives FOR ALL USING (true);
