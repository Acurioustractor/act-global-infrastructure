-- Voice Notes Schema
-- Purpose: Shareable voice notes with transcription and semantic search
-- Cultural Protocol: Auto-flags notes mentioning Elders for review
--
-- Created: 2026-01-21
-- Part of: ACT Unified Data Synchronization

-- =============================================================================
-- ENABLE VECTOR EXTENSION (if not already enabled)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- VOICE NOTES TABLE
-- Shareable voice notes with transcription and embeddings
-- =============================================================================
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source channel
    source_channel TEXT NOT NULL,  -- 'discord', 'signal', 'whatsapp', 'direct', 'telegram'

    -- Recording metadata
    recorded_by UUID REFERENCES user_identities(id),
    recorded_by_name TEXT,  -- Denormalized for quick access
    duration_seconds INT,
    file_size_bytes INT,

    -- Audio storage
    audio_url TEXT,  -- Supabase Storage URL: storage/voice-notes/{id}.{ext}
    audio_format TEXT DEFAULT 'ogg',  -- 'ogg', 'mp3', 'wav', 'm4a'

    -- Transcription
    transcript TEXT,
    transcript_confidence DECIMAL(3,2),  -- 0.00 to 1.00
    transcript_language TEXT DEFAULT 'en',
    transcribed_at TIMESTAMPTZ,
    transcription_model TEXT,  -- 'whisper-large-v3', 'whisper-tiny', etc.

    -- AI enrichment
    summary TEXT,  -- AI-generated summary
    topics TEXT[],  -- ['project:harvest', 'planning', 'budget']
    action_items JSONB,  -- [{text, assigned_to, due_date}]
    key_points TEXT[],  -- Bullet points
    mentioned_people TEXT[],  -- Names mentioned in the note
    mentioned_contacts UUID[],  -- Linked to ghl_contacts

    -- Semantic search
    embedding vector(384),  -- all-MiniLM-L6-v2 embeddings

    -- Visibility & sharing
    visibility TEXT DEFAULT 'private',  -- 'private', 'team', 'project', 'public'
    shared_with UUID[],  -- Array of user_identity IDs
    project_context TEXT,  -- Project this note relates to

    -- Related items
    related_contact_id TEXT REFERENCES ghl_contacts(ghl_id),
    related_communication_id UUID REFERENCES communications_history(id),
    reply_to_voice_note_id UUID REFERENCES voice_notes(id),

    -- Cultural protocol flags
    mentions_elders BOOLEAN DEFAULT FALSE,
    requires_cultural_review BOOLEAN DEFAULT FALSE,
    cultural_review_status TEXT,  -- 'pending', 'approved', 'flagged'
    cultural_reviewer_notes TEXT,

    -- Timestamps
    recorded_at TIMESTAMPTZ NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    enriched_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_voice_notes_recorded_by ON voice_notes(recorded_by);
