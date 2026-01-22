-- API Usage Tracking Schema
-- Purpose: Track LLM and external API costs for optimization
-- Layer 8: Cost & Latency Optimization
--
-- Created: 2026-01-21
-- Part of: 9 Layers of Agentic Infrastructure

-- =============================================================================
-- API USAGE TABLE
-- Records every API call for cost tracking and optimization
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Provider and model
    provider TEXT NOT NULL,              -- 'openai', 'anthropic', 'cohere', 'huggingface'
    model TEXT NOT NULL,                 -- 'gpt-4o', 'claude-opus-4-5', 'text-embedding-3-small'
    endpoint TEXT,                       -- 'chat', 'embeddings', 'completions', 'images'
    api_version TEXT,                    -- Provider API version used

    -- Token usage
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) STORED,

    -- Cost estimation (USD)
    input_cost DECIMAL(10,6),
    output_cost DECIMAL(10,6),
    estimated_cost DECIMAL(10,6),

    -- Caching
    cache_hit BOOLEAN DEFAULT FALSE,
    cache_key TEXT,                      -- Hash of the input for deduplication

    -- Context
    script_name TEXT,                    -- 'morning-brief.mjs', 'voice-pipeline.mjs'
    agent_id TEXT,                       -- Matches agent_audit_log.agent_id
    operation TEXT,                      -- 'embed_voice_note', 'summarize_contact', 'generate_brief'

    -- Performance
    latency_ms INTEGER,
    retries INTEGER DEFAULT 0,

    -- Request details (for debugging, truncated)
    request_hash TEXT,                   -- Hash of full request for deduplication analysis
    response_status INTEGER,             -- HTTP status code
    error_message TEXT,

    -- Batch tracking
    batch_id UUID,                       -- Group related calls
    batch_sequence INTEGER               -- Order within batch
);

-- =============================================================================
-- PRICING TABLE
-- Current pricing for cost estimation (update as prices change)
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL DEFAULT 'default',

    -- Pricing per 1M tokens (or per request for non-token APIs)
    input_price_per_1m DECIMAL(10,4),    -- USD per 1M input tokens
    output_price_per_1m DECIMAL(10,4),   -- USD per 1M output tokens
    price_per_request DECIMAL(10,6),     -- For fixed-price APIs (images, etc.)

    -- Validity
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,

    UNIQUE(provider, model, endpoint, effective_from)
);

-- Insert current pricing (January 2026)
INSERT INTO api_pricing (provider, model, endpoint, input_price_per_1m, output_price_per_1m) VALUES
    -- OpenAI
    ('openai', 'gpt-4o', 'chat', 2.50, 10.00),
    ('openai', 'gpt-4o-mini', 'chat', 0.15, 0.60),
    ('openai', 'gpt-4-turbo', 'chat', 10.00, 30.00),
    ('openai', 'text-embedding-3-small', 'embeddings', 0.02, 0),
    ('openai', 'text-embedding-3-large', 'embeddings', 0.13, 0),
    ('openai', 'whisper-1', 'transcription', 0.006, 0),  -- per second, not token

    -- Anthropic
    ('anthropic', 'claude-opus-4-5', 'chat', 15.00, 75.00),
    ('anthropic', 'claude-sonnet-4', 'chat', 3.00, 15.00),
    ('anthropic', 'claude-haiku-3.5', 'chat', 0.80, 4.00),

    -- Cohere
    ('cohere', 'embed-english-v3.0', 'embeddings', 0.10, 0),

    -- HuggingFace (inference endpoints - varies)
    ('huggingface', 'all-MiniLM-L6-v2', 'embeddings', 0.01, 0)
ON CONFLICT (provider, model, endpoint, effective_from) DO NOTHING;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate cost for a usage record
CREATE OR REPLACE FUNCTION calculate_api_cost(
    p_provider TEXT,
    p_model TEXT,
    p_endpoint TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER
)
RETURNS DECIMAL(10,6) AS $$
DECLARE
    v_pricing RECORD;
    v_cost DECIMAL(10,6);
BEGIN
    SELECT * INTO v_pricing
    FROM api_pricing
    WHERE provider = p_provider
      AND model = p_model
      AND endpoint = COALESCE(p_endpoint, 'default')
      AND effective_from <= CURRENT_DATE
      AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
    ORDER BY effective_from DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Fallback: try default endpoint
        SELECT * INTO v_pricing
        FROM api_pricing
        WHERE provider = p_provider
          AND model = p_model
          AND endpoint = 'default'
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN NULL;  -- Unknown pricing
    END IF;

    -- Calculate cost
    v_cost :=
        (COALESCE(p_input_tokens, 0) * v_pricing.input_price_per_1m / 1000000.0) +
        (COALESCE(p_output_tokens, 0) * v_pricing.output_price_per_1m / 1000000.0) +
        COALESCE(v_pricing.price_per_request, 0);

    RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

