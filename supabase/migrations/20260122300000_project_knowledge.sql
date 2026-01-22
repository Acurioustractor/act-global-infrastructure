-- Project Knowledge Table
-- Purpose: Unified catch-all for all project-related knowledge, reflections, links, and context
--
-- This is the "everything bucket" for project intelligence.
-- Captures: voice notes, quick reflections, meeting links, document refs, decisions, events
--
-- Created: 2026-01-22

-- =============================================================================
-- ENABLE EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- PROJECT KNOWLEDGE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project linkage (required)
    project_code TEXT NOT NULL,  -- 'ACT-HV' for Harvest, 'ACT-JH' for JusticeHub, etc.
    project_name TEXT,  -- Denormalized for display

    -- Knowledge type
    knowledge_type TEXT NOT NULL,  -- See types below
    -- Types:
    --   'reflection'     - Quick thought or insight
    --   'decision'       - Decision made
    --   'meeting'        - Meeting notes/transcript link
    --   'voice_note'     - Link to voice_notes table
    --   'document'       - Strategy doc, contract, plan
    --   'event'          - Something that happened
    --   'question'       - Open question to resolve
    --   'link'           - External resource
    --   'communication'  - Key email/message
    --   'milestone'      - Achievement or deadline

    -- Content
    title TEXT,  -- Short title/headline
    content TEXT,  -- Main content (reflection text, summary, notes)

    -- Source linking (optional - link to original if applicable)
    source_type TEXT,  -- 'notion', 'voice_note', 'file', 'url', 'manual'
    source_ref TEXT,   -- Notion page ID, voice_note UUID, file path, URL
    source_url TEXT,   -- Direct URL if applicable

    -- For voice_note type, link to voice_notes table
    voice_note_id UUID REFERENCES voice_notes(id),

    -- For communication type, link to communications_history
    communication_id UUID REFERENCES communications_history(id),

    -- Metadata
    recorded_by TEXT DEFAULT 'ben',  -- Who captured this
    recorded_at TIMESTAMPTZ DEFAULT NOW(),  -- When it happened (may differ from created_at)

    -- People involved
    participants TEXT[],  -- Names of people involved
    contact_ids TEXT[],   -- GHL contact IDs if linked

    -- AI enrichment
    summary TEXT,  -- AI-generated summary if content is long
    topics TEXT[],  -- Topic tags for filtering
    sentiment TEXT,  -- 'positive', 'neutral', 'negative', 'uncertain'
    importance TEXT DEFAULT 'normal',  -- 'critical', 'high', 'normal', 'low'

    -- Action tracking
    action_required BOOLEAN DEFAULT FALSE,
    action_items JSONB,  -- [{text, assigned_to, due_date, completed}]
    follow_up_date DATE,

    -- Decision tracking (for knowledge_type = 'decision')
    decision_status TEXT,  -- 'proposed', 'decided', 'implemented', 'revisited'
    decision_rationale TEXT,

    -- Semantic search
    embedding vector(384),  -- For semantic search across all knowledge

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Core lookups
CREATE INDEX IF NOT EXISTS idx_pk_project ON project_knowledge(project_code);
CREATE INDEX IF NOT EXISTS idx_pk_type ON project_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_pk_recorded_at ON project_knowledge(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pk_importance ON project_knowledge(importance);

-- Filtering
CREATE INDEX IF NOT EXISTS idx_pk_topics ON project_knowledge USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_pk_participants ON project_knowledge USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_pk_action_required ON project_knowledge(action_required) WHERE action_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_pk_follow_up ON project_knowledge(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Source linking
CREATE INDEX IF NOT EXISTS idx_pk_source ON project_knowledge(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_pk_voice_note ON project_knowledge(voice_note_id) WHERE voice_note_id IS NOT NULL;

-- Vector search
CREATE INDEX IF NOT EXISTS idx_pk_embedding ON project_knowledge
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Semantic search across project knowledge
CREATE OR REPLACE FUNCTION search_project_knowledge(
    query_embedding vector(384),
    p_project_code TEXT DEFAULT NULL,
    p_knowledge_types TEXT[] DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    project_code TEXT,
    knowledge_type TEXT,
    title TEXT,
    content TEXT,
    recorded_at TIMESTAMPTZ,
    topics TEXT[],
    importance TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pk.id,
        pk.project_code,
        pk.knowledge_type,
        pk.title,
        pk.content,
        pk.recorded_at,
        pk.topics,
        pk.importance,
        1 - (pk.embedding <=> query_embedding) as similarity
    FROM project_knowledge pk
    WHERE pk.embedding IS NOT NULL
    AND 1 - (pk.embedding <=> query_embedding) > match_threshold
    AND (p_project_code IS NULL OR pk.project_code = p_project_code)
    AND (p_knowledge_types IS NULL OR pk.knowledge_type = ANY(p_knowledge_types))
    ORDER BY pk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Get project timeline (all knowledge for a project, chronological)
CREATE OR REPLACE FUNCTION get_project_timeline(
    p_project_code TEXT,
    p_limit INT DEFAULT 50,
    p_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    knowledge_type TEXT,
    title TEXT,
    content TEXT,
    summary TEXT,
    recorded_at TIMESTAMPTZ,
    participants TEXT[],
    importance TEXT,
    action_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pk.id,
        pk.knowledge_type,
        pk.title,
        pk.content,
        pk.summary,
        pk.recorded_at,
        pk.participants,
        pk.importance,
        pk.action_required
    FROM project_knowledge pk
    WHERE pk.project_code = p_project_code
    AND (p_types IS NULL OR pk.knowledge_type = ANY(p_types))
    ORDER BY pk.recorded_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get project context for decision-making
-- Returns recent + important knowledge for a project
CREATE OR REPLACE FUNCTION get_project_context(
    p_project_code TEXT,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    knowledge_type TEXT,
    title TEXT,
    content TEXT,
    summary TEXT,
    recorded_at TIMESTAMPTZ,
    importance TEXT,
    decision_status TEXT
) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := NOW() - (p_days || ' days')::INTERVAL;

    RETURN QUERY
    -- Recent items
    SELECT
        pk.id,
        pk.knowledge_type,
        pk.title,
        pk.content,
        pk.summary,
        pk.recorded_at,
        pk.importance,
        pk.decision_status
    FROM project_knowledge pk
    WHERE pk.project_code = p_project_code
    AND (pk.recorded_at >= cutoff_date OR pk.importance IN ('critical', 'high'))
    ORDER BY
        CASE pk.importance
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            ELSE 3
        END,
        pk.recorded_at DESC
    LIMIT 25;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_pk_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pk_updated ON project_knowledge;
CREATE TRIGGER trigger_pk_updated
    BEFORE UPDATE ON project_knowledge
    FOR EACH ROW EXECUTE FUNCTION update_pk_timestamp();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Recent knowledge by project (last 30 days)
CREATE OR REPLACE VIEW v_recent_project_knowledge AS
SELECT
    pk.*,
    CASE
        WHEN pk.recorded_at >= NOW() - INTERVAL '7 days' THEN 'this_week'
        WHEN pk.recorded_at >= NOW() - INTERVAL '30 days' THEN 'this_month'
        ELSE 'older'
    END as recency
FROM project_knowledge pk
WHERE pk.recorded_at >= NOW() - INTERVAL '30 days'
ORDER BY pk.recorded_at DESC;

-- Decisions by project
CREATE OR REPLACE VIEW v_project_decisions AS
SELECT
    pk.project_code,
    pk.project_name,
    pk.title,
    pk.content,
    pk.decision_status,
    pk.decision_rationale,
    pk.recorded_at,
    pk.participants
FROM project_knowledge pk
WHERE pk.knowledge_type = 'decision'
ORDER BY pk.project_code, pk.recorded_at DESC;

-- Open questions by project
CREATE OR REPLACE VIEW v_project_questions AS
SELECT
    pk.project_code,
    pk.project_name,
    pk.title,
    pk.content,
    pk.recorded_at,
    pk.follow_up_date,
    pk.importance
FROM project_knowledge pk
WHERE pk.knowledge_type = 'question'
AND pk.action_required = TRUE
ORDER BY pk.importance DESC, pk.recorded_at DESC;

-- Action items across projects
CREATE OR REPLACE VIEW v_project_actions AS
SELECT
    pk.id,
    pk.project_code,
    pk.title,
    pk.action_items,
    pk.follow_up_date,
    pk.recorded_at
FROM project_knowledge pk
WHERE pk.action_required = TRUE
OR pk.follow_up_date IS NOT NULL
ORDER BY pk.follow_up_date NULLS LAST, pk.recorded_at DESC;

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

ALTER TABLE project_knowledge ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (team knowledge)
CREATE POLICY pk_read_policy ON project_knowledge
    FOR SELECT TO authenticated
    USING (TRUE);

-- Allow authenticated users to insert
CREATE POLICY pk_insert_policy ON project_knowledge
    FOR INSERT TO authenticated
    WITH CHECK (TRUE);

-- Allow recorded_by to update their own entries
CREATE POLICY pk_update_policy ON project_knowledge
    FOR UPDATE TO authenticated
    USING (recorded_by = current_user OR auth.jwt() ->> 'role' = 'admin');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE project_knowledge IS 'Unified catch-all for project-related knowledge, reflections, decisions, and context';
COMMENT ON COLUMN project_knowledge.project_code IS 'Project code from config/project-codes.json (e.g., ACT-HV, ACT-JH)';
COMMENT ON COLUMN project_knowledge.knowledge_type IS 'Type: reflection, decision, meeting, voice_note, document, event, question, link, communication, milestone';
COMMENT ON COLUMN project_knowledge.embedding IS 'Vector embedding for semantic search (384 dimensions)';
COMMENT ON FUNCTION search_project_knowledge IS 'Semantic search across all project knowledge';
COMMENT ON FUNCTION get_project_context IS 'Get recent + important knowledge for decision-making context';
