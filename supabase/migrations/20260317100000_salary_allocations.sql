-- Salary allocation model for splitting founder/staff wages across projects
-- Supports R&D time-tracking evidence (who worked on what, for what %)

CREATE TABLE IF NOT EXISTS project_salary_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text NOT NULL,
  person_name text NOT NULL,
  role text,
  allocation_pct numeric NOT NULL CHECK (allocation_pct >= 0 AND allocation_pct <= 1),
  monthly_cost numeric NOT NULL,
  fy text NOT NULL,
  rd_eligible boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for lookups by project and FY
CREATE INDEX IF NOT EXISTS idx_salary_alloc_project_fy ON project_salary_allocations(project_code, fy);
CREATE INDEX IF NOT EXISTS idx_salary_alloc_person ON project_salary_allocations(person_name, fy);

COMMENT ON TABLE project_salary_allocations IS 'Splits founder/staff wages across projects by % time allocation. Separate from project_budgets because: (1) changes per-quarter as focus shifts, (2) needs person-level detail for R&D evidence, (3) R&D Tax Incentive requires who/what/%time.';
