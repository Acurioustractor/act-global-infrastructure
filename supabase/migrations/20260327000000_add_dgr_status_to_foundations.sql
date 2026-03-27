-- Add DGR status and supporting columns to foundations table
-- DGR (Deductible Gift Recipient) is the #1 signal for grant-making foundations

ALTER TABLE foundations
  ADD COLUMN IF NOT EXISTS has_dgr boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dgr_endorsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS abr_entity_type text,
  ADD COLUMN IF NOT EXISTS abr_status text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Index for DGR filtering
CREATE INDEX IF NOT EXISTS idx_foundations_has_dgr ON foundations (has_dgr) WHERE has_dgr = true;

COMMENT ON COLUMN foundations.has_dgr IS 'DGR-endorsed per ABR/ATO — can receive tax-deductible donations';
COMMENT ON COLUMN foundations.metadata IS 'ABR enrichment data, DGR items, etc.';
