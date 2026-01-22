-- ============================================================================
-- AGENT LEARNINGS TABLE
-- Stores insights derived from agent performance analysis
-- Part of: Agent Learning System
-- Created: 2026-01-23
-- ============================================================================

-- Main learnings table
CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,

  -- Learning classification
  learning_type TEXT NOT NULL CHECK (learning_type IN (
    'pattern',           -- Observed pattern in approvals/rejections
    'threshold',         -- Optimal confidence threshold suggestion
    'bound_adjustment',  -- Suggested changes to action bounds
    'calibration',       -- Confidence calibration insights
    'action_preference', -- Preferred actions by context
    'timing'             -- Optimal timing patterns
  )),

  -- The insight itself
  insight JSONB NOT NULL,
  -- Example insight structures:
  -- threshold: {"current": 0.7, "suggested": 0.82, "samples": 100, "expected_improvement": "15%"}
  -- pattern: {"action": "sync_contacts", "trigger": "scheduled", "outcome": "rejected", "frequency": 5}
  -- bound_adjustment: {"action": "sync_contacts", "current_bounds": {...}, "suggested_bounds": {...}, "reason": "..."}
  -- calibration: {"overconfident_rate": 0.15, "underconfident_rate": 0.05, "calibration_error": 0.10}

  -- Metadata about the learning
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER DEFAULT 0,           -- How many data points support this
  time_window_days INTEGER DEFAULT 30,        -- How many days of data was analyzed

  -- Application status
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  applied_by TEXT,
  application_result JSONB,                   -- Result after applying the learning

  -- Validation
  validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_outcome TEXT CHECK (validation_outcome IN ('effective', 'ineffective', 'neutral', NULL)),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                      -- Some learnings may become stale
);

-- ============================================================================
-- AGENT LEARNING METRICS VIEW
-- Aggregated view of agent performance for learning analysis
-- ============================================================================

CREATE OR REPLACE VIEW v_agent_learning_metrics AS
SELECT
  p.agent_id,
  p.action_name,
  COUNT(*) as total_proposals,
  COUNT(*) FILTER (WHERE p.status = 'approved') as approved,
  COUNT(*) FILTER (WHERE p.status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE p.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE p.status = 'failed') as failed,

  -- Approval rate
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.status = 'approved') /
    NULLIF(COUNT(*) FILTER (WHERE p.status IN ('approved', 'rejected')), 0),
    2
  ) as approval_rate,

  -- Confidence stats
  AVG((p.reasoning->>'confidence')::DECIMAL) as avg_confidence,
  AVG((p.reasoning->>'confidence')::DECIMAL) FILTER (WHERE p.status = 'approved') as avg_approved_confidence,
  AVG((p.reasoning->>'confidence')::DECIMAL) FILTER (WHERE p.status = 'rejected') as avg_rejected_confidence,

  -- Rejection reasons (top 5)
  array_agg(DISTINCT p.review_notes) FILTER (WHERE p.status = 'rejected' AND p.review_notes IS NOT NULL) as rejection_reasons,

  -- Time analysis
  MIN(p.created_at) as first_proposal,
  MAX(p.created_at) as last_proposal
FROM agent_proposals p
WHERE p.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.agent_id, p.action_name
ORDER BY total_proposals DESC;

-- ============================================================================
-- AUTONOMOUS EXECUTION METRICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_autonomous_learning_metrics AS
SELECT
  e.agent_id,
  e.action_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE e.success = TRUE) as successful,
  COUNT(*) FILTER (WHERE e.success = FALSE) as failed,

  -- Review outcomes
  COUNT(*) FILTER (WHERE e.review_outcome = 'correct') as reviewed_correct,
  COUNT(*) FILTER (WHERE e.review_outcome = 'incorrect') as reviewed_incorrect,

  -- Success rate
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE e.success = TRUE) / NULLIF(COUNT(*), 0),
    2
  ) as success_rate,

  -- Calibration (how well confidence predicts correctness)
  AVG(e.confidence) as avg_confidence,
  AVG(e.confidence) FILTER (WHERE e.review_outcome = 'correct') as avg_correct_confidence,
  AVG(e.confidence) FILTER (WHERE e.review_outcome = 'incorrect') as avg_incorrect_confidence,

  -- Bounds compliance
  COUNT(*) FILTER (WHERE e.within_bounds = FALSE) as bounds_violations,

  -- Flagging rate
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE e.flagged_for_review = TRUE) / NULLIF(COUNT(*), 0),
    2
  ) as flag_rate

