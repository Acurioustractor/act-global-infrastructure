-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AGENTIC WORKFLOW SYSTEM
-- Enables agents to propose, get approval, and execute tasks autonomously
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─────────────────────────────────────────────────────────────────────
-- AGENT ACTIONS REGISTRY
-- Defines what actions agents can take and their autonomy levels
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_name TEXT UNIQUE NOT NULL,        -- 'sync_contacts', 'send_notification', etc.
  description TEXT,

  -- Autonomy Level (inspired by Taskly AI)
  -- 1 = Manual only (agent can suggest, human must execute)
  -- 2 = Supervised (agent proposes, human approves, then agent executes)
  -- 3 = Autonomous (agent executes within bounds, logs for review)
  autonomy_level INTEGER NOT NULL DEFAULT 2 CHECK (autonomy_level BETWEEN 1 AND 3),

  -- Bounds for autonomous execution
  bounds JSONB DEFAULT '{}',               -- {"max_records": 100, "allowed_targets": [...]}

  -- Risk assessment
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  reversible BOOLEAN DEFAULT TRUE,

  -- Execution details
  script_path TEXT,                        -- 'scripts/sync-contacts.mjs'
  script_args_template JSONB DEFAULT '{}', -- Template for script arguments

  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- AGENT PROPOSALS
-- Queue of tasks proposed by agents for human review
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What agent proposed this?
  agent_id TEXT NOT NULL,                  -- 'morning-brief', 'relationship-health', etc.
  agent_version TEXT,

  -- What's being proposed?
  action_id UUID REFERENCES agent_actions(id),
  action_name TEXT NOT NULL,               -- Denormalized for quick access
  title TEXT NOT NULL,                     -- Human-readable title
  description TEXT,                        -- Detailed description

  -- Why is it being proposed? (Layer 9: Decision Traces)
  reasoning JSONB NOT NULL,                -- {
                                           --   "trigger": "relationship_health_score < 0.3",
                                           --   "evidence": [...],
                                           --   "confidence": 0.85,
                                           --   "alternatives_considered": [...]
                                           -- }

  -- What will happen?
  proposed_action JSONB NOT NULL,          -- The actual action parameters
  expected_outcome TEXT,                   -- What agent expects to happen
  impact_assessment JSONB,                 -- {"affected_records": 5, "reversible": true}

  -- Priority & timing
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  deadline TIMESTAMPTZ,                    -- When should this be decided by?

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting human review
    'approved',     -- Human approved, ready for execution
    'rejected',     -- Human rejected
    'modified',     -- Human modified the proposal
    'executing',    -- Currently being executed
    'completed',    -- Successfully executed
    'failed',       -- Execution failed
    'expired'       -- Deadline passed without decision
  )),

  -- Human decision
  reviewed_by TEXT,                        -- Who reviewed?
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,                       -- Human feedback
  modified_action JSONB,                   -- If human modified the proposal

  -- Execution tracking
  execution_started_at TIMESTAMPTZ,
  execution_completed_at TIMESTAMPTZ,
  execution_result JSONB,
  execution_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- AUTONOMOUS EXECUTIONS
