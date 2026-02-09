-- ============================================================================
-- ACT Strategic Systems Migration
-- Cash Flow, Assets, Staff, Debt, Revenue Streams, Admin/Compliance, Biz Dev
-- February 2026
-- ============================================================================

-- ============================================================================
-- 1. CASH FLOW & FINANCIAL PROJECTIONS
-- ============================================================================

-- Monthly financial snapshots (aggregated from Xero data)
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL, -- first of month
  income NUMERIC(12,2) DEFAULT 0,
  expenses NUMERIC(12,2) DEFAULT 0,
  net NUMERIC(12,2) GENERATED ALWAYS AS (income - expenses) STORED,
  -- Breakdown by type
  income_breakdown JSONB DEFAULT '{}',   -- { "grants": 5000, "consulting": 3000, ... }
  expense_breakdown JSONB DEFAULT '{}',  -- { "labour": 8000, "subscriptions": 2000, ... }
  -- Cash position
  opening_balance NUMERIC(12,2),
  closing_balance NUMERIC(12,2),
  -- Metadata
  source TEXT DEFAULT 'xero', -- xero | manual | projected
  is_projection BOOLEAN DEFAULT false,
  confidence NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0 for projections
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, is_projection)
);

-- Cash flow scenarios for "what if" modelling
CREATE TABLE IF NOT EXISTS cashflow_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  -- Adjustments applied to baseline
  adjustments JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{ "type": "add_income", "amount": 3000, "start": "2026-06", "label": "Studio revenue" },
  --       { "type": "add_expense", "amount": 1500, "start": "2026-04", "label": "New hire" }]
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. REVENUE STREAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- e.g. 'farm-csa', 'goods-sales', 'studio', 'grants', 'consulting'
  category TEXT NOT NULL, -- 'earned' | 'grants' | 'investment' | 'donations'
  description TEXT,
  -- Linked project codes
  project_codes TEXT[] DEFAULT '{}', -- ACT-HV, ACT-GD, etc.
  -- Tracking
  status TEXT DEFAULT 'active', -- active | developing | paused | retired
  target_monthly NUMERIC(12,2),
  color TEXT, -- for charts
  icon TEXT,  -- lucide icon name
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly revenue by stream (populated from Xero + manual)
CREATE TABLE IF NOT EXISTS revenue_stream_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES revenue_streams(id),
  month DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'xero', -- xero | manual | projected
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id, month)
);

