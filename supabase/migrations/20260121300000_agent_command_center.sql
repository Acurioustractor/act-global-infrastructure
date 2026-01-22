-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ACT AGENT COMMAND CENTER
-- Multi-agent architecture with unified task queue and channel routing
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Agent Registry
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,              -- 'scout', 'scribe', 'ledger', etc.
  name TEXT NOT NULL,
  domain TEXT NOT NULL,             -- 'research', 'content', 'finance', 'relationships'
  description TEXT,
  autonomy_level INT DEFAULT 2 CHECK (autonomy_level BETWEEN 1 AND 3),
  enabled BOOLEAN DEFAULT TRUE,
  current_task_id UUID,
  last_heartbeat TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified Task Queue (all agents share this)
CREATE TABLE IF NOT EXISTS agent_task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,                   -- 'research', 'draft', 'calculate', 'action', 'review'

  -- Assignment
  assigned_agent TEXT REFERENCES agents(id),
  requested_by TEXT,                -- 'ben', 'system', 'discord-bot'
  source TEXT NOT NULL,             -- 'discord', 'signal', 'whatsapp', 'web', 'voice', 'scheduled', 'cli'
  source_id TEXT,                   -- Original message ID for threading

  -- Status
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued',      -- Waiting to be picked up
    'assigned',    -- Agent assigned but not started
    'working',     -- Agent actively working
    'review',      -- Needs human review
    'approved',    -- Human approved, ready to finalize
    'done',        -- Completed successfully
    'failed',      -- Failed with error
    'rejected',    -- Human rejected
    'cancelled'    -- Cancelled by user
  )),
  priority INT DEFAULT 2 CHECK (priority BETWEEN 1 AND 4), -- 1=urgent, 4=low

  -- Execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output JSONB,                     -- Agent's output
  reasoning TEXT,                   -- Agent's reasoning
  confidence DECIMAL(3,2),
  error TEXT,
  duration_ms INT,

  -- Human Review
  needs_review BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT CHECK (review_decision IN ('approved', 'rejected', 'edited')),
  review_feedback TEXT,
  human_edits JSONB,

  -- Channel Routing
  notify_channels TEXT[] DEFAULT ARRAY['discord'],
  reply_to JSONB,                   -- {channel: 'discord', channel_id: '...', thread_id: '...'}

  -- Dependencies
  depends_on UUID[],                -- Task IDs this depends on
  blocks UUID[],                    -- Task IDs blocked by this

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Messages (for threading and history)
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,            -- 'discord', 'signal', 'whatsapp', 'web'
  channel_id TEXT,                  -- Platform channel/chat ID
  message_id TEXT,                  -- Platform's message ID
  thread_id TEXT,                   -- For threaded replies
  task_id UUID REFERENCES agent_task_queue(id) ON DELETE SET NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  content TEXT,
  sender TEXT,                      -- 'ben', 'scout', 'system'
  message_type TEXT DEFAULT 'text', -- 'text', 'voice', 'image', 'approval'
  metadata JSONB DEFAULT '{}',      -- Platform-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Performance Tracking (for learning)
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES agents(id),
  task_type TEXT,
  period_start DATE,
  period_end DATE,
  task_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  review_count INT DEFAULT 0,
  approval_rate DECIMAL(3,2),
  avg_duration_ms INT,
  avg_confidence DECIMAL(3,2),
  actual_success_rate DECIMAL(3,2),
  common_errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, task_type, period_start)
);

