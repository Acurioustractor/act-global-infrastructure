-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MULTI-AGENT COORDINATION SYSTEM
-- Enables agents to spawn sub-tasks, coordinate, and collaborate
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─────────────────────────────────────────────────────────────────────
-- Add coordination columns to agent_proposals
-- ─────────────────────────────────────────────────────────────────────

-- Parent proposal reference (self-referential FK)
ALTER TABLE agent_proposals
ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES agent_proposals(id) ON DELETE SET NULL;

-- Array of child proposal IDs (denormalized for quick access)
ALTER TABLE agent_proposals
ADD COLUMN IF NOT EXISTS child_proposal_ids UUID[] DEFAULT '{}';

-- Coordination status
ALTER TABLE agent_proposals
ADD COLUMN IF NOT EXISTS coordination_status TEXT DEFAULT 'independent'
  CHECK (coordination_status IN ('independent', 'waiting', 'coordinating', 'complete'));

-- Target agent for delegated tasks
ALTER TABLE agent_proposals
ADD COLUMN IF NOT EXISTS target_agent_id TEXT;

-- Context passed from parent
ALTER TABLE agent_proposals
ADD COLUMN IF NOT EXISTS coordination_context JSONB DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────
-- INDEXES for coordination queries
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_proposals_parent ON agent_proposals(parent_proposal_id)
  WHERE parent_proposal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_coordination_status ON agent_proposals(coordination_status)
  WHERE coordination_status != 'independent';

CREATE INDEX IF NOT EXISTS idx_proposals_target_agent ON agent_proposals(target_agent_id)
  WHERE target_agent_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- FUNCTIONS for coordination
-- ─────────────────────────────────────────────────────────────────────

-- Spawn a sub-task for another agent
CREATE OR REPLACE FUNCTION spawn_sub_task(
  p_parent_id UUID,
  p_parent_agent TEXT,
  p_target_agent TEXT,
  p_action_name TEXT,
  p_params JSONB,
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_action agent_actions%ROWTYPE;
  v_sub_task_id UUID;
  v_title TEXT;
BEGIN
  -- Get action details
  SELECT * INTO v_action FROM agent_actions WHERE action_name = p_action_name;

  -- Build title
  v_title := 'Sub-task: ' || p_action_name || ' (delegated by ' || p_parent_agent || ')';

  -- Create the sub-task proposal
  INSERT INTO agent_proposals (
    agent_id,
    target_agent_id,
    action_id,
    action_name,
    title,
    description,
    reasoning,
    proposed_action,
    parent_proposal_id,
    coordination_status,
    coordination_context,
    status,
    priority
  ) VALUES (
    p_target_agent,
    p_target_agent,
    v_action.id,
    p_action_name,
    v_title,
    'Delegated sub-task from ' || p_parent_agent,
    jsonb_build_object(
      'trigger', 'delegated_from_' || p_parent_agent,
      'parent_proposal', p_parent_id,
      'confidence', 0.9
    ),
    p_params,
    p_parent_id,
    'waiting',
    p_context,
    'pending',
    'normal'
  )
  RETURNING id INTO v_sub_task_id;

  -- Update parent with child reference
  UPDATE agent_proposals
  SET
    child_proposal_ids = array_append(child_proposal_ids, v_sub_task_id),
    coordination_status = 'coordinating',
    updated_at = NOW()
  WHERE id = p_parent_id;

  RETURN v_sub_task_id;
END;
$$ LANGUAGE plpgsql;

-- Get sub-task results for a parent task
CREATE OR REPLACE FUNCTION get_sub_task_results(p_parent_id UUID)
RETURNS TABLE (
  sub_task_id UUID,
  target_agent TEXT,
  action_name TEXT,
  status TEXT,
  result JSONB,
  error TEXT,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as sub_task_id,
    p.target_agent_id as target_agent,
    p.action_name,
    p.status,
    p.execution_result as result,
    p.execution_error as error,
    p.execution_completed_at as completed_at
  FROM agent_proposals p
  WHERE p.parent_proposal_id = p_parent_id
  ORDER BY p.created_at;
END;
$$ LANGUAGE plpgsql;

-- Check if all sub-tasks are complete
CREATE OR REPLACE FUNCTION check_coordination_complete(p_parent_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INT;
  v_completed INT;
  v_failed INT;
  v_pending INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'approved', 'executing'))
  INTO v_total, v_completed, v_failed, v_pending
  FROM agent_proposals
  WHERE parent_proposal_id = p_parent_id;

  RETURN jsonb_build_object(
    'total', v_total,
    'completed', v_completed,
    'failed', v_failed,
    'pending', v_pending,
    'all_complete', (v_pending = 0),
    'any_failed', (v_failed > 0)
  );
END;
$$ LANGUAGE plpgsql;

-- Update parent coordination status when child completes
CREATE OR REPLACE FUNCTION update_parent_coordination()
RETURNS TRIGGER AS $$
DECLARE
  v_status JSONB;
BEGIN
  -- Only trigger when a child task completes or fails
  IF NEW.parent_proposal_id IS NOT NULL AND
     NEW.status IN ('completed', 'failed') AND
     OLD.status NOT IN ('completed', 'failed') THEN

    -- Check if all siblings are done
    v_status := check_coordination_complete(NEW.parent_proposal_id);

    IF (v_status->>'all_complete')::boolean THEN
      UPDATE agent_proposals
      SET
        coordination_status = 'complete',
        updated_at = NOW()
      WHERE id = NEW.parent_proposal_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update parent status
DROP TRIGGER IF EXISTS update_parent_on_child_complete ON agent_proposals;
CREATE TRIGGER update_parent_on_child_complete
  AFTER UPDATE ON agent_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_coordination();

-- ─────────────────────────────────────────────────────────────────────
-- VIEW: Active coordination tasks
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW coordinating_tasks AS
SELECT
  p.id,
  p.agent_id as parent_agent,
  p.title,
  p.coordination_status,
  array_length(p.child_proposal_ids, 1) as child_count,
  (
    SELECT COUNT(*) FROM agent_proposals c
    WHERE c.parent_proposal_id = p.id AND c.status = 'completed'
  ) as completed_children,
  (
    SELECT COUNT(*) FROM agent_proposals c
    WHERE c.parent_proposal_id = p.id AND c.status IN ('pending', 'approved', 'executing')
  ) as pending_children,
  p.created_at
FROM agent_proposals p
WHERE p.coordination_status IN ('coordinating', 'waiting')
ORDER BY p.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────
-- VIEW: Sub-tasks awaiting pickup
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW delegated_tasks AS
SELECT
  p.id,
  p.target_agent_id as for_agent,
  p.agent_id as from_agent,
  p.action_name,
  p.title,
  p.proposed_action as params,
  p.coordination_context as context,
  parent.title as parent_task,
  p.created_at
FROM agent_proposals p
LEFT JOIN agent_proposals parent ON p.parent_proposal_id = parent.id
WHERE p.parent_proposal_id IS NOT NULL
  AND p.status = 'pending'
ORDER BY p.created_at;
