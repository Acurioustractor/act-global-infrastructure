-- Subscription Discovery System
-- Purpose: Automated discovery of subscriptions from Xero, bank transactions, and email
-- Created: 2026-01-28

-- =============================================================================
-- EXTEND SUBSCRIPTIONS TABLE
-- =============================================================================

-- Add discovery-related columns to existing subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS xero_repeating_invoice_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS discovery_source TEXT[];
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS discovery_confidence INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_discovery_check TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expected_amount DECIMAL(10,2);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS consecutive_missed_payments INTEGER DEFAULT 0;

-- Index for discovery queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_xero_repeating ON subscriptions(xero_repeating_invoice_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_discovery ON subscriptions(last_discovery_check);
CREATE INDEX IF NOT EXISTS idx_subscriptions_missed_payments ON subscriptions(consecutive_missed_payments) WHERE consecutive_missed_payments > 0;

-- =============================================================================
-- SUBSCRIPTION DISCOVERY EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_discovery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'discovered',       -- New subscription found
        'price_change',     -- Amount changed >5%
        'confirmed',        -- Manual confirmation of discovery
        'missed_payment',   -- Expected payment not received
        'cancelled',        -- 2+ missed payments = likely cancelled
        'renewed',          -- Payment received after gap
        'merged'            -- Duplicate detection merged records
    )),

    -- Source tracking
    source TEXT NOT NULL CHECK (source IN (
        'xero_repeating',   -- From Xero RepeatingInvoices API
        'transaction',      -- From bank transaction pattern
        'email',            -- From email receipt scanning
        'manual',           -- Manual entry
        'reconciliation'    -- Automatic reconciliation
    )),

    -- Confidence and details
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    details JSONB DEFAULT '{}',

    -- For price changes
    previous_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),

    -- Vendor matching
    vendor_name TEXT,
    vendor_aliases TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for discovery events
CREATE INDEX IF NOT EXISTS idx_discovery_events_subscription ON subscription_discovery_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_discovery_events_type ON subscription_discovery_events(event_type);
CREATE INDEX IF NOT EXISTS idx_discovery_events_source ON subscription_discovery_events(source);
CREATE INDEX IF NOT EXISTS idx_discovery_events_created ON subscription_discovery_events(created_at DESC);

-- =============================================================================
-- PENDING SUBSCRIPTIONS TABLE
-- For discovered subscriptions awaiting confirmation
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Candidate info
    vendor_name TEXT NOT NULL,
    vendor_aliases TEXT[],

    -- Detected billing
    detected_amount DECIMAL(10,2),
    detected_currency TEXT DEFAULT 'AUD',
    detected_cycle TEXT CHECK (detected_cycle IN ('monthly', 'quarterly', 'annual', 'unknown')),

    -- Discovery metadata
    discovery_source TEXT NOT NULL,
    discovery_confidence INTEGER CHECK (discovery_confidence BETWEEN 0 AND 100),
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    payment_count INTEGER DEFAULT 1,

    -- Pattern details
    avg_interval_days INTEGER,
    amount_variance_pct DECIMAL(5,2),

    -- Evidence
    evidence JSONB DEFAULT '[]',  -- Array of supporting transactions/emails

    -- Resolution
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'merged')),
    resolved_subscription_id UUID REFERENCES subscriptions(id),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pending subscriptions
CREATE INDEX IF NOT EXISTS idx_pending_subs_status ON pending_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pending_subs_vendor ON pending_subscriptions(vendor_name);
CREATE INDEX IF NOT EXISTS idx_pending_subs_confidence ON pending_subscriptions(discovery_confidence DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Subscriptions needing attention
CREATE OR REPLACE VIEW v_subscription_alerts AS
SELECT
    s.*,
    CASE
        WHEN s.consecutive_missed_payments >= 2 THEN 'possibly_cancelled'
        WHEN s.expected_amount IS NOT NULL
             AND s.cost_per_cycle IS NOT NULL
             AND ABS(s.cost_per_cycle - s.expected_amount) / NULLIF(s.expected_amount, 0) > 0.1
        THEN 'price_change'
        WHEN s.renewal_date IS NOT NULL
             AND s.renewal_date < CURRENT_DATE
             AND s.auto_renew = true
        THEN 'overdue_renewal'
        ELSE 'ok'
    END as alert_status,
    CASE
        WHEN s.consecutive_missed_payments >= 2 THEN 'high'
        WHEN s.consecutive_missed_payments = 1 THEN 'medium'
        WHEN s.renewal_date IS NOT NULL AND s.renewal_date < CURRENT_DATE THEN 'medium'
        ELSE 'low'
    END as alert_priority
FROM subscriptions s
WHERE s.status = 'active';

-- Discovery summary
CREATE OR REPLACE VIEW v_discovery_summary AS
SELECT
    source,
    event_type,
    COUNT(*) as event_count,
    AVG(confidence) as avg_confidence,
    MAX(created_at) as last_event
FROM subscription_discovery_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY source, event_type
ORDER BY event_count DESC;

-- Pending subscriptions summary
CREATE OR REPLACE VIEW v_pending_subscriptions_review AS
SELECT
    ps.*,
    COALESCE(
        (SELECT s.name FROM subscriptions s
         WHERE LOWER(s.provider) = LOWER(ps.vendor_name)
         LIMIT 1),
        NULL
    ) as possible_match
FROM pending_subscriptions ps
WHERE ps.status = 'pending'
ORDER BY ps.discovery_confidence DESC, ps.payment_count DESC;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp on pending_subscriptions
CREATE OR REPLACE FUNCTION update_pending_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pending_subs_updated ON pending_subscriptions;
CREATE TRIGGER trigger_pending_subs_updated
    BEFORE UPDATE ON pending_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_pending_subscription_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE subscription_discovery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovery_events_finance ON subscription_discovery_events
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

CREATE POLICY pending_subscriptions_finance ON pending_subscriptions
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE subscription_discovery_events IS 'Audit trail of subscription discoveries, changes, and alerts';
COMMENT ON TABLE pending_subscriptions IS 'Discovered subscriptions awaiting manual confirmation';
COMMENT ON VIEW v_subscription_alerts IS 'Active subscriptions with alert status (price changes, missed payments)';
COMMENT ON VIEW v_discovery_summary IS 'Last 30 days discovery activity by source and type';
COMMENT ON VIEW v_pending_subscriptions_review IS 'Pending discoveries with possible existing matches';

-- =============================================================================
-- ADD ACCOUNT AND PAYMENT TRACKING COLUMNS
-- =============================================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS account_email TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT;

COMMENT ON COLUMN subscriptions.account_email IS 'Email account used for this subscription login';
COMMENT ON COLUMN subscriptions.payment_method IS 'Payment method (card, bank transfer, PayPal)';
