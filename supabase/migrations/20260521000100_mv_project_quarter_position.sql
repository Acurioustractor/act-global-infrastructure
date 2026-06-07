-- S2: Materialized per-project per-quarter position
-- Aggregates ACCREC + ACCPAY + SPEND/RECEIVE per project per quarter.
-- Single canonical source so Notion and command-center never disagree.
-- See thoughts/shared/reviews/finance-system-review-2026-05-21.md S2.
-- Applied via Supabase MCP 2026-05-21.

DROP MATERIALIZED VIEW IF EXISTS mv_project_quarter_position;

CREATE MATERIALIZED VIEW mv_project_quarter_position AS
WITH all_lines AS (
  SELECT
    'ACCREC' as line_type,
    total,
    date,
    project_code,
    'invoice' as source_table
  FROM xero_invoices
  WHERE type = 'ACCREC' AND project_code IS NOT NULL AND project_code != ''

  UNION ALL

  SELECT
    'ACCPAY' as line_type,
    total,
    date,
    project_code,
    'invoice' as source_table
  FROM xero_invoices
  WHERE type = 'ACCPAY' AND project_code IS NOT NULL AND project_code != ''

  UNION ALL

  SELECT
    type as line_type,
    total,
    date,
    project_code,
    'bank_txn' as source_table
  FROM xero_transactions
  WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
    AND project_code IS NOT NULL AND project_code != ''
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

COMMENT ON MATERIALIZED VIEW mv_project_quarter_position IS
  'Per-project per-quarter financial position. Two-account rule applied (NAB Visa #8815 + ACT Everyday only). Refresh after sync-xero-to-supabase.mjs. Created 2026-05-21 (S2).';

GRANT SELECT ON mv_project_quarter_position TO authenticated, service_role;

CREATE OR REPLACE FUNCTION refresh_mv_project_quarter_position()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_quarter_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

GRANT EXECUTE ON FUNCTION refresh_mv_project_quarter_position() TO service_role;

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
