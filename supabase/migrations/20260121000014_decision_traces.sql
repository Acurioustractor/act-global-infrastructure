-- Decision Traces Schema
-- Purpose: Track agent decision-making for explainability and debugging
-- Layer 9: Observability & Evaluation
--
-- Created: 2026-01-21
-- Part of: 9 Layers of Agentic Infrastructure

-- =============================================================================
-- DECISION TRACES TABLE
-- Records the reasoning behind agent decisions
-- =============================================================================
CREATE TABLE IF NOT EXISTS decision_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Decision identification
    decision_type TEXT NOT NULL,         -- 'project_link', 'contact_match', 'task_create', 'priority_assign'
    agent_id TEXT NOT NULL,              -- Matches agent_audit_log.agent_id

    -- Input context (what the agent saw)
    input_context JSONB NOT NULL,        -- Original data/request that triggered decision
    input_hash TEXT,                     -- Hash for finding similar decisions

    -- Retrieved context (what RAG/search returned)
    retrieved_context JSONB,             -- Documents/records retrieved for context
    retrieval_query TEXT,                -- What was searched for
    retrieval_count INT,                 -- How many results were returned
    retrieval_scores DECIMAL(3,2)[],     -- Similarity scores

    -- Reasoning (LLM explanation)
    reasoning TEXT,                      -- Natural language explanation of decision
    reasoning_model TEXT,                -- Model used for reasoning: 'gpt-4o', 'claude-opus-4-5'
    reasoning_tokens INT,                -- Tokens used for reasoning

    -- Decision output
    decision JSONB NOT NULL,             -- The actual decision made
    decision_summary TEXT,               -- Human-readable summary
    alternatives_considered JSONB,       -- Other options that were evaluated
    confidence DECIMAL(3,2),             -- 0.00 to 1.00

    -- Outcome tracking
    outcome_status TEXT DEFAULT 'pending',  -- 'pending', 'correct', 'incorrect', 'partial', 'unknown'
    outcome_notes TEXT,
    outcome_recorded_at TIMESTAMPTZ,

    -- Human feedback
    human_feedback TEXT,                 -- 'correct', 'incorrect', 'needs_improvement', NULL
    feedback_notes TEXT,
    feedback_by TEXT,
    feedback_at TIMESTAMPTZ,

    -- Used for learning
    used_for_training BOOLEAN DEFAULT FALSE,
    training_weight DECIMAL(3,2),        -- How much to weight this example

    -- Linking
    parent_decision_id UUID REFERENCES decision_traces(id),
    audit_log_id UUID,                   -- Link to agent_audit_log if applicable

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- DECISION PATTERNS TABLE
-- Track common decision patterns for analysis
-- =============================================================================
CREATE TABLE IF NOT EXISTS decision_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern identification
    pattern_name TEXT NOT NULL UNIQUE,
    pattern_description TEXT,
    decision_type TEXT NOT NULL,

    -- Pattern definition
    input_pattern JSONB,                 -- What input conditions trigger this pattern
    typical_reasoning TEXT,              -- Common reasoning for this pattern
    expected_outcome JSONB,              -- What outcome is expected

    -- Statistics
    occurrence_count INT DEFAULT 0,
    success_rate DECIMAL(5,2),
    avg_confidence DECIMAL(3,2),

    -- Examples
    example_decision_ids UUID[],         -- IDs of representative decisions

    -- Timestamps
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Log a decision trace
CREATE OR REPLACE FUNCTION log_decision_trace(
    p_decision_type TEXT,
    p_agent_id TEXT,
    p_input_context JSONB,
    p_decision JSONB,
    p_reasoning TEXT DEFAULT NULL,
    p_confidence DECIMAL DEFAULT NULL,
    p_retrieved_context JSONB DEFAULT NULL,
    p_alternatives JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO decision_traces (
        decision_type, agent_id, input_context, decision,
        reasoning, confidence, retrieved_context, alternatives_considered,
        decision_summary
    ) VALUES (
        p_decision_type, p_agent_id, p_input_context, p_decision,
        p_reasoning, p_confidence, p_retrieved_context, p_alternatives,
        COALESCE(p_decision->>'summary', p_decision_type || ' decision')
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Record feedback on a decision
CREATE OR REPLACE FUNCTION record_decision_feedback(
    p_decision_id UUID,
    p_feedback TEXT,
    p_feedback_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE decision_traces
    SET human_feedback = p_feedback,
        feedback_by = p_feedback_by,
        feedback_notes = p_notes,
        feedback_at = NOW(),
        -- Update outcome based on feedback
        outcome_status = CASE
            WHEN p_feedback = 'correct' THEN 'correct'
            WHEN p_feedback = 'incorrect' THEN 'incorrect'
            ELSE 'partial'
        END,
        outcome_recorded_at = NOW()
    WHERE id = p_decision_id;
END;
$$ LANGUAGE plpgsql;

-- Get decision quality metrics
CREATE OR REPLACE FUNCTION get_decision_quality_metrics(
    p_agent_id TEXT DEFAULT NULL,
    p_decision_type TEXT DEFAULT NULL,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    agent_id TEXT,
    decision_type TEXT,
    total_decisions BIGINT,
    with_feedback BIGINT,
    correct_decisions BIGINT,
    incorrect_decisions BIGINT,
    accuracy_rate DECIMAL(5,2),
    avg_confidence DECIMAL(3,2),
    confidence_calibration DECIMAL(5,2)  -- How well confidence predicts correctness
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dt.agent_id,
        dt.decision_type,
        COUNT(*) as total_decisions,
        COUNT(*) FILTER (WHERE dt.human_feedback IS NOT NULL) as with_feedback,
        COUNT(*) FILTER (WHERE dt.human_feedback = 'correct') as correct_decisions,
        COUNT(*) FILTER (WHERE dt.human_feedback = 'incorrect') as incorrect_decisions,
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE dt.human_feedback = 'correct') /
            NULLIF(COUNT(*) FILTER (WHERE dt.human_feedback IS NOT NULL), 0),
            2
        ) as accuracy_rate,
        AVG(dt.confidence)::DECIMAL(3,2) as avg_confidence,
        -- Calibration: difference between confidence and actual accuracy
        ABS(
            AVG(dt.confidence) -
            (COUNT(*) FILTER (WHERE dt.human_feedback = 'correct')::DECIMAL /
             NULLIF(COUNT(*) FILTER (WHERE dt.human_feedback IS NOT NULL), 0))
        )::DECIMAL(5,2) as confidence_calibration
    FROM decision_traces dt
    WHERE dt.timestamp > NOW() - (p_days || ' days')::INTERVAL
      AND (p_agent_id IS NULL OR dt.agent_id = p_agent_id)
      AND (p_decision_type IS NULL OR dt.decision_type = p_decision_type)
    GROUP BY dt.agent_id, dt.decision_type
    ORDER BY total_decisions DESC;
END;
$$ LANGUAGE plpgsql;

-- Find similar past decisions
CREATE OR REPLACE FUNCTION find_similar_decisions(
    p_input_context JSONB,
    p_decision_type TEXT,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    decision_id UUID,
    input_context JSONB,
    decision JSONB,
    reasoning TEXT,
    human_feedback TEXT,
    confidence DECIMAL(3,2),
    similarity_score DECIMAL(3,2)
) AS $$
BEGIN
    -- Simple key-overlap similarity (could be enhanced with embeddings)
    RETURN QUERY
    SELECT
        dt.id as decision_id,
        dt.input_context,
        dt.decision,
        dt.reasoning,
        dt.human_feedback,
        dt.confidence,
        -- Calculate simple key overlap similarity
        (
            SELECT COUNT(*)::DECIMAL / GREATEST(
                jsonb_object_keys_count(p_input_context),
                jsonb_object_keys_count(dt.input_context)
            )
            FROM (
                SELECT key FROM jsonb_object_keys(p_input_context) key
                INTERSECT
                SELECT key FROM jsonb_object_keys(dt.input_context) key
            ) overlap
        )::DECIMAL(3,2) as similarity_score
    FROM decision_traces dt
    WHERE dt.decision_type = p_decision_type
      AND dt.human_feedback IS NOT NULL  -- Only consider reviewed decisions
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function to count jsonb keys
CREATE OR REPLACE FUNCTION jsonb_object_keys_count(j JSONB)
RETURNS INT AS $$
    SELECT COUNT(*)::INT FROM jsonb_object_keys(j);
$$ LANGUAGE sql IMMUTABLE;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_decision_traces_type ON decision_traces(decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_traces_agent ON decision_traces(agent_id);
CREATE INDEX IF NOT EXISTS idx_decision_traces_timestamp ON decision_traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decision_traces_feedback ON decision_traces(human_feedback) WHERE human_feedback IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_traces_outcome ON decision_traces(outcome_status);
CREATE INDEX IF NOT EXISTS idx_decision_traces_confidence ON decision_traces(confidence);
CREATE INDEX IF NOT EXISTS idx_decision_traces_input_hash ON decision_traces(input_hash) WHERE input_hash IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_decision_traces_input_gin ON decision_traces USING GIN(input_context);
CREATE INDEX IF NOT EXISTS idx_decision_traces_decision_gin ON decision_traces USING GIN(decision);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Recent decisions needing feedback
CREATE OR REPLACE VIEW v_decisions_needing_feedback AS
SELECT
    id,
    decision_type,
    agent_id,
    decision_summary,
    confidence,
    timestamp,
    input_context->>'summary' as input_summary,
    decision->>'action' as decision_action
FROM decision_traces
WHERE human_feedback IS NULL
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY confidence ASC, timestamp DESC  -- Low confidence first
LIMIT 100;

-- Decision quality dashboard
CREATE OR REPLACE VIEW v_decision_quality_dashboard AS
SELECT
    agent_id,
    decision_type,
    DATE(timestamp) as date,
    COUNT(*) as decisions,
    COUNT(*) FILTER (WHERE human_feedback = 'correct') as correct,
    COUNT(*) FILTER (WHERE human_feedback = 'incorrect') as incorrect,
    AVG(confidence)::DECIMAL(3,2) as avg_confidence,
    MIN(confidence) as min_confidence,
    MAX(confidence) as max_confidence
FROM decision_traces
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY agent_id, decision_type, DATE(timestamp)
ORDER BY date DESC, decisions DESC;

-- Incorrect decisions for learning
CREATE OR REPLACE VIEW v_incorrect_decisions AS
SELECT
    dt.id,
    dt.decision_type,
    dt.agent_id,
    dt.input_context,
    dt.reasoning,
    dt.decision,
    dt.human_feedback,
    dt.feedback_notes,
    dt.confidence,
    dt.timestamp
FROM decision_traces dt
WHERE dt.human_feedback = 'incorrect'
ORDER BY dt.timestamp DESC;

-- High-confidence incorrect decisions (calibration issues)
CREATE OR REPLACE VIEW v_calibration_issues AS
SELECT
    id,
    decision_type,
    agent_id,
    confidence,
    decision_summary,
    reasoning,
    feedback_notes,
    timestamp
FROM decision_traces
WHERE human_feedback = 'incorrect'
  AND confidence > 0.8
ORDER BY confidence DESC, timestamp DESC;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Generate input hash for similarity lookups
CREATE OR REPLACE FUNCTION generate_input_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.input_hash := md5(NEW.input_context::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_input_hash
    BEFORE INSERT ON decision_traces
    FOR EACH ROW
    EXECUTE FUNCTION generate_input_hash();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE decision_traces IS 'Audit trail of agent decisions with reasoning for explainability';
COMMENT ON TABLE decision_patterns IS 'Common decision patterns for analysis and improvement';
COMMENT ON COLUMN decision_traces.reasoning IS 'Natural language explanation of why this decision was made';
COMMENT ON COLUMN decision_traces.human_feedback IS 'Human evaluation: correct, incorrect, needs_improvement';
COMMENT ON COLUMN decision_traces.confidence IS 'Agent-reported confidence in decision (0.0 to 1.0)';
COMMENT ON FUNCTION log_decision_trace IS 'Log a decision with input, output, and optional reasoning';
COMMENT ON FUNCTION get_decision_quality_metrics IS 'Get accuracy and calibration metrics for decisions';
COMMENT ON VIEW v_calibration_issues IS 'High-confidence incorrect decisions indicating calibration problems';
