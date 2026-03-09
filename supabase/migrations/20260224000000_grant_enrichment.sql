-- Grant Enrichment: add columns for auto-extracted requirements and ACT readiness
-- These are populated by scripts/enrich-grant-opportunities.mjs

ALTER TABLE grant_opportunities
  ADD COLUMN IF NOT EXISTS requirements_summary TEXT,
  ADD COLUMN IF NOT EXISTS act_readiness JSONB,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT;

-- Index for finding unenriched grants with URLs
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_enrichment
  ON grant_opportunities (enriched_at)
  WHERE url IS NOT NULL AND enriched_at IS NULL;
