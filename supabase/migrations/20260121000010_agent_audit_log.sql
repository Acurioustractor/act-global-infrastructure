-- Agent Audit Log Schema
-- Purpose: Track all agent actions for governance, debugging, and compliance
-- Layer 7: Governance & Safety
--
-- Created: 2026-01-21
-- Part of: 9 Layers of Agentic Infrastructure

-- =============================================================================
-- AGENT AUDIT LOG TABLE
-- Records every action taken by autonomous agents
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Agent identification
    agent_id TEXT NOT NULL,              -- 'morning-brief', 'voice-pipeline', 'contact-sync', etc.
    agent_version TEXT,                  -- Optional version tracking

    -- Action details
    action TEXT NOT NULL,                -- 'read', 'write', 'delete', 'sync', 'enrich', 'embed'
    action_category TEXT,                -- 'data_access', 'external_api', 'llm_call', 'notification'

    -- Target information
    target_table TEXT,                   -- 'ghl_contacts', 'voice_notes', 'knowledge_base', etc.
    target_id TEXT,                      -- ID of affected record (single or comma-separated)
    target_count INT DEFAULT 1,          -- Number of records affected

    -- Context
    input_summary JSONB,                 -- What triggered the action (truncated for privacy)
    output_summary JSONB,                -- What changed (keys/counts, not full data)

    -- Attribution
    user_context TEXT,                   -- Who initiated (if human-triggered): 'ben', 'cron', 'webhook'
    trigger_source TEXT,                 -- 'manual', 'cron', 'webhook', 'cascade', 'retry'
    parent_audit_id UUID REFERENCES agent_audit_log(id),  -- For cascading actions

    -- Performance
    duration_ms INTEGER,
    api_calls_made INT DEFAULT 0,
    tokens_used INT DEFAULT 0,

    -- Outcome
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    error_code TEXT,
    retry_count INT DEFAULT 0,

    -- Cultural protocol tracking
    cultural_data_accessed BOOLEAN DEFAULT FALSE,
    cultural_review_required BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_agent ON agent_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON agent_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON agent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_target ON agent_audit_log(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_success ON agent_audit_log(success) WHERE success = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_cultural ON agent_audit_log(cultural_data_accessed) WHERE cultural_data_accessed = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_user ON agent_audit_log(user_context);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_agent_time ON agent_audit_log(agent_id, timestamp DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Recent errors (last 24 hours)
CREATE OR REPLACE VIEW v_recent_agent_errors AS
SELECT
    agent_id,
    action,
    target_table,
    error_message,
    error_code,
    timestamp,
    duration_ms
FROM agent_audit_log
WHERE success = FALSE
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Agent activity summary (last 7 days)
CREATE OR REPLACE VIEW v_agent_activity_summary AS
SELECT
    agent_id,
    action,
    COUNT(*) as action_count,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as error_count,
    AVG(duration_ms)::INT as avg_duration_ms,
    MAX(timestamp) as last_run
FROM agent_audit_log
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY agent_id, action
ORDER BY agent_id, action_count DESC;

-- Cultural data access log
CREATE OR REPLACE VIEW v_cultural_data_access AS
SELECT
    agent_id,
    action,
    target_table,
    target_id,
    user_context,
    timestamp
FROM agent_audit_log
WHERE cultural_data_accessed = TRUE
ORDER BY timestamp DESC;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to log an agent action (simplified interface)
CREATE OR REPLACE FUNCTION log_agent_action(
    p_agent_id TEXT,
    p_action TEXT,
    p_target_table TEXT DEFAULT NULL,
    p_target_id TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_duration_ms INT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_input_summary JSONB DEFAULT NULL,
    p_output_summary JSONB DEFAULT NULL,
    p_user_context TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO agent_audit_log (
        agent_id, action, target_table, target_id,
        success, duration_ms, error_message,
        input_summary, output_summary, user_context
    ) VALUES (
        p_agent_id, p_action, p_target_table, p_target_id,
        p_success, p_duration_ms, p_error_message,
        p_input_summary, p_output_summary, p_user_context
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent health status
CREATE OR REPLACE FUNCTION get_agent_health(p_hours INT DEFAULT 24)
RETURNS TABLE (
    agent_id TEXT,
    total_actions BIGINT,
    successful_actions BIGINT,
    failed_actions BIGINT,
    success_rate DECIMAL(5,2),
    avg_duration_ms INT,
    last_success TIMESTAMPTZ,
    last_failure TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.agent_id,
        COUNT(*) as total_actions,
        SUM(CASE WHEN a.success THEN 1 ELSE 0 END) as successful_actions,
        SUM(CASE WHEN NOT a.success THEN 1 ELSE 0 END) as failed_actions,
        ROUND(100.0 * SUM(CASE WHEN a.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
        AVG(a.duration_ms)::INT as avg_duration_ms,
        MAX(CASE WHEN a.success THEN a.timestamp END) as last_success,
        MAX(CASE WHEN NOT a.success THEN a.timestamp END) as last_failure
    FROM agent_audit_log a
    WHERE a.timestamp > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY a.agent_id
    ORDER BY failed_actions DESC, total_actions DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RETENTION POLICY
-- =============================================================================

-- Function to clean up old audit logs (keep 1 year by default)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INT DEFAULT 365)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM agent_audit_log
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE agent_audit_log IS 'Audit trail for all agent actions - governance layer';
COMMENT ON COLUMN agent_audit_log.agent_id IS 'Identifier for the agent: morning-brief, voice-pipeline, contact-sync, etc.';
COMMENT ON COLUMN agent_audit_log.action IS 'Type of action: read, write, delete, sync, enrich, embed';
COMMENT ON COLUMN agent_audit_log.cultural_data_accessed IS 'Flag if action touched culturally sensitive data';
COMMENT ON FUNCTION log_agent_action IS 'Simplified function to log agent actions from scripts';
COMMENT ON FUNCTION get_agent_health IS 'Get health metrics for all agents over specified hours';