CREATE INDEX IF NOT EXISTS idx_voice_notes_channel ON voice_notes(source_channel);
CREATE INDEX IF NOT EXISTS idx_voice_notes_recorded_at ON voice_notes(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notes_visibility ON voice_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_voice_notes_topics ON voice_notes USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_voice_notes_project ON voice_notes(project_context);
CREATE INDEX IF NOT EXISTS idx_voice_notes_cultural ON voice_notes(requires_cultural_review) WHERE requires_cultural_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_voice_notes_contact ON voice_notes(related_contact_id);

-- Vector index for semantic search (IVFFlat for faster queries)
CREATE INDEX IF NOT EXISTS idx_voice_notes_embedding ON voice_notes
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- =============================================================================
-- VOICE NOTE SHARES TABLE
-- Track who has accessed shared voice notes
-- =============================================================================
CREATE TABLE IF NOT EXISTS voice_note_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    voice_note_id UUID NOT NULL REFERENCES voice_notes(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES user_identities(id),
    shared_by UUID REFERENCES user_identities(id),

    -- Access tracking
    share_method TEXT,  -- 'direct', 'channel', 'project'
    accessed_at TIMESTAMPTZ,
    access_count INT DEFAULT 0,

    -- Permissions
    can_reshare BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(voice_note_id, shared_with)
);

-- Index for share lookups
CREATE INDEX IF NOT EXISTS idx_voice_note_shares_note ON voice_note_shares(voice_note_id);
CREATE INDEX IF NOT EXISTS idx_voice_note_shares_user ON voice_note_shares(shared_with);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to search voice notes semantically
CREATE OR REPLACE FUNCTION search_voice_notes(
    query_embedding vector(384),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_visibility TEXT DEFAULT NULL,
    filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    transcript TEXT,
    summary TEXT,
    topics TEXT[],
    recorded_by_name TEXT,
    recorded_at TIMESTAMPTZ,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vn.id,
        vn.transcript,
        vn.summary,
        vn.topics,
        vn.recorded_by_name,
        vn.recorded_at,
        1 - (vn.embedding <=> query_embedding) as similarity
    FROM voice_notes vn
    WHERE vn.embedding IS NOT NULL
    AND 1 - (vn.embedding <=> query_embedding) > match_threshold
    AND (filter_visibility IS NULL OR vn.visibility = filter_visibility OR vn.visibility = 'public')
    AND (filter_user_id IS NULL OR vn.recorded_by = filter_user_id OR filter_user_id = ANY(vn.shared_with))
    ORDER BY vn.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-flag cultural content
CREATE OR REPLACE FUNCTION check_cultural_content()
RETURNS TRIGGER AS $$
DECLARE
    elder_keywords TEXT[] := ARRAY['elder', 'aunty', 'auntie', 'uncle', 'traditional owner', 'first nations', 'aboriginal', 'indigenous', 'sacred', 'ceremony', 'dreaming', 'country'];
    keyword TEXT;
BEGIN
    -- Check transcript for cultural keywords
    IF NEW.transcript IS NOT NULL THEN
        FOREACH keyword IN ARRAY elder_keywords LOOP
            IF LOWER(NEW.transcript) LIKE '%' || keyword || '%' THEN
                NEW.mentions_elders := TRUE;
                NEW.requires_cultural_review := TRUE;
                NEW.cultural_review_status := 'pending';
                EXIT;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-check cultural content
DROP TRIGGER IF EXISTS trigger_check_cultural_content ON voice_notes;
CREATE TRIGGER trigger_check_cultural_content
    BEFORE INSERT OR UPDATE OF transcript ON voice_notes
    FOR EACH ROW
    EXECUTE FUNCTION check_cultural_content();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS trigger_voice_notes_updated ON voice_notes;
CREATE TRIGGER trigger_voice_notes_updated
    BEFORE UPDATE ON voice_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Team voice notes (visible to team)
CREATE OR REPLACE VIEW v_team_voice_notes AS
SELECT
    vn.*,
    ui.display_name as recorder_display_name,
    ui.preferred_channel as recorder_channel
FROM voice_notes vn
LEFT JOIN user_identities ui ON vn.recorded_by = ui.id
WHERE vn.visibility IN ('team', 'public')
ORDER BY vn.recorded_at DESC;

-- Voice notes needing cultural review
CREATE OR REPLACE VIEW v_voice_notes_cultural_review AS
SELECT
    vn.*,
    ui.display_name as recorder_display_name
FROM voice_notes vn
LEFT JOIN user_identities ui ON vn.recorded_by = ui.id
WHERE vn.requires_cultural_review = TRUE
AND vn.cultural_review_status = 'pending'
ORDER BY vn.recorded_at ASC;

-- Voice notes with action items
CREATE OR REPLACE VIEW v_voice_notes_with_actions AS
SELECT
    vn.id,
    vn.summary,
    vn.recorded_by_name,
    vn.recorded_at,
    vn.project_context,
    jsonb_array_elements(vn.action_items) as action_item
FROM voice_notes vn
WHERE vn.action_items IS NOT NULL
AND jsonb_array_length(vn.action_items) > 0
ORDER BY vn.recorded_at DESC;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_note_shares ENABLE ROW LEVEL SECURITY;

-- Voice notes - visibility-based access
CREATE POLICY voice_notes_access ON voice_notes
    FOR SELECT TO authenticated
    USING (
        visibility = 'public'
        OR visibility = 'team'
        OR recorded_by = (auth.jwt() ->> 'sub')::UUID
        OR (auth.jwt() ->> 'sub')::UUID = ANY(shared_with)
    );

-- Voice notes - owner can modify
CREATE POLICY voice_notes_owner ON voice_notes
    FOR ALL TO authenticated
    USING (
        recorded_by = (auth.jwt() ->> 'sub')::UUID
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Voice note shares - team access
CREATE POLICY voice_note_shares_team ON voice_note_shares
    FOR ALL TO authenticated
    USING (TRUE);

-- =============================================================================
-- STORAGE BUCKET (run manually or via Supabase Dashboard)
-- =============================================================================

-- Note: This creates the storage bucket for voice notes
-- Run via Supabase Dashboard or SQL:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('voice-notes', 'voice-notes', false)
-- ON CONFLICT (id) DO NOTHING;
--
-- Storage policies should allow authenticated users to upload to their own folder

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE voice_notes IS 'Voice notes with transcription, AI enrichment, and semantic search';
COMMENT ON TABLE voice_note_shares IS 'Tracks sharing and access to voice notes';
COMMENT ON COLUMN voice_notes.embedding IS 'all-MiniLM-L6-v2 embeddings for semantic search (384 dimensions)';
COMMENT ON COLUMN voice_notes.mentions_elders IS 'Auto-flagged if transcript mentions cultural keywords';
COMMENT ON COLUMN voice_notes.requires_cultural_review IS 'If true, note needs cultural liaison review before sharing';
COMMENT ON FUNCTION search_voice_notes IS 'Semantic search over voice note transcripts using vector similarity';
