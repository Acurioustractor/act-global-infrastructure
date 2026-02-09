-- ============================================================================
-- COMBINED MIGRATION: Strategic Systems + Xero Integration
-- Target: https://tednluwflfhxyucgwigh.supabase.co
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: XERO INTEGRATION TABLES
-- ============================================================================

-- Xero Invoices
CREATE TABLE IF NOT EXISTS xero_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    xero_invoice_id TEXT UNIQUE NOT NULL,
    invoice_number TEXT,
    reference TEXT,
    contact_name TEXT,
    contact_id UUID,
    project_code TEXT,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED', 'DELETED')),
    type TEXT NOT NULL CHECK (type IN ('ACCREC', 'ACCPAY')),
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency_code TEXT DEFAULT 'AUD',
    date DATE NOT NULL,
    due_date DATE,
    fully_paid_date DATE,
    line_items JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xero_invoices_xero_id ON xero_invoices(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_project ON xero_invoices(project_code);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_date ON xero_invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_due_date ON xero_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_status ON xero_invoices(status);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_type ON xero_invoices(type);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_contact ON xero_invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_contact_name ON xero_invoices(contact_name);

-- Xero Transactions
CREATE TABLE IF NOT EXISTS xero_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    xero_transaction_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('RECEIVE', 'SPEND', 'TRANSFER')),
    contact_name TEXT,
    bank_account TEXT,
    project_code TEXT,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    date DATE NOT NULL,
    line_items JSONB DEFAULT '[]',
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xero_transactions_xero_id ON xero_transactions(xero_transaction_id);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_project ON xero_transactions(project_code);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_date ON xero_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_type ON xero_transactions(type);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_bank ON xero_transactions(bank_account);

-- Xero Sync Log
CREATE TABLE IF NOT EXISTS xero_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    records_synced INT DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_xero_sync_log_started ON xero_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_type ON xero_sync_log(sync_type);

-- Xero Tokens (for OAuth refresh)
CREATE TABLE IF NOT EXISTS xero_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    tenant_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: STRATEGIC SYSTEMS TABLES
-- ============================================================================

-- Monthly financial snapshots (aggregated from Xero data)
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  income NUMERIC(12,2) DEFAULT 0,
  expenses NUMERIC(12,2) DEFAULT 0,
  net NUMERIC(12,2) GENERATED ALWAYS AS (income - expenses) STORED,
  income_breakdown JSONB DEFAULT '{}',
  expense_breakdown JSONB DEFAULT '{}',
  opening_balance NUMERIC(12,2),
  closing_balance NUMERIC(12,2),
  source TEXT DEFAULT 'xero',
  is_projection BOOLEAN DEFAULT false,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, is_projection)
);

-- Cash flow scenarios
CREATE TABLE IF NOT EXISTS cashflow_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  adjustments JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue streams
CREATE TABLE IF NOT EXISTS revenue_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  project_codes TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  target_monthly NUMERIC(12,2),
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly revenue by stream
CREATE TABLE IF NOT EXISTS revenue_stream_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES revenue_streams(id),
  month DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'xero',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id, month)
);

