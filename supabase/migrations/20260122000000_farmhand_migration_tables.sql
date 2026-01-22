-- Farmhand Migration Tables
-- Purpose: Add tables from Farmhand to Main database for consolidation
-- Migration: ACT Farmhand (bhwyqqbovcjoefezgfnq) → Main (tednluwflfhxyucgwigh)
--
-- Created: 2026-01-22
-- Part of: Database Consolidation Project

-- =============================================================================
-- SYNC STATE TABLE
-- Tracks sync tokens for Gmail, Calendar, and other incremental syncs
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY,  -- e.g., 'google-gmail-sync', 'google-calendar-sync'
    sync_type TEXT NOT NULL,  -- 'gmail', 'calendar', 'ghl', etc.
    last_sync_token TEXT,  -- History ID, page token, etc.
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    next_page_token TEXT,  -- For paginated syncs
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    state JSONB DEFAULT '{}',  -- Additional sync state
    metadata JSONB DEFAULT '{}'  -- Push notification info, etc.
);

-- Index for type lookups
CREATE INDEX IF NOT EXISTS idx_sync_state_type ON sync_state(sync_type);

COMMENT ON TABLE sync_state IS 'Tracks incremental sync state for Gmail, Calendar, GHL, and other services';
COMMENT ON COLUMN sync_state.last_sync_token IS 'History ID for Gmail, sync token for Calendar, etc.';
COMMENT ON COLUMN sync_state.metadata IS 'Additional metadata like push notification expiration';

-- =============================================================================
-- LEARNED THRESHOLDS TABLE
-- Bayesian-updated thresholds for contact timing by segment
-- =============================================================================
CREATE TABLE IF NOT EXISTS learned_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment TEXT NOT NULL UNIQUE,  -- 'advocate', 'active_partner', 'prospect', etc.
    threshold_days INT NOT NULL DEFAULT 30,  -- Recommended days between contact
    confidence DECIMAL(5,4) DEFAULT 0.5,  -- 0.0000 to 1.0000
    sample_size INT DEFAULT 0,  -- Number of observations
    prior_alpha DECIMAL(10,2) DEFAULT 2,  -- Beta prior alpha
    prior_beta DECIMAL(10,2) DEFAULT 2,  -- Beta prior beta
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE learned_thresholds
    ADD COLUMN IF NOT EXISTS threshold_days INT DEFAULT 30,
    ADD COLUMN IF NOT EXISTS confidence DECIMAL(5,4) DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS sample_size INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prior_alpha DECIMAL(10,2) DEFAULT 2,
    ADD COLUMN IF NOT EXISTS prior_beta DECIMAL(10,2) DEFAULT 2,
    ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Remove duplicate segments before adding unique constraint
-- Keep the row with the highest sample_size for each segment
DELETE FROM learned_thresholds a
USING learned_thresholds b
WHERE a.segment = b.segment
  AND a.id < b.id;

-- Add unique constraint on segment if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'learned_thresholds_segment_key'
    ) THEN
        ALTER TABLE learned_thresholds ADD CONSTRAINT learned_thresholds_segment_key UNIQUE (segment);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists
    NULL;
END $$;

-- Seed with initial thresholds from Farmhand (only if empty)
INSERT INTO learned_thresholds (segment, threshold_days, confidence, sample_size)
SELECT * FROM (VALUES
    ('advocate', 14, 0.75::decimal, 50),
    ('active_partner', 21, 0.70::decimal, 40),
    ('warm_prospect', 28, 0.65::decimal, 30),
    ('cold_prospect', 45, 0.55::decimal, 20),
    ('dormant', 90, 0.50::decimal, 10),
    ('default', 30, 0.60::decimal, 100)
) AS v(segment, threshold_days, confidence, sample_size)
WHERE NOT EXISTS (SELECT 1 FROM learned_thresholds LIMIT 1)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE learned_thresholds IS 'Bayesian-learned contact frequency thresholds by relationship segment';
COMMENT ON COLUMN learned_thresholds.confidence IS 'Confidence in threshold (updated via Bayesian learning)';

