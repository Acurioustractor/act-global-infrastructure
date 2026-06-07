-- A 2026-05-21: tighten mv_project_quarter_position to exclude TRANSFER-type rows.
-- These are internal cash movements (NAB Visa ↔ ACT Everyday), not project work.
-- 307 such rows were already untagged via UPDATE in the same session
-- (source = 'manual-untagged-transfer-type-2026-05-21'). This MV change is defense
-- in depth — if anything ever re-tags TRANSFER rows, the aggregation ignores them.
--
-- Replaces the original 20260521000100 view with a tighter version. The 100/200
-- naming preserves migration order.

DROP VIEW IF EXISTS v_project_lifetime_position;
DROP MATERIALIZED VIEW IF EXISTS mv_project_quarter_position;

CREATE MATERIALIZED VIEW mv_project_quarter_position AS
WITH all_lines AS (
  SELECT 'ACCREC' as line_type, total, date, project_code, 'invoice' as source_table
  FROM xero_invoices WHERE type = 'ACCREC' AND project_code IS NOT NULL AND project_code != ''
  UNION ALL
  SELECT 'ACCPAY', total, date, project_code, 'invoice' FROM xero_invoices
    WHERE type = 'ACCPAY' AND project_code IS NOT NULL AND project_code != ''
  UNION ALL
  SELECT type, total, date, project_code, 'bank_txn'
  FROM xero_transactions
  WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
    AND project_code IS NOT NULL AND project_code != ''
    AND type NOT LIKE '%TRANSFER%'  -- exclude internal cash movements
)
SELECT
  project_code,
  date_trunc('quarter', date)::date as quarter_start,
  EXTRACT(YEAR FROM date)::int as year,
  EXTRACT(QUARTER FROM date)::int as quarter,
  SUM(CASE WHEN line_type = 'ACCREC' THEN total ELSE 0 END) as revenue_invoiced,
  SUM(CASE WHEN line_type = 'ACCPAY' THEN total ELSE 0 END) as expense_billed,
  SUM(CASE WHEN line_type = 'SPEND' THEN total ELSE 0 END) as expense_bank,
  SUM(CASE WHEN line_type = 'RECEIVE' THEN total ELSE 0 END) as receive_bank,
  COUNT(*) FILTER (WHERE source_table = 'invoice') as invoice_count,
  COUNT(*) FILTER (WHERE source_table = 'bank_txn') as txn_count,
  COUNT(*) as row_count,
  now() as materialized_at
FROM all_lines
GROUP BY project_code, date_trunc('quarter', date), EXTRACT(YEAR FROM date), EXTRACT(QUARTER FROM date);

CREATE UNIQUE INDEX idx_mv_pqp_unique ON mv_project_quarter_position (project_code, quarter_start);
CREATE INDEX idx_mv_pqp_year_quarter ON mv_project_quarter_position (year, quarter);
GRANT SELECT ON mv_project_quarter_position TO authenticated, service_role;

CREATE OR REPLACE VIEW v_project_lifetime_position AS
SELECT
  project_code,
  SUM(revenue_invoiced) as revenue_invoiced_lifetime,
  SUM(expense_billed) as expense_billed_lifetime,
  SUM(expense_bank) as expense_bank_lifetime,
  SUM(receive_bank) as receive_bank_lifetime,
  SUM(invoice_count) as invoice_count_lifetime,
  SUM(txn_count) as txn_count_lifetime,
  MIN(quarter_start) as first_quarter,
  MAX(quarter_start) as last_quarter
FROM mv_project_quarter_position
GROUP BY project_code;
GRANT SELECT ON v_project_lifetime_position TO authenticated, service_role;