-- Fundraising pipeline
CREATE TABLE IF NOT EXISTS fundraising_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  funder TEXT,
  type TEXT NOT NULL,
  amount NUMERIC(12,2),
  status TEXT DEFAULT 'identified',
  probability NUMERIC(3,2) DEFAULT 0.5,
  expected_date DATE,
  actual_date DATE,
  project_codes TEXT[] DEFAULT '{}',
  stream_id UUID REFERENCES revenue_streams(id),
  contact_id UUID,
  requirements TEXT,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  sub_type TEXT,
  location TEXT,
  location_zone TEXT,
  acquisition_date DATE,
  acquisition_cost NUMERIC(12,2),
  current_value NUMERIC(12,2),
  depreciation_method TEXT,
  useful_life_years INTEGER,
  salvage_value NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  condition TEXT DEFAULT 'good',
  condition_updated_at TIMESTAMPTZ,
  assigned_project TEXT,
  responsible_person TEXT,
  insured BOOLEAN DEFAULT false,
  insurance_policy TEXT,
  insurance_expiry DATE,
  insured_value NUMERIC(12,2),
  serial_number TEXT,
  make_model TEXT,
  description TEXT,
  image_url TEXT,
  documents JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asset maintenance
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  frequency TEXT,
  next_due DATE,
  last_completed DATE,
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  xero_transaction_id TEXT,
  status TEXT DEFAULT 'scheduled',
  assigned_to TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  property_type TEXT,
  total_area_hectares NUMERIC(10,2),
  usable_area_hectares NUMERIC(10,2),
  zones JSONB DEFAULT '[]',
  purchase_price NUMERIC(12,2),
  purchase_date DATE,
  current_valuation NUMERIC(12,2),
  valuation_date DATE,
  council_rates_annual NUMERIC(12,2),
  zoning TEXT,
  lot_plan TEXT,
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lodgings
CREATE TABLE IF NOT EXISTS lodgings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  name TEXT NOT NULL,
  lodging_type TEXT,
  capacity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available',
  current_occupant TEXT,
  amenities JSONB DEFAULT '[]',
  condition TEXT DEFAULT 'good',
  last_inspection DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  debt_type TEXT NOT NULL,
  lender TEXT,
  original_amount NUMERIC(12,2) NOT NULL,
  current_balance NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,4),
  rate_type TEXT DEFAULT 'variable',
  fixed_until DATE,
  regular_payment NUMERIC(12,2),
  monthly_payment NUMERIC(12,2),
  payment_frequency TEXT DEFAULT 'monthly',
  next_payment_date DATE,
  maturity_date DATE,
  total_extra_payments NUMERIC(12,2) DEFAULT 0,
  property_id UUID REFERENCES properties(id),
  asset_id UUID REFERENCES assets(id),
  offset_balance NUMERIC(12,2) DEFAULT 0,
  offset_account_id TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Debt payments
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  principal NUMERIC(12,2),
  interest NUMERIC(12,2),
  is_extra BOOLEAN DEFAULT false,
  balance_after NUMERIC(12,2),
  source TEXT DEFAULT 'xero',
  xero_transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Debt scenarios
CREATE TABLE IF NOT EXISTS debt_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  extra_monthly NUMERIC(12,2) DEFAULT 0,
  extra_lump_sums JSONB DEFAULT '[]',
  rate_adjustment NUMERIC(5,4) DEFAULT 0,
  projected_payoff_date DATE,
  projected_interest_original NUMERIC(12,2),
  projected_interest_new NUMERIC(12,2),
  total_interest_saved NUMERIC(12,2),
  months_saved INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  employment_type TEXT,
  available_hours_per_week NUMERIC(5,1) DEFAULT 38,
  hourly_rate NUMERIC(8,2),
  annual_salary NUMERIC(12,2),
  skills TEXT[] DEFAULT '{}',
  primary_zone TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  user_identity_id UUID,
  ghl_contact_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Resource allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  hours_per_week NUMERIC(5,1),
  percentage NUMERIC(5,2),
  start_date DATE NOT NULL,
  end_date DATE,
  allocation_type TEXT DEFAULT 'planned',
  season TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seasonal demand
CREATE TABLE IF NOT EXISTS seasonal_demand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  demand_hours NUMERIC(6,1) NOT NULL,
  demand_level TEXT DEFAULT 'normal',
  activities TEXT[] DEFAULT '{}',
  skills_needed TEXT[] DEFAULT '{}',
  notes TEXT,
  UNIQUE(project_code, month)
);

-- Compliance items
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT,
  due_date DATE,
  next_due DATE,
  reminder_days INTEGER DEFAULT 14,
  responsible TEXT,
  project_code TEXT,
  status TEXT DEFAULT 'upcoming',
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  asset_id UUID REFERENCES assets(id),
  debt_id UUID REFERENCES debts(id),
  document_url TEXT,
  description TEXT,
  checklist JSONB DEFAULT '[]',
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tracked documents
CREATE TABLE IF NOT EXISTS tracked_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  project_code TEXT,
  asset_id UUID REFERENCES assets(id),
  compliance_item_id UUID REFERENCES compliance_items(id),
  issue_date DATE,
  expiry_date DATE,
  renewal_reminder_days INTEGER DEFAULT 30,
  file_url TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business initiatives
