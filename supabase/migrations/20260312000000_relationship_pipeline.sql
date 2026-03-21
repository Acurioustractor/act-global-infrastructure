-- Unified Relationship Pipeline
-- One board showing all relationships: grants, foundations, businesses, people, opportunities
-- Multi-dimensional ranking: love/mission, money/$, strategic, urgency

CREATE TABLE IF NOT EXISTS relationship_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type text NOT NULL CHECK (entity_type IN ('grant', 'foundation', 'business', 'person', 'opportunity')),
  entity_id text NOT NULL,
  entity_name text NOT NULL,

  stage text NOT NULL DEFAULT 'cold' CHECK (stage IN ('cold', 'warm', 'engaged', 'active', 'partner', 'dormant', 'lost')),

  -- Multi-dimensional ranking (0-5)
  love_score smallint NOT NULL DEFAULT 0 CHECK (love_score BETWEEN 0 AND 5),
  money_score smallint NOT NULL DEFAULT 0 CHECK (money_score BETWEEN 0 AND 5),
  strategic_score smallint NOT NULL DEFAULT 0 CHECK (strategic_score BETWEEN 0 AND 5),
  urgency_score smallint NOT NULL DEFAULT 0 CHECK (urgency_score BETWEEN 0 AND 5),

  -- Relationship context
  color text,
  notes text,
  next_action text,
  next_action_date date,
  last_contact_date date,
  key_contact text,

  -- Denormalized for display
  value_low numeric,
  value_high numeric,
  subtitle text,

  -- Project association
  project_codes text[],

  -- Notion sync
  notion_page_id text,
  last_synced_to_notion timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_rp_stage ON relationship_pipeline(stage);
CREATE INDEX idx_rp_entity_type ON relationship_pipeline(entity_type);
CREATE INDEX idx_rp_urgency ON relationship_pipeline(urgency_score DESC) WHERE urgency_score > 0;
CREATE INDEX idx_rp_next_action_date ON relationship_pipeline(next_action_date) WHERE next_action_date IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_relationship_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_relationship_pipeline_updated_at
  BEFORE UPDATE ON relationship_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_pipeline_updated_at();
