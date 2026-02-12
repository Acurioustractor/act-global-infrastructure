-- Insight votes: track user feedback on intelligence insights
CREATE TABLE insight_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES intelligence_insights(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down', 'important')),
  insight_type TEXT,
  project_codes TEXT[],
  contact_id TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insight_votes_insight ON insight_votes(insight_id);
CREATE INDEX idx_insight_votes_type ON insight_votes(vote_type);
CREATE INDEX idx_insight_votes_project ON insight_votes USING GIN(project_codes);
CREATE INDEX idx_insight_votes_contact ON insight_votes(contact_id) WHERE contact_id IS NOT NULL;
