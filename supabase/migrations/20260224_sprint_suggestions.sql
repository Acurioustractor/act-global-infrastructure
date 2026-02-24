-- Sprint Suggestions: auto-populated from ecosystem signals
-- Surfaces grant deadlines, overdue actions, stale emails, calendar deadlines, and high-priority insights

CREATE TABLE IF NOT EXISTS sprint_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  stream TEXT NOT NULL DEFAULT 'Infrastructure',
  priority TEXT NOT NULL DEFAULT 'next',
  notes TEXT,
  source_type TEXT NOT NULL, -- 'grant_deadline', 'overdue_action', 'email_followup', 'calendar_deadline', 'insight'
  source_ref TEXT,           -- ID of source record
  due_date DATE,
  project_code TEXT,
  owner TEXT,
  dismissed BOOLEAN DEFAULT false,
  promoted_to UUID REFERENCES sprint_items(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_sprint_suggestions_active
  ON sprint_suggestions(dismissed, promoted_to)
  WHERE dismissed = false AND promoted_to IS NULL;

CREATE INDEX idx_sprint_suggestions_dedup
  ON sprint_suggestions(source_type, source_ref)
  WHERE dismissed = false AND promoted_to IS NULL;

-- Add source tracking to sprint_items
ALTER TABLE sprint_items
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_ref TEXT;
