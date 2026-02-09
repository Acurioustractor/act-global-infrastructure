-- Cross-Domain Intelligence Views
-- Purpose: Eliminate JS-side joins, enable fast cross-domain queries
-- Created: 2026-02-10

-- =============================================================================
-- 1. v_project_summary — Aggregated metrics per project
-- =============================================================================

CREATE OR REPLACE VIEW v_project_summary AS
WITH tx_stats AS (
    SELECT
        project_code,
        COALESCE(SUM(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'SPEND' THEN ABS(total) ELSE 0 END), 0) AS total_expenses,
        COALESCE(SUM(CASE WHEN type = 'RECEIVE' THEN total WHEN type = 'SPEND' THEN total ELSE 0 END), 0) AS net,
        COUNT(*) AS transaction_count
    FROM xero_transactions
    WHERE project_code IS NOT NULL
    GROUP BY project_code
),
inv_stats AS (
    SELECT
        project_code,
        COUNT(*) AS invoice_count,
        COALESCE(SUM(amount_due), 0) AS outstanding_amount
    FROM xero_invoices
    WHERE project_code IS NOT NULL
      AND status NOT IN ('PAID', 'VOIDED', 'DELETED')
    GROUP BY project_code
),
opp_stats AS (
    SELECT
        project_code,
        COUNT(*) AS opportunity_count,
        COALESCE(SUM(monetary_value), 0) AS pipeline_value,
        COUNT(*) FILTER (WHERE status = 'open') AS open_opportunities
    FROM ghl_opportunities
    WHERE project_code IS NOT NULL
    GROUP BY project_code
),
email_stats AS (
    SELECT
        unnest(project_codes) AS project_code,
        COUNT(*) AS email_count,
        MAX(occurred_at) AS last_email_date
    FROM communications_history
    WHERE project_codes IS NOT NULL AND array_length(project_codes, 1) > 0
    GROUP BY unnest(project_codes)
),
grant_stats AS (
    SELECT
        project_code,
        COUNT(*) AS grant_count,
        COALESCE(SUM(CASE WHEN status = 'successful' THEN outcome_amount ELSE 0 END), 0) AS grants_won,
        COALESCE(SUM(CASE WHEN status IN ('submitted', 'under_review') THEN amount_requested ELSE 0 END), 0) AS grants_pending
    FROM grant_applications
    WHERE project_code IS NOT NULL
    GROUP BY project_code
),
sub_stats AS (
    SELECT
        unnest(project_codes) AS project_code,
        COALESCE(SUM(
            CASE billing_cycle
                WHEN 'monthly' THEN amount
                WHEN 'annual' THEN amount / 12
                WHEN 'quarterly' THEN amount / 3
                ELSE 0
            END
        ), 0) AS subscription_monthly_cost
    FROM subscriptions
    WHERE account_status = 'active' AND project_codes IS NOT NULL AND array_length(project_codes, 1) > 0
    GROUP BY unnest(project_codes)
)
SELECT
    ph.project_code,
    ph.project_name,
    ph.overall_score AS health_score,
    ph.health_status,
    ph.momentum_score,
    ph.engagement_score,
    ph.financial_score,
    ph.timeline_score,
    ph.calculated_at AS health_calculated_at,
    COALESCE(tx.total_income, 0) AS total_income,
    COALESCE(tx.total_expenses, 0) AS total_expenses,
    COALESCE(tx.net, 0) AS net,
    COALESCE(tx.transaction_count, 0) AS transaction_count,
    COALESCE(inv.invoice_count, 0) AS invoice_count,
    COALESCE(inv.outstanding_amount, 0) AS outstanding_amount,
    COALESCE(opp.opportunity_count, 0) AS opportunity_count,
    COALESCE(opp.pipeline_value, 0) AS pipeline_value,
    COALESCE(opp.open_opportunities, 0) AS open_opportunities,
    COALESCE(em.email_count, 0) AS email_count,
    em.last_email_date,
    COALESCE(gr.grant_count, 0) AS grant_count,
    COALESCE(gr.grants_won, 0) AS grants_won,
    COALESCE(gr.grants_pending, 0) AS grants_pending,
    COALESCE(ss.subscription_monthly_cost, 0) AS subscription_monthly_cost
FROM project_health ph
LEFT JOIN tx_stats tx ON tx.project_code = ph.project_code
LEFT JOIN inv_stats inv ON inv.project_code = ph.project_code
LEFT JOIN opp_stats opp ON opp.project_code = ph.project_code
LEFT JOIN email_stats em ON em.project_code = ph.project_code
LEFT JOIN grant_stats gr ON gr.project_code = ph.project_code
LEFT JOIN sub_stats ss ON ss.project_code = ph.project_code;

COMMENT ON VIEW v_project_summary IS 'Cross-domain project summary: finances, pipeline, comms, grants, health';

-- =============================================================================
-- 2. v_enriched_opportunities — Opportunities with contact + pipeline info
-- =============================================================================

CREATE OR REPLACE VIEW v_enriched_opportunities AS
SELECT
    o.id,
    o.ghl_id,
    o.name,
    o.status,
    o.monetary_value,
    o.pipeline_name,
    o.stage_name,
    o.project_code,
    o.ghl_contact_id,
    o.ghl_pipeline_id,
    o.ghl_stage_id,
    o.assigned_to,
    o.ghl_created_at,
    o.ghl_updated_at,
    o.created_at,
    o.updated_at,
    c.full_name AS contact_name,
    c.email AS contact_email,
    c.company_name AS contact_company,
    p.name AS pipeline_name_resolved,
    p.ghl_location_id
