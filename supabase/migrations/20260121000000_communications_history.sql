-- Communications History & User Identities Schema
-- Purpose: Track all communications across channels with AI enrichment
-- Cultural Protocol: Respects existing cultural_protocols table - NEVER syncs sacred data
--
-- Created: 2026-01-21
-- Part of: ACT Unified Data Synchronization

-- =============================================================================
-- USER IDENTITIES TABLE
-- Cross-channel identity mapping for team members
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Canonical identity
    canonical_name TEXT NOT NULL UNIQUE,  -- 'ben', 'nic', 'matt'
    display_name TEXT,  -- 'Ben Knight', 'Nic Marchesi'

    -- Channel identifiers (all optional)
    discord_id TEXT,
    discord_username TEXT,
    signal_number TEXT,  -- E.164 format: +61...
    whatsapp_number TEXT,  -- E.164 format
    telegram_id TEXT,
    telegram_username TEXT,
    email TEXT,
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),

    -- Preferences
    preferred_channel TEXT DEFAULT 'discord',  -- discord, signal, whatsapp, telegram, email
    notification_preferences JSONB DEFAULT '{
        "morning_brief": true,
        "urgent_only": false,
        "quiet_hours": {"start": "22:00", "end": "07:00"}
    }',

    -- Timezone
    timezone TEXT DEFAULT 'Australia/Brisbane',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for identity lookups
