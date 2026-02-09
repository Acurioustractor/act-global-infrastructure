-- Procedural Memory: Learned multi-step workflows
-- Phase 5 of Advanced Memory System

CREATE TABLE IF NOT EXISTS procedural_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Procedure identification
  procedure_name TEXT NOT NULL UNIQUE,
  description TEXT,
  agent_id TEXT NOT NULL,

  -- The procedure itself
  steps JSONB NOT NULL,             -- [{step: 1, action: "...", params_template: {...}, conditions: {...}}]
  preconditions JSONB,              -- When to trigger this procedure
  postconditions JSONB,             -- Expected state after completion

  -- Learning metadata
  learned_from_episodes UUID[],
  learned_from_decisions UUID[],

  -- Performance
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  success_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN execution_count > 0 THEN success_count::FLOAT / execution_count ELSE 0 END
  ) STORED,
  avg_duration_ms INTEGER,

  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  version INTEGER DEFAULT 1,
  superseded_by UUID REFERENCES procedural_memory(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_agent ON procedural_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_status ON procedural_memory(status);
CREATE INDEX IF NOT EXISTS idx_pm_name ON procedural_memory(procedure_name);
