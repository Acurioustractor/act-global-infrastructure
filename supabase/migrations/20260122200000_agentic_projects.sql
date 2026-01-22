-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AGENTIC PROJECT MANAGEMENT
-- TasklyAI-inspired: Dual-assignee tasks, agent execution, goal decomposition
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Projects (high-level goals)
CREATE TABLE IF NOT EXISTS agentic_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT NOT NULL,                      -- "Set up Phase 1 foundation for ACT Pty Ltd"
  context JSONB DEFAULT '{}',              -- Additional context for agents
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  owner TEXT,                              -- Human owner
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (decomposed from goals)
CREATE TABLE IF NOT EXISTS agentic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES agentic_projects(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'action' CHECK (task_type IN ('research', 'draft', 'calculate', 'action', 'review', 'decision')),

  -- Dual-assignee: human AND/OR agent
  assigned_human TEXT,                     -- Human assignee (nullable)
  assigned_agent TEXT,                     -- Agent type (nullable): 'researcher', 'drafter', 'calculator'
  assignment_mode TEXT DEFAULT 'agent' CHECK (assignment_mode IN ('human', 'agent', 'dual', 'review')),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'agent_working', 'needs_review', 'completed', 'blocked')),
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 4), -- 1=urgent, 4=low

  -- Agent execution
  agent_output JSONB,                      -- What the agent produced
  agent_reasoning TEXT,                    -- How it approached the task
  agent_confidence DECIMAL(3,2),           -- How confident in the output
  agent_started_at TIMESTAMPTZ,
  agent_completed_at TIMESTAMPTZ,

  -- Human review
  human_feedback TEXT,
  human_approved BOOLEAN,
  human_edits JSONB,                       -- What human changed

  -- Dependencies
  depends_on UUID[],                       -- Task IDs this depends on

  -- Ordering
  position INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages (for directing agents)
CREATE TABLE IF NOT EXISTS agentic_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES agentic_projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agentic_tasks(id) ON DELETE SET NULL,

  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  agent_type TEXT,                         -- Which agent responded
  content TEXT NOT NULL,

  -- For agent responses
  action_taken JSONB,                      -- What the agent did
  artifacts JSONB,                         -- Files, links, data produced

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent work log (what agents have done)
CREATE TABLE IF NOT EXISTS agentic_work_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES agentic_projects(id),
  task_id UUID REFERENCES agentic_tasks(id),

  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,                    -- 'research', 'draft', 'calculate', 'decompose'
  input_summary JSONB,
  output_summary JSONB,

  -- Execution details
  duration_ms INTEGER,
  tokens_used INTEGER,
  model_used TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project ON agentic_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON agentic_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON agentic_tasks(assigned_agent) WHERE assigned_agent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_project ON agentic_chat(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_work_log_project ON agentic_work_log(project_id, created_at);

-- View: Project dashboard
CREATE OR REPLACE VIEW agentic_project_dashboard AS
SELECT
  p.id,
  p.name,
  p.goal,
  p.status,
  p.owner,
  p.created_at,
  COUNT(t.id) as total_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'agent_working') as agent_working,
  COUNT(t.id) FILTER (WHERE t.status = 'needs_review') as needs_review,
  COUNT(t.id) FILTER (WHERE t.assigned_agent IS NOT NULL) as agent_tasks,
  COUNT(t.id) FILTER (WHERE t.assigned_human IS NOT NULL) as human_tasks
FROM agentic_projects p
LEFT JOIN agentic_tasks t ON t.project_id = p.id
GROUP BY p.id;