-- Agent Learnings (captured insights)
CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES agents(id),
  task_id UUID REFERENCES agent_task_queue(id),
  learning_type TEXT CHECK (learning_type IN ('success_pattern', 'failure_pattern', 'user_preference', 'domain_knowledge')),
  content TEXT NOT NULL,
  context JSONB,
  confidence DECIMAL(3,2),
  applied_count INT DEFAULT 0,
  last_applied TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON agent_task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_agent ON agent_task_queue(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_task_queue_priority ON agent_task_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_task_queue_review ON agent_task_queue(needs_review) WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_channel_messages_task ON channel_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel, channel_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent ON agent_performance(agent_id, period_start);

-- Insert default agents
INSERT INTO agents (id, name, domain, description, autonomy_level) VALUES
  ('dispatcher', 'Dispatcher', 'routing', 'Routes incoming requests to the appropriate agent', 3),
  ('scout', 'Scout', 'research', 'Codebase analysis, market research, competitive intel', 3),
  ('scribe', 'Scribe', 'content', 'Blog posts, newsletters, social media, documentation', 2),
  ('ledger', 'Ledger', 'finance', 'Invoicing, expense tracking, Xero sync, R&DTI', 1),
  ('cultivator', 'Cultivator', 'relationships', 'Partner health, follow-ups, dinner invites', 2),
  ('shepherd', 'Shepherd', 'projects', 'Status updates, milestone tracking, blockers', 2),
  ('oracle', 'Oracle', 'knowledge', 'Q&A, RAG search, knowledge gaps', 3),
  ('herald', 'Herald', 'communications', 'Digest emails, partner updates, announcements', 2),
  ('chronicler', 'Chronicler', 'learning', 'Captures learnings, updates knowledge base', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  description = EXCLUDED.description;

-- View: Task Queue Dashboard
CREATE OR REPLACE VIEW task_queue_dashboard AS
SELECT
  t.id,
  t.title,
  t.status,
  t.priority,
  t.assigned_agent,
  a.name as agent_name,
  t.source,
  t.needs_review,
  t.created_at,
  t.started_at,
  t.completed_at,
  t.duration_ms,
  CASE
    WHEN t.status = 'working' THEN EXTRACT(EPOCH FROM (NOW() - t.started_at))::INT
    ELSE NULL
  END as working_seconds
FROM agent_task_queue t
LEFT JOIN agents a ON t.assigned_agent = a.id
ORDER BY
  CASE t.status
    WHEN 'review' THEN 1
    WHEN 'working' THEN 2
    WHEN 'queued' THEN 3
    ELSE 4
  END,
  t.priority,
  t.created_at;

-- View: Agent Status
CREATE OR REPLACE VIEW agent_status AS
SELECT
  a.id,
  a.name,
  a.domain,
  a.autonomy_level,
  a.enabled,
  a.last_heartbeat,
  CASE
    WHEN a.last_heartbeat > NOW() - INTERVAL '10 minutes' THEN 'online'
    WHEN a.last_heartbeat > NOW() - INTERVAL '1 hour' THEN 'idle'
    ELSE 'offline'
  END as status,
  a.current_task_id,
  t.title as current_task_title,
  (SELECT COUNT(*) FROM agent_task_queue WHERE assigned_agent = a.id AND status = 'done') as completed_today,
  (SELECT COUNT(*) FROM agent_task_queue WHERE assigned_agent = a.id AND status = 'review') as pending_review
FROM agents a
LEFT JOIN agent_task_queue t ON a.current_task_id = t.id;

-- Function: Assign task to agent
CREATE OR REPLACE FUNCTION assign_task_to_agent(p_task_id UUID, p_agent_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update task
  UPDATE agent_task_queue
  SET assigned_agent = p_agent_id,
      status = 'assigned',
      updated_at = NOW()
  WHERE id = p_task_id;

  -- Update agent
  UPDATE agents
  SET current_task_id = p_task_id,
      last_heartbeat = NOW()
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Complete task
CREATE OR REPLACE FUNCTION complete_task(
  p_task_id UUID,
  p_output JSONB,
  p_reasoning TEXT DEFAULT NULL,
  p_confidence DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_agent_id TEXT;
  v_started_at TIMESTAMPTZ;
BEGIN
  -- Get task info
  SELECT assigned_agent, started_at INTO v_agent_id, v_started_at
  FROM agent_task_queue WHERE id = p_task_id;

  -- Update task
  UPDATE agent_task_queue
  SET status = 'done',
      output = p_output,
      reasoning = p_reasoning,
      confidence = p_confidence,
      completed_at = NOW(),
      duration_ms = EXTRACT(EPOCH FROM (NOW() - v_started_at))::INT * 1000,
      updated_at = NOW()
  WHERE id = p_task_id;

  -- Clear agent's current task
  UPDATE agents
  SET current_task_id = NULL,
      last_heartbeat = NOW()
  WHERE id = v_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark task for review
CREATE OR REPLACE FUNCTION mark_task_for_review(
  p_task_id UUID,
  p_output JSONB,
  p_reasoning TEXT DEFAULT NULL,
  p_confidence DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_task_queue
  SET status = 'review',
      needs_review = TRUE,
      output = p_output,
      reasoning = p_reasoning,
      confidence = p_confidence,
      updated_at = NOW()
  WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_queue_updated ON agent_task_queue;
CREATE TRIGGER task_queue_updated
  BEFORE UPDATE ON agent_task_queue
  FOR EACH ROW EXECUTE FUNCTION update_task_timestamp();