CREATE TABLE IF NOT EXISTS business_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  initiative_type TEXT NOT NULL,
  type TEXT,
  description TEXT,
  hypothesis TEXT,
  success_criteria TEXT,
  success BOOLEAN,
  project_codes TEXT[] DEFAULT '{}',
  stream_id UUID REFERENCES revenue_streams(id),
  status TEXT DEFAULT 'ideation',
  progress NUMERIC(5,2) DEFAULT 0,
  estimated_hours NUMERIC(8,1),
  estimated_cost NUMERIC(12,2),
  budget_allocated NUMERIC(12,2) DEFAULT 0,
  actual_hours NUMERIC(8,1),
  actual_cost NUMERIC(12,2),
  target_start DATE,
  target_launch DATE,
  target_launch_date DATE,
  actual_start DATE,
  actual_launch DATE,
  expected_monthly_revenue NUMERIC(12,2),
  expected_revenue NUMERIC(12,2),
  expected_monthly_cost NUMERIC(12,2),
  projected_revenue NUMERIC(12,2),
  learnings TEXT,
  pivot_notes TEXT,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 3: VIEWS
-- ============================================================================

-- Xero views
CREATE OR REPLACE VIEW v_project_financials AS
SELECT
    project_code,
    COUNT(*) FILTER (WHERE type = 'ACCREC') as receivable_count,
    COUNT(*) FILTER (WHERE type = 'ACCPAY') as payable_count,
    COALESCE(SUM(total) FILTER (WHERE type = 'ACCREC'), 0) as total_receivables,
    COALESCE(SUM(total) FILTER (WHERE type = 'ACCPAY'), 0) as total_payables,
    COALESCE(SUM(amount_paid) FILTER (WHERE type = 'ACCREC'), 0) as received,
    COALESCE(SUM(amount_paid) FILTER (WHERE type = 'ACCPAY'), 0) as paid,
    COALESCE(SUM(amount_due) FILTER (WHERE type = 'ACCREC'), 0) as outstanding_receivables,
    COALESCE(SUM(amount_due) FILTER (WHERE type = 'ACCPAY'), 0) as outstanding_payables,
    COALESCE(SUM(total) FILTER (WHERE type = 'ACCREC'), 0) - COALESCE(SUM(total) FILTER (WHERE type = 'ACCPAY'), 0) as net_position
FROM xero_invoices
WHERE status NOT IN ('VOIDED', 'DELETED')
GROUP BY project_code
ORDER BY project_code;

CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
    DATE_TRUNC('month', date) as month,
    project_code,
    COUNT(*) as invoice_count,
    SUM(total) as total_invoiced,
    SUM(amount_paid) as total_received,
    SUM(amount_due) as total_outstanding
FROM xero_invoices
WHERE type = 'ACCREC'
  AND status NOT IN ('VOIDED', 'DELETED')
GROUP BY DATE_TRUNC('month', date), project_code
ORDER BY month DESC, project_code;

CREATE OR REPLACE VIEW v_outstanding_invoices AS
SELECT
    id,
    xero_invoice_id,
    invoice_number,
    contact_name,
    project_code,
    type,
    total,
    amount_due,
    amount_paid,
    date,
    due_date,
    CASE
        WHEN due_date IS NULL THEN 'no_due_date'
        WHEN due_date >= CURRENT_DATE THEN 'current'
        WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30_days'
        WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60_days'
        WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90_days'
        ELSE '90+_days'
    END as aging_bucket,
    CASE
        WHEN due_date IS NULL THEN 0
        ELSE CURRENT_DATE - due_date
    END as days_overdue
FROM xero_invoices
WHERE amount_due > 0
  AND status IN ('AUTHORISED', 'SUBMITTED')
ORDER BY due_date ASC NULLS LAST;

-- Strategic system views
CREATE OR REPLACE VIEW v_cashflow_summary AS
SELECT
  month, income, expenses, net, closing_balance,
  is_projection, confidence, income_breakdown, expense_breakdown
FROM financial_snapshots
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_assets_by_zone AS
SELECT
  location_zone, asset_type,
  COUNT(*) as count,
  SUM(current_value) as total_value,
  COUNT(*) FILTER (WHERE condition = 'poor' OR condition = 'critical') as needs_attention