-- Fundraising pipeline
CREATE TABLE IF NOT EXISTS fundraising_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  funder TEXT,
  type TEXT NOT NULL, -- 'grant' | 'investment' | 'donation' | 'sponsorship' | 'loan'
  amount NUMERIC(12,2),
  status TEXT DEFAULT 'identified', -- identified | researching | applying | submitted | negotiating | approved | received | declined
  probability NUMERIC(3,2) DEFAULT 0.5, -- 0.0-1.0
  expected_date DATE,
  actual_date DATE,
  -- Linkage
  project_codes TEXT[] DEFAULT '{}',
  stream_id UUID REFERENCES revenue_streams(id),
  contact_id UUID, -- link to ghl_contacts
  -- Details
  requirements TEXT,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. PROPERTY & ASSET REGISTER
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'land' | 'building' | 'vehicle' | 'equipment' | 'infrastructure' | 'technology' | 'furniture'
  sub_type TEXT, -- e.g. 'tractor', 'shed', 'walking-track', 'solar-panels'
  -- Location
  location TEXT, -- physical location description
  location_zone TEXT, -- 'farm' | 'harvest' | 'studio' | 'lodgings' | 'common'
  -- Financials
  acquisition_date DATE,
  acquisition_cost NUMERIC(12,2),
  current_value NUMERIC(12,2),
  depreciation_method TEXT, -- 'straight-line' | 'diminishing' | 'none'
  useful_life_years INTEGER,
  salvage_value NUMERIC(12,2) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'active', -- active | maintenance | decommissioned | disposed
  condition TEXT DEFAULT 'good', -- excellent | good | fair | poor | critical
  condition_updated_at TIMESTAMPTZ,
  -- Assignment
  assigned_project TEXT, -- project code
  responsible_person TEXT,
  -- Insurance
  insured BOOLEAN DEFAULT false,
  insurance_policy TEXT,
  insurance_expiry DATE,
  insured_value NUMERIC(12,2),
  -- Details
  serial_number TEXT,
  make_model TEXT,
  description TEXT,
  image_url TEXT,
  documents JSONB DEFAULT '[]', -- [{ "name": "manual.pdf", "url": "..." }]
  tags TEXT[] DEFAULT '{}',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance schedule and history
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  -- Schedule
  title TEXT NOT NULL,
  maintenance_type TEXT NOT NULL, -- 'preventive' | 'corrective' | 'inspection' | 'replacement'
  frequency TEXT, -- 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'hours:200' | 'one-off'
  -- Scheduling
  next_due DATE,
  last_completed DATE,
  -- Cost
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  xero_transaction_id TEXT, -- link to bank transaction
  -- Execution
  status TEXT DEFAULT 'scheduled', -- scheduled | overdue | in-progress | completed | skipped
  assigned_to TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  -- Details
  notes TEXT,
  checklist JSONB DEFAULT '[]', -- [{ "item": "Check oil", "done": true }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property-specific tracking (for the main property / mortgage)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  property_type TEXT, -- 'farm' | 'residential' | 'commercial' | 'mixed'
  -- Size
  total_area_hectares NUMERIC(10,2),
  usable_area_hectares NUMERIC(10,2),
  -- Zones/areas within the property
  zones JSONB DEFAULT '[]',
  -- e.g. [{ "name": "Main paddock", "hectares": 5, "use": "grazing" },
  --       { "name": "Studio area", "hectares": 0.5, "use": "creative" }]
  -- Valuation
  purchase_price NUMERIC(12,2),
  purchase_date DATE,
  current_valuation NUMERIC(12,2),
  valuation_date DATE,
  -- Council
  council_rates_annual NUMERIC(12,2),
  zoning TEXT,
  lot_plan TEXT,
  -- Status
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lodgings / accommodation tracking
CREATE TABLE IF NOT EXISTS lodgings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  name TEXT NOT NULL,
  lodging_type TEXT, -- 'house' | 'cabin' | 'tent-site' | 'caravan' | 'room'
  capacity INTEGER DEFAULT 1, -- number of people
  -- Status
  status TEXT DEFAULT 'available', -- available | occupied | maintenance | under-construction
  current_occupant TEXT,
  -- Amenities
  amenities JSONB DEFAULT '[]', -- ['bathroom', 'kitchen', 'wifi', 'power']
  -- Condition
  condition TEXT DEFAULT 'good',
  last_inspection DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. DEBT & MORTGAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  debt_type TEXT NOT NULL, -- 'mortgage' | 'loan' | 'credit-line' | 'equipment-finance'
  lender TEXT,
  -- Terms
  original_amount NUMERIC(12,2) NOT NULL,
  current_balance NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,4), -- e.g. 0.0625 for 6.25%
  rate_type TEXT DEFAULT 'variable', -- 'fixed' | 'variable'
  fixed_until DATE,
  -- Repayment
  regular_payment NUMERIC(12,2),
  payment_frequency TEXT DEFAULT 'monthly', -- 'weekly' | 'fortnightly' | 'monthly'
  next_payment_date DATE,
  maturity_date DATE,
  -- Extra payments
  total_extra_payments NUMERIC(12,2) DEFAULT 0,
  -- Linked asset
  property_id UUID REFERENCES properties(id),
  asset_id UUID REFERENCES assets(id),
  -- Offset account
  offset_balance NUMERIC(12,2) DEFAULT 0,
  offset_account_id TEXT, -- Xero bank account ID
  -- Status
  status TEXT DEFAULT 'active', -- active | paid-off | refinanced
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment history (actual payments from Xero + manual)
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  principal NUMERIC(12,2),
  interest NUMERIC(12,2),
  is_extra BOOLEAN DEFAULT false,
  balance_after NUMERIC(12,2),
  source TEXT DEFAULT 'xero', -- xero | manual
  xero_transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Debt scenarios (what-if modelling)
CREATE TABLE IF NOT EXISTS debt_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Scenario adjustments
  extra_monthly NUMERIC(12,2) DEFAULT 0,
  extra_lump_sums JSONB DEFAULT '[]', -- [{ "date": "2026-12", "amount": 5000 }]
  rate_adjustment NUMERIC(5,4) DEFAULT 0, -- +/- from current rate
  -- Calculated results (cached)
  projected_payoff_date DATE,
  total_interest_saved NUMERIC(12,2),
  months_saved INTEGER,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. STAFF & RESOURCE ALLOCATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  role TEXT, -- 'founder' | 'staff' | 'contractor' | 'volunteer' | 'intern'
  employment_type TEXT, -- 'full-time' | 'part-time' | 'casual' | 'contract'
  -- Capacity
  available_hours_per_week NUMERIC(5,1) DEFAULT 38,
  hourly_rate NUMERIC(8,2),
  annual_salary NUMERIC(12,2),
  -- Skills
  skills TEXT[] DEFAULT '{}',
  primary_zone TEXT, -- 'farm' | 'harvest' | 'studio' | 'admin' | 'mixed'
  -- Status
  status TEXT DEFAULT 'active', -- active | on-leave | ended
  start_date DATE,
  end_date DATE,
  -- Links
  user_identity_id UUID, -- links to user_identities
  ghl_contact_id TEXT,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- How team members are allocated across projects
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  -- Allocation
  hours_per_week NUMERIC(5,1),
  percentage NUMERIC(5,2), -- 0-100
  -- Period
  start_date DATE NOT NULL,
  end_date DATE, -- null = ongoing
  -- Type
  allocation_type TEXT DEFAULT 'planned', -- 'planned' | 'actual' | 'seasonal'
  season TEXT, -- 'summer' | 'autumn' | 'winter' | 'spring' | null for year-round
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seasonal capacity model
CREATE TABLE IF NOT EXISTS seasonal_demand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  -- Demand
  demand_hours NUMERIC(6,1) NOT NULL,
  demand_level TEXT DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'peak'
  -- Typical activities
  activities TEXT[] DEFAULT '{}',
  skills_needed TEXT[] DEFAULT '{}',
  -- Notes
  notes TEXT,
  UNIQUE(project_code, month)
);