-- Log API usage with automatic cost calculation
CREATE OR REPLACE FUNCTION log_api_usage(
    p_provider TEXT,
    p_model TEXT,
    p_endpoint TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_script_name TEXT DEFAULT NULL,
    p_cache_hit BOOLEAN DEFAULT FALSE,
    p_latency_ms INTEGER DEFAULT NULL,
    p_agent_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_cost DECIMAL(10,6);
BEGIN
    v_cost := calculate_api_cost(p_provider, p_model, p_endpoint, p_input_tokens, p_output_tokens);

    INSERT INTO api_usage (
        provider, model, endpoint,
        input_tokens, output_tokens, estimated_cost,
        script_name, cache_hit, latency_ms, agent_id
    ) VALUES (
        p_provider, p_model, p_endpoint,
        p_input_tokens, p_output_tokens, v_cost,
        p_script_name, p_cache_hit, p_latency_ms, p_agent_id
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Get cost summary by period
CREATE OR REPLACE FUNCTION get_cost_summary(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    provider TEXT,
    model TEXT,
    total_calls BIGINT,
    total_tokens BIGINT,
    cache_hits BIGINT,
    cache_hit_rate DECIMAL(5,2),
    total_cost DECIMAL(10,2),
    avg_latency_ms INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.provider,
        u.model,
        COUNT(*) as total_calls,
        SUM(u.total_tokens)::BIGINT as total_tokens,
        SUM(CASE WHEN u.cache_hit THEN 1 ELSE 0 END)::BIGINT as cache_hits,
        ROUND(100.0 * SUM(CASE WHEN u.cache_hit THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as cache_hit_rate,
        ROUND(SUM(COALESCE(u.estimated_cost, 0))::DECIMAL, 2) as total_cost,
        AVG(u.latency_ms)::INT as avg_latency_ms
    FROM api_usage u
    WHERE u.timestamp::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY u.provider, u.model
    ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage(provider, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_script ON api_usage(script_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_agent ON api_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_cache ON api_usage(cache_key) WHERE cache_hit = FALSE;
CREATE INDEX IF NOT EXISTS idx_api_usage_batch ON api_usage(batch_id) WHERE batch_id IS NOT NULL;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Daily cost summary
CREATE OR REPLACE VIEW v_daily_api_costs AS
SELECT
    DATE(timestamp) as date,
    provider,
    model,
    COUNT(*) as calls,
    SUM(total_tokens) as tokens,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
    ROUND(SUM(COALESCE(estimated_cost, 0))::DECIMAL, 4) as cost_usd
FROM api_usage
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), provider, model
ORDER BY date DESC, cost_usd DESC;

-- Script-level costs (for optimization)
CREATE OR REPLACE VIEW v_script_api_costs AS
SELECT
    script_name,
    provider,
    model,
    COUNT(*) as calls,
    SUM(total_tokens) as tokens,
    ROUND(SUM(COALESCE(estimated_cost, 0))::DECIMAL, 4) as cost_usd,
    AVG(latency_ms)::INT as avg_latency_ms,
    ROUND(100.0 * SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as cache_hit_pct
FROM api_usage
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND script_name IS NOT NULL
GROUP BY script_name, provider, model
ORDER BY cost_usd DESC;

-- Cache efficiency analysis
CREATE OR REPLACE VIEW v_cache_efficiency AS
SELECT
    script_name,
    model,
    COUNT(*) as total_calls,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
    ROUND(100.0 * SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as hit_rate,
    ROUND(SUM(CASE WHEN NOT cache_hit THEN estimated_cost ELSE 0 END)::DECIMAL, 4) as actual_cost,
    ROUND(SUM(estimated_cost)::DECIMAL, 4) as would_be_cost,
    ROUND(SUM(CASE WHEN cache_hit THEN estimated_cost ELSE 0 END)::DECIMAL, 4) as savings
FROM api_usage
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY script_name, model
HAVING COUNT(*) > 10
ORDER BY savings DESC;

-- =============================================================================
-- ALERTS (functions for monitoring)
-- =============================================================================

-- Check if daily spend exceeds threshold
CREATE OR REPLACE FUNCTION check_daily_spend_alert(
    p_threshold_usd DECIMAL DEFAULT 10.00
)
RETURNS TABLE (
    alert_date DATE,
    total_spend DECIMAL(10,2),
    threshold DECIMAL(10,2),
    top_model TEXT,
    top_model_cost DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH daily AS (
        SELECT
            DATE(timestamp) as dt,
            SUM(estimated_cost) as total,
            MAX(model) FILTER (WHERE estimated_cost = (SELECT MAX(estimated_cost) FROM api_usage u2 WHERE DATE(u2.timestamp) = DATE(api_usage.timestamp))) as top_model
        FROM api_usage
        WHERE DATE(timestamp) = CURRENT_DATE
        GROUP BY DATE(timestamp)
    )
    SELECT
        d.dt as alert_date,
        ROUND(d.total::DECIMAL, 2) as total_spend,
        p_threshold_usd as threshold,
        d.top_model,
        ROUND((SELECT SUM(estimated_cost) FROM api_usage WHERE DATE(timestamp) = d.dt AND model = d.top_model)::DECIMAL, 2) as top_model_cost
    FROM daily d
    WHERE d.total > p_threshold_usd;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE api_usage IS 'Tracks all LLM and external API calls for cost optimization';
COMMENT ON TABLE api_pricing IS 'Current pricing for API providers and models';
COMMENT ON FUNCTION calculate_api_cost IS 'Calculate USD cost for an API call based on current pricing';
COMMENT ON FUNCTION log_api_usage IS 'Log an API call with automatic cost calculation';
COMMENT ON FUNCTION get_cost_summary IS 'Get cost summary by provider and model for a date range';
COMMENT ON VIEW v_daily_api_costs IS 'Daily breakdown of API costs by provider and model';
COMMENT ON VIEW v_script_api_costs IS 'Cost breakdown by script for optimization targeting';
COMMENT ON VIEW v_cache_efficiency IS 'Analysis of cache effectiveness and savings';
