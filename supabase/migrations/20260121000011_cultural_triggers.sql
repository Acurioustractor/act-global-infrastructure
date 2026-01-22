-- Cultural Data Protection Triggers
-- Purpose: Enforce cultural protocols at database level
-- Layer 7: Governance & Safety
--
-- Created: 2026-01-21
-- Part of: 9 Layers of Agentic Infrastructure
--
-- NOTE: This migration extends the existing cultural_protocols table from ghl_sync_schema

-- =============================================================================
-- EXTEND CULTURAL PROTOCOLS TABLE
-- Add new columns to existing table for entity-level protection
-- =============================================================================

-- Add entity tracking columns
ALTER TABLE cultural_protocols
    ADD COLUMN IF NOT EXISTS entity_type TEXT,
    ADD COLUMN IF NOT EXISTS entity_id TEXT,
    ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS permitted_uses TEXT[] DEFAULT ARRAY['internal'],
    ADD COLUMN IF NOT EXISTS restrictions TEXT[],
    ADD COLUMN IF NOT EXISTS requires_attribution BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS attribution_text TEXT,
    ADD COLUMN IF NOT EXISTS consent_given_by TEXT,
    ADD COLUMN IF NOT EXISTS consent_date DATE,
    ADD COLUMN IF NOT EXISTS consent_expires DATE,
    ADD COLUMN IF NOT EXISTS consent_notes TEXT,
    ADD COLUMN IF NOT EXISTS cultural_liaison_id TEXT,
    ADD COLUMN IF NOT EXISTS community_of_origin TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT;

-- =============================================================================
-- SYNC QUEUE TABLE
-- Queue for syncing data to external systems
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What to sync
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_system TEXT NOT NULL,         -- 'ghl', 'notion', 'external_api'

    -- Sync details
    operation TEXT NOT NULL,             -- 'create', 'update', 'delete'
    payload JSONB,

    -- Cultural check
    cultural_check_passed BOOLEAN DEFAULT FALSE,
    cultural_protocol_id UUID REFERENCES cultural_protocols(id),

    -- Status
    status TEXT DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'failed', 'blocked'
    error_message TEXT,
    retry_count INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =============================================================================
-- CULTURAL PROTECTION FUNCTIONS
-- =============================================================================

