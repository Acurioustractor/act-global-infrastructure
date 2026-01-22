-- Xero Financial Data Integration
-- Purpose: Store Xero invoices and transactions with project linking
-- Syncs: Xero -> Supabase (read-only from Xero)
--
-- Created: 2026-01-23

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
    contact_id UUID REFERENCES ghl_contacts(id),  -- Link to GHL contact if matched

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
-- VIEWS
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
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update timestamp trigger (reuse existing function if it exists)
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
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_sync_log ENABLE ROW LEVEL SECURITY;

-- Invoices - admin and finance access
CREATE POLICY xero_invoices_finance ON xero_invoices
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role')
    );

-- Transactions - admin and finance access
CREATE POLICY xero_transactions_finance ON xero_transactions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role')
    );

-- Sync log - admin access
CREATE POLICY xero_sync_log_admin ON xero_sync_log
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'service_role')
    );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE xero_invoices IS 'Xero invoices synced from Xero API - includes receivables (ACCREC) and payables (ACCPAY)';
COMMENT ON TABLE xero_transactions IS 'Xero bank transactions synced from Xero API';
COMMENT ON TABLE xero_sync_log IS 'Log of all Xero sync operations';
COMMENT ON COLUMN xero_invoices.type IS 'ACCREC = Accounts Receivable (income), ACCPAY = Accounts Payable (expense)';
COMMENT ON COLUMN xero_invoices.project_code IS 'Links to ACT project codes (EL, HARVEST, PICC, etc.)';
COMMENT ON VIEW v_project_financials IS 'Aggregated financial summary by project code';
COMMENT ON VIEW v_monthly_revenue IS 'Monthly revenue breakdown by project';
COMMENT ON VIEW v_outstanding_invoices IS 'Unpaid invoices with aging buckets for cash flow management';
