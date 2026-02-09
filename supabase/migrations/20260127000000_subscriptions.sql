-- Subscriptions Tracking System
-- Purpose: Track software subscriptions, costs, and renewal dates
-- Created: 2026-01-27

-- =============================================================================
-- SUBSCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    category TEXT CHECK (category IN ('development', 'design', 'marketing', 'operations', 'finance', 'communication', 'ai', 'infrastructure', 'other')),

    -- Billing
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual', 'quarterly', 'one-time')),
    cost_per_cycle DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'AUD',

    -- Dates
    start_date DATE,
    renewal_date DATE,
    cancellation_date DATE,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'trial', 'expired')),
    auto_renew BOOLEAN DEFAULT true,

    -- Usage & value
    users_count INTEGER DEFAULT 1,
    usage_notes TEXT,
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

    -- Links
    login_url TEXT,
    billing_portal_url TEXT,
    xero_contact_id TEXT,

    -- Project association
    project_codes TEXT[],  -- Which ACT projects use this

    -- Metadata
    notes TEXT,
    detected_from_email BOOLEAN DEFAULT false,
    email_detection_confidence INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON subscriptions(renewal_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider);

-- =============================================================================
-- SUBSCRIPTION HISTORY TABLE
-- Track cost changes and status updates
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,

    -- Change details
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'renewed', 'upgraded', 'downgraded', 'cancelled', 'paused', 'resumed', 'price_change')),
    previous_cost DECIMAL(10,2),
    new_cost DECIMAL(10,2),
    previous_status TEXT,
    new_status TEXT,

    -- Context
    notes TEXT,
    triggered_by TEXT,  -- 'manual', 'email_detection', 'xero_sync'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_sub ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_type ON subscription_history(change_type);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Monthly subscription costs by category
CREATE OR REPLACE VIEW v_subscription_costs AS
SELECT
    category,
    COUNT(*) as subscription_count,
    SUM(
        CASE billing_cycle
            WHEN 'monthly' THEN cost_per_cycle
            WHEN 'annual' THEN cost_per_cycle / 12
            WHEN 'quarterly' THEN cost_per_cycle / 3
            ELSE 0
        END
    ) as monthly_cost,
    SUM(
        CASE billing_cycle
            WHEN 'monthly' THEN cost_per_cycle * 12
            WHEN 'annual' THEN cost_per_cycle
            WHEN 'quarterly' THEN cost_per_cycle * 4
            ELSE cost_per_cycle
        END
    ) as annual_cost
FROM subscriptions
WHERE status = 'active'
GROUP BY category
ORDER BY monthly_cost DESC;

-- Upcoming renewals
CREATE OR REPLACE VIEW v_upcoming_renewals AS
SELECT
    id,
    name,
    provider,
    category,
    cost_per_cycle,
    billing_cycle,
    renewal_date,
    auto_renew,
    renewal_date - CURRENT_DATE as days_until_renewal
FROM subscriptions
WHERE status = 'active'
  AND renewal_date IS NOT NULL
  AND renewal_date >= CURRENT_DATE
ORDER BY renewal_date ASC;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_finance ON subscriptions
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

CREATE POLICY subscription_history_finance ON subscription_history
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE subscriptions IS 'Software subscription tracking for ACT';
COMMENT ON TABLE subscription_history IS 'Audit trail for subscription changes';
COMMENT ON COLUMN subscriptions.value_rating IS '1-5 rating of value vs cost';
COMMENT ON COLUMN subscriptions.project_codes IS 'ACT project codes that use this subscription';
COMMENT ON VIEW v_subscription_costs IS 'Monthly and annual costs aggregated by category';
COMMENT ON VIEW v_upcoming_renewals IS 'Subscriptions with upcoming renewal dates';
