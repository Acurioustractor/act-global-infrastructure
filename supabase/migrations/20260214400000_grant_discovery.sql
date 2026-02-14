-- Grant Discovery Enhancements
-- Adds feedback tracking and URL uniqueness for deduplication

-- Feedback column for human decisions (apply/skip)
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '[]';

-- Unique URL constraint for deduplication
-- Use a partial index since url can be null
CREATE UNIQUE INDEX IF NOT EXISTS idx_grants_unique_url
  ON grant_opportunities(url) WHERE url IS NOT NULL;

-- Comment
COMMENT ON COLUMN grant_opportunities.feedback IS 'Human feedback array: [{action, reason, timestamp}]';
