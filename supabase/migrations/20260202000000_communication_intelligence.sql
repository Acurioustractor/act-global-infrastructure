-- Communication Intelligence System
-- Adds project linking, auto-created contacts, and intelligence insights

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Extend communications_history
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE communications_history
  ADD COLUMN IF NOT EXISTS project_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_project_confidence DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intelligence_version INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_comms_project_codes ON communications_history USING GIN (project_codes);
CREATE INDEX IF NOT EXISTS idx_comms_intelligence_version ON communications_history (intelligence_version);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Extend ghl_contacts for auto-creation tracking
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_created_from TEXT,
  ADD COLUMN IF NOT EXISTS first_seen_subject TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_ghl_contacts_auto_created ON ghl_contacts (auto_created) WHERE auto_created = TRUE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Communication-project links (many-to-many with confidence)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS communication_project_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES communications_history(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  confidence DECIMAL NOT NULL DEFAULT 0.5,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(communication_id, project_code)
);

CREATE INDEX IF NOT EXISTS idx_comm_project_links_project ON communication_project_links (project_code);
CREATE INDEX IF NOT EXISTS idx_comm_project_links_comm ON communication_project_links (communication_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Intelligence insights (central insight bus, Realtime-enabled)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS intelligence_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL, -- 'follow_up', 'relationship_change', 'cross_domain', 'new_contact', 'contact_suggestion', 'ecosystem_signal', 'knowledge_alignment', 'contact_research'
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'active', -- 'active', 'dismissed', 'acted'
  data JSONB DEFAULT '{}',
  source_type TEXT, -- 'sql', 'ai', 'vector', 'event'
  source_id TEXT, -- reference to originating entity
  dedup_key TEXT, -- for preventing duplicate insights
  acted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_status ON intelligence_insights (status);
CREATE INDEX IF NOT EXISTS idx_insights_type ON intelligence_insights (insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_created ON intelligence_insights (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_dedup ON intelligence_insights (dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insights_expires ON intelligence_insights (expires_at) WHERE expires_at IS NOT NULL;

-- Enable Realtime on intelligence_insights
ALTER PUBLICATION supabase_realtime ADD TABLE intelligence_insights;
