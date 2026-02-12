-- =============================================================================
-- ENHANCE RELATIONSHIP HEALTH — Multi-Signal Contact Intelligence
-- Adds per-signal scores and enrichment fields to relationship_health
-- =============================================================================

-- Signal breakdown scores (0-100 each)
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS email_score INT DEFAULT 0;
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS calendar_score INT DEFAULT 0;
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS financial_score INT DEFAULT 0;
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS pipeline_score INT DEFAULT 0;
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS knowledge_score INT DEFAULT 0;

-- Full signal breakdown for debugging/display
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS signal_breakdown JSONB DEFAULT '{}';

-- Enrichment fields from cross-domain queries
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS next_meeting_date TIMESTAMPTZ;
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS open_invoice_amount DECIMAL DEFAULT 0;

-- Index on temperature_trend for the needing-attention query
CREATE INDEX IF NOT EXISTS idx_relationship_health_trend ON relationship_health(temperature_trend);

-- Index on risk_flags for deal risk queries (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_relationship_health_risk_flags ON relationship_health USING GIN(risk_flags);

COMMENT ON COLUMN relationship_health.email_score IS 'Email recency & frequency signal (0-100)';
COMMENT ON COLUMN relationship_health.calendar_score IS 'Calendar meeting activity signal (0-100)';
COMMENT ON COLUMN relationship_health.financial_score IS 'Financial activity signal (0-100)';
COMMENT ON COLUMN relationship_health.pipeline_score IS 'GHL pipeline stage + momentum signal (0-100)';
COMMENT ON COLUMN relationship_health.knowledge_score IS 'Meeting notes & knowledge mentions signal (0-100)';
COMMENT ON COLUMN relationship_health.signal_breakdown IS 'Full breakdown of all signal inputs for debugging';
