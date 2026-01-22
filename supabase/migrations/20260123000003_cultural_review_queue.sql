-- Cultural Review Queue
-- Purpose: Track and route items needing cultural review to appropriate liaisons
-- Layer 7: Governance & Safety
--
-- Created: 2026-01-23
-- Part of: Cultural Review Automation System

-- =============================================================================
-- CULTURAL REVIEW QUEUE TABLE
-- Central queue for tracking items requiring cultural review
-- =============================================================================
CREATE TABLE IF NOT EXISTS cultural_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Item being reviewed
    item_type TEXT NOT NULL,  -- 'voice_note', 'story', 'project_knowledge', 'communication'
    item_id UUID NOT NULL,
    item_title TEXT,  -- Cached title for display

    -- Cultural context
    nation_community TEXT,  -- 'Barkindji', 'Wiradjuri', 'Torres Strait', etc.
    region TEXT,  -- 'NSW', 'QLD', 'WA', etc.
    sensitivity_level TEXT DEFAULT 'standard',  -- 'standard', 'sensitive', 'sacred', 'restricted'

    -- Review details
    review_reason TEXT NOT NULL,  -- Why this needs review: 'mentions_elder', 'sacred_content', 'cultural_keywords'
    flagged_keywords TEXT[],  -- Keywords that triggered the flag
    content_preview TEXT,  -- First ~200 chars for quick scanning

    -- Assignment
    assigned_to TEXT,  -- Reviewer email or user ID
    assigned_at TIMESTAMPTZ,

    -- Status tracking
    status TEXT DEFAULT 'pending',  -- 'pending', 'in_review', 'approved', 'flagged', 'escalated', 'archived'
    priority TEXT DEFAULT 'normal',  -- 'urgent', 'high', 'normal', 'low'

    -- Review outcome
    reviewer_notes TEXT,
    review_decision TEXT,  -- 'approve_internal', 'approve_external', 'restrict', 'redact', 'delete'
    restrictions_applied TEXT[],  -- ['no_external_sharing', 'elder_attribution_required', etc.]
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,

    -- Follow-up
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_date DATE,
    followup_notes TEXT,

    -- Links to related protocols
    cultural_protocol_id UUID REFERENCES cultural_protocols(id),

    -- Notification tracking
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,
    notification_channel TEXT,  -- 'email', 'discord', 'signal'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CULTURAL LIAISONS TABLE