-- Check if an entity has cultural restrictions
CREATE OR REPLACE FUNCTION check_cultural_restrictions(
    p_entity_type TEXT,
    p_entity_id TEXT
)
RETURNS TABLE (
    has_restrictions BOOLEAN,
    sensitivity_level TEXT,
    permitted_uses TEXT[],
    restrictions TEXT[],
    requires_attribution BOOLEAN,
    cultural_liaison_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TRUE as has_restrictions,
        cp.sensitivity_level,
        cp.permitted_uses,
        cp.restrictions,
        cp.requires_attribution,
        cp.cultural_liaison_id
    FROM cultural_protocols cp
    WHERE cp.entity_type = p_entity_type
      AND (cp.entity_id = p_entity_id OR cp.entity_id IS NULL)
      AND (cp.consent_expires IS NULL OR cp.consent_expires > CURRENT_DATE)
    ORDER BY
        CASE WHEN cp.entity_id IS NOT NULL THEN 0 ELSE 1 END,  -- Specific rules first
        cp.sensitivity_level DESC
    LIMIT 1;

    -- If no restrictions found, return default
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            FALSE as has_restrictions,
            'standard'::TEXT as sensitivity_level,
            ARRAY['internal', 'external']::TEXT[] as permitted_uses,
            NULL::TEXT[] as restrictions,
            FALSE as requires_attribution,
            NULL::TEXT as cultural_liaison_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Prevent syncing culturally restricted data to external systems
CREATE OR REPLACE FUNCTION prevent_cultural_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_restrictions RECORD;
BEGIN
    -- Check cultural restrictions for the source entity
    SELECT * INTO v_restrictions
    FROM check_cultural_restrictions(NEW.source_table, NEW.source_id);

    -- If target is external and data is restricted
    IF NEW.target_system != 'internal' THEN
        -- Check if 'external' is NOT in permitted uses
        IF v_restrictions.has_restrictions
           AND NOT ('external' = ANY(v_restrictions.permitted_uses)) THEN

            -- Log the blocked attempt (if audit table exists)
            BEGIN
                INSERT INTO agent_audit_log (
                    agent_id, action, target_table, target_id,
                    success, error_message, cultural_data_accessed, cultural_review_required
                ) VALUES (
                    'sync-queue', 'sync_blocked', NEW.source_table, NEW.source_id,
                    FALSE, 'Blocked by cultural protocol: external sync not permitted',
                    TRUE, TRUE
                );
            EXCEPTION WHEN undefined_table THEN
                -- agent_audit_log doesn't exist yet, skip logging
                NULL;
            END;

            -- Either block or mark for review based on sensitivity
            IF v_restrictions.sensitivity_level IN ('sacred', 'restricted') THEN
                RAISE EXCEPTION 'Cannot sync culturally protected data (%) to external system. Contact cultural liaison: %',
                    v_restrictions.sensitivity_level, v_restrictions.cultural_liaison_id;
            ELSE
                -- For sensitive data, mark for review instead of blocking
                NEW.status := 'blocked';
                NEW.cultural_check_passed := FALSE;
                NEW.error_message := 'Requires cultural review before external sync';
            END IF;
        ELSE
            NEW.cultural_check_passed := TRUE;
        END IF;
    ELSE
        NEW.cultural_check_passed := TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sync_queue
DROP TRIGGER IF EXISTS trigger_cultural_sync_guard ON sync_queue;
CREATE TRIGGER trigger_cultural_sync_guard
    BEFORE INSERT OR UPDATE ON sync_queue
    FOR EACH ROW
    EXECUTE FUNCTION prevent_cultural_sync();

-- =============================================================================
-- VOICE NOTES CULTURAL TRIGGER (extends existing)
-- =============================================================================

-- Enhanced cultural keyword detection for First Nations content
CREATE OR REPLACE FUNCTION detect_cultural_content()
RETURNS TRIGGER AS $$
DECLARE
    -- Expanded keyword list for Australian First Nations context
    sacred_keywords TEXT[] := ARRAY[
        'sacred', 'ceremony', 'dreaming', 'songline', 'initiation',
        'men''s business', 'women''s business', 'secret', 'restricted'
    ];
    elder_keywords TEXT[] := ARRAY[
        'elder', 'aunty', 'auntie', 'uncle', 'traditional owner',
        'custodian', 'knowledge keeper', 'lawman', 'lawwoman'
    ];
    cultural_keywords TEXT[] := ARRAY[
        'first nations', 'aboriginal', 'indigenous', 'torres strait',
        'country', 'on country', 'welcome to country', 'acknowledgement',
        'traditional lands', 'sovereignty', 'treaty', 'land rights'
    ];
    keyword TEXT;
    transcript_lower TEXT;
BEGIN
    -- Only check if there's content to check
    IF NEW.transcript IS NULL THEN
        RETURN NEW;
    END IF;

    transcript_lower := LOWER(NEW.transcript);

    -- Check for sacred content (highest restriction)
    FOREACH keyword IN ARRAY sacred_keywords LOOP
        IF transcript_lower LIKE '%' || keyword || '%' THEN
            NEW.requires_cultural_review := TRUE;
            NEW.cultural_review_status := 'pending';
            NEW.mentions_elders := TRUE;

            -- Create cultural protocol entry
            INSERT INTO cultural_protocols (
                entity_type, entity_id, sensitivity_level,
                permitted_uses, restrictions
            ) VALUES (
                'voice_note', NEW.id::TEXT, 'sacred',
                ARRAY['internal'], ARRAY['no_external_sharing', 'elder_review_required']
            ) ON CONFLICT DO NOTHING;

            RETURN NEW;
        END IF;
    END LOOP;

    -- Check for elder mentions
    FOREACH keyword IN ARRAY elder_keywords LOOP
        IF transcript_lower LIKE '%' || keyword || '%' THEN
            NEW.mentions_elders := TRUE;
            NEW.requires_cultural_review := TRUE;
            NEW.cultural_review_status := 'pending';
            RETURN NEW;
        END IF;
    END LOOP;

    -- Check for general cultural content
    FOREACH keyword IN ARRAY cultural_keywords LOOP
        IF transcript_lower LIKE '%' || keyword || '%' THEN
            -- Flag but don't require review for general cultural mentions
            NEW.requires_cultural_review := FALSE;
            -- Could add metadata for cultural context tracking
            RETURN NEW;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_cultural_entity ON cultural_protocols(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cultural_sensitivity ON cultural_protocols(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_cultural ON sync_queue(cultural_check_passed) WHERE cultural_check_passed = FALSE;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Pending cultural reviews
CREATE OR REPLACE VIEW v_pending_cultural_reviews AS
SELECT
    sq.id as sync_id,
    sq.source_table,
    sq.source_id,
    sq.target_system,
    sq.created_at,
    cp.sensitivity_level,
    cp.cultural_liaison_id,
    cp.community_of_origin
FROM sync_queue sq
LEFT JOIN cultural_protocols cp ON cp.entity_type = sq.source_table AND cp.entity_id = sq.source_id
WHERE sq.status = 'blocked'
  AND sq.cultural_check_passed = FALSE
ORDER BY sq.created_at;

-- Cultural data summary
CREATE OR REPLACE VIEW v_cultural_data_summary AS
SELECT
    entity_type,
    sensitivity_level,
    COUNT(*) as item_count,
    COUNT(DISTINCT community_of_origin) as communities
FROM cultural_protocols
WHERE entity_type IS NOT NULL
GROUP BY entity_type, sensitivity_level
ORDER BY entity_type, sensitivity_level;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN cultural_protocols.entity_type IS 'Type of entity this protocol applies to: contact, story, voice_note, project';
COMMENT ON COLUMN cultural_protocols.sensitivity_level IS 'Sensitivity level: standard, sensitive, sacred, restricted';
COMMENT ON TABLE sync_queue IS 'Queue for syncing data to external systems with cultural checks';
COMMENT ON FUNCTION check_cultural_restrictions IS 'Check if an entity has cultural restrictions before accessing/syncing';
COMMENT ON FUNCTION prevent_cultural_sync IS 'Trigger function to block syncing culturally restricted data';
COMMENT ON FUNCTION detect_cultural_content IS 'Enhanced detection of cultural content in text (voice notes, etc.)';
