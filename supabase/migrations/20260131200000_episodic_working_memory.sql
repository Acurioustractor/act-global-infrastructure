-- Episodic & Working Memory
-- Phase 3 of Advanced Memory System

-- Episodic Memory: Coherent sequences of related events
CREATE TABLE IF NOT EXISTS memory_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Episode identification
  title TEXT NOT NULL,
  summary TEXT,
  episode_type TEXT NOT NULL CHECK (episode_type IN (
    'project_phase',     -- A phase in a project lifecycle
    'decision_sequence', -- A sequence of related decisions
    'interaction_arc',   -- Arc of interactions with a contact/org
    'incident',          -- Problem/incident and its resolution
    'learning_journey',  -- How the system learned something
    'campaign',          -- Marketing/outreach campaign lifecycle
    'grant_process'      -- Grant application lifecycle
  )),

  -- Scoping
  project_code TEXT,
  entity_ids UUID[],

  -- Timeline
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,          -- NULL = ongoing

  -- Content
  key_events JSONB DEFAULT '[]',
  outcome TEXT,
  lessons_learned TEXT[],

  -- Semantic
  embedding vector(384),
  topics TEXT[],

  -- Lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  decay_score FLOAT DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_project ON memory_episodes(project_code);
CREATE INDEX IF NOT EXISTS idx_episodes_type ON memory_episodes(episode_type);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON memory_episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_embedding ON memory_episodes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_episodes_time ON memory_episodes(started_at DESC);

-- Search episodes semantically
CREATE OR REPLACE FUNCTION search_episodes(
  query_embedding vector(384),
  p_project_code TEXT DEFAULT NULL,
  p_episode_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID, title TEXT, summary TEXT, episode_type TEXT,
  project_code TEXT, started_at TIMESTAMPTZ, status TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT me.id, me.title, me.summary, me.episode_type,
         me.project_code, me.started_at, me.status,
         (1 - (me.embedding <=> query_embedding))::FLOAT as similarity
  FROM memory_episodes me
  WHERE me.embedding IS NOT NULL
    AND 1 - (me.embedding <=> query_embedding) > match_threshold
    AND (p_project_code IS NULL OR me.project_code = p_project_code)
    AND (p_episode_types IS NULL OR me.episode_type = ANY(p_episode_types))
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Working Memory: Per-agent session context
CREATE TABLE IF NOT EXISTS agent_working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,

  -- Context window
  active_context JSONB DEFAULT '{}',
  retrieved_memories UUID[],
  decisions_made UUID[],

  -- Scratchpad (agent's working notes)
  scratchpad JSONB DEFAULT '{}',

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

  UNIQUE(agent_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_awm_agent ON agent_working_memory(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_awm_session ON agent_working_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_awm_expiry ON agent_working_memory(expires_at);
