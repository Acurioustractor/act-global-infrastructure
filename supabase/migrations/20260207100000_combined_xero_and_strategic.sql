-- ============================================================================
-- ACT COMMAND CENTER - COMBINED XERO & STRATEGIC SYSTEMS MIGRATION
-- ============================================================================
-- This combined migration integrates:
-- 1. Xero Financial Data Integration (invoices, transactions, sync logs)
-- 2. ACT Strategic Systems (cash flow, assets, staff, debt, revenue, compliance)
--
-- Purpose: Central dashboard database for ACT Global with financial sync
-- from Xero and comprehensive business operations tracking.
--
-- Created: 2026-02-07
-- ============================================================================


-- =============================================================================
-- PART 1: XERO INTEGRATION TABLES
-- =============================================================================

-- =============================================================================
-- XERO INVOICES TABLE
-- Stores all invoices (receivable and payable) from Xero
-- =============================================================================
CREATE TABLE IF NOT EXISTS xero_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Xero identifiers
    xero_invoice_id TEXT UNIQUE NOT NULL,
    invoice_number TEXT,
    reference TEXT,

    -- Contact information
    contact_name TEXT,
    -- NOTE: contact_id references ghl_contacts which may not exist in all environments
    -- Stored as plain UUID without FK constraint to avoid deployment issues
    contact_id UUID,

    -- Project association
    project_code TEXT,  -- Links to ACT projects (e.g., 'EL', 'HARVEST', 'PICC')

    -- Invoice status and type
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED', 'DELETED')),
    type TEXT NOT NULL CHECK (type IN ('ACCREC', 'ACCPAY')),  -- ACCREC = receivable, ACCPAY = payable

    -- Financial amounts
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency_code TEXT DEFAULT 'AUD',

    -- Important dates
    date DATE NOT NULL,
    due_date DATE,
    fully_paid_date DATE,

    -- Detailed data
    line_items JSONB DEFAULT '[]',  -- [{description, quantity, unitAmount, accountCode, taxType, lineAmount}]
    metadata JSONB DEFAULT '{}',    -- Additional Xero data (payments, credit notes, etc.)

    -- Sync metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_xero_invoices_xero_id ON xero_invoices(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_project ON xero_invoices(project_code);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_date ON xero_invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_due_date ON xero_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_status ON xero_invoices(status);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_type ON xero_invoices(type);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_contact ON xero_invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_contact_name ON xero_invoices(contact_name);

-- =============================================================================
-- XERO TRANSACTIONS TABLE
-- Stores bank transactions from Xero
-- =============================================================================
CREATE TABLE IF NOT EXISTS xero_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Xero identifiers
    xero_transaction_id TEXT UNIQUE NOT NULL,

    -- Transaction details
    type TEXT NOT NULL CHECK (type IN ('RECEIVE', 'SPEND', 'TRANSFER')),
    contact_name TEXT,
    bank_account TEXT,

    -- Project association
    project_code TEXT,

    -- Financial data
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',

    -- Date
    date DATE NOT NULL,

    -- Detailed data
    line_items JSONB DEFAULT '[]',  -- [{description, quantity, unitAmount, accountCode, taxType, lineAmount}]

    -- Sync metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xero_transactions_xero_id ON xero_transactions(xero_transaction_id);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_project ON xero_transactions(project_code);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_date ON xero_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_type ON xero_transactions(type);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_bank ON xero_transactions(bank_account);

-- =============================================================================
-- XERO SYNC LOG TABLE
-- Track Xero sync operations
-- =============================================================================
CREATE TABLE IF NOT EXISTS xero_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sync operation details
    sync_type TEXT NOT NULL,  -- invoices, transactions, contacts, full
    records_synced INT DEFAULT 0,

    -- Error tracking
    errors JSONB DEFAULT '[]',  -- [{entity_id, error_message, timestamp}]

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Index for recent logs
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_started ON xero_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_xero_sync_log_type ON xero_sync_log(sync_type);

-- =============================================================================
-- XERO VIEWS
-- =============================================================================

-- Project Financials: Aggregate invoices by project
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

-- Monthly Revenue: Revenue breakdown by month
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

-- Outstanding Invoices: Unpaid invoices with aging
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

-- =============================================================================
-- XERO FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to xero_invoices
DROP TRIGGER IF EXISTS trigger_xero_invoices_updated ON xero_invoices;
CREATE TRIGGER trigger_xero_invoices_updated
    BEFORE UPDATE ON xero_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply to xero_transactions
DROP TRIGGER IF EXISTS trigger_xero_transactions_updated ON xero_transactions;
CREATE TRIGGER trigger_xero_transactions_updated
    BEFORE UPDATE ON xero_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- XERO ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;

-- Invoices - finance and service_role access
DROP POLICY IF EXISTS xero_invoices_finance ON xero_invoices;
CREATE POLICY xero_invoices_finance ON xero_invoices
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role')
    );

