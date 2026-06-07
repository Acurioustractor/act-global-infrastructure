-- Add next-report tracking to project_funding_allocations (2026-05-21)
-- Used by /finance/funders side panel + list "reports due in 30 days" filter.

ALTER TABLE project_funding_allocations
  ADD COLUMN IF NOT EXISTS next_report_due date,
  ADD COLUMN IF NOT EXISTS next_report_name text;

UPDATE project_funding_allocations
SET next_report_due = '2026-07-31',
    next_report_name = 'FY26 Operational acquittal'
WHERE funder_org_name = 'The Snow Foundation' AND next_report_due IS NULL;
