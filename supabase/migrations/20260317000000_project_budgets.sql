-- Project Budgets Table
-- Xero budgets API is read-only, so we maintain budgets in Supabase
-- Used by financial-advisor-agent.mjs for budget vs actual analysis

CREATE TABLE IF NOT EXISTS project_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text NOT NULL,
  fy_year text NOT NULL,                -- 'FY26', 'FY27'
  month date,                            -- NULL = annual budget, date = monthly
  budget_amount numeric(12,2) NOT NULL,
  budget_type text DEFAULT 'expense' CHECK (budget_type IN ('expense', 'revenue', 'grant', 'salary')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_code, fy_year, month, budget_type)
);

CREATE INDEX idx_project_budgets_fy ON project_budgets(fy_year);
CREATE INDEX idx_project_budgets_project ON project_budgets(project_code);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_budgets_updated_at
  BEFORE UPDATE ON project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budgets_updated_at();

COMMENT ON TABLE project_budgets IS 'Project budget tracking — Xero budgets are read-only via API, so we maintain here for budget vs actual analysis';