FROM assets WHERE status = 'active'
GROUP BY location_zone, asset_type
ORDER BY location_zone, asset_type;

CREATE OR REPLACE VIEW v_overdue_maintenance AS
SELECT am.*, a.name as asset_name, a.asset_type, a.location_zone
FROM asset_maintenance am
JOIN assets a ON a.id = am.asset_id
WHERE am.status IN ('scheduled', 'overdue')
  AND am.next_due <= CURRENT_DATE
ORDER BY am.next_due;

CREATE OR REPLACE VIEW v_team_capacity AS
SELECT
  tm.id, tm.name, tm.role, tm.available_hours_per_week,
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

CREATE OR REPLACE VIEW v_compliance_calendar AS
SELECT ci.*,
  CASE
    WHEN ci.next_due < CURRENT_DATE THEN 'overdue'
    WHEN ci.next_due <= CURRENT_DATE + ci.reminder_days THEN 'due-soon'
    ELSE 'upcoming'
  END as computed_status
FROM compliance_items ci
WHERE ci.status != 'completed' AND ci.status != 'not-applicable'
ORDER BY ci.next_due;

CREATE OR REPLACE VIEW v_revenue_performance AS
SELECT
  rs.id, rs.name, rs.code, rs.category, rs.target_monthly, rs.color,
  COALESCE(latest.amount, 0) as latest_month_amount,
  COALESCE(avg3.avg_amount, 0) as avg_3_month,
  CASE
    WHEN rs.target_monthly > 0 THEN ROUND(COALESCE(latest.amount, 0) / rs.target_monthly * 100, 1)
    ELSE 0
  END as target_pct
FROM revenue_streams rs
LEFT JOIN LATERAL (
  SELECT amount FROM revenue_stream_entries WHERE stream_id = rs.id ORDER BY month DESC LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT AVG(amount) as avg_amount FROM revenue_stream_entries
  WHERE stream_id = rs.id AND month >= (CURRENT_DATE - INTERVAL '3 months')
) avg3 ON true
WHERE rs.status = 'active';

CREATE OR REPLACE VIEW v_debt_overview AS
SELECT d.*, p.name as property_name,
  ROUND((d.original_amount - d.current_balance) / NULLIF(d.original_amount, 0) * 100, 1) as equity_pct,
  d.original_amount - d.current_balance as equity_amount
FROM debts d
LEFT JOIN properties p ON p.id = d.property_id
WHERE d.status = 'active';

-- ============================================================================
-- PART 4: TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_xero_invoices_updated ON xero_invoices;
CREATE TRIGGER trigger_xero_invoices_updated
    BEFORE UPDATE ON xero_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_xero_transactions_updated ON xero_transactions;
CREATE TRIGGER trigger_xero_transactions_updated
    BEFORE UPDATE ON xero_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY
-- ============================================================================

-- Xero tables
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON xero_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON xero_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON xero_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON xero_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Strategic system tables
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

-- ============================================================================
-- PART 6: SEED DATA
-- ============================================================================

INSERT INTO revenue_streams (name, code, category, project_codes, color, icon) VALUES
  ('Farm & CSA', 'farm-csa', 'earned', '{ACT-HV}', '#10B981', 'Sprout'),
  ('Goods Sales', 'goods-sales', 'earned', '{ACT-GD}', '#F59E0B', 'ShoppingBag'),
  ('Studio Commissions', 'studio', 'earned', '{ACT-PS,ACT-EL,ACT-SS,ACT-UA}', '#8B5CF6', 'Palette'),
  ('Grants & Funding', 'grants', 'grants', '{}', '#3B82F6', 'HandCoins'),
  ('Consulting & Services', 'consulting', 'earned', '{ACT-JH,ACT-MN,ACT-DG}', '#EC4899', 'Briefcase'),
  ('Donations & Sponsorship', 'donations', 'donations', '{}', '#F97316', 'Heart')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DONE - All tables, views, triggers, RLS policies, and seed data created
-- Next step: Run the Xero sync scripts to populate xero_invoices and xero_transactions
-- ============================================================================
