-- Unified Entities Schema
-- Purpose: Entity resolution and deduplication across data sources
-- Layer 3: Preparation & Transformation
--
-- Created: 2026-01-21
-- Part of: 9 Layers of Agentic Infrastructure

-- =============================================================================
-- CANONICAL ENTITIES TABLE
-- Master records for deduplicated entities
-- =============================================================================
CREATE TABLE IF NOT EXISTS canonical_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity classification
    entity_type TEXT NOT NULL,           -- 'person', 'organization', 'project', 'place'

    -- Canonical data (the "truth")
    canonical_name TEXT NOT NULL,
    canonical_email TEXT,
    canonical_phone TEXT,
    canonical_company TEXT,

    -- Merge metadata
    merged_from UUID[] DEFAULT ARRAY[]::UUID[],  -- IDs of source records that were merged
    merge_count INT DEFAULT 1,
    last_merge_at TIMESTAMPTZ,

    -- Quality indicators
    confidence DECIMAL(3,2) DEFAULT 1.00,        -- 0.00 to 1.00
    data_completeness DECIMAL(3,2),              -- % of fields populated
    verification_status TEXT DEFAULT 'unverified',  -- 'unverified', 'verified', 'disputed'

    -- Enrichment
    enrichment_data JSONB DEFAULT '{}'::jsonb,   -- Additional data from enrichment services
    enriched_at TIMESTAMPTZ,

    -- First Nations / Cultural context
    cultural_affiliation TEXT,
    community_connections TEXT[],

    -- ACT-specific
    relationship_strength TEXT,          -- 'core', 'active', 'occasional', 'dormant'
    primary_project_codes TEXT[],        -- LCAA codes this entity relates to

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ENTITY IDENTIFIERS TABLE
-- All known identifiers for an entity (emails, phones, IDs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS entity_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to canonical entity
    entity_id UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE,

    -- Identifier details
    identifier_type TEXT NOT NULL,       -- 'email', 'phone', 'ghl_id', 'notion_id', 'linkedin', 'twitter'
    identifier_value TEXT NOT NULL,
    normalized_value TEXT,               -- Normalized for matching (lowercase email, E.164 phone)

    -- Source tracking
    source TEXT NOT NULL,                -- 'ghl', 'notion', 'email', 'manual', 'linkedin'
    source_record_id TEXT,               -- ID in the source system
    source_confidence DECIMAL(3,2) DEFAULT 1.00,

    -- Validity
    is_primary BOOLEAN DEFAULT FALSE,    -- Primary identifier of this type
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(identifier_type, normalized_value)
);

-- =============================================================================
-- ENTITY MERGE LOG TABLE
-- Track merge decisions for audit and undo
-- =============================================================================
CREATE TABLE IF NOT EXISTS entity_merge_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was merged
    surviving_entity_id UUID NOT NULL REFERENCES canonical_entities(id),
    merged_entity_id UUID NOT NULL,      -- Can't FK since it's deleted
    merged_entity_snapshot JSONB NOT NULL,  -- Full copy before merge

    -- Merge details
    merge_reason TEXT,                   -- 'email_match', 'phone_match', 'fuzzy_name', 'manual'
    match_confidence DECIMAL(3,2),
    match_details JSONB,                 -- What matched: {email: x, phone: y, name_similarity: 0.95}

    -- Attribution
    merged_by TEXT,                      -- 'auto', 'manual:ben', etc.
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,

    -- For potential undo
    can_unmerge BOOLEAN DEFAULT TRUE,
    unmerged BOOLEAN DEFAULT FALSE,
    unmerged_at TIMESTAMPTZ,

    -- Timestamp
    merged_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- POTENTIAL MATCHES TABLE
