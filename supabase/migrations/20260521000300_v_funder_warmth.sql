-- Funder warmth + next-move views (2026-05-21)
-- Powers Funder Reporting Hub (Notion) + sync-funder-reporting-to-notion.mjs script.
-- Applied via Supabase MCP 2026-05-21.

CREATE OR REPLACE VIEW v_funder_summary AS
WITH inv AS (
  SELECT
    contact_name as funder_name,
    count(*) as invoice_count,
    sum(total) as gross_revenue,
    sum(total) / 1.1 as net_revenue,
    min(date) as first_invoice,
    max(date) as last_invoice,
    EXTRACT(DAY FROM (now() - max(date)::timestamp))::int as days_since_last,
    count(DISTINCT EXTRACT(YEAR FROM date))::int as years_active,
    array_agg(DISTINCT project_code ORDER BY project_code) FILTER (WHERE project_code IS NOT NULL) as projects,
    cardinality(array_agg(DISTINCT project_code) FILTER (WHERE project_code IS NOT NULL)) as project_span,
    count(*) FILTER (WHERE status = 'AUTHORISED')::int as authorised_count,
    coalesce(sum(amount_due) FILTER (WHERE status = 'AUTHORISED'), 0) as outstanding,
    count(*) FILTER (WHERE status = 'PAID')::int as paid_count,
    coalesce(sum(total) FILTER (WHERE status = 'PAID'), 0) as paid_revenue
  FROM xero_invoices
  WHERE type = 'ACCREC' AND status NOT IN ('DELETED','VOIDED')
  GROUP BY contact_name
)
SELECT
  i.funder_name,
  i.invoice_count,
  i.paid_count,
  i.authorised_count,
  round(i.gross_revenue::numeric, 0) as gross_revenue,
  round(i.net_revenue::numeric, 0) as net_revenue,
  round(i.paid_revenue::numeric, 0) as paid_revenue,
  round(i.outstanding::numeric, 0) as outstanding,
  i.first_invoice,
  i.last_invoice,
  i.days_since_last,
  i.years_active,
  i.project_span,
  i.projects,
  LEAST(100, GREATEST(0,
    LEAST(30, (ln(GREATEST(i.gross_revenue, 1000))::numeric - ln(1000)) * 4.5)
    + GREATEST(0, 25 - (i.days_since_last::numeric / 14.6))
    + LEAST(20, i.invoice_count * 2)
    + GREATEST(0, (i.years_active - 1) * 10)
    + LEAST(5, (i.project_span - 1) * 3)
    + (CASE WHEN i.authorised_count > 0 THEN 10 ELSE 0 END)
  ))::int as warmth_score,
  CASE
    WHEN i.gross_revenue >= 100000 AND i.days_since_last <= 90 THEN 'HOT'
    WHEN i.gross_revenue >= 50000 AND i.days_since_last <= 180 THEN 'WARM'
    WHEN i.days_since_last <= 90 THEN 'STEADY'
    WHEN i.days_since_last <= 365 THEN 'COOLING'
    ELSE 'COLD'
  END as warmth_band
FROM inv i;

GRANT SELECT ON v_funder_summary TO authenticated, service_role;

CREATE OR REPLACE VIEW v_funder_next_move AS
SELECT
  f.*,
  CASE
    WHEN f.outstanding > 0 AND f.days_since_last <= 30
      THEN 'Chase payment: ' || to_char(f.outstanding,'$FM999,999,999') || ' authorised, expect within 14 days'
    WHEN f.outstanding > 0 AND f.days_since_last <= 90
      THEN 'Follow up on outstanding ' || to_char(f.outstanding,'$FM999,999,999') || ' authorised invoice'
    WHEN f.outstanding > 0
      THEN 'Escalate stale authorised invoice — ' || to_char(f.outstanding,'$FM999,999,999')
    WHEN f.warmth_band = 'HOT' AND f.years_active >= 2
      THEN 'Renewal conversation: 2+ year repeat funder'
    WHEN f.warmth_band = 'HOT'
      THEN 'Active relationship — schedule next-round conversation'
    WHEN f.warmth_band = 'WARM'
      THEN 'Re-engage: 50K+ funder going quiet (' || f.days_since_last || 'd)'
    WHEN f.warmth_band = 'STEADY'
      THEN 'Recent activity — explore partnership extension'
    WHEN f.warmth_band = 'COOLING'
      THEN 'REVIVE: ' || f.days_since_last || ' days quiet — warm-touch email'
    WHEN f.warmth_band = 'COLD'
      THEN 'Cold lapse: ' || f.days_since_last || 'd. Revive or close out.'
    ELSE 'Review'
  END as next_move
FROM v_funder_summary f;

GRANT SELECT ON v_funder_next_move TO authenticated, service_role;
