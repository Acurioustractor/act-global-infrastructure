-- Learning System: Feedback, Patterns, Calibration, Autonomy Transitions
-- Enables agents to learn from corrections and adjust behavior over time.

-- 1. Feedback Records: captures every human correction/rejection
CREATE TABLE IF NOT EXISTS agent_feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id TEXT NOT NULL,
  action_name TEXT NOT NULL,

  proposal_id UUID REFERENCES agent_proposals(id),
  execution_id UUID REFERENCES autonomous_executions(id),

  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'rejection',
    'correction',
    'review_incorrect',
    'review_correct',
    'outcome_failure',
    'manual_override'
  )),

  original_action JSONB,
  corrected_action JSONB,
  correction_delta JSONB,
  human_explanation TEXT,

  agent_confidence DECIMAL(3,2),
  action_context JSONB,

  mistake_category TEXT,
  pattern_id UUID,

  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  correction_rule_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_agent_action ON agent_feedback_records(agent_id, action_name);
CREATE INDEX idx_feedback_type ON agent_feedback_records(feedback_type);
CREATE INDEX idx_feedback_unprocessed ON agent_feedback_records(processed) WHERE processed = FALSE;
CREATE INDEX idx_feedback_created ON agent_feedback_records(created_at DESC);

-- 2. Mistake Patterns: clusters of repeated mistakes
CREATE TABLE IF NOT EXISTS agent_mistake_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id TEXT NOT NULL,
  action_name TEXT NOT NULL,

  pattern_description TEXT NOT NULL,
  mistake_category TEXT NOT NULL,

  feedback_record_ids UUID[] NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  trigger_conditions JSONB,

  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'mitigated', 'resolved', 'dismissed'
  )),

  correction_rule_id UUID,
  autonomy_adjustment JSONB,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_agent_action ON agent_mistake_patterns(agent_id, action_name);
CREATE INDEX idx_patterns_active ON agent_mistake_patterns(status) WHERE status = 'active';

-- 3. Confidence Calibration: tracks prediction accuracy
CREATE TABLE IF NOT EXISTS agent_confidence_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id TEXT NOT NULL,
  action_name TEXT,

  calibration_window_days INTEGER NOT NULL DEFAULT 30,
  total_actions INTEGER NOT NULL,
  calibration_buckets JSONB NOT NULL,

  mean_confidence DECIMAL(3,2),
  mean_success_rate DECIMAL(3,2),
  calibration_error DECIMAL(4,3),
  overconfidence_rate DECIMAL(3,2),
  underconfidence_rate DECIMAL(3,2),
  confidence_adjustment DECIMAL(4,3),

  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calibration_agent ON agent_confidence_calibration(agent_id, calculated_at DESC);

-- 4. Autonomy Transitions: audit trail of level changes
CREATE TABLE IF NOT EXISTS agent_autonomy_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  action_name TEXT NOT NULL,
  agent_id TEXT NOT NULL,

  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,

  reason TEXT NOT NULL,
  evidence JSONB NOT NULL,

  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'approved', 'rejected', 'applied'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_autonomy_transitions_action ON agent_autonomy_transitions(action_name, created_at DESC);

-- ============================================================
-- TRIGGERS: Auto-capture feedback from proposal/execution events
-- ============================================================

