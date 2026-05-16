-- Money Command Pass B — per-project money state view
--
-- Backs /finance/command (the canonical Money Command view).
-- Layers surfaced by the API: TOP coverage %, MIDDLE alignment quality + heartbeats, BOTTOM action hooks.
--
-- Read-only view. No data is written. Refreshed implicitly on every SELECT.
-- Companion: ../scripts/compute-project-money-state.mjs (snapshot for daily cron — Pass B2).

DROP VIEW IF EXISTS public.v_project_money_state;

CREATE VIEW public.v_project_money_state AS
WITH fy_range AS (
  -- Australian FY26 = Jul 2025 → Jun 2026
  SELECT DATE '2025-07-01' AS fy_start, DATE '2026-06-30' AS fy_end
),
txn_stats AS (
  SELECT
    t.project_code,
    count(*) FILTER (WHERE t.date BETWEEN f.fy_start AND f.fy_end) AS txn_count_fy,
    count(*) FILTER (WHERE t.date BETWEEN f.fy_start AND f.fy_end AND t.project_code IS NULL) AS txn_untagged_fy,
    sum(CASE WHEN t.type IN ('SPEND','SPEND-OVERPAYMENT','SPEND-PREPAYMENT')
              AND t.date BETWEEN f.fy_start AND f.fy_end THEN t.total ELSE 0 END) AS expenses_fy,
    sum(CASE WHEN t.type IN ('RECEIVE','RECEIVE-OVERPAYMENT','RECEIVE-PREPAYMENT')
              AND t.date BETWEEN f.fy_start AND f.fy_end THEN t.total ELSE 0 END) AS income_fy,
    max(t.date) AS last_transaction_at
  FROM xero_transactions t
  CROSS JOIN fy_range f
  GROUP BY t.project_code
),
inv_stats AS (
  SELECT
    i.project_code,
    count(*) FILTER (WHERE i.date BETWEEN f.fy_start AND f.fy_end) AS inv_count_fy,
    count(*) FILTER (WHERE i.date BETWEEN f.fy_start AND f.fy_end AND i.project_code IS NULL) AS inv_untagged_fy,
    sum(CASE WHEN i.type = 'ACCREC' AND i.status IN ('AUTHORISED','SUBMITTED')
              THEN i.amount_due ELSE 0 END) AS receivables,
    sum(CASE WHEN i.type = 'ACCREC' AND i.status = 'PAID'
              AND i.date BETWEEN f.fy_start AND f.fy_end THEN i.total ELSE 0 END) AS revenue_paid_fy,
    max(i.fully_paid_date) FILTER (WHERE i.type = 'ACCREC') AS last_invoice_paid_at,
    max(i.date) FILTER (WHERE i.type = 'ACCPAY') AS last_bill_at
  FROM xero_invoices i
  CROSS JOIN fy_range f
  GROUP BY i.project_code
),
opp_stats AS (
  SELECT
    o.project_code,
    count(*) FILTER (WHERE o.status = 'open') AS opp_open_count,
    count(*) FILTER (WHERE o.status = 'open' AND o.project_code IS NULL) AS opp_untagged_count,
    sum(CASE WHEN o.status = 'open' THEN
      COALESCE(o.monetary_value, 0) *
      CASE
        WHEN lower(o.stage_name) ~ '(won|invoiced|harvest|graduation)' THEN 1.00
        WHEN lower(o.stage_name) ~ '(submitted|growth|negotiation)' THEN 0.70
        WHEN lower(o.stage_name) ~ '(proposed|invited|application.in.progress)' THEN 0.50
        WHEN lower(o.stage_name) ~ '(germination|scoping|needs.assessment|grant.opportunity.identified)' THEN 0.25
        WHEN lower(o.stage_name) ~ '(identified|signal|new.lead|new.inquiry|outreach)' THEN 0.10
        WHEN lower(o.stage_name) ~ '(lost|cancelled|dropped)' THEN 0.00
        ELSE 0.15
      END
    ELSE 0 END) AS pipeline_weighted,
    sum(CASE WHEN o.status = 'open' THEN COALESCE(o.monetary_value, 0) ELSE 0 END) AS pipeline_raw,
    max(o.last_stage_change_at) FILTER (WHERE o.status = 'open') AS last_opp_update_at
  FROM ghl_opportunities o
  GROUP BY o.project_code
),
grant_stats AS (
  SELECT
    ga.project_code,
    sum(CASE WHEN ga.status IN ('submitted','in_review','interview') THEN COALESCE(ga.amount_requested, 0) ELSE 0 END) AS grants_in_flight,
    count(*) FILTER (WHERE ga.status IN ('submitted','in_review','interview')) AS grants_in_flight_count
  FROM grant_applications ga
  GROUP BY ga.project_code
)
SELECT
  p.code AS project_code,
  p.name AS project_name,
  p.tier,
  p.category,
  p.status AS project_status,
  p.importance_weight,

  -- Coverage
  COALESCE(ts.txn_count_fy, 0) AS txn_count_fy,
  COALESCE(ts.txn_untagged_fy, 0) AS txn_untagged_fy,
  COALESCE(inv.inv_count_fy, 0) AS inv_count_fy,
  COALESCE(inv.inv_untagged_fy, 0) AS inv_untagged_fy,
  COALESCE(opp.opp_open_count, 0) AS opp_open_count,
  COALESCE(opp.opp_untagged_count, 0) AS opp_untagged_count,

  -- Money flowing
  COALESCE(ts.income_fy, 0) AS income_fy,
  COALESCE(ts.expenses_fy, 0) AS expenses_fy,
  COALESCE(ts.income_fy, 0) - COALESCE(ts.expenses_fy, 0) AS net_fy,
  COALESCE(inv.revenue_paid_fy, 0) AS revenue_paid_fy,
  COALESCE(inv.receivables, 0) AS receivables,
  COALESCE(opp.pipeline_weighted, 0) AS pipeline_weighted,
  COALESCE(opp.pipeline_raw, 0) AS pipeline_raw,
  COALESCE(gs.grants_in_flight, 0) AS grants_in_flight,
  COALESCE(gs.grants_in_flight_count, 0) AS grants_in_flight_count,

  -- Heartbeats
  ts.last_transaction_at,
  inv.last_invoice_paid_at,
  inv.last_bill_at,
  opp.last_opp_update_at,

  -- Days-since helpers (NULL when no activity ever); date - date returns int days in Postgres
  GREATEST((CURRENT_DATE - ts.last_transaction_at)::int, 0) AS days_since_transaction,
  GREATEST((CURRENT_DATE - inv.last_invoice_paid_at)::int, 0) AS days_since_invoice_paid,
  GREATEST((CURRENT_DATE - opp.last_opp_update_at::date)::int, 0) AS days_since_opp_update

FROM projects p
LEFT JOIN txn_stats ts ON ts.project_code = p.code
LEFT JOIN inv_stats inv ON inv.project_code = p.code
LEFT JOIN opp_stats opp ON opp.project_code = p.code
LEFT JOIN grant_stats gs ON gs.project_code = p.code
ORDER BY p.importance_weight DESC NULLS LAST, p.name;

COMMENT ON VIEW public.v_project_money_state IS
  'Per-project money state for /finance/command. Coverage %, $ flowing (income/expenses/receivables/pipeline/grants), heartbeats. Read live. Snapshot via scripts/compute-project-money-state.mjs for performance if needed.';