FROM ghl_opportunities o
LEFT JOIN ghl_contacts c ON c.ghl_id = o.ghl_contact_id
LEFT JOIN ghl_pipelines p ON p.ghl_id = o.ghl_pipeline_id;

COMMENT ON VIEW v_enriched_opportunities IS 'Opportunities enriched with contact name/email and pipeline details';

-- =============================================================================
-- 3. v_contact_360 — Contact with aggregated cross-domain stats
-- =============================================================================

CREATE OR REPLACE VIEW v_contact_360 AS
WITH opp_agg AS (
    SELECT
        ghl_contact_id,
        COUNT(*) AS opportunity_count,
        COALESCE(SUM(monetary_value), 0) AS total_pipeline_value,
        COUNT(*) FILTER (WHERE status = 'won') AS won_count,
        COALESCE(SUM(CASE WHEN status = 'won' THEN monetary_value ELSE 0 END), 0) AS won_value
    FROM ghl_opportunities
    WHERE ghl_contact_id IS NOT NULL
    GROUP BY ghl_contact_id
),
comms_agg AS (
    SELECT
        ghl_contact_id,
        COUNT(*) AS email_count,
        MAX(occurred_at) AS last_email_date,
        MIN(occurred_at) AS first_email_date
    FROM communications_history
    WHERE ghl_contact_id IS NOT NULL
    GROUP BY ghl_contact_id
),
tx_agg AS (
    SELECT
        LOWER(TRIM(contact_name)) AS contact_name_lower,
        COALESCE(SUM(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN type = 'SPEND' THEN ABS(total) ELSE 0 END), 0) AS total_payments,
        COUNT(*) AS transaction_count
    FROM xero_transactions
    WHERE contact_name IS NOT NULL AND contact_name != ''
    GROUP BY LOWER(TRIM(contact_name))
)
SELECT
    c.id,
    c.ghl_id,
    c.full_name,
    c.email,
    c.phone,
    c.company_name,
    c.tags,
    c.projects,
    c.engagement_status,
    c.first_contact_date,
    c.last_contact_date,
    COALESCE(oa.opportunity_count, 0) AS opportunity_count,
    COALESCE(oa.total_pipeline_value, 0) AS total_pipeline_value,
    COALESCE(oa.won_count, 0) AS won_count,
    COALESCE(oa.won_value, 0) AS won_value,
    COALESCE(ca.email_count, 0) AS email_count,
    ca.last_email_date,
    ca.first_email_date,
    COALESCE(ta.total_revenue, 0) AS total_revenue,
    COALESCE(ta.total_payments, 0) AS total_payments,
    COALESCE(ta.transaction_count, 0) AS financial_transaction_count
FROM ghl_contacts c
LEFT JOIN opp_agg oa ON oa.ghl_contact_id = c.ghl_id
LEFT JOIN comms_agg ca ON ca.ghl_contact_id = c.ghl_id
LEFT JOIN tx_agg ta ON ta.contact_name_lower = LOWER(TRIM(c.full_name));

COMMENT ON VIEW v_contact_360 IS 'Contact with pipeline, communication, and financial stats';

-- =============================================================================
-- 4. v_activity_stream — Interleaved activity across all domains
-- =============================================================================

CREATE OR REPLACE VIEW v_activity_stream AS
-- Transactions
SELECT
    'transaction' AS activity_type,
    id::text AS source_id,
    project_code,
    date::timestamptz AS activity_date,
    CASE type
        WHEN 'RECEIVE' THEN 'Received from ' || COALESCE(contact_name, 'Unknown')
        WHEN 'SPEND' THEN 'Payment to ' || COALESCE(contact_name, 'Unknown')
        ELSE 'Transfer'
    END AS title,
    '$' || ABS(total)::text AS description,
    total AS amount
FROM xero_transactions
WHERE date >= CURRENT_DATE - INTERVAL '90 days'

UNION ALL

-- Emails
SELECT
    'email' AS activity_type,
    id::text AS source_id,
    CASE WHEN project_codes IS NOT NULL AND array_length(project_codes, 1) > 0
         THEN project_codes[1]
         ELSE NULL
    END AS project_code,
    occurred_at AS activity_date,
    COALESCE(subject, 'Email') AS title,
    LEFT(COALESCE(content_preview, ''), 120) AS description,
    NULL::numeric AS amount
FROM communications_history
WHERE occurred_at >= CURRENT_DATE - INTERVAL '90 days'

UNION ALL

-- Opportunities (status changes)
SELECT
    'opportunity' AS activity_type,
    id::text AS source_id,
    project_code,
    COALESCE(ghl_updated_at, updated_at) AS activity_date,
    name AS title,
    status || ' — ' || COALESCE(stage_name, '') || ' ($' || COALESCE(monetary_value, 0)::text || ')' AS description,
    monetary_value AS amount
FROM ghl_opportunities
WHERE COALESCE(ghl_updated_at, updated_at) >= CURRENT_DATE - INTERVAL '90 days'

UNION ALL

-- Meetings / Knowledge
SELECT
    'meeting' AS activity_type,
    id::text AS source_id,
    project_code,
    COALESCE(recorded_at, created_at) AS activity_date,
    title,
    LEFT(COALESCE(summary, ''), 120) AS description,
    NULL::numeric AS amount
FROM project_knowledge
WHERE knowledge_type = 'meeting'
  AND COALESCE(recorded_at, created_at) >= CURRENT_DATE - INTERVAL '90 days'

ORDER BY activity_date DESC;

COMMENT ON VIEW v_activity_stream IS 'Interleaved activity stream across all domains (transactions, emails, opportunities, meetings)';