-- Record of actions executed autonomously (Level 3)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id TEXT NOT NULL,
  action_id UUID REFERENCES agent_actions(id),
  action_name TEXT NOT NULL,

  -- What was executed?
  action_params JSONB NOT NULL,

  -- Why? (Decision trace)
  reasoning JSONB NOT NULL,
  confidence DECIMAL(3,2),

  -- What happened?
  result JSONB,
  success BOOLEAN,
  error_message TEXT,
  duration_ms INTEGER,

  -- Bounds check
  within_bounds BOOLEAN DEFAULT TRUE,
  bounds_violated JSONB,                   -- If out of bounds, what was violated?

  -- Human review (post-execution)
  flagged_for_review BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_outcome TEXT CHECK (review_outcome IN ('correct', 'incorrect', 'uncertain')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_proposals_status ON agent_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_agent ON agent_proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_priority ON agent_proposals(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_pending ON agent_proposals(status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_executions_agent ON autonomous_executions(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_executions_flagged ON autonomous_executions(flagged_for_review)
  WHERE flagged_for_review = TRUE;

-- ─────────────────────────────────────────────────────────────────────
-- SEED DATA: Default Agent Actions
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO agent_actions (action_name, description, autonomy_level, risk_level, reversible, script_path, bounds)
VALUES
  -- Level 3: Autonomous (low risk, informational)
  ('generate_report', 'Generate a report or summary', 3, 'low', TRUE,
   'scripts/generate-morning-brief.mjs', '{"max_pages": 10}'),
  ('search_data', 'Search across ACT data sources', 3, 'low', TRUE,
   'scripts/unified-search.mjs', '{"max_results": 100}'),
  ('analyze_health', 'Run infrastructure health check', 3, 'low', TRUE,
   'scripts/infrastructure-health.mjs', '{}'),

  -- Level 2: Supervised (medium risk, data modification)
  ('sync_contacts', 'Sync contacts between systems', 2, 'medium', TRUE,
   'scripts/entity-resolution.mjs', '{"max_records": 100}'),
  ('send_notification', 'Send Discord/email notification', 2, 'medium', FALSE,
   'scripts/discord-notify.mjs', '{"max_recipients": 10}'),
  ('update_project', 'Update project status or metadata', 2, 'medium', TRUE,
   'scripts/project-updates.mjs', '{"max_projects": 5}'),
  ('create_task', 'Create a task or todo item', 2, 'low', TRUE,
   NULL, '{}'),

  -- Level 1: Manual only (high risk, irreversible)
  ('delete_data', 'Delete records from database', 1, 'critical', FALSE,
   NULL, '{}'),
  ('bulk_email', 'Send bulk emails', 1, 'high', FALSE,
   NULL, '{"requires_explicit_approval": true}'),
  ('modify_permissions', 'Change user permissions', 1, 'critical', FALSE,
   NULL, '{}')
ON CONFLICT (action_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────────────

-- Pending proposals for human review
CREATE OR REPLACE VIEW pending_proposals AS
SELECT
  p.id,
  p.agent_id,
  p.title,
  p.description,
  p.priority,
  p.deadline,
  p.created_at,
  a.autonomy_level,
  a.risk_level,
  p.reasoning->>'trigger' as trigger_reason,
  p.reasoning->>'confidence' as confidence,
  p.impact_assessment
FROM agent_proposals p
LEFT JOIN agent_actions a ON p.action_id = a.id
WHERE p.status = 'pending'
ORDER BY
  CASE p.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    ELSE 4
  END,
  p.created_at;

-- Recent autonomous actions for review
CREATE OR REPLACE VIEW autonomous_review_queue AS
SELECT
  e.id,
  e.agent_id,
  e.action_name,
  e.success,
  e.confidence,
  e.reasoning->>'trigger' as trigger_reason,
  e.within_bounds,
  e.created_at
FROM autonomous_executions e
WHERE e.flagged_for_review = TRUE
  AND e.reviewed_at IS NULL
ORDER BY e.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────

-- Approve a proposal
CREATE OR REPLACE FUNCTION approve_proposal(
  proposal_id UUID,
  reviewer TEXT,
  notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_proposal agent_proposals%ROWTYPE;
BEGIN
  -- Get the proposal
  SELECT * INTO v_proposal FROM agent_proposals WHERE id = proposal_id;

  IF v_proposal.status != 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending (status: %)', v_proposal.status;
  END IF;

  -- Update to approved
  UPDATE agent_proposals SET
    status = 'approved',
    reviewed_by = reviewer,
    reviewed_at = NOW(),
    review_notes = notes,
    updated_at = NOW()
  WHERE id = proposal_id;

  RETURN proposal_id;
END;
$$ LANGUAGE plpgsql;

-- Reject a proposal
CREATE OR REPLACE FUNCTION reject_proposal(
  proposal_id UUID,
  reviewer TEXT,
  notes TEXT
)
RETURNS UUID AS $$
BEGIN
  UPDATE agent_proposals SET
    status = 'rejected',
    reviewed_by = reviewer,
    reviewed_at = NOW(),
    review_notes = notes,
    updated_at = NOW()
  WHERE id = proposal_id
    AND status = 'pending';

  RETURN proposal_id;
END;
$$ LANGUAGE plpgsql;

-- Check if action is within bounds
CREATE OR REPLACE FUNCTION check_action_bounds(
  p_action_name TEXT,
  p_params JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_action agent_actions%ROWTYPE;
  v_bounds JSONB;
  v_violations JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO v_action FROM agent_actions WHERE action_name = p_action_name;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('within_bounds', FALSE, 'error', 'Action not found');
  END IF;

  v_bounds := v_action.bounds;

  -- Check max_records bound
  IF v_bounds ? 'max_records' AND p_params ? 'record_count' THEN
    IF (p_params->>'record_count')::INT > (v_bounds->>'max_records')::INT THEN
      v_violations := v_violations || jsonb_build_object(
        'bound', 'max_records',
        'limit', v_bounds->>'max_records',
        'requested', p_params->>'record_count'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'within_bounds', jsonb_array_length(v_violations) = 0,
    'violations', v_violations,
    'autonomy_level', v_action.autonomy_level
  );
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────

-- Auto-expire proposals past deadline
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_proposals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND deadline IS NOT NULL
    AND deadline < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run expiry check on any proposal update
DROP TRIGGER IF EXISTS check_expired_proposals ON agent_proposals;
CREATE TRIGGER check_expired_proposals
  AFTER INSERT OR UPDATE ON agent_proposals
  FOR EACH STATEMENT
  EXECUTE FUNCTION expire_old_proposals();

-- Flag autonomous executions for review if confidence is low
CREATE OR REPLACE FUNCTION flag_low_confidence_executions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confidence < 0.7 OR NEW.within_bounds = FALSE THEN
    NEW.flagged_for_review := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_flag_executions ON autonomous_executions;
CREATE TRIGGER auto_flag_executions
  BEFORE INSERT ON autonomous_executions
  FOR EACH ROW
  EXECUTE FUNCTION flag_low_confidence_executions();