-- =============================================================================
-- RECOMMENDATION OUTCOMES TABLE
-- Track AI recommendations and their outcomes for learning
-- =============================================================================
CREATE TABLE IF NOT EXISTS recommendation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_type TEXT NOT NULL,  -- 'followup', 'opportunity', 'task', 'contact_timing'
    entity_id TEXT NOT NULL,  -- ID of the contact, opportunity, or entity
    entity_type TEXT NOT NULL,  -- 'contact', 'opportunity', 'project'
    recommended_action TEXT NOT NULL,  -- The action recommended
    confidence_score DECIMAL(3,2),  -- 0.00 to 1.00
    recommended_at TIMESTAMPTZ DEFAULT NOW(),

    -- Outcome tracking
    acted_upon BOOLEAN,  -- Did user act on the recommendation?
    outcome TEXT,  -- 'success', 'partial', 'failure', 'skipped', 'pending'
    outcome_value DECIMAL(15,2),  -- Optional numeric value (revenue, score, etc.)
    outcome_date TIMESTAMPTZ,
    feedback_notes TEXT,  -- User feedback

    -- Context for learning
    context JSONB DEFAULT '{}',  -- Additional context at time of recommendation

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for learning queries
CREATE INDEX IF NOT EXISTS idx_recommendation_type ON recommendation_outcomes(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_entity ON recommendation_outcomes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_outcome ON recommendation_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_recommendation_date ON recommendation_outcomes(recommended_at DESC);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS trigger_recommendation_outcomes_updated ON recommendation_outcomes;
CREATE TRIGGER trigger_recommendation_outcomes_updated
    BEFORE UPDATE ON recommendation_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE recommendation_outcomes IS 'Tracks AI recommendations and outcomes for continuous learning';

-- =============================================================================
-- KNOWLEDGE CHUNKS TABLE
-- RAG knowledge base with 384-dim embeddings (all-MiniLM-L6-v2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    content TEXT NOT NULL,
    embedding VECTOR(384),  -- all-MiniLM-L6-v2 embeddings

    -- Source tracking
    source_type TEXT NOT NULL,  -- 'email', 'voice_note', 'document', 'project', 'decision'
    source_id TEXT,  -- ID in source system
    source_url TEXT,  -- URL if applicable

    -- Organization
    project_id TEXT,  -- Related project ID
    file_path TEXT,  -- For document sources
    chunk_index INT DEFAULT 0,  -- Position within source

    -- AI enrichment
    summary TEXT,  -- AI-generated summary
    topics TEXT[],  -- Extracted topics
    entities TEXT[],  -- Named entities

    -- Quality & confidence
    confidence FLOAT DEFAULT 0.8,  -- Confidence in chunk quality
    quality_score FLOAT,  -- Manual or computed quality score

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Deduplication
    content_hash TEXT,  -- Hash for dedup
    UNIQUE(source_type, source_id, chunk_index)
);

-- Add missing columns if table already exists
ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS topics TEXT[],
    ADD COLUMN IF NOT EXISTS entities TEXT[],
    ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.8,
    ADD COLUMN IF NOT EXISTS quality_score FLOAT,
    ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Vector index for semantic search (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_project ON knowledge_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_topics ON knowledge_chunks USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hash ON knowledge_chunks(content_hash);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS trigger_knowledge_chunks_updated ON knowledge_chunks;
CREATE TRIGGER trigger_knowledge_chunks_updated
    BEFORE UPDATE ON knowledge_chunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE knowledge_chunks IS 'RAG knowledge base with semantic search (384-dim all-MiniLM-L6-v2)';
COMMENT ON COLUMN knowledge_chunks.embedding IS '384-dimensional embedding from all-MiniLM-L6-v2 model';

-- =============================================================================
-- ADD FOLLOW-UP TRACKING TO COMMUNICATIONS_HISTORY
-- Fields from Farmhand's communication_history table
-- =============================================================================
ALTER TABLE communications_history
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_response BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMPTZ;

-- Index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_comms_needs_response ON communications_history(requires_response, response_received_at)
    WHERE requires_response = TRUE;

CREATE INDEX IF NOT EXISTS idx_comms_contact_email ON communications_history(contact_email);

COMMENT ON COLUMN communications_history.contact_email IS 'Email address for linking (allows retroactive contact matching)';
COMMENT ON COLUMN communications_history.requires_response IS 'Flag for follow-up tracking';

-- =============================================================================
-- ENTITIES TABLE (from Farmhand entity resolution)
-- Canonical "one person, one view" across all systems
-- =============================================================================
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    company TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_email ON entities(primary_email);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_entities_company ON entities(company);

COMMENT ON TABLE entities IS 'Canonical person records for entity resolution across systems';

-- =============================================================================
-- ENTITY MAPPINGS TABLE
-- Links entities to source systems (GHL, Calendar, Email, Notion)
-- =============================================================================
CREATE TABLE IF NOT EXISTS entity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL CHECK (source_system IN ('ghl', 'calendar', 'email', 'notion', 'gmail')),
    source_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_mappings_entity ON entity_mappings(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_mappings_source ON entity_mappings(source_system, source_id);

COMMENT ON TABLE entity_mappings IS 'Links canonical entities to source system IDs';

-- =============================================================================
-- CONTACT REVIEW DECISIONS (from Farmhand contact enrichment)
-- Review-first workflow for importing contacts to GHL
-- =============================================================================
CREATE TABLE IF NOT EXISTS contact_review_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    normalized_email TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
    name TEXT,
    domain TEXT,
    decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'approve', 'ignore')),
    suggested_tags TEXT[] DEFAULT '{}',
    approved_tags TEXT[] DEFAULT '{}',
    source_context JSONB DEFAULT '{}',  -- email subjects, dates, communication stats
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_review_email ON contact_review_decisions(normalized_email);
CREATE INDEX IF NOT EXISTS idx_contact_review_decision ON contact_review_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_contact_review_domain ON contact_review_decisions(domain);

COMMENT ON TABLE contact_review_decisions IS 'Review-first workflow for importing email contacts to GHL';

-- =============================================================================
-- PENDING CONTACTS TABLE
-- Contacts discovered from communications awaiting GHL creation
-- =============================================================================
CREATE TABLE IF NOT EXISTS pending_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contact info (extracted)
    email TEXT UNIQUE NOT NULL,
    name TEXT,  -- Extracted from email signature or header
    company TEXT,  -- Extracted from domain or signature
    title TEXT,  -- Job title if found

    -- Discovery context
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    communication_count INT DEFAULT 1,

    -- AI analysis
    topics TEXT[],  -- Topics discussed
    importance_score DECIMAL(3,2) DEFAULT 0.5,  -- 0.00 to 1.00
    suggested_tags TEXT[],  -- Suggested GHL tags

    -- Status
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'created'
    reviewed_by UUID REFERENCES user_identities(id),
    reviewed_at TIMESTAMPTZ,
    ghl_contact_id TEXT REFERENCES ghl_contacts(ghl_id),  -- After creation
    rejection_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_contacts_status ON pending_contacts(status);
CREATE INDEX IF NOT EXISTS idx_pending_contacts_importance ON pending_contacts(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_pending_contacts_email ON pending_contacts(email);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS trigger_pending_contacts_updated ON pending_contacts;
CREATE TRIGGER trigger_pending_contacts_updated
    BEFORE UPDATE ON pending_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE pending_contacts IS 'Contacts discovered from emails awaiting review for GHL creation';

-- =============================================================================
-- SEMANTIC SEARCH FUNCTION
-- Search knowledge chunks using vector similarity
-- =============================================================================
CREATE OR REPLACE FUNCTION search_knowledge(
    query_embedding vector(384),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_source_type TEXT DEFAULT NULL,
    filter_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    topics TEXT[],
    source_type TEXT,
    source_id TEXT,
    project_id TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.summary,
        kc.topics,
        kc.source_type,
        kc.source_id,
        kc.project_id,
        1 - (kc.embedding <=> query_embedding) as similarity
    FROM knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
    AND (filter_project_id IS NULL OR kc.project_id = filter_project_id)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_knowledge IS 'Semantic search over knowledge chunks using vector similarity';

-- =============================================================================
-- VIEW: PENDING CONTACTS WITH CONTEXT
-- =============================================================================
CREATE OR REPLACE VIEW v_pending_contacts_review AS
SELECT
    pc.*,
    (SELECT COUNT(*) FROM communications_history ch
     WHERE ch.source_system = 'gmail'
     AND (ch.content_preview ILIKE '%' || pc.email || '%'
          OR ch.subject ILIKE '%' || pc.email || '%')) as recent_email_count,
    (SELECT MAX(occurred_at) FROM communications_history ch
     WHERE ch.source_system = 'gmail'
     AND (ch.content_preview ILIKE '%' || pc.email || '%'
          OR ch.subject ILIKE '%' || pc.email || '%')) as last_communication_at
FROM pending_contacts pc
WHERE pc.status = 'pending'
ORDER BY pc.importance_score DESC, pc.communication_count DESC;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_contacts ENABLE ROW LEVEL SECURITY;

-- Team access policies (all authenticated users)
CREATE POLICY sync_state_team ON sync_state FOR ALL TO authenticated USING (TRUE);
CREATE POLICY learned_thresholds_team ON learned_thresholds FOR ALL TO authenticated USING (TRUE);
CREATE POLICY recommendation_outcomes_team ON recommendation_outcomes FOR ALL TO authenticated USING (TRUE);
CREATE POLICY knowledge_chunks_team ON knowledge_chunks FOR ALL TO authenticated USING (TRUE);
CREATE POLICY pending_contacts_team ON pending_contacts FOR ALL TO authenticated USING (TRUE);

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Tables created:
--   - sync_state: Incremental sync tracking (Gmail, Calendar, etc.)
--   - learned_thresholds: Bayesian contact timing thresholds
--   - recommendation_outcomes: AI recommendation tracking
--   - knowledge_chunks: RAG knowledge base (384-dim embeddings)
--   - pending_contacts: Contacts awaiting GHL creation
--
-- Functions created:
--   - search_knowledge: Semantic search over knowledge chunks
--
-- Views created:
--   - v_pending_contacts_review: Pending contacts with email context
