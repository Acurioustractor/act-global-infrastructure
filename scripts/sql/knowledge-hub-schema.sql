-- ACT Knowledge Hub - Supabase Schema
-- Run this in Supabase SQL Editor to create all tables
--
-- Tables:
--   knowledge_chunks - Vector-enabled content for RAG
--   entity_relationships - Contact/project relationship tracking
--   contact_communications - Email/call/meeting history
--   conversation_context - Chatbot session memory
--   calendar_events - Google Calendar sync
--   sync_state - Incremental sync tracking

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- KNOWLEDGE CHUNKS (RAG)
-- =============================================================================

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  source_type TEXT NOT NULL CHECK (source_type IN ('codebase', 'notion', 'ghl', 'email', 'calendar', 'manual')),
  source_id TEXT,
  project_id TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source
  ON knowledge_chunks (source_type, project_id);

-- =============================================================================
-- ENTITY RELATIONSHIPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'project', 'opportunity', 'issue', 'document')),
  entity_id TEXT NOT NULL,
  related_entity_type TEXT NOT NULL CHECK (related_entity_type IN ('contact', 'project', 'opportunity', 'issue', 'document')),
  related_entity_id TEXT NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('works_on', 'knows', 'owns', 'related_to', 'depends_on', 'blocks', 'parent_of', 'child_of')),
  strength_score FLOAT DEFAULT 0.5 CHECK (strength_score >= 0 AND strength_score <= 1),
  last_interaction TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, related_entity_type, related_entity_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_entity
  ON entity_relationships (entity_type, entity_id);

-- =============================================================================
-- CONTACT COMMUNICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT NOT NULL,
  comm_type TEXT NOT NULL CHECK (comm_type IN ('email', 'call', 'meeting', 'sms', 'chat', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  subject TEXT,
  summary TEXT,
  full_content TEXT,
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  topics TEXT[],
  action_items TEXT[],
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ghl', 'gmail', 'calendar', 'manual')),
  source_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_communications_contact
  ON contact_communications (ghl_contact_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_communications_date
  ON contact_communications (occurred_at DESC);

-- =============================================================================
-- CONVERSATION CONTEXT (CHATBOT MEMORY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  interface TEXT NOT NULL CHECK (interface IN ('chatbot', 'voice', 'claude_code', 'notion_ai')),
  site TEXT DEFAULT 'act-farm',
  history JSONB DEFAULT '[]',
  intent_detected TEXT,
  entities_mentioned JSONB DEFAULT '[]',
  context_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_conversation_context_session
  ON conversation_context (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_context_expiry
  ON conversation_context (expires_at);

-- =============================================================================
-- CALENDAR EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id TEXT UNIQUE NOT NULL,
  calendar_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  attendees JSONB DEFAULT '[]',
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  event_type TEXT CHECK (event_type IN ('meeting', 'focus', 'travel', 'personal', 'other')),
  ghl_contact_ids TEXT[],
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_time
  ON calendar_events (start_time, end_time);

-- =============================================================================
-- SYNC STATE (INCREMENTAL SYNC TRACKING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL CHECK (service IN ('gmail', 'calendar', 'ghl', 'notion', 'github')),
  last_sync_token TEXT,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_page_token TEXT,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_knowledge_chunks_updated_at ON knowledge_chunks;
CREATE TRIGGER update_knowledge_chunks_updated_at
  BEFORE UPDATE ON knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entity_relationships_updated_at ON entity_relationships;
CREATE TRIGGER update_entity_relationships_updated_at
  BEFORE UPDATE ON entity_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_context_updated_at ON conversation_context;
CREATE TRIGGER update_conversation_context_updated_at
  BEFORE UPDATE ON conversation_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_state_updated_at ON sync_state;
CREATE TRIGGER update_sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for backend scripts)
CREATE POLICY "Service role has full access to knowledge_chunks"
  ON knowledge_chunks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to entity_relationships"
  ON entity_relationships FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to contact_communications"
  ON contact_communications FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to conversation_context"
  ON conversation_context FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to calendar_events"
  ON calendar_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to sync_state"
  ON sync_state FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anon read access to knowledge_chunks (for website chatbot)
CREATE POLICY "Anon can read knowledge_chunks"
  ON knowledge_chunks FOR SELECT
  USING (true);

-- Allow anon read/write to conversation_context (for chatbot sessions)
CREATE POLICY "Anon can manage conversation_context"
  ON conversation_context FOR ALL
  USING (true);

-- =============================================================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_source_type TEXT DEFAULT NULL,
  filter_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_id TEXT,
  project_id TEXT,
  file_path TEXT,
  metadata JSONB,
  confidence FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.source_type,
    kc.source_id,
    kc.project_id,
    kc.file_path,
    kc.metadata,
    kc.confidence,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    (filter_source_type IS NULL OR kc.source_type = filter_source_type)
    AND (filter_project_id IS NULL OR kc.project_id = filter_project_id)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- RELATIONSHIP HEALTH QUERY FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_contacts_needing_attention(
  days_threshold INT DEFAULT 25
)
RETURNS TABLE (
  ghl_contact_id TEXT,
  last_communication TIMESTAMPTZ,
  days_since_contact INT,
  total_communications BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.ghl_contact_id,
    MAX(cc.occurred_at) AS last_communication,
    EXTRACT(DAY FROM NOW() - MAX(cc.occurred_at))::INT AS days_since_contact,
    COUNT(*)::BIGINT AS total_communications
  FROM contact_communications cc
  GROUP BY cc.ghl_contact_id
  HAVING MAX(cc.occurred_at) < NOW() - (days_threshold || ' days')::INTERVAL
  ORDER BY last_communication ASC;
END;
$$;

-- =============================================================================
-- DONE
-- =============================================================================

-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'knowledge_chunks',
  'entity_relationships',
  'contact_communications',
  'conversation_context',
  'calendar_events',
  'sync_state'
);
