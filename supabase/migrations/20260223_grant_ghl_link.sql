-- Add GHL link column to grant_opportunities for two-way sync
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT;
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_ghl_id ON grant_opportunities(ghl_opportunity_id);
