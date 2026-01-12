-- ALMA Unification: Create relationship tables to link Articles, Stories, Profiles to ALMA
-- Migration: 20260102_alma_unification_links
-- Purpose: Transform ALMA from siloed data into a fully interconnected intelligence ecosystem

-- ============================================================================
-- 1. ARTICLES → ALMA INTERVENTIONS
-- ============================================================================
-- Allows blog posts/articles to reference ALMA interventions
-- Example: Article about BackTrack program links to its ALMA intervention record

CREATE TABLE IF NOT EXISTS article_related_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES alma_interventions(id) ON DELETE CASCADE,
  relevance_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, intervention_id)
);

CREATE INDEX idx_article_related_interventions_article ON article_related_interventions(article_id);
CREATE INDEX idx_article_related_interventions_intervention ON article_related_interventions(intervention_id);

COMMENT ON TABLE article_related_interventions IS 'Links articles to ALMA interventions for cross-referencing';
COMMENT ON COLUMN article_related_interventions.relevance_note IS 'Optional note explaining why this intervention is related to this article';

-- ============================================================================
-- 2. ARTICLES → ALMA EVIDENCE
-- ============================================================================
-- Allows articles to reference ALMA evidence/research records
-- Example: Research summary article links to the formal ALMA evidence record

CREATE TABLE IF NOT EXISTS article_related_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES alma_evidence(id) ON DELETE CASCADE,
  relevance_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, evidence_id)
);

CREATE INDEX idx_article_related_evidence_article ON article_related_evidence(article_id);
CREATE INDEX idx_article_related_evidence_evidence ON article_related_evidence(evidence_id);

COMMENT ON TABLE article_related_evidence IS 'Links articles to ALMA evidence records';
COMMENT ON COLUMN article_related_evidence.relevance_note IS 'Optional note explaining why this evidence is related to this article';

-- ============================================================================
-- 3. STORIES → ALMA INTERVENTIONS
-- ============================================================================
-- Allows platform multimedia stories to reference ALMA interventions
-- Example: Photo story about community program links to its ALMA intervention

CREATE TABLE IF NOT EXISTS story_related_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES alma_interventions(id) ON DELETE CASCADE,
  relevance_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, intervention_id)
);

CREATE INDEX idx_story_related_interventions_story ON story_related_interventions(story_id);
CREATE INDEX idx_story_related_interventions_intervention ON story_related_interventions(intervention_id);

COMMENT ON TABLE story_related_interventions IS 'Links platform stories to ALMA interventions';
COMMENT ON COLUMN story_related_interventions.relevance_note IS 'Optional note explaining why this intervention is related to this story';

-- ============================================================================
-- 4. PROFILES → ALMA INTERVENTIONS
-- ============================================================================
-- Links people to interventions they founded, operate, research, or participate in
-- Example: Profile of Bernie Shakeshaft links to BackTrack intervention as "founder"

CREATE TABLE IF NOT EXISTS alma_intervention_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervention_id UUID NOT NULL REFERENCES alma_interventions(id) ON DELETE CASCADE,
  public_profile_id UUID NOT NULL REFERENCES public_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('founder', 'staff', 'researcher', 'participant', 'community_elder', 'evaluator', 'supporter')),
  started_date DATE,
  ended_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(intervention_id, public_profile_id, role)
);

CREATE INDEX idx_alma_intervention_profiles_intervention ON alma_intervention_profiles(intervention_id);
CREATE INDEX idx_alma_intervention_profiles_profile ON alma_intervention_profiles(public_profile_id);
CREATE INDEX idx_alma_intervention_profiles_role ON alma_intervention_profiles(role);

COMMENT ON TABLE alma_intervention_profiles IS 'Links people to ALMA interventions with their role';
COMMENT ON COLUMN alma_intervention_profiles.role IS 'Role: founder, staff, researcher, participant, community_elder, evaluator, supporter';
COMMENT ON COLUMN alma_intervention_profiles.started_date IS 'When this person started this role';
COMMENT ON COLUMN alma_intervention_profiles.ended_date IS 'When this person ended this role (NULL if ongoing)';