-- Trigger: auto-record feedback when proposal is rejected or modified
CREATE OR REPLACE FUNCTION record_rejection_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO agent_feedback_records (
      agent_id, action_name, proposal_id, feedback_type,
      original_action, human_explanation, agent_confidence, action_context
    ) VALUES (
      NEW.agent_id, NEW.action_name, NEW.id, 'rejection',
      NEW.proposed_action, NEW.review_notes,
      (NEW.reasoning->>'confidence')::DECIMAL, NEW.reasoning
    );
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'modified' AND NEW.modified_action IS NOT NULL THEN
    INSERT INTO agent_feedback_records (
      agent_id, action_name, proposal_id, feedback_type,
      original_action, corrected_action, human_explanation,
      agent_confidence, action_context
    ) VALUES (
      NEW.agent_id, NEW.action_name, NEW.id, 'correction',
      NEW.proposed_action, NEW.modified_action, NEW.review_notes,
      (NEW.reasoning->>'confidence')::DECIMAL, NEW.reasoning
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_record_proposal_feedback
  AFTER UPDATE ON agent_proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION record_rejection_feedback();

-- Trigger: auto-record feedback when autonomous execution is reviewed
CREATE OR REPLACE FUNCTION record_execution_review_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.review_outcome IS NOT NULL AND OLD.review_outcome IS NULL THEN
    INSERT INTO agent_feedback_records (
      agent_id, action_name, execution_id, feedback_type,
      original_action, agent_confidence, action_context
    ) VALUES (
      NEW.agent_id, NEW.action_name, NEW.id,
      CASE NEW.review_outcome
        WHEN 'correct' THEN 'review_correct'
        WHEN 'incorrect' THEN 'review_incorrect'
        ELSE 'review_incorrect'
      END,
      NEW.action_params, NEW.confidence, NEW.reasoning
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_record_execution_feedback
  AFTER UPDATE ON autonomous_executions
  FOR EACH ROW
  WHEN (OLD.review_outcome IS DISTINCT FROM NEW.review_outcome)
  EXECUTE FUNCTION record_execution_review_feedback();

-- ============================================================
-- SQL FUNCTIONS: Pattern detection, calibration, autonomy eval
-- ============================================================

-- Detect repeated mistakes for an agent
CREATE OR REPLACE FUNCTION detect_repeated_mistakes(
  p_agent_id TEXT,
  p_min_occurrences INTEGER DEFAULT 3,
  p_window_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  action_name TEXT,
  mistake_category TEXT,
  occurrence_count BIGINT,
  avg_confidence DECIMAL,
  feedback_ids UUID[],
  common_explanation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.action_name,
    COALESCE(f.mistake_category, f.feedback_type) as mistake_category,
    COUNT(*) as occurrence_count,
    AVG(f.agent_confidence)::DECIMAL as avg_confidence,
    array_agg(f.id) as feedback_ids,
    MODE() WITHIN GROUP (ORDER BY f.human_explanation) as common_explanation
  FROM agent_feedback_records f
  WHERE f.agent_id = p_agent_id
    AND f.feedback_type IN ('rejection', 'correction', 'review_incorrect', 'outcome_failure')
    AND f.created_at > NOW() - (p_window_days || ' days')::INTERVAL
  GROUP BY f.action_name, COALESCE(f.mistake_category, f.feedback_type)
  HAVING COUNT(*) >= p_min_occurrences
  ORDER BY occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate confidence calibration for an agent
CREATE OR REPLACE FUNCTION calculate_calibration(
  p_agent_id TEXT,
  p_window_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  bucket TEXT,
  action_count BIGINT,
  avg_confidence DECIMAL,
  actual_success_rate DECIMAL,
  calibration_gap DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH actions AS (
    SELECT
      (p.reasoning->>'confidence')::DECIMAL as confidence,
      CASE WHEN p.status = 'completed' THEN TRUE
           WHEN p.status IN ('rejected', 'failed') THEN FALSE
           ELSE NULL END as success
    FROM agent_proposals p
    WHERE p.agent_id = p_agent_id
      AND p.status IN ('completed', 'rejected', 'failed')
      AND p.created_at > NOW() - (p_window_days || ' days')::INTERVAL
    UNION ALL
    SELECT
      e.confidence,
      CASE WHEN e.review_outcome = 'correct' THEN TRUE
           WHEN e.review_outcome = 'incorrect' THEN FALSE
           WHEN e.success = TRUE AND e.review_outcome IS NULL THEN TRUE
           ELSE FALSE END as success
    FROM autonomous_executions e
    WHERE e.agent_id = p_agent_id
      AND e.created_at > NOW() - (p_window_days || ' days')::INTERVAL
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN confidence >= 0.9 THEN '0.9-1.0'
        WHEN confidence >= 0.7 THEN '0.7-0.9'
        WHEN confidence >= 0.5 THEN '0.5-0.7'
        ELSE '0.0-0.5'
      END as bucket,
      confidence,
      success
    FROM actions
    WHERE success IS NOT NULL AND confidence IS NOT NULL
  )
  SELECT
    b.bucket,
    COUNT(*) as action_count,
    AVG(b.confidence)::DECIMAL as avg_confidence,
    (COUNT(*) FILTER (WHERE b.success = TRUE))::DECIMAL / NULLIF(COUNT(*), 0) as actual_success_rate,
    (AVG(b.confidence) - (COUNT(*) FILTER (WHERE b.success = TRUE))::DECIMAL / NULLIF(COUNT(*), 0))::DECIMAL as calibration_gap
  FROM bucketed b
  GROUP BY b.bucket
  ORDER BY b.bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Evaluate autonomy level change for an action
CREATE OR REPLACE FUNCTION evaluate_autonomy_change(
  p_action_name TEXT,
  p_window_days INTEGER DEFAULT 60
)
RETURNS TABLE (
  current_level INTEGER,
  recommended_level INTEGER,
  success_rate DECIMAL,
  sample_size BIGINT,
  rejection_rate DECIMAL,
  reason TEXT
) AS $$
DECLARE
  v_current_level INTEGER;
  v_success DECIMAL;
  v_rejection DECIMAL;
  v_sample BIGINT;
  v_recommend INTEGER;
  v_reason TEXT;
BEGIN
  SELECT autonomy_level INTO v_current_level
  FROM agent_actions WHERE action_name = p_action_name;

  SELECT
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0), 2),
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'rejected') /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('approved', 'rejected', 'completed')), 0), 2),
    COUNT(*)
  INTO v_success, v_rejection, v_sample
  FROM agent_proposals
  WHERE action_name = p_action_name
    AND created_at > NOW() - (p_window_days || ' days')::INTERVAL;

  v_recommend := v_current_level;
  v_reason := 'No change recommended';

  IF v_success > 95 AND COALESCE(v_rejection, 0) < 5 AND v_sample > 20 THEN
    IF v_current_level < 3 THEN
      v_recommend := v_current_level + 1;
      v_reason := format('Excellent track record: %s%% success, %s%% rejection over %s actions',
        v_success, v_rejection, v_sample);
    END IF;
  ELSIF (v_success IS NOT NULL AND v_success < 80) OR (v_rejection IS NOT NULL AND v_rejection > 20) THEN
    IF v_current_level > 1 THEN
      v_recommend := v_current_level - 1;
      v_reason := format('Poor track record: %s%% success, %s%% rejection over %s actions',
        v_success, v_rejection, v_sample);
    END IF;
  END IF;

  RETURN QUERY SELECT v_current_level, v_recommend, v_success, v_sample, v_rejection, v_reason;
END;
$$ LANGUAGE plpgsql;