-- ============================================================================
-- 6. ADMINISTRATION & COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'tax' | 'insurance' | 'permit' | 'registration' | 'reporting' | 'safety' | 'grant-acquittal'
  -- Scheduling
  frequency TEXT, -- 'monthly' | 'quarterly' | 'yearly' | 'one-off'
  due_date DATE,
  next_due DATE,
  reminder_days INTEGER DEFAULT 14, -- days before due to alert
  -- Assignment
  responsible TEXT,
  project_code TEXT,
  -- Status
  status TEXT DEFAULT 'upcoming', -- upcoming | due-soon | overdue | completed | not-applicable
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  -- Linked items
  asset_id UUID REFERENCES assets(id),
  debt_id UUID REFERENCES debts(id),
  document_url TEXT,
  -- Details
  description TEXT,
  checklist JSONB DEFAULT '[]',
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document tracking (contracts, certificates, licences)
CREATE TABLE IF NOT EXISTS tracked_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'insurance' | 'licence' | 'contract' | 'certificate' | 'permit' | 'report'
  -- Linkage
  project_code TEXT,
  asset_id UUID REFERENCES assets(id),
  compliance_item_id UUID REFERENCES compliance_items(id),
  -- Dates
  issue_date DATE,
  expiry_date DATE,
  renewal_reminder_days INTEGER DEFAULT 30,
  -- Storage
  file_url TEXT,
  file_name TEXT,
  -- Status
  status TEXT DEFAULT 'active', -- active | expired | superseded | archived
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. BUSINESS DEVELOPMENT & R&D
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  initiative_type TEXT NOT NULL, -- 'product' | 'market' | 'partnership' | 'capability' | 'research' | 'experiment'
  -- Scope
  description TEXT,
  hypothesis TEXT, -- for experiments/R&D
  success_criteria TEXT,
  -- Linkage
  project_codes TEXT[] DEFAULT '{}',
  stream_id UUID REFERENCES revenue_streams(id),
  -- Status & Progress
  status TEXT DEFAULT 'ideation', -- ideation | validating | building | testing | launched | paused | abandoned
  progress NUMERIC(5,2) DEFAULT 0, -- 0-100
  -- Resources
  estimated_hours NUMERIC(8,1),
  estimated_cost NUMERIC(12,2),
  actual_hours NUMERIC(8,1),
  actual_cost NUMERIC(12,2),
  -- Timeline
  target_start DATE,
  target_launch DATE,
  actual_start DATE,
  actual_launch DATE,
  -- Impact
  expected_monthly_revenue NUMERIC(12,2),
  expected_monthly_cost NUMERIC(12,2),
  -- Learning
  learnings TEXT,
  pivot_notes TEXT,
  -- Metadata
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. VIEWS FOR DASHBOARDS
-- ============================================================================

-- Cash flow summary view
CREATE OR REPLACE VIEW v_cashflow_summary AS
SELECT
  month,
  income,
  expenses,
  net,
  closing_balance,
  is_projection,
  confidence,
  income_breakdown,
  expense_breakdown
FROM financial_snapshots
ORDER BY month DESC;

-- Asset summary by zone
CREATE OR REPLACE VIEW v_assets_by_zone AS
SELECT
  location_zone,
  asset_type,
  COUNT(*) as count,
  SUM(current_value) as total_value,
  COUNT(*) FILTER (WHERE condition = 'poor' OR condition = 'critical') as needs_attention
FROM assets
WHERE status = 'active'
GROUP BY location_zone, asset_type
ORDER BY location_zone, asset_type;

-- Overdue maintenance
CREATE OR REPLACE VIEW v_overdue_maintenance AS
SELECT
  am.*,
  a.name as asset_name,
  a.asset_type,
  a.location_zone
