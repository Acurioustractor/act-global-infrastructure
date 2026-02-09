-- Financial Dashboards: Add project_code_source tracking and GHL grant linkage
-- Created: 2026-02-09

-- Track how project_code was assigned (manual, vendor_rule, tracking_match, keyword_match)
ALTER TABLE xero_transactions ADD COLUMN IF NOT EXISTS project_code_source TEXT;
ALTER TABLE xero_invoices ADD COLUMN IF NOT EXISTS project_code_source TEXT;

-- Link grant applications to GHL opportunities
ALTER TABLE grant_applications ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT;

-- Index for faster lookups on untagged transactions
CREATE INDEX IF NOT EXISTS idx_xero_tx_no_project ON xero_transactions(project_code) WHERE project_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_xero_inv_no_project ON xero_invoices(project_code) WHERE project_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_grant_app_ghl ON grant_applications(ghl_opportunity_id);
