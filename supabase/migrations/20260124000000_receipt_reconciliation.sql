-- Receipt Reconciliation Intelligence System
-- Purpose: Track missing receipts, email matches, gamification
-- Created: 2026-01-24

-- =============================================================================
-- SCHEMA UPDATES: Add has_attachments columns
-- =============================================================================

-- Add has_attachments to xero_transactions if missing
ALTER TABLE xero_transactions
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;

-- Create index for receipt queries
CREATE INDEX IF NOT EXISTS idx_xero_transactions_has_attachments
ON xero_transactions(has_attachments);

CREATE INDEX IF NOT EXISTS idx_xero_invoices_has_attachments
ON xero_invoices(has_attachments);

-- =============================================================================
-- RECEIPT MATCHES TABLE
-- Tracks unmatched expenses and potential email matches
-- =============================================================================

CREATE TABLE IF NOT EXISTS receipt_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source reference (either invoice or transaction)
    source_type TEXT NOT NULL CHECK (source_type IN ('invoice', 'transaction')),
    source_id TEXT NOT NULL,  -- xero_invoice_id or xero_transaction_id

    -- Transaction details (denormalized for quick access)
    vendor_name TEXT,
    amount DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    category TEXT,  -- 'travel', 'subscription', 'other'
    description TEXT,

    -- Match status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Needs receipt
        'email_suggested',   -- Email match found
        'resolved',          -- Receipt attached
        'no_receipt_needed', -- Marked as not needing receipt
        'deferred'           -- Deferred to next week
    )),

    -- Email match data
    suggested_email_id UUID,  -- Reference to communications_history
    suggested_email_subject TEXT,
    suggested_email_from TEXT,
    suggested_email_date TIMESTAMPTZ,
    match_confidence INTEGER,  -- 0-100 AI confidence score
    match_reasons JSONB DEFAULT '[]',  -- [{reason, weight}]

    -- Resolution tracking
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,  -- 'manual', 'email_match', 'no_receipt'
    resolution_notes TEXT,

    -- Week tracking
    week_start DATE,  -- Monday of the week this was created
    deferred_count INTEGER DEFAULT 0,

    -- Gamification
    points_awarded INTEGER DEFAULT 0,
    quick_resolve BOOLEAN DEFAULT false,  -- Resolved within 7 days

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(source_type, source_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_receipt_matches_status ON receipt_matches(status);
CREATE INDEX IF NOT EXISTS idx_receipt_matches_week ON receipt_matches(week_start);
CREATE INDEX IF NOT EXISTS idx_receipt_matches_vendor ON receipt_matches(vendor_name);
CREATE INDEX IF NOT EXISTS idx_receipt_matches_category ON receipt_matches(category);
CREATE INDEX IF NOT EXISTS idx_receipt_matches_date ON receipt_matches(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_matches_confidence ON receipt_matches(match_confidence DESC);

-- =============================================================================
-- USER GAMIFICATION STATS
-- Single record for ACT Finance account
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_gamification_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE DEFAULT 'act-finance',  -- Single user for now

    -- Points
    total_points INTEGER DEFAULT 0,
    points_this_week INTEGER DEFAULT 0,
    points_this_month INTEGER DEFAULT 0,

    -- Streaks
    current_streak INTEGER DEFAULT 0,  -- Consecutive perfect weeks
    best_streak INTEGER DEFAULT 0,
    last_perfect_week DATE,

    -- Counters
    receipts_resolved INTEGER DEFAULT 0,
    quick_resolves INTEGER DEFAULT 0,
    no_receipt_marked INTEGER DEFAULT 0,

    -- Achievements (stored as array of achievement IDs earned)
    achievements JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default ACT Finance user
INSERT INTO user_gamification_stats (user_id)
VALUES ('act-finance')
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- RECEIPT MATCH HISTORY
-- Audit trail for learning and improvement
-- =============================================================================

CREATE TABLE IF NOT EXISTS receipt_match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    receipt_match_id UUID REFERENCES receipt_matches(id) ON DELETE CASCADE,

    -- Action details
    action TEXT NOT NULL CHECK (action IN (
        'created',
        'email_suggested',
        'confidence_updated',
        'resolved',
        'deferred',
        'no_receipt_marked',
        'reopened'
    )),

    -- Before/after state
    previous_status TEXT,
    new_status TEXT,

    -- Match feedback (for learning)
    feedback TEXT CHECK (feedback IN ('correct', 'incorrect', 'partial', null)),
    feedback_notes TEXT,

    -- Context
    triggered_by TEXT,  -- 'scan', 'manual', 'weekly_review'
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_history_match ON receipt_match_history(receipt_match_id);
CREATE INDEX IF NOT EXISTS idx_receipt_history_action ON receipt_match_history(action);
CREATE INDEX IF NOT EXISTS idx_receipt_history_feedback ON receipt_match_history(feedback);

-- =============================================================================
-- RECEIPT RECONCILIATION WEEKS
-- Weekly snapshots for tracking and streaks
-- =============================================================================

CREATE TABLE IF NOT EXISTS receipt_reconciliation_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    week_start DATE UNIQUE NOT NULL,  -- Monday
    week_end DATE NOT NULL,            -- Sunday

    -- Counts
    total_pending INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    no_receipt_count INTEGER DEFAULT 0,
    deferred_count INTEGER DEFAULT 0,

    -- Amounts
    total_amount_pending DECIMAL(12,2) DEFAULT 0,
    total_amount_resolved DECIMAL(12,2) DEFAULT 0,

    -- Categories
    travel_count INTEGER DEFAULT 0,
    subscription_count INTEGER DEFAULT 0,
    other_count INTEGER DEFAULT 0,

    -- Performance
    average_resolve_time_hours DECIMAL(10,2),
    quick_resolve_rate DECIMAL(5,2),  -- Percentage

    -- Status
    is_perfect_week BOOLEAN DEFAULT false,  -- 100% resolved
    points_earned INTEGER DEFAULT 0,

    -- Gamification bonuses applied
    bonuses_applied JSONB DEFAULT '[]',  -- [{type, points, reason}]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_weeks_start ON receipt_reconciliation_weeks(week_start DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Pending receipts with category and age
CREATE OR REPLACE VIEW v_pending_receipts AS
SELECT
    rm.id,
    rm.source_type,
    rm.source_id,
    rm.vendor_name,
    rm.amount,
    rm.transaction_date,
    rm.category,
    rm.description,
    rm.status,
    rm.match_confidence,
    rm.suggested_email_subject,
    rm.suggested_email_from,
    rm.week_start,
    rm.deferred_count,
    CURRENT_DATE - rm.transaction_date as days_old,
    CASE
        WHEN rm.transaction_date >= CURRENT_DATE - 7 THEN 'quick_resolve_eligible'
        WHEN rm.transaction_date >= CURRENT_DATE - 30 THEN 'recent'
        WHEN rm.transaction_date >= CURRENT_DATE - 60 THEN 'aging'
        ELSE 'backlog'
    END as age_category
FROM receipt_matches rm
WHERE rm.status IN ('pending', 'email_suggested', 'deferred')
ORDER BY rm.match_confidence DESC NULLS LAST, rm.transaction_date DESC;

-- Weekly summary stats
CREATE OR REPLACE VIEW v_receipt_weekly_summary AS
SELECT
    week_start,
    total_pending,
    resolved_count,
    no_receipt_count,
    deferred_count,
    resolved_count + no_receipt_count as completed_count,
    CASE
        WHEN total_pending > 0
        THEN ROUND(100.0 * (resolved_count + no_receipt_count) / total_pending, 1)
        ELSE 100
    END as completion_rate,
    total_amount_pending,
    total_amount_resolved,
    is_perfect_week,
    points_earned
FROM receipt_reconciliation_weeks
ORDER BY week_start DESC;

-- Gamification leaderboard (for future multi-user)
CREATE OR REPLACE VIEW v_gamification_leaderboard AS
SELECT
    user_id,
    total_points,
    current_streak,
    best_streak,
    receipts_resolved,
    quick_resolves,
    CASE
        WHEN receipts_resolved > 0
        THEN ROUND(100.0 * quick_resolves / receipts_resolved, 1)
        ELSE 0
    END as quick_resolve_rate,
    jsonb_array_length(achievements) as achievement_count,
    achievements
FROM user_gamification_stats
ORDER BY total_points DESC;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get current week's Monday
CREATE OR REPLACE FUNCTION get_week_start(d DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN d - EXTRACT(DOW FROM d)::INTEGER + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Award points and update stats
CREATE OR REPLACE FUNCTION award_receipt_points(
    p_user_id TEXT,
    p_points INTEGER,
    p_is_quick_resolve BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
    v_new_total INTEGER;
BEGIN
    UPDATE user_gamification_stats
    SET
        total_points = total_points + p_points,
        points_this_week = points_this_week + p_points,
        points_this_month = points_this_month + p_points,
        receipts_resolved = receipts_resolved + 1,
        quick_resolves = quick_resolves + CASE WHEN p_is_quick_resolve THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING total_points INTO v_new_total;

    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Check and award achievement
CREATE OR REPLACE FUNCTION check_receipt_achievements(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_stats user_gamification_stats%ROWTYPE;
    v_new_achievements JSONB := '[]'::JSONB;
    v_achievement JSONB;
BEGIN
    SELECT * INTO v_stats FROM user_gamification_stats WHERE user_id = p_user_id;

    -- Receipt Rookie: First receipt resolved
    IF v_stats.receipts_resolved = 1 AND NOT v_stats.achievements ? 'receipt_rookie' THEN
        v_achievement := jsonb_build_object(
            'id', 'receipt_rookie',
            'name', 'Receipt Rookie',
            'description', 'Resolved your first receipt',
            'earned_at', NOW(),
            'icon', '🧾'
        );
        v_new_achievements := v_new_achievements || v_achievement;
    END IF;

    -- Week Warrior: First perfect week
    IF v_stats.current_streak >= 1 AND NOT v_stats.achievements ? 'week_warrior' THEN
        v_achievement := jsonb_build_object(
            'id', 'week_warrior',
            'name', 'Week Warrior',
            'description', 'Completed your first perfect week',
            'earned_at', NOW(),
            'icon', '🏆'
        );
        v_new_achievements := v_new_achievements || v_achievement;
    END IF;

    -- Streak Starter: 2 consecutive perfect weeks
    IF v_stats.current_streak >= 2 AND NOT v_stats.achievements ? 'streak_starter' THEN
        v_achievement := jsonb_build_object(
            'id', 'streak_starter',
            'name', 'Streak Starter',
            'description', '2 consecutive perfect weeks',
            'earned_at', NOW(),
            'icon', '🔥'
        );
        v_new_achievements := v_new_achievements || v_achievement;
    END IF;

    -- Streak Master: 4 consecutive perfect weeks
    IF v_stats.current_streak >= 4 AND NOT v_stats.achievements ? 'streak_master' THEN
        v_achievement := jsonb_build_object(
            'id', 'streak_master',
            'name', 'Streak Master',
            'description', '4 consecutive perfect weeks - a whole month!',
            'earned_at', NOW(),
            'icon', '👑'
        );
        v_new_achievements := v_new_achievements || v_achievement;
    END IF;

    -- Century Club: 100 receipts resolved
    IF v_stats.receipts_resolved >= 100 AND NOT v_stats.achievements ? 'century_club' THEN
        v_achievement := jsonb_build_object(
            'id', 'century_club',
            'name', 'Century Club',
            'description', 'Resolved 100 receipts',
            'earned_at', NOW(),
            'icon', '💯'
        );
        v_new_achievements := v_new_achievements || v_achievement;
    END IF;

    -- Speed Demon: 10 quick resolves
    IF v_stats.quick_resolves >= 10 AND NOT v_stats.achievements ? 'speed_demon' THEN
        v_achievement := jsonb_build_object(
            'id', 'speed_demon',
            'name', 'Speed Demon',
            'description', '10 receipts resolved within 7 days',
            'earned_at', NOW(),
            'icon', '⚡'
        );
        v_new_achievements := v_new_achievements || v_achievement;
    END IF;

    -- Update achievements if new ones earned
    IF jsonb_array_length(v_new_achievements) > 0 THEN
        UPDATE user_gamification_stats
        SET achievements = achievements || v_new_achievements,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN v_new_achievements;
END;
$$ LANGUAGE plpgsql;

-- Reset weekly points (call at start of each week)
CREATE OR REPLACE FUNCTION reset_weekly_points()
RETURNS void AS $$
BEGIN
    UPDATE user_gamification_stats
    SET points_this_week = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_receipt_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_receipt_matches_updated ON receipt_matches;
CREATE TRIGGER trigger_receipt_matches_updated
    BEFORE UPDATE ON receipt_matches
    FOR EACH ROW EXECUTE FUNCTION update_receipt_timestamp();

DROP TRIGGER IF EXISTS trigger_gamification_stats_updated ON user_gamification_stats;
CREATE TRIGGER trigger_gamification_stats_updated
    BEFORE UPDATE ON user_gamification_stats
    FOR EACH ROW EXECUTE FUNCTION update_receipt_timestamp();

DROP TRIGGER IF EXISTS trigger_reconciliation_weeks_updated ON receipt_reconciliation_weeks;
CREATE TRIGGER trigger_reconciliation_weeks_updated
    BEFORE UPDATE ON receipt_reconciliation_weeks
    FOR EACH ROW EXECUTE FUNCTION update_receipt_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE receipt_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_reconciliation_weeks ENABLE ROW LEVEL SECURITY;

-- Finance access policies
CREATE POLICY receipt_matches_finance ON receipt_matches
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

CREATE POLICY gamification_stats_finance ON user_gamification_stats
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

CREATE POLICY receipt_history_finance ON receipt_match_history
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

CREATE POLICY reconciliation_weeks_finance ON receipt_reconciliation_weeks
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'finance', 'service_role'));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE receipt_matches IS 'Tracks unmatched expenses and potential email receipts';
COMMENT ON TABLE user_gamification_stats IS 'Gamification stats for receipt reconciliation';
COMMENT ON TABLE receipt_match_history IS 'Audit trail for receipt match actions';
COMMENT ON TABLE receipt_reconciliation_weeks IS 'Weekly snapshots for tracking progress';

COMMENT ON COLUMN receipt_matches.category IS 'travel, subscription, or other';
COMMENT ON COLUMN receipt_matches.match_confidence IS '0-100 AI-generated confidence score';
COMMENT ON COLUMN receipt_matches.quick_resolve IS 'Resolved within 7 days of transaction';
COMMENT ON COLUMN user_gamification_stats.current_streak IS 'Consecutive perfect weeks';
COMMENT ON VIEW v_pending_receipts IS 'Active receipts needing attention with age categorization';
COMMENT ON VIEW v_receipt_weekly_summary IS 'Week-by-week reconciliation performance';