FROM autonomous_executions e
WHERE e.created_at > NOW() - INTERVAL '30 days'
GROUP BY e.agent_id, e.action_name
ORDER BY total_executions DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Store a new learning
CREATE OR REPLACE FUNCTION store_agent_learning(
  p_agent_id TEXT,
  p_learning_type TEXT,
  p_insight JSONB,
  p_confidence DECIMAL DEFAULT NULL,
  p_evidence_count INTEGER DEFAULT NULL,
  p_time_window_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO agent_learnings (
    agent_id,
    learning_type,
    insight,
    confidence,
    evidence_count,
    time_window_days,
    expires_at
  ) VALUES (
    p_agent_id,
    p_learning_type,
    p_insight,
    p_confidence,
    p_evidence_count,
    p_time_window_days,
    -- Learnings expire after 2x the analysis window
    NOW() + (p_time_window_days * 2 || ' days')::INTERVAL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Mark a learning as applied
CREATE OR REPLACE FUNCTION apply_agent_learning(
  p_learning_id UUID,
  p_applied_by TEXT,
  p_application_result JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_learnings
  SET
    applied = TRUE,
    applied_at = NOW(),
    applied_by = p_applied_by,
    application_result = p_application_result,
    updated_at = NOW()
  WHERE id = p_learning_id;
END;
$$ LANGUAGE plpgsql;

-- Validate a learning's effectiveness
CREATE OR REPLACE FUNCTION validate_agent_learning(
  p_learning_id UUID,
  p_outcome TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_learnings
  SET
    validated = TRUE,
    validated_at = NOW(),
    validation_outcome = p_outcome,
    updated_at = NOW()
  WHERE id = p_learning_id;
END;
$$ LANGUAGE plpgsql;

-- Get agent's optimal confidence threshold based on historical data
CREATE OR REPLACE FUNCTION calculate_optimal_threshold(
  p_agent_id TEXT,
  p_action_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  suggested_threshold DECIMAL(3,2),
  current_approval_rate DECIMAL(5,2),
  samples_analyzed INTEGER,
  confidence_in_suggestion DECIMAL(3,2)
) AS $$
DECLARE
  v_approved_avg DECIMAL;
  v_rejected_avg DECIMAL;
  v_total INTEGER;
  v_threshold DECIMAL;
BEGIN
  -- Calculate average confidence for approved vs rejected
  SELECT
    AVG((reasoning->>'confidence')::DECIMAL) FILTER (WHERE status = 'approved'),
    AVG((reasoning->>'confidence')::DECIMAL) FILTER (WHERE status = 'rejected'),
    COUNT(*)
  INTO v_approved_avg, v_rejected_avg, v_total
  FROM agent_proposals
  WHERE agent_id = p_agent_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
    AND status IN ('approved', 'rejected')
    AND (p_action_name IS NULL OR action_name = p_action_name);

  -- Calculate optimal threshold (midpoint between approved and rejected averages)
  -- If no rejections, suggest current approved average - 0.1
  IF v_rejected_avg IS NULL THEN
    v_threshold := GREATEST(v_approved_avg - 0.1, 0.5);
  ELSE
    v_threshold := (v_approved_avg + v_rejected_avg) / 2;
  END IF;

  RETURN QUERY SELECT
    ROUND(v_threshold, 2)::DECIMAL(3,2) as suggested_threshold,
    ROUND(100.0 * (
      SELECT COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL /
             NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 0)
      FROM agent_proposals
      WHERE agent_id = p_agent_id
        AND created_at > NOW() - (p_days || ' days')::INTERVAL
    ), 2)::DECIMAL(5,2) as current_approval_rate,
    v_total as samples_analyzed,
    -- Confidence in suggestion based on sample size
    LEAST(1.0, v_total::DECIMAL / 50)::DECIMAL(3,2) as confidence_in_suggestion;
END;
$$ LANGUAGE plpgsql;

-- Get patterns that lead to rejection
CREATE OR REPLACE FUNCTION get_rejection_patterns(
  p_agent_id TEXT,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  action_name TEXT,
  trigger_type TEXT,
  rejection_count BIGINT,
  avg_confidence DECIMAL(3,2),
  common_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.action_name,
    p.reasoning->>'trigger' as trigger_type,
    COUNT(*) as rejection_count,
    AVG((p.reasoning->>'confidence')::DECIMAL)::DECIMAL(3,2) as avg_confidence,
    MODE() WITHIN GROUP (ORDER BY p.review_notes) as common_reason
  FROM agent_proposals p
  WHERE p.agent_id = p_agent_id
    AND p.status = 'rejected'
    AND p.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY p.action_name, p.reasoning->>'trigger'
  ORDER BY rejection_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get patterns that lead to approval
CREATE OR REPLACE FUNCTION get_approval_patterns(
  p_agent_id TEXT,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  action_name TEXT,
  trigger_type TEXT,
  approval_count BIGINT,
  avg_confidence DECIMAL(3,2),
  success_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.action_name,
    p.reasoning->>'trigger' as trigger_type,
    COUNT(*) as approval_count,
    AVG((p.reasoning->>'confidence')::DECIMAL)::DECIMAL(3,2) as avg_confidence,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE p.status = 'completed') /
      NULLIF(COUNT(*), 0),
      2
    )::DECIMAL(5,2) as success_rate
  FROM agent_proposals p
  WHERE p.agent_id = p_agent_id
    AND p.status IN ('approved', 'completed')
    AND p.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY p.action_name, p.reasoning->>'trigger'
  ORDER BY approval_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_learnings_agent ON agent_learnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_type ON agent_learnings(learning_type);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_applied ON agent_learnings(applied) WHERE applied = FALSE;
CREATE INDEX IF NOT EXISTS idx_agent_learnings_created ON agent_learnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_expires ON agent_learnings(expires_at) WHERE expires_at IS NOT NULL;

-- GIN index for insight queries
CREATE INDEX IF NOT EXISTS idx_agent_learnings_insight_gin ON agent_learnings USING GIN(insight);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp on modification
CREATE OR REPLACE FUNCTION update_agent_learning_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_learning_updated ON agent_learnings;
CREATE TRIGGER trigger_agent_learning_updated
  BEFORE UPDATE ON agent_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_learning_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_learnings IS 'Stores insights derived from agent performance analysis for continuous improvement';
COMMENT ON COLUMN agent_learnings.learning_type IS 'Type of learning: pattern, threshold, bound_adjustment, calibration, action_preference, timing';
COMMENT ON COLUMN agent_learnings.insight IS 'JSONB containing the actual insight details, structure varies by learning_type';
COMMENT ON COLUMN agent_learnings.confidence IS 'Confidence in the learning based on evidence quality and quantity (0-1)';
COMMENT ON COLUMN agent_learnings.evidence_count IS 'Number of data points (proposals/executions) that support this learning';
COMMENT ON COLUMN agent_learnings.applied IS 'Whether this learning has been applied to improve agent behavior';
COMMENT ON COLUMN agent_learnings.validated IS 'Whether the effectiveness of this learning has been validated after application';
COMMENT ON FUNCTION store_agent_learning IS 'Store a new agent learning insight';
COMMENT ON FUNCTION calculate_optimal_threshold IS 'Calculate optimal confidence threshold based on approval/rejection patterns';
COMMENT ON FUNCTION get_rejection_patterns IS 'Get common patterns that lead to proposal rejections';
COMMENT ON FUNCTION get_approval_patterns IS 'Get common patterns that lead to proposal approvals';
