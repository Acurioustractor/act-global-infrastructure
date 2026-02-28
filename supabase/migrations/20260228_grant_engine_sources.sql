-- GrantScope: Multi-source grant discovery engine
-- Adds source tracking, discovery audit log, and plugin registry

-- Track multi-source provenance on grants
ALTER TABLE grant_opportunities
  ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS discovery_method TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Index for stale verification check
CREATE INDEX IF NOT EXISTS idx_grants_last_verified
  ON grant_opportunities (last_verified_at)
  WHERE last_verified_at IS NOT NULL;

-- Discovery run audit log
CREATE TABLE IF NOT EXISTS grant_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  sources_used TEXT[],
  grants_discovered INT DEFAULT 0,
  grants_new INT DEFAULT 0,
  grants_updated INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial'))
);

CREATE INDEX IF NOT EXISTS idx_discovery_runs_status ON grant_discovery_runs(status);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_started ON grant_discovery_runs(started_at DESC);

-- Source plugin registry
CREATE TABLE IF NOT EXISTS grant_source_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  total_discovered INT DEFAULT 0
);

-- Seed built-in plugins
INSERT INTO grant_source_plugins (id, name, type, enabled) VALUES
  ('grantconnect', 'GrantConnect (grants.gov.au)', 'scraper', true),
  ('web-search', 'AI Web Search', 'ai_search', true),
  ('llm-knowledge', 'LLM Knowledge', 'llm_knowledge', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies
ALTER TABLE grant_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_source_plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovery_runs_all ON grant_discovery_runs
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'pm', 'service_role'));

CREATE POLICY source_plugins_all ON grant_source_plugins
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'pm', 'service_role'));

-- Comments
COMMENT ON TABLE grant_discovery_runs IS 'Audit log for each grant discovery run';
COMMENT ON TABLE grant_source_plugins IS 'Registry of grant source plugins (scrapers, APIs, AI search)';
COMMENT ON COLUMN grant_opportunities.sources IS 'JSONB array of {pluginId, foundAt, rawUrl, confidence} per source';
COMMENT ON COLUMN grant_opportunities.discovery_method IS 'How this grant was found (source plugin ID or combo)';
COMMENT ON COLUMN grant_opportunities.last_verified_at IS 'Last time this grant was confirmed still open via web search';