CREATE INDEX IF NOT EXISTS idx_user_identities_discord ON user_identities(discord_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_signal ON user_identities(signal_number);
CREATE INDEX IF NOT EXISTS idx_user_identities_whatsapp ON user_identities(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_user_identities_telegram ON user_identities(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_email ON user_identities(email);

-- =============================================================================
-- COMMUNICATIONS HISTORY TABLE
-- Full communication tracking with AI enrichment
-- =============================================================================
CREATE TABLE IF NOT EXISTS communications_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contact linkage (optional - some comms may be internal)
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),

    -- Channel details
    channel TEXT NOT NULL,  -- 'email', 'calendar', 'sms', 'call', 'voice_note', 'whatsapp', 'discord'
    direction TEXT NOT NULL,  -- 'inbound', 'outbound', 'internal'

    -- Participants (for internal comms)
    from_identity UUID REFERENCES user_identities(id),
    to_identities UUID[],  -- Array of user_identity IDs

    -- Content
    subject TEXT,
    content_preview TEXT,  -- First 500 chars, no sensitive data
    full_content_ref TEXT,  -- Reference to full content if stored elsewhere

    -- AI-generated enrichment
    summary TEXT,  -- AI-generated summary
    sentiment TEXT,  -- 'positive', 'neutral', 'negative', 'urgent'
    topics TEXT[],  -- ['project:harvest', 'funding', 'timeline']
    action_items JSONB,  -- [{text, assigned_to, due_date}]
    key_decisions TEXT[],  -- Important decisions made

    -- Response tracking
    waiting_for_response BOOLEAN DEFAULT FALSE,
    response_needed_by TEXT,  -- 'us', 'them', 'none'
    follow_up_date DATE,

    -- Source tracking
    source_system TEXT NOT NULL,  -- 'gmail', 'ghl', 'google_calendar', 'discord', 'signal'
    source_id TEXT,  -- ID in the source system
    source_thread_id TEXT,  -- For email threads

    -- Related communications
    parent_id UUID REFERENCES communications_history(id),

    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    enriched_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Deduplication
    UNIQUE(source_system, source_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_comms_contact ON communications_history(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_comms_channel ON communications_history(channel);
CREATE INDEX IF NOT EXISTS idx_comms_occurred ON communications_history(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_topics ON communications_history USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_comms_waiting ON communications_history(waiting_for_response) WHERE waiting_for_response = TRUE;
CREATE INDEX IF NOT EXISTS idx_comms_source ON communications_history(source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_comms_thread ON communications_history(source_thread_id);

-- =============================================================================
-- RELATIONSHIP HEALTH TABLE
-- Tracks relationship quality over time (enriched from communications)
-- =============================================================================
CREATE TABLE IF NOT EXISTS relationship_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contact linkage
    ghl_contact_id TEXT UNIQUE NOT NULL REFERENCES ghl_contacts(ghl_id),

    -- Health metrics
    temperature INT CHECK (temperature BETWEEN 0 AND 100),  -- 0=cold, 100=hot
    last_temperature_change INT,  -- +/- change since last update
    temperature_trend TEXT,  -- 'rising', 'stable', 'falling'

    -- LCAA stage tracking
    lcaa_stage TEXT,  -- 'listen', 'connect', 'amplify', 'advocate'
    lcaa_stage_confidence DECIMAL(3,2),  -- 0.00 to 1.00

    -- Engagement metrics
    total_touchpoints INT DEFAULT 0,
    inbound_count INT DEFAULT 0,
    outbound_count INT DEFAULT 0,
    avg_response_time_hours DECIMAL(10,2),

    -- Communication recency
    last_inbound_at TIMESTAMPTZ,
    last_outbound_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,  -- GREATEST of inbound/outbound, updated by trigger
    days_since_contact INT,  -- Calculated by scheduled job or at query time

    -- Sentiment analysis
    overall_sentiment TEXT,  -- 'very_positive', 'positive', 'neutral', 'negative', 'very_negative'
    sentiment_history JSONB,  -- [{date, sentiment, communication_id}]

    -- AI insights
    relationship_summary TEXT,  -- AI-generated relationship summary
    suggested_actions TEXT[],  -- AI-suggested next actions
    risk_flags TEXT[],  -- ['going_cold', 'unresponsive', 'needs_attention']

    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for health lookups
CREATE INDEX IF NOT EXISTS idx_relationship_health_temperature ON relationship_health(temperature);
CREATE INDEX IF NOT EXISTS idx_relationship_health_stage ON relationship_health(lcaa_stage);
CREATE INDEX IF NOT EXISTS idx_relationship_health_days ON relationship_health(days_since_contact);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update relationship health from communications
CREATE OR REPLACE FUNCTION update_relationship_health()
RETURNS TRIGGER AS $$
DECLARE
    v_last_contact TIMESTAMPTZ;
    v_days_since INT;
BEGIN
    -- Calculate last contact and days since
    v_last_contact := NEW.occurred_at;
    v_days_since := EXTRACT(DAY FROM (NOW() - v_last_contact))::INT;

    -- Update or create relationship health record
    INSERT INTO relationship_health (
        ghl_contact_id,
        last_inbound_at,
        last_outbound_at,
        last_contact_at,
        days_since_contact,
        total_touchpoints
    )
    VALUES (
        NEW.ghl_contact_id,
        CASE WHEN NEW.direction = 'inbound' THEN NEW.occurred_at ELSE NULL END,
        CASE WHEN NEW.direction = 'outbound' THEN NEW.occurred_at ELSE NULL END,
        NEW.occurred_at,
        v_days_since,
        1
    )
    ON CONFLICT (ghl_contact_id) DO UPDATE SET
        last_inbound_at = CASE
            WHEN NEW.direction = 'inbound' THEN GREATEST(relationship_health.last_inbound_at, NEW.occurred_at)
            ELSE relationship_health.last_inbound_at
        END,
        last_outbound_at = CASE
            WHEN NEW.direction = 'outbound' THEN GREATEST(relationship_health.last_outbound_at, NEW.occurred_at)
            ELSE relationship_health.last_outbound_at
        END,
        last_contact_at = GREATEST(relationship_health.last_contact_at, NEW.occurred_at),
        days_since_contact = EXTRACT(DAY FROM (NOW() - GREATEST(relationship_health.last_contact_at, NEW.occurred_at)))::INT,
        inbound_count = relationship_health.inbound_count + CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
        outbound_count = relationship_health.outbound_count + CASE WHEN NEW.direction = 'outbound' THEN 1 ELSE 0 END,
        total_touchpoints = relationship_health.total_touchpoints + 1,
        updated_at = NOW()
    WHERE NEW.ghl_contact_id IS NOT NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update relationship health
DROP TRIGGER IF EXISTS trigger_update_relationship_health ON communications_history;
CREATE TRIGGER trigger_update_relationship_health
    AFTER INSERT ON communications_history
    FOR EACH ROW
    WHEN (NEW.ghl_contact_id IS NOT NULL)
    EXECUTE FUNCTION update_relationship_health();

-- Update timestamp trigger for new tables
DROP TRIGGER IF EXISTS trigger_user_identities_updated ON user_identities;
CREATE TRIGGER trigger_user_identities_updated
    BEFORE UPDATE ON user_identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_comms_history_updated ON communications_history;
CREATE TRIGGER trigger_comms_history_updated
    BEFORE UPDATE ON communications_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_relationship_health_updated ON relationship_health;
CREATE TRIGGER trigger_relationship_health_updated
    BEFORE UPDATE ON relationship_health
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Recent communications with contact info
CREATE OR REPLACE VIEW v_recent_communications AS
SELECT
    ch.*,
    c.full_name as contact_name,
    c.email as contact_email,
    c.company_name,
    rh.temperature,
    rh.lcaa_stage
FROM communications_history ch
LEFT JOIN ghl_contacts c ON ch.ghl_contact_id = c.ghl_id
LEFT JOIN relationship_health rh ON ch.ghl_contact_id = rh.ghl_contact_id
ORDER BY ch.occurred_at DESC;

-- Awaiting response view
CREATE OR REPLACE VIEW v_awaiting_response AS
SELECT
    ch.*,
    c.full_name as contact_name,
    c.email as contact_email,
    EXTRACT(DAY FROM (NOW() - ch.occurred_at)) as days_waiting
FROM communications_history ch
JOIN ghl_contacts c ON ch.ghl_contact_id = c.ghl_id
WHERE ch.waiting_for_response = TRUE
AND ch.response_needed_by = 'them'
ORDER BY ch.occurred_at ASC;

-- Need to respond view
CREATE OR REPLACE VIEW v_need_to_respond AS
SELECT
    ch.*,
    c.full_name as contact_name,
    c.email as contact_email,
    EXTRACT(DAY FROM (NOW() - ch.occurred_at)) as days_since
FROM communications_history ch
JOIN ghl_contacts c ON ch.ghl_contact_id = c.ghl_id
WHERE ch.waiting_for_response = TRUE
AND ch.response_needed_by = 'us'
ORDER BY ch.occurred_at ASC;

-- Contact communication summary
CREATE OR REPLACE VIEW v_contact_communication_summary AS
SELECT
    c.ghl_id,
    c.full_name,
    c.email,
    rh.temperature,
    rh.lcaa_stage,
    rh.days_since_contact,
    rh.total_touchpoints,
    rh.overall_sentiment,
    (SELECT COUNT(*) FROM communications_history ch
     WHERE ch.ghl_contact_id = c.ghl_id AND ch.channel = 'email') as email_count,
    (SELECT COUNT(*) FROM communications_history ch
     WHERE ch.ghl_contact_id = c.ghl_id AND ch.channel = 'calendar') as meeting_count,
    (SELECT COUNT(*) FROM communications_history ch
     WHERE ch.ghl_contact_id = c.ghl_id AND ch.channel = 'call') as call_count,
    (SELECT array_agg(DISTINCT topic) FROM communications_history ch, unnest(ch.topics) as topic
     WHERE ch.ghl_contact_id = c.ghl_id) as all_topics
FROM ghl_contacts c
LEFT JOIN relationship_health rh ON c.ghl_id = rh.ghl_contact_id;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_health ENABLE ROW LEVEL SECURITY;

-- Team access policies
CREATE POLICY user_identities_team ON user_identities
    FOR ALL TO authenticated
    USING (TRUE);

CREATE POLICY communications_history_team ON communications_history
    FOR ALL TO authenticated
    USING (TRUE);

CREATE POLICY relationship_health_team ON relationship_health
    FOR ALL TO authenticated
    USING (TRUE);

-- =============================================================================
-- SEED DATA: Team Identities
-- =============================================================================

INSERT INTO user_identities (canonical_name, display_name, email, preferred_channel, timezone)
VALUES
    ('ben', 'Ben Knight', 'ben@act.place', 'discord', 'Australia/Brisbane'),
    ('nic', 'Nic Marchesi', 'nic@act.place', 'whatsapp', 'Australia/Brisbane')
ON CONFLICT (canonical_name) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_identities IS 'Cross-channel identity mapping for team members';
COMMENT ON TABLE communications_history IS 'Full communication tracking with AI enrichment - respects cultural protocols';
COMMENT ON TABLE relationship_health IS 'Relationship quality metrics derived from communications';
COMMENT ON COLUMN communications_history.content_preview IS 'First 500 chars only - no sensitive cultural data';
COMMENT ON COLUMN relationship_health.temperature IS 'Relationship warmth: 0=cold, 100=hot';