FROM asset_maintenance am
JOIN assets a ON a.id = am.asset_id
WHERE am.status IN ('scheduled', 'overdue')
  AND am.next_due <= CURRENT_DATE
ORDER BY am.next_due;

-- Team capacity overview
CREATE OR REPLACE VIEW v_team_capacity AS
SELECT
  tm.id,
  tm.name,
  tm.role,
  tm.available_hours_per_week,
  COALESCE(SUM(ra.hours_per_week), 0) as allocated_hours,
  tm.available_hours_per_week - COALESCE(SUM(ra.hours_per_week), 0) as available_hours,
  ROUND(COALESCE(SUM(ra.hours_per_week), 0) / NULLIF(tm.available_hours_per_week, 0) * 100, 1) as utilisation_pct,
  ARRAY_AGG(DISTINCT ra.project_code) FILTER (WHERE ra.project_code IS NOT NULL) as projects
FROM team_members tm
LEFT JOIN resource_allocations ra ON ra.team_member_id = tm.id
  AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  AND ra.start_date <= CURRENT_DATE
WHERE tm.status = 'active'
GROUP BY tm.id, tm.name, tm.role, tm.available_hours_per_week;

-- Compliance calendar
CREATE OR REPLACE VIEW v_compliance_calendar AS
SELECT
  ci.*,
  CASE
    WHEN ci.next_due < CURRENT_DATE THEN 'overdue'
    WHEN ci.next_due <= CURRENT_DATE + ci.reminder_days THEN 'due-soon'
    ELSE 'upcoming'
  END as computed_status
FROM compliance_items ci
WHERE ci.status != 'completed' AND ci.status != 'not-applicable'
ORDER BY ci.next_due;

-- Revenue stream performance
CREATE OR REPLACE VIEW v_revenue_performance AS
SELECT
  rs.id,
  rs.name,
  rs.code,
  rs.category,
  rs.target_monthly,
  rs.color,
  COALESCE(latest.amount, 0) as latest_month_amount,
  COALESCE(avg3.avg_amount, 0) as avg_3_month,
  CASE
    WHEN rs.target_monthly > 0 THEN ROUND(COALESCE(latest.amount, 0) / rs.target_monthly * 100, 1)
    ELSE 0
  END as target_pct
FROM revenue_streams rs
LEFT JOIN LATERAL (
  SELECT amount FROM revenue_stream_entries
  WHERE stream_id = rs.id
  ORDER BY month DESC LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT AVG(amount) as avg_amount FROM revenue_stream_entries
  WHERE stream_id = rs.id
  AND month >= (CURRENT_DATE - INTERVAL '3 months')
) avg3 ON true
WHERE rs.status = 'active';

-- Debt overview
CREATE OR REPLACE VIEW v_debt_overview AS
SELECT
  d.*,
  p.name as property_name,
  ROUND(
    (d.original_amount - d.current_balance) / NULLIF(d.original_amount, 0) * 100, 1
  ) as equity_pct,
  d.original_amount - d.current_balance as equity_amount
FROM debts d
LEFT JOIN properties p ON p.id = d.property_id
WHERE d.status = 'active';

-- Seed initial revenue streams
INSERT INTO revenue_streams (name, code, category, project_codes, color, icon) VALUES
  ('Farm & CSA', 'farm-csa', 'earned', '{ACT-HV}', '#10B981', 'Sprout'),
  ('Goods Sales', 'goods-sales', 'earned', '{ACT-GD}', '#F59E0B', 'ShoppingBag'),
  ('Studio Commissions', 'studio', 'earned', '{ACT-PS,ACT-EL,ACT-SS,ACT-UA}', '#8B5CF6', 'Palette'),
  ('Grants & Funding', 'grants', 'grants', '{}', '#3B82F6', 'HandCoins'),
  ('Consulting & Services', 'consulting', 'earned', '{ACT-JH,ACT-MN,ACT-DG}', '#EC4899', 'Briefcase'),
  ('Donations & Sponsorship', 'donations', 'donations', '{}', '#F97316', 'Heart')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 9. ENABLE RLS (Row Level Security)
-- ============================================================================

ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_stream_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraising_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodgings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_initiatives ENABLE ROW LEVEL SECURITY;

-- Service role access (command center uses service role key)
CREATE POLICY "service_role_all" ON financial_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cashflow_scenarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON revenue_streams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON revenue_stream_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON fundraising_pipeline FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON assets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON asset_maintenance FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON properties FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON lodgings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON debts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON debt_payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON debt_scenarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON team_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON resource_allocations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON seasonal_demand FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON compliance_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON tracked_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON business_initiatives FOR ALL TO service_role USING (true) WITH CHECK (true);
