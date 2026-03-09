-- Receipt-to-Reconciliation Pipeline
-- Adds is_reconciled tracking + pipeline status table
-- Created: 2026-03-04

-- =============================================================================
-- Phase 1: Add is_reconciled to xero_transactions
-- =============================================================================

ALTER TABLE xero_transactions
ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_xero_transactions_is_reconciled
ON xero_transactions(is_reconciled);

-- =============================================================================
-- Phase 2: Receipt Pipeline Status table
-- Tracks each transaction through the receipt pipeline stages
-- =============================================================================

CREATE TABLE IF NOT EXISTS receipt_pipeline_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xero_transaction_id TEXT REFERENCES xero_transactions(xero_transaction_id),
  dext_forwarded_email_id BIGINT REFERENCES dext_forwarded_emails(id),
  gmail_message_id TEXT,
  calendar_event_id UUID,
  stage TEXT NOT NULL DEFAULT 'missing_receipt'
    CHECK (stage IN (
      'missing_receipt',
      'forwarded_to_dext',
      'dext_processed',
      'xero_bill_created',
      'reconciled'
    )),
  vendor_name TEXT,
  amount NUMERIC,
  transaction_date DATE,
  matched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(xero_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_status_stage ON receipt_pipeline_status(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_status_xero_id ON receipt_pipeline_status(xero_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status_vendor ON receipt_pipeline_status(vendor_name);
CREATE INDEX IF NOT EXISTS idx_pipeline_status_date ON receipt_pipeline_status(transaction_date DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_pipeline_status_updated ON receipt_pipeline_status;
CREATE TRIGGER trigger_pipeline_status_updated
  BEFORE UPDATE ON receipt_pipeline_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Pipeline funnel view
-- =============================================================================

CREATE OR REPLACE VIEW v_receipt_pipeline_funnel AS
SELECT
  stage,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total_amount,
  MIN(transaction_date) as oldest_date,
  MAX(transaction_date) as newest_date,
  COUNT(*) FILTER (WHERE transaction_date < CURRENT_DATE - INTERVAL '14 days') as stuck_count
FROM receipt_pipeline_status
GROUP BY stage
ORDER BY
  CASE stage
    WHEN 'missing_receipt' THEN 1
    WHEN 'forwarded_to_dext' THEN 2
    WHEN 'dext_processed' THEN 3
    WHEN 'xero_bill_created' THEN 4
    WHEN 'reconciled' THEN 5
  END;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE receipt_pipeline_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY receipt_pipeline_finance ON receipt_pipeline_status
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

COMMENT ON TABLE receipt_pipeline_status IS 'Tracks transactions through receipt pipeline: missing → forwarded → processed → billed → reconciled';