-- Candidates for merge that need review
-- =============================================================================
CREATE TABLE IF NOT EXISTS entity_potential_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The two entities that might be duplicates
    entity_a_id UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE,
    entity_b_id UUID NOT NULL REFERENCES canonical_entities(id) ON DELETE CASCADE,

    -- Match analysis
    match_score DECIMAL(3,2) NOT NULL,   -- 0.00 to 1.00
    match_reasons JSONB NOT NULL,        -- {email_domain: 0.3, fuzzy_name: 0.7, same_company: 0.5}

    -- Status
    status TEXT DEFAULT 'pending',       -- 'pending', 'approved', 'rejected', 'merged'
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Timestamp
    detected_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate pairs
    UNIQUE(entity_a_id, entity_b_id),
    CHECK(entity_a_id < entity_b_id)     -- Ensure consistent ordering
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Normalize phone number to E.164 format (Australian focus)
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF phone IS NULL THEN RETURN NULL; END IF;

    -- Remove all non-digits
    cleaned := regexp_replace(phone, '[^0-9]', '', 'g');

    -- Handle Australian numbers
    IF cleaned LIKE '0%' AND LENGTH(cleaned) = 10 THEN
        -- Convert 04xx to +614xx
        cleaned := '+61' || SUBSTRING(cleaned FROM 2);
    ELSIF cleaned LIKE '61%' AND LENGTH(cleaned) = 11 THEN
        cleaned := '+' || cleaned;
    ELSIF LENGTH(cleaned) = 9 AND cleaned LIKE '4%' THEN
        -- Just mobile without leading 0
        cleaned := '+61' || cleaned;
    END IF;

    RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normalize email (lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
    IF email IS NULL THEN RETURN NULL; END IF;
    RETURN LOWER(TRIM(email));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate name similarity (Levenshtein-based)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

CREATE OR REPLACE FUNCTION name_similarity(name1 TEXT, name2 TEXT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    n1 TEXT;
    n2 TEXT;
    max_len INT;
    distance INT;
BEGIN
    IF name1 IS NULL OR name2 IS NULL THEN RETURN 0; END IF;

    n1 := LOWER(TRIM(name1));
    n2 := LOWER(TRIM(name2));

    IF n1 = n2 THEN RETURN 1.00; END IF;

    max_len := GREATEST(LENGTH(n1), LENGTH(n2));
    IF max_len = 0 THEN RETURN 0; END IF;

    distance := levenshtein(n1, n2);
    RETURN GREATEST(0, 1.0 - (distance::DECIMAL / max_len))::DECIMAL(3,2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find or create canonical entity from source record
CREATE OR REPLACE FUNCTION resolve_entity(
    p_source TEXT,
    p_source_id TEXT,
    p_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_company TEXT DEFAULT NULL,
    p_entity_type TEXT DEFAULT 'person'
)
RETURNS UUID AS $$
DECLARE
    v_entity_id UUID;
    v_normalized_email TEXT;
    v_normalized_phone TEXT;
    v_existing_entity_id UUID;
BEGIN
    v_normalized_email := normalize_email(p_email);
    v_normalized_phone := normalize_phone(p_phone);

    -- 1. Check if source record already linked
    SELECT entity_id INTO v_existing_entity_id
    FROM entity_identifiers
    WHERE source = p_source AND source_record_id = p_source_id
    LIMIT 1;

    IF v_existing_entity_id IS NOT NULL THEN
        RETURN v_existing_entity_id;
    END IF;

    -- 2. Try to find existing entity by email
    IF v_normalized_email IS NOT NULL THEN
        SELECT entity_id INTO v_existing_entity_id
        FROM entity_identifiers
        WHERE identifier_type = 'email' AND normalized_value = v_normalized_email
        LIMIT 1;

        IF v_existing_entity_id IS NOT NULL THEN
            -- Add source ID to existing entity
            INSERT INTO entity_identifiers (entity_id, identifier_type, identifier_value, normalized_value, source, source_record_id)
            VALUES (v_existing_entity_id, p_source || '_id', p_source_id, p_source_id, p_source, p_source_id)
            ON CONFLICT DO NOTHING;
            RETURN v_existing_entity_id;
        END IF;
    END IF;

    -- 3. Try to find by phone
    IF v_normalized_phone IS NOT NULL THEN
        SELECT entity_id INTO v_existing_entity_id
        FROM entity_identifiers
        WHERE identifier_type = 'phone' AND normalized_value = v_normalized_phone
        LIMIT 1;

        IF v_existing_entity_id IS NOT NULL THEN
            -- Add source ID and email to existing entity
            INSERT INTO entity_identifiers (entity_id, identifier_type, identifier_value, normalized_value, source, source_record_id)
            VALUES (v_existing_entity_id, p_source || '_id', p_source_id, p_source_id, p_source, p_source_id)
            ON CONFLICT DO NOTHING;

            IF v_normalized_email IS NOT NULL THEN
                INSERT INTO entity_identifiers (entity_id, identifier_type, identifier_value, normalized_value, source, source_record_id)
                VALUES (v_existing_entity_id, 'email', p_email, v_normalized_email, p_source, p_source_id)
                ON CONFLICT DO NOTHING;
            END IF;

            RETURN v_existing_entity_id;
        END IF;
    END IF;

    -- 4. Create new canonical entity
    INSERT INTO canonical_entities (entity_type, canonical_name, canonical_email, canonical_phone, canonical_company)
    VALUES (p_entity_type, p_name, v_normalized_email, v_normalized_phone, p_company)
    RETURNING id INTO v_entity_id;

    -- Add identifiers
    INSERT INTO entity_identifiers (entity_id, identifier_type, identifier_value, normalized_value, source, source_record_id)
    VALUES (v_entity_id, p_source || '_id', p_source_id, p_source_id, p_source, p_source_id);

    IF v_normalized_email IS NOT NULL THEN
        INSERT INTO entity_identifiers (entity_id, identifier_type, identifier_value, normalized_value, source, source_record_id, is_primary)
        VALUES (v_entity_id, 'email', p_email, v_normalized_email, p_source, p_source_id, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_normalized_phone IS NOT NULL THEN
        INSERT INTO entity_identifiers (entity_id, identifier_type, identifier_value, normalized_value, source, source_record_id, is_primary)
        VALUES (v_entity_id, 'phone', p_phone, v_normalized_phone, p_source, p_source_id, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_entity_id;
END;
$$ LANGUAGE plpgsql;

-- Find potential duplicates for an entity
CREATE OR REPLACE FUNCTION find_potential_duplicates(
    p_entity_id UUID,
    p_threshold DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    candidate_id UUID,
    match_score DECIMAL(3,2),
    match_reasons JSONB
) AS $$
DECLARE
    v_entity RECORD;
    v_email_domain TEXT;
BEGIN
    SELECT * INTO v_entity FROM canonical_entities WHERE id = p_entity_id;

    IF v_entity IS NULL THEN RETURN; END IF;

    -- Extract email domain for partial matching
    IF v_entity.canonical_email IS NOT NULL THEN
        v_email_domain := SPLIT_PART(v_entity.canonical_email, '@', 2);
    END IF;

    RETURN QUERY
    WITH scores AS (
        SELECT
            ce.id as candidate_id,
            -- Name similarity
            name_similarity(v_entity.canonical_name, ce.canonical_name) as name_score,
            -- Email domain match
            CASE
                WHEN v_email_domain IS NOT NULL
                     AND ce.canonical_email LIKE '%@' || v_email_domain
                THEN 0.3
                ELSE 0
            END as email_domain_score,
            -- Same company
            CASE
                WHEN v_entity.canonical_company IS NOT NULL
                     AND LOWER(ce.canonical_company) = LOWER(v_entity.canonical_company)
                THEN 0.4
                ELSE 0
            END as company_score
        FROM canonical_entities ce
        WHERE ce.id != p_entity_id
          AND ce.entity_type = v_entity.entity_type
    )
    SELECT
        s.candidate_id,
        (s.name_score * 0.5 + s.email_domain_score + s.company_score)::DECIMAL(3,2) as match_score,
        jsonb_build_object(
            'name_similarity', s.name_score,
            'email_domain', s.email_domain_score,
            'same_company', s.company_score
        ) as match_reasons
    FROM scores s
    WHERE (s.name_score * 0.5 + s.email_domain_score + s.company_score) >= p_threshold
    ORDER BY match_score DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_canonical_entity_type ON canonical_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_canonical_name ON canonical_entities(canonical_name);
CREATE INDEX IF NOT EXISTS idx_canonical_email ON canonical_entities(canonical_email);
CREATE INDEX IF NOT EXISTS idx_canonical_phone ON canonical_entities(canonical_phone);
CREATE INDEX IF NOT EXISTS idx_canonical_company ON canonical_entities(canonical_company);
CREATE INDEX IF NOT EXISTS idx_canonical_confidence ON canonical_entities(confidence);

CREATE INDEX IF NOT EXISTS idx_identifier_entity ON entity_identifiers(entity_id);
CREATE INDEX IF NOT EXISTS idx_identifier_type_value ON entity_identifiers(identifier_type, normalized_value);
CREATE INDEX IF NOT EXISTS idx_identifier_source ON entity_identifiers(source, source_record_id);

CREATE INDEX IF NOT EXISTS idx_merge_log_surviving ON entity_merge_log(surviving_entity_id);
CREATE INDEX IF NOT EXISTS idx_merge_log_merged ON entity_merge_log(merged_entity_id);

CREATE INDEX IF NOT EXISTS idx_potential_matches_status ON entity_potential_matches(status);
CREATE INDEX IF NOT EXISTS idx_potential_matches_score ON entity_potential_matches(match_score DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Unified view of all contacts with their sources
CREATE OR REPLACE VIEW v_unified_contacts AS
SELECT
    ce.id,
    ce.canonical_name as name,
    ce.canonical_email as email,
    ce.canonical_phone as phone,
    ce.canonical_company as company,
    ce.confidence,
    ce.relationship_strength,
    ce.primary_project_codes,
    -- Aggregate sources
    ARRAY_AGG(DISTINCT ei.source) as sources,
    -- Get specific IDs per source
    MAX(CASE WHEN ei.source = 'ghl' THEN ei.source_record_id END) as ghl_id,
    MAX(CASE WHEN ei.source = 'notion' THEN ei.source_record_id END) as notion_id,
    -- Count of identifiers
    COUNT(DISTINCT ei.id) as identifier_count,
    ce.created_at,
    ce.updated_at
FROM canonical_entities ce
LEFT JOIN entity_identifiers ei ON ei.entity_id = ce.id
WHERE ce.entity_type = 'person'
GROUP BY ce.id;

-- Duplicate candidates needing review
CREATE OR REPLACE VIEW v_duplicate_review_queue AS
SELECT
    pm.id as match_id,
    pm.match_score,
    pm.match_reasons,
    pm.detected_at,
    -- Entity A details
    a.id as entity_a_id,
    a.canonical_name as name_a,
    a.canonical_email as email_a,
    a.canonical_company as company_a,
    -- Entity B details
    b.id as entity_b_id,
    b.canonical_name as name_b,
    b.canonical_email as email_b,
    b.canonical_company as company_b
FROM entity_potential_matches pm
JOIN canonical_entities a ON pm.entity_a_id = a.id
JOIN canonical_entities b ON pm.entity_b_id = b.id
WHERE pm.status = 'pending'
ORDER BY pm.match_score DESC;

-- Entity resolution statistics
CREATE OR REPLACE VIEW v_entity_resolution_stats AS
SELECT
    entity_type,
    COUNT(*) as total_entities,
    AVG(merge_count)::DECIMAL(4,1) as avg_merges,
    AVG(confidence)::DECIMAL(3,2) as avg_confidence,
    COUNT(*) FILTER (WHERE merge_count > 1) as merged_entities,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_entities
FROM canonical_entities
GROUP BY entity_type;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE TRIGGER trigger_canonical_entities_updated
    BEFORE UPDATE ON canonical_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE canonical_entities IS 'Master entity records after deduplication and merging';
COMMENT ON TABLE entity_identifiers IS 'All known identifiers (emails, phones, IDs) for each entity';
COMMENT ON TABLE entity_merge_log IS 'Audit log of entity merge decisions with undo capability';
COMMENT ON TABLE entity_potential_matches IS 'Candidate duplicates detected by matching algorithms';
COMMENT ON FUNCTION resolve_entity IS 'Find or create canonical entity from a source record';
COMMENT ON FUNCTION find_potential_duplicates IS 'Find entities that may be duplicates based on similarity';
COMMENT ON FUNCTION name_similarity IS 'Calculate similarity between two names (0.0 to 1.0)';
