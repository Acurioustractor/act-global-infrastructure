-- Financial Clarity System — Phase 2
-- Pre-calculated monthly P&L per project, variance explanations, enhanced cash flow view

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: project_monthly_financials
-- Pre-calculated monthly P&L per project
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS project_monthly_financials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text NOT NULL,
  month date NOT NULL, -- first of month, e.g. 2026-01-01

  revenue numeric DEFAULT 0,
  expenses numeric DEFAULT 0,
  net numeric DEFAULT 0,

  -- Breakdowns (JSONB: { "category": amount })
  revenue_breakdown jsonb DEFAULT '{}',
  expense_breakdown jsonb DEFAULT '{}',

  -- FY year-to-date
  fy_ytd_revenue numeric DEFAULT 0,
  fy_ytd_expenses numeric DEFAULT 0,
  fy_ytd_net numeric DEFAULT 0,

  -- Tagging coverage
  transaction_count int DEFAULT 0,
  unmapped_count int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(project_code, month)
);

CREATE INDEX IF NOT EXISTS idx_pmf_project_code ON project_monthly_financials(project_code);
CREATE INDEX IF NOT EXISTS idx_pmf_month ON project_monthly_financials(month DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: financial_variance_notes
-- Auto-generated explanations for significant month-to-month changes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS financial_variance_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text,              -- NULL = org-wide
  month date NOT NULL,            -- month of the variance
  variance_type text NOT NULL,    -- 'revenue_change', 'expense_change', 'net_swing'
  amount_change numeric NOT NULL, -- delta from prior month
  pct_change numeric,             -- percentage change
  explanation text NOT NULL,      -- LLM-generated or rule-based explanation
  top_drivers jsonb,              -- [{ "vendor": "X", "amount": Y, "change": Z }]
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  auto_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(project_code, month, variance_type)
);

CREATE INDEX IF NOT EXISTS idx_fvn_month ON financial_variance_notes(month DESC);
CREATE INDEX IF NOT EXISTS idx_fvn_project ON financial_variance_notes(project_code);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEW: v_cashflow_explained
-- Enhances v_cashflow_summary with top sources and variance explanations
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW v_cashflow_explained AS
SELECT
  cf.month,
  cf.income,
  cf.expenses,
  cf.net,
  cf.closing_balance,
  cf.is_projection,
  cf.confidence,
  cf.income_breakdown,
  cf.expense_breakdown,
  -- Prior month for comparison
  LAG(cf.income) OVER (ORDER BY cf.month) AS prior_income,
  LAG(cf.expenses) OVER (ORDER BY cf.month) AS prior_expenses,
  LAG(cf.net) OVER (ORDER BY cf.month) AS prior_net,
  -- Variance
  cf.income - COALESCE(LAG(cf.income) OVER (ORDER BY cf.month), 0) AS income_change,
  cf.expenses - COALESCE(LAG(cf.expenses) OVER (ORDER BY cf.month), 0) AS expense_change,
  cf.net - COALESCE(LAG(cf.net) OVER (ORDER BY cf.month), 0) AS net_change,
  -- Variance notes (joined)
  fvn.explanations
FROM v_cashflow_summary cf
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'type', fvn2.variance_type,
    'explanation', fvn2.explanation,
    'amount', fvn2.amount_change,
    'severity', fvn2.severity
  )) AS explanations
  FROM financial_variance_notes fvn2
  WHERE fvn2.month = cf.month AND fvn2.project_code IS NULL
) fvn ON true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEW: v_unmapped_transactions
-- Transactions without project codes, with suggested project from vendor rules
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW v_unmapped_transactions AS
SELECT
  xt.id,
  xt.date,
  xt.contact_name,
  xt.total,
  xt.type,
  xt.bank_account,
  vpr.project_code AS suggested_project,
  vpr.category AS suggested_category,
  vpr.vendor_name AS matched_rule_vendor
FROM xero_transactions xt
LEFT JOIN vendor_project_rules vpr
  ON lower(xt.contact_name) = lower(vpr.vendor_name)
  OR xt.contact_name = ANY(vpr.aliases)
WHERE xt.project_code IS NULL
  AND xt.date > now() - interval '6 months'
ORDER BY xt.date DESC;
