-- GHL Sync Schema for ACT Ecosystem
-- Purpose: Store GHL contacts and opportunities with bidirectional sync capability
-- Cultural Protocol: Sensitive cultural data NEVER syncs to GHL - stays in Supabase only
--
-- Created: 2026-01-05
-- Updated: 2026-01-05

-- =============================================================================
-- GHL CONTACTS TABLE
-- Syncs: GHL <-> Supabase (bidirectional)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ghl_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- GHL identifiers
    ghl_id TEXT UNIQUE NOT NULL,
    ghl_location_id TEXT NOT NULL,

    -- Core contact info (syncs to GHL)
    first_name TEXT,
    last_name TEXT,
    full_name TEXT GENERATED ALWAYS AS (
        COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    ) STORED,
    email TEXT,
    phone TEXT,
    company_name TEXT,

    -- Tags (syncs to GHL)
    tags TEXT[] DEFAULT '{}',

    -- Custom fields (syncs to GHL - NON-SENSITIVE only)
    custom_fields JSONB DEFAULT '{}',

    -- Project associations
    projects TEXT[] DEFAULT '{}',  -- e.g., ['empathy-ledger', 'the-harvest']

    -- Engagement tracking
    engagement_status TEXT DEFAULT 'lead',  -- lead, prospect, active, alumni, lapsed, opted-out
    first_contact_date TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ,

    -- Sync metadata
    ghl_created_at TIMESTAMPTZ,
    ghl_updated_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',  -- pending, synced, error
    sync_error TEXT,

    -- Local metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_ghl_id ON ghl_contacts(ghl_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_email ON ghl_contacts(email);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_tags ON ghl_contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_projects ON ghl_contacts USING GIN(projects);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_engagement ON ghl_contacts(engagement_status);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_sync_status ON ghl_contacts(sync_status);

-- =============================================================================
-- GHL OPPORTUNITIES TABLE
-- Syncs: GHL -> Supabase (read-only from GHL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ghl_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- GHL identifiers
    ghl_id TEXT UNIQUE NOT NULL,
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),
    ghl_pipeline_id TEXT NOT NULL,
    ghl_stage_id TEXT NOT NULL,

    -- Opportunity data
    name TEXT NOT NULL,
    pipeline_name TEXT,
    stage_name TEXT,
    status TEXT,  -- open, won, lost, abandoned
    monetary_value DECIMAL(12,2),

    -- Custom fields
    custom_fields JSONB DEFAULT '{}',

    -- Assigned user
    assigned_to TEXT,

    -- Sync metadata
    ghl_created_at TIMESTAMPTZ,
    ghl_updated_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Local metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_contact ON ghl_opportunities(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_pipeline ON ghl_opportunities(ghl_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_status ON ghl_opportunities(status);

-- =============================================================================
-- GHL PIPELINES TABLE
-- Syncs: GHL -> Supabase (reference data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ghl_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- GHL identifiers
    ghl_id TEXT UNIQUE NOT NULL,
    ghl_location_id TEXT NOT NULL,

    -- Pipeline data
    name TEXT NOT NULL,
    stages JSONB DEFAULT '[]',  -- [{id, name, order}]

    -- Sync metadata
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Local metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- GHL TAGS TABLE
-- Syncs: GHL -> Supabase (reference data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ghl_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- GHL identifiers
    ghl_location_id TEXT NOT NULL,

    -- Tag data
    name TEXT NOT NULL,
    category TEXT,  -- project, role, engagement, interest, action, priority, cultural, campaign
    color TEXT,

    -- Sync metadata
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Local metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ghl_location_id, name)
);

-- =============================================================================
-- CULTURAL PROTOCOLS TABLE
-- NEVER SYNCS TO GHL - Stays in Supabase only
-- =============================================================================
CREATE TABLE IF NOT EXISTS cultural_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to contact (can be GHL contact or standalone)
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),
    empathy_ledger_user_id UUID,  -- Links to Empathy Ledger users table

    -- Cultural information (NEVER syncs to GHL)
    cultural_nation TEXT,  -- e.g., 'Kabi Kabi', 'Jinibara'
    elder_status BOOLEAN DEFAULT FALSE,
    elder_consent JSONB,  -- Detailed consent records
    sacred_knowledge_notes TEXT,  -- Private notes, NEVER shared

    -- Protocol requirements
    requires_elder_review BOOLEAN DEFAULT FALSE,
    elder_reviewer_id UUID,  -- Reference to Elder contact
    review_status TEXT,  -- pending, approved, rejected
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,

    -- OCAP compliance
    ocap_ownership TEXT,  -- Who owns this data
    ocap_control TEXT,  -- Who controls access
    ocap_access TEXT,  -- Who can access
    ocap_possession TEXT,  -- Who possesses the data

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_cultural_protocols_ghl ON cultural_protocols(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_cultural_protocols_elder ON cultural_protocols(elder_status);

-- =============================================================================
-- SYNC LOG TABLE
-- Track all sync operations for debugging
-- =============================================================================
CREATE TABLE IF NOT EXISTS ghl_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sync operation details
    operation TEXT NOT NULL,  -- create, update, delete, full_sync
    entity_type TEXT NOT NULL,  -- contact, opportunity, pipeline
    entity_id TEXT,
    direction TEXT NOT NULL,  -- ghl_to_supabase, supabase_to_ghl, bidirectional

    -- Status
    status TEXT NOT NULL,  -- success, error, skipped
    error_message TEXT,

    -- Metrics
    records_processed INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_skipped INT DEFAULT 0,
    records_failed INT DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,

    -- Context
    triggered_by TEXT,  -- webhook, cron, manual
    metadata JSONB DEFAULT '{}'
);

-- Index for recent logs
CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_created ON ghl_sync_log(started_at DESC);

-- =============================================================================
-- DONATION TRACKING (syncs to GHL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to contact
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),

    -- Donation details
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'AUD',
    donation_date TIMESTAMPTZ NOT NULL,
    donation_method TEXT,  -- credit_card, bank_transfer, cash, in_kind
    frequency TEXT DEFAULT 'one_time',  -- one_time, monthly, quarterly, annual

    -- Project designation
    project TEXT,  -- empathy-ledger, justicehub, the-harvest, etc.

    -- Payment processing
    stripe_payment_id TEXT,
    stripe_customer_id TEXT,

    -- Tax receipt
    receipt_sent BOOLEAN DEFAULT FALSE,
    receipt_sent_at TIMESTAMPTZ,

    -- GHL sync
    synced_to_ghl BOOLEAN DEFAULT FALSE,
    ghl_opportunity_id TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for donor queries
CREATE INDEX IF NOT EXISTS idx_donations_contact ON donations(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_project ON donations(project);

-- =============================================================================
-- VOLUNTEER HOURS (syncs to GHL custom field)
-- =============================================================================
CREATE TABLE IF NOT EXISTS volunteer_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to contact
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),

    -- Hours details
    hours DECIMAL(6,2) NOT NULL,
    date DATE NOT NULL,
    activity TEXT NOT NULL,
    project TEXT,  -- the-harvest, act-farm, etc.

    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_contact ON volunteer_hours(ghl_contact_id);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Active contacts with cultural protocol flags
CREATE OR REPLACE VIEW v_contacts_with_protocols AS
SELECT
    c.*,
    cp.cultural_nation,
    cp.elder_status,
    cp.requires_elder_review,
    cp.review_status,
    CASE
        WHEN cp.id IS NOT NULL THEN TRUE
        ELSE FALSE
    END as has_cultural_protocols
FROM ghl_contacts c
LEFT JOIN cultural_protocols cp ON c.ghl_id = cp.ghl_contact_id;

-- Donor summary
CREATE OR REPLACE VIEW v_donor_summary AS
SELECT
    c.ghl_id,
    c.full_name,
    c.email,
    COUNT(d.id) as donation_count,
    SUM(d.amount) as lifetime_value,
    MIN(d.donation_date) as first_donation,
    MAX(d.donation_date) as last_donation,
    CASE
        WHEN MAX(d.donation_date) < NOW() - INTERVAL '12 months' THEN 'lapsed'
        WHEN COUNT(d.id) >= 3 THEN 'regular'
        WHEN COUNT(d.id) = 2 THEN 'repeat'
        WHEN COUNT(d.id) = 1 THEN 'first_time'
        ELSE 'prospect'
    END as donor_status
FROM ghl_contacts c
LEFT JOIN donations d ON c.ghl_id = d.ghl_contact_id
GROUP BY c.ghl_id, c.full_name, c.email;

-- Volunteer summary
CREATE OR REPLACE VIEW v_volunteer_summary AS
SELECT
    c.ghl_id,
    c.full_name,
    c.email,
    COALESCE(SUM(vh.hours), 0) as total_hours,
    COUNT(vh.id) as session_count,
    MAX(vh.date) as last_volunteered,
    array_agg(DISTINCT vh.project) FILTER (WHERE vh.project IS NOT NULL) as projects_volunteered
FROM ghl_contacts c
LEFT JOIN volunteer_hours vh ON c.ghl_id = vh.ghl_contact_id
GROUP BY c.ghl_id, c.full_name, c.email;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS trigger_ghl_contacts_updated ON ghl_contacts;
CREATE TRIGGER trigger_ghl_contacts_updated
    BEFORE UPDATE ON ghl_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_ghl_opportunities_updated ON ghl_opportunities;
CREATE TRIGGER trigger_ghl_opportunities_updated
    BEFORE UPDATE ON ghl_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_cultural_protocols_updated ON cultural_protocols;
CREATE TRIGGER trigger_cultural_protocols_updated
    BEFORE UPDATE ON cultural_protocols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE ghl_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;

-- Cultural protocols - strict access (admin only)
CREATE POLICY cultural_protocols_admin ON cultural_protocols
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin'
        OR auth.jwt() ->> 'role' = 'cultural_liaison'
    );

-- Contacts - team access
CREATE POLICY ghl_contacts_team ON ghl_contacts
    FOR ALL TO authenticated
    USING (TRUE);  -- Customize based on project access

-- Opportunities - team access
CREATE POLICY ghl_opportunities_team ON ghl_opportunities
    FOR ALL TO authenticated
    USING (TRUE);

-- Donations - admin and finance
CREATE POLICY donations_admin ON donations
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'finance')
    );

-- Volunteer hours - team access
CREATE POLICY volunteer_hours_team ON volunteer_hours
    FOR ALL TO authenticated
    USING (TRUE);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE ghl_contacts IS 'GHL contacts synced bidirectionally - NO sensitive cultural data';
COMMENT ON TABLE cultural_protocols IS 'Cultural protocol data - NEVER syncs to GHL, Supabase only';
COMMENT ON TABLE ghl_sync_log IS 'Log of all GHL sync operations for debugging';
COMMENT ON COLUMN cultural_protocols.elder_consent IS 'Detailed consent records - NEVER syncs to GHL';
COMMENT ON COLUMN cultural_protocols.sacred_knowledge_notes IS 'Private notes - NEVER shared outside Supabase';