-- Service role access for Xero invoices (dashboard API uses service_role)
DROP POLICY IF EXISTS xero_invoices_service_role ON xero_invoices;
CREATE POLICY xero_invoices_service_role ON xero_invoices
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Transactions - finance and service_role access
DROP POLICY IF EXISTS xero_transactions_finance ON xero_transactions;
CREATE POLICY xero_transactions_finance ON xero_transactions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role')
    );

-- Service role access for Xero transactions (dashboard API uses service_role)
DROP POLICY IF EXISTS xero_transactions_service_role ON xero_transactions;
CREATE POLICY xero_transactions_service_role ON xero_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sync log - admin and service_role access
DROP POLICY IF EXISTS xero_sync_log_admin ON xero_sync_log;
CREATE POLICY xero_sync_log_admin ON xero_sync_log
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'service_role')
    );

-- Service role access for Xero sync logs (dashboard API uses service_role)
DROP POLICY IF EXISTS xero_sync_log_service_role ON xero_sync_log;
CREATE POLICY xero_sync_log_service_role ON xero_sync_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- XERO TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE xero_invoices IS 'Xero invoices synced from Xero API - includes receivables (ACCREC) and payables (ACCPAY)';
COMMENT ON TABLE xero_transactions IS 'Xero bank transactions synced from Xero API';
COMMENT ON TABLE xero_sync_log IS 'Log of all Xero sync operations';
COMMENT ON COLUMN xero_invoices.type IS 'ACCREC = Accounts Receivable (income), ACCPAY = Accounts Payable (expense)';
COMMENT ON COLUMN xero_invoices.project_code IS 'Links to ACT project codes (EL, HARVEST, PICC, etc.)';
COMMENT ON COLUMN xero_invoices.contact_id IS 'Intended to reference ghl_contacts(id) but stored as UUID to avoid FK dependency issues';
COMMENT ON VIEW v_project_financials IS 'Aggregated financial summary by project code';
COMMENT ON VIEW v_monthly_revenue IS 'Monthly revenue breakdown by project';
COMMENT ON VIEW v_outstanding_invoices IS 'Unpaid invoices with aging buckets for cash flow management';


-- =============================================================================
-- PART 2: STRATEGIC SYSTEMS TABLES
-- =============================================================================

-- =============================================================================
-- 1. CASH FLOW & FINANCIAL PROJECTIONS
-- =============================================================================

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

-- =============================================================================
-- 2. REVENUE STREAMS
-- =============================================================================

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

-- =============================================================================
-- 3. PROPERTY & ASSET REGISTER
-- =============================================================================

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

-- =============================================================================
-- 4. DEBT & MORTGAGE TRACKING
-- =============================================================================

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

-- =============================================================================
-- 5. STAFF & RESOURCE ALLOCATION
-- =============================================================================

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

-- =============================================================================
-- 6. ADMINISTRATION & COMPLIANCE
-- =============================================================================

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

-- =============================================================================
-- 7. BUSINESS DEVELOPMENT & R&D
-- =============================================================================

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

-- =============================================================================
-- 8. STRATEGIC SYSTEMS VIEWS FOR DASHBOARDS
-- =============================================================================

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

-- =============================================================================
-- 9. ENABLE RLS (Row Level Security) - STRATEGIC SYSTEMS
-- =============================================================================

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

-- Service role access (command center uses service_role key)
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