-- Registry of approved cultural reviewers by community/region
-- =============================================================================
CREATE TABLE IF NOT EXISTS cultural_liaisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Liaison details
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,

    -- Scope of authority
    communities TEXT[] NOT NULL,  -- ['Barkindji', 'Wiradjuri'] - communities they can review for
    regions TEXT[],  -- ['NSW', 'VIC'] - geographic regions
    review_types TEXT[] DEFAULT ARRAY['voice_note', 'story', 'project_knowledge'],  -- What they can review

    -- Capacity and preferences
    max_weekly_reviews INT DEFAULT 10,
    preferred_notification_channel TEXT DEFAULT 'email',  -- 'email', 'discord', 'signal'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_assigned_at TIMESTAMPTZ,
    reviews_this_week INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_crq_status ON cultural_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_crq_item ON cultural_review_queue(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_crq_assigned ON cultural_review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crq_nation ON cultural_review_queue(nation_community) WHERE nation_community IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crq_pending ON cultural_review_queue(status, priority) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_crq_created ON cultural_review_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crq_sensitivity ON cultural_review_queue(sensitivity_level);

-- Liaison indexes
CREATE INDEX IF NOT EXISTS idx_cl_active ON cultural_liaisons(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cl_communities ON cultural_liaisons USING GIN(communities);
CREATE INDEX IF NOT EXISTS idx_cl_regions ON cultural_liaisons USING GIN(regions);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Find appropriate liaison for a review item
CREATE OR REPLACE FUNCTION find_cultural_liaison(
    p_community TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_item_type TEXT DEFAULT 'voice_note'
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    preferred_channel TEXT,
    workload INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.id,
        cl.name,
        cl.email,
        cl.preferred_notification_channel as preferred_channel,
        cl.reviews_this_week as workload
    FROM cultural_liaisons cl
    WHERE cl.is_active = TRUE
    AND (p_community IS NULL OR p_community = ANY(cl.communities))
    AND (p_region IS NULL OR p_region = ANY(cl.regions))
    AND p_item_type = ANY(cl.review_types)
    AND cl.reviews_this_week < cl.max_weekly_reviews
    ORDER BY
        -- Prefer liaisons who cover the specific community
        CASE WHEN p_community IS NOT NULL AND p_community = ANY(cl.communities) THEN 0 ELSE 1 END,
        -- Then by workload (prefer less busy)
        cl.reviews_this_week,
        -- Then by last assignment (round-robin)
        cl.last_assigned_at NULLS FIRST
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign review to appropriate liaison
CREATE OR REPLACE FUNCTION auto_assign_review(p_review_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_review RECORD;
    v_liaison RECORD;
BEGIN
    -- Get the review item
    SELECT * INTO v_review
    FROM cultural_review_queue
    WHERE id = p_review_id AND status = 'pending' AND assigned_to IS NULL;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Find appropriate liaison
    SELECT * INTO v_liaison
    FROM find_cultural_liaison(v_review.nation_community, v_review.region, v_review.item_type);

    IF NOT FOUND THEN
        -- No available liaison - escalate
        UPDATE cultural_review_queue
        SET status = 'escalated',
            reviewer_notes = 'No available cultural liaison for this community/region',
            updated_at = NOW()
        WHERE id = p_review_id;
        RETURN FALSE;
    END IF;

    -- Assign the review
    UPDATE cultural_review_queue
    SET assigned_to = v_liaison.email,
        assigned_at = NOW(),
        status = 'in_review',
        updated_at = NOW()
    WHERE id = p_review_id;

    -- Update liaison workload
    UPDATE cultural_liaisons
    SET reviews_this_week = reviews_this_week + 1,
        last_assigned_at = NOW(),
        updated_at = NOW()
    WHERE id = v_liaison.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Queue an item for cultural review (called by triggers or agents)
CREATE OR REPLACE FUNCTION queue_cultural_review(
    p_item_type TEXT,
    p_item_id UUID,
    p_reason TEXT,
    p_keywords TEXT[] DEFAULT NULL,
    p_community TEXT DEFAULT NULL,
    p_sensitivity TEXT DEFAULT 'sensitive',
    p_content_preview TEXT DEFAULT NULL,
    p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
    v_existing UUID;
BEGIN
    -- Check for existing pending/in_review entry
    SELECT id INTO v_existing
    FROM cultural_review_queue
    WHERE item_type = p_item_type
    AND item_id = p_item_id
    AND status IN ('pending', 'in_review');

    IF v_existing IS NOT NULL THEN
        -- Already queued
        RETURN v_existing;
    END IF;

    -- Insert new queue entry
    INSERT INTO cultural_review_queue (
        item_type, item_id, item_title, review_reason,
        flagged_keywords, nation_community, sensitivity_level,
        content_preview, priority
    ) VALUES (
        p_item_type, p_item_id, p_title, p_reason,
        p_keywords, p_community, p_sensitivity,
        p_content_preview,
        CASE p_sensitivity
            WHEN 'sacred' THEN 'urgent'
            WHEN 'restricted' THEN 'high'
            ELSE 'normal'
        END
    )
    RETURNING id INTO v_queue_id;

    -- Try to auto-assign
    PERFORM auto_assign_review(v_queue_id);

    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Reset weekly review counts (should be called by cron job every Monday)
CREATE OR REPLACE FUNCTION reset_liaison_weekly_counts()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE cultural_liaisons
    SET reviews_this_week = 0,
        updated_at = NOW()
    WHERE reviews_this_week > 0;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger for queue
CREATE OR REPLACE FUNCTION update_crq_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crq_updated ON cultural_review_queue;
CREATE TRIGGER trigger_crq_updated
    BEFORE UPDATE ON cultural_review_queue
    FOR EACH ROW EXECUTE FUNCTION update_crq_timestamp();

-- Update timestamp trigger for liaisons
DROP TRIGGER IF EXISTS trigger_cl_updated ON cultural_liaisons;
CREATE TRIGGER trigger_cl_updated
    BEFORE UPDATE ON cultural_liaisons
    FOR EACH ROW EXECUTE FUNCTION update_crq_timestamp();

-- Auto-queue voice notes that need cultural review
CREATE OR REPLACE FUNCTION auto_queue_voice_note_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.requires_cultural_review = TRUE AND NEW.cultural_review_status = 'pending' THEN
        PERFORM queue_cultural_review(
            'voice_note',
            NEW.id,
            CASE
                WHEN NEW.mentions_elders THEN 'mentions_elder'
                ELSE 'cultural_keywords'
            END,
            NULL,  -- keywords extracted by check_cultural_content
            NULL,  -- community to be determined
            'sensitive',
            LEFT(NEW.transcript, 200),
            NEW.summary
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_queue_voice_review ON voice_notes;
CREATE TRIGGER trigger_auto_queue_voice_review
    AFTER INSERT OR UPDATE OF requires_cultural_review, cultural_review_status ON voice_notes
    FOR EACH ROW
    WHEN (NEW.requires_cultural_review = TRUE AND NEW.cultural_review_status = 'pending')
    EXECUTE FUNCTION auto_queue_voice_note_review();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Pending reviews dashboard
CREATE OR REPLACE VIEW v_pending_cultural_reviews AS
SELECT
    crq.id,
    crq.item_type,
    crq.item_id,
    crq.item_title,
    crq.nation_community,
    crq.sensitivity_level,
    crq.review_reason,
    crq.priority,
    crq.content_preview,
    crq.assigned_to,
    crq.assigned_at,
    crq.created_at,
    EXTRACT(DAY FROM NOW() - crq.created_at) as days_pending
FROM cultural_review_queue crq
WHERE crq.status IN ('pending', 'in_review')
ORDER BY
    CASE crq.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
    END,
    crq.created_at;

-- Review statistics
CREATE OR REPLACE VIEW v_cultural_review_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'in_review') as in_review_count,
    COUNT(*) FILTER (WHERE status = 'approved' AND reviewed_at >= NOW() - INTERVAL '7 days') as approved_this_week,
    COUNT(*) FILTER (WHERE status = 'flagged' AND reviewed_at >= NOW() - INTERVAL '7 days') as flagged_this_week,
    COUNT(*) FILTER (WHERE status = 'escalated') as escalated_count,
    AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) FILTER (WHERE reviewed_at IS NOT NULL) as avg_review_hours
FROM cultural_review_queue;

-- Liaison workload summary
CREATE OR REPLACE VIEW v_liaison_workload AS
SELECT
    cl.id,
    cl.name,
    cl.email,
    cl.communities,
    cl.reviews_this_week,
    cl.max_weekly_reviews,
    cl.max_weekly_reviews - cl.reviews_this_week as capacity_remaining,
    COUNT(crq.id) as active_reviews
FROM cultural_liaisons cl
LEFT JOIN cultural_review_queue crq ON crq.assigned_to = cl.email AND crq.status = 'in_review'
WHERE cl.is_active = TRUE
GROUP BY cl.id;

-- Items by community
CREATE OR REPLACE VIEW v_reviews_by_community AS
SELECT
    COALESCE(nation_community, 'Unknown') as community,
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'flagged') as flagged
FROM cultural_review_queue
GROUP BY nation_community
ORDER BY total_reviews DESC;

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

ALTER TABLE cultural_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_liaisons ENABLE ROW LEVEL SECURITY;

-- Queue - authenticated users can view, cultural liaisons can update their assigned items
CREATE POLICY crq_read_policy ON cultural_review_queue
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY crq_update_policy ON cultural_review_queue
    FOR UPDATE TO authenticated
    USING (
        assigned_to = current_user
        OR auth.jwt() ->> 'role' = 'admin'
        OR auth.jwt() ->> 'role' = 'cultural_liaison'
    );

-- Liaisons - read-only for most, admin can modify
CREATE POLICY cl_read_policy ON cultural_liaisons
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY cl_admin_policy ON cultural_liaisons
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE cultural_review_queue IS 'Queue for tracking items requiring cultural review before sharing or processing';
COMMENT ON TABLE cultural_liaisons IS 'Registry of approved cultural reviewers by community and region';
COMMENT ON COLUMN cultural_review_queue.item_type IS 'Type of item: voice_note, story, project_knowledge, communication';
COMMENT ON COLUMN cultural_review_queue.sensitivity_level IS 'Cultural sensitivity: standard, sensitive, sacred, restricted';
COMMENT ON COLUMN cultural_review_queue.status IS 'Review status: pending, in_review, approved, flagged, escalated, archived';
COMMENT ON FUNCTION find_cultural_liaison IS 'Find appropriate cultural liaison based on community, region, and capacity';
COMMENT ON FUNCTION queue_cultural_review IS 'Add an item to the cultural review queue with auto-assignment';
COMMENT ON FUNCTION auto_assign_review IS 'Automatically assign a review to an appropriate liaison';
