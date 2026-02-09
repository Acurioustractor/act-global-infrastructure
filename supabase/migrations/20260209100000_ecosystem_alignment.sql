-- Ecosystem Alignment: project_code on GHL opportunities + data quality views
-- Phase 1 of Deep Ecosystem Alignment

-- 1. Add project_code to ghl_opportunities
ALTER TABLE ghl_opportunities ADD COLUMN IF NOT EXISTS project_code TEXT;
CREATE INDEX IF NOT EXISTS idx_ghl_opps_project ON ghl_opportunities(project_code);

-- 2. Data quality scoring view
CREATE OR REPLACE VIEW v_data_quality_scores AS
SELECT
  'ghl_opportunities' as source,
  COUNT(*) as total,
  COUNT(project_code) as tagged,
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as pct
FROM ghl_opportunities
UNION ALL
SELECT 'xero_transactions', COUNT(*), COUNT(project_code),
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM xero_transactions
UNION ALL
SELECT 'xero_invoices', COUNT(*), COUNT(project_code),
  ROUND(COUNT(project_code)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM xero_invoices
UNION ALL
SELECT 'subscriptions', COUNT(*), COUNT(NULLIF(project_codes, '{}')),
  ROUND(COUNT(NULLIF(project_codes, '{}'))::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM subscriptions WHERE account_status = 'active';

-- 3. Top untagged transactions view
CREATE OR REPLACE VIEW v_top_untagged AS
SELECT contact_name, COUNT(*) as tx_count,
  ROUND(SUM(ABS(total))::numeric, 0) as total_value
FROM xero_transactions
WHERE project_code IS NULL AND contact_name IS NOT NULL
GROUP BY contact_name
ORDER BY tx_count DESC
LIMIT 30;