-- ============================================================================
-- 5. PROFILES → ALMA EVIDENCE (upgrade from text to FK)
-- ============================================================================
-- Allows linking evidence authors to profile records
-- Keeps existing 'author' text field for backwards compatibility

ALTER TABLE alma_evidence
  ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES public_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alma_evidence_author_profile ON alma_evidence(author_profile_id);

COMMENT ON COLUMN alma_evidence.author_profile_id IS 'Links to public_profiles for author - keeps author text field for backwards compatibility';

-- ============================================================================
-- 6. ORGANIZATIONS → INTERVENTIONS (upgrade from text to FK)
-- ============================================================================
-- Allows linking operating organization to organization records
-- Keeps existing 'operating_organization' text field for backwards compatibility

ALTER TABLE alma_interventions
  ADD COLUMN IF NOT EXISTS operating_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alma_interventions_org ON alma_interventions(operating_organization_id);

COMMENT ON COLUMN alma_interventions.operating_organization_id IS 'Links to organizations table - keeps operating_organization text for backwards compatibility';

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get all related content for an intervention
CREATE OR REPLACE FUNCTION get_intervention_related_content(p_intervention_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'articles', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', a.id,
        'title', a.title,
        'slug', a.slug,
        'relevance_note', ari.relevance_note
      )), '[]'::json)
      FROM article_related_interventions ari
      JOIN articles a ON a.id = ari.article_id
      WHERE ari.intervention_id = p_intervention_id
    ),
    'stories', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', s.id,
        'title', s.title,
        'slug', s.slug,
        'relevance_note', sri.relevance_note
      )), '[]'::json)
      FROM story_related_interventions sri
      JOIN stories s ON s.id = sri.story_id
      WHERE sri.intervention_id = p_intervention_id
    ),
    'profiles', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', p.id,
        'name', p.full_name,
        'role', aip.role,
        'started_date', aip.started_date,
        'ended_date', aip.ended_date
      )), '[]'::json)
      FROM alma_intervention_profiles aip
      JOIN public_profiles p ON p.id = aip.public_profile_id
      WHERE aip.intervention_id = p_intervention_id
    ),
    'media_mentions', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ma.id,
        'headline', ma.headline,
        'source_name', ma.source_name,
        'published_date', ma.published_date,
        'sentiment', ma.sentiment
      )), '[]'::json)
      FROM alma_media_articles ma
      WHERE ma.intervention_mentions @> ARRAY[p_intervention_id::text]
    ),
    'evidence', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', e.id,
        'title', e.title,
        'evidence_type', e.evidence_type,
        'findings', e.findings
      )), '[]'::json)
      FROM alma_intervention_evidence aie
      JOIN alma_evidence e ON e.id = aie.evidence_id
      WHERE aie.intervention_id = p_intervention_id
    ),
    'outcomes', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', o.id,
        'name', o.name,
        'outcome_type', o.outcome_type
      )), '[]'::json)
      FROM alma_intervention_outcomes aio
      JOIN alma_outcomes o ON o.id = aio.outcome_id
      WHERE aio.intervention_id = p_intervention_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_intervention_related_content IS 'Returns all related content for an intervention in one query';

-- Function to get all related content for an article
CREATE OR REPLACE FUNCTION get_article_related_content(p_article_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'interventions', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', i.id,
        'name', i.name,
        'type', i.type,
        'relevance_note', ari.relevance_note
      )), '[]'::json)
      FROM article_related_interventions ari
      JOIN alma_interventions i ON i.id = ari.intervention_id
      WHERE ari.article_id = p_article_id
    ),
    'evidence', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', e.id,
        'title', e.title,
        'evidence_type', e.evidence_type,
        'relevance_note', are.relevance_note
      )), '[]'::json)
      FROM article_related_evidence are
      JOIN alma_evidence e ON e.id = are.evidence_id
      WHERE are.article_id = p_article_id
    ),
    'programs', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', cp.id,
        'title', cp.title,
        'location', cp.location
      )), '[]'::json)
      FROM article_related_programs arp
      JOIN community_programs cp ON cp.id = arp.program_id
      WHERE arp.article_id = p_article_id
    ),
    'services', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', s.id,
        'name', s.name,
        'service_type', s.service_type
      )), '[]'::json)
      FROM article_related_services ars
      JOIN services s ON s.id = ars.service_id
      WHERE ars.article_id = p_article_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_article_related_content IS 'Returns all related content for an article in one query';

-- ============================================================================
-- 8. RLS POLICIES (Row Level Security)
-- ============================================================================

-- All relationship tables are publicly readable (related content should be visible)
-- Only authenticated users can create/update/delete relationships

ALTER TABLE article_related_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_related_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_related_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alma_intervention_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view article-intervention links"
  ON article_related_interventions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view article-evidence links"
  ON article_related_evidence FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view story-intervention links"
  ON story_related_interventions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view intervention-profile links"
  ON alma_intervention_profiles FOR SELECT
  USING (true);

-- Authenticated write access (admins/editors can create links)
CREATE POLICY "Authenticated users can create article-intervention links"
  ON article_related_interventions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create article-evidence links"
  ON article_related_evidence FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create story-intervention links"
  ON story_related_interventions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create intervention-profile links"
  ON alma_intervention_profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 9. AUDIT LOGGING
-- ============================================================================

-- Log relationship creation to alma_usage_log for attribution tracking
CREATE OR REPLACE FUNCTION log_relationship_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to ALMA usage log for attribution
  INSERT INTO alma_usage_log (
    entity_type,
    entity_id,
    action,
    user_id,
    metadata
  ) VALUES (
    'relationship',
    NEW.id,
    'create',
    auth.uid(),
    json_build_object(
      'table', TG_TABLE_NAME,
      'linked_entities', json_build_object(
        'entity_1', CASE
          WHEN TG_TABLE_NAME = 'article_related_interventions' THEN NEW.article_id
          WHEN TG_TABLE_NAME = 'article_related_evidence' THEN NEW.article_id
          WHEN TG_TABLE_NAME = 'story_related_interventions' THEN NEW.story_id
          WHEN TG_TABLE_NAME = 'alma_intervention_profiles' THEN NEW.intervention_id
        END,
        'entity_2', CASE
          WHEN TG_TABLE_NAME = 'article_related_interventions' THEN NEW.intervention_id
          WHEN TG_TABLE_NAME = 'article_related_evidence' THEN NEW.evidence_id
          WHEN TG_TABLE_NAME = 'story_related_interventions' THEN NEW.intervention_id
          WHEN TG_TABLE_NAME = 'alma_intervention_profiles' THEN NEW.public_profile_id
        END
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER log_article_intervention_creation
  AFTER INSERT ON article_related_interventions
  FOR EACH ROW EXECUTE FUNCTION log_relationship_creation();

CREATE TRIGGER log_article_evidence_creation
  AFTER INSERT ON article_related_evidence
  FOR EACH ROW EXECUTE FUNCTION log_relationship_creation();

CREATE TRIGGER log_story_intervention_creation
  AFTER INSERT ON story_related_interventions
  FOR EACH ROW EXECUTE FUNCTION log_relationship_creation();

CREATE TRIGGER log_intervention_profile_creation
  AFTER INSERT ON alma_intervention_profiles
  FOR EACH ROW EXECUTE FUNCTION log_relationship_creation();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Created article_related_interventions table
-- ✅ Created article_related_evidence table
-- ✅ Created story_related_interventions table
-- ✅ Created alma_intervention_profiles table
-- ✅ Added author_profile_id to alma_evidence
-- ✅ Added operating_organization_id to alma_interventions
-- ✅ Created helper functions for fetching related content
-- ✅ Added RLS policies for security
-- ✅ Added audit logging triggers

-- Next steps:
-- 1. Run backfill scripts to populate relationships from existing data
-- 2. Build frontend components to display related content
-- 3. Create admin UI for managing relationships
