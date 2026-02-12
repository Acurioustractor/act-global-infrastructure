-- Contact ranking: votes, project links, snooze support

-- Vote history (every vote stored for decay calculation)
CREATE TABLE contact_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT NOT NULL REFERENCES ghl_contacts(ghl_id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activity_snapshot_at TIMESTAMPTZ  -- latest activity at vote time (for suppression)
);
CREATE INDEX idx_contact_votes_contact ON contact_votes(ghl_contact_id);

-- Explicit project links (separate from GHL tags which get overwritten on sync)
CREATE TABLE contact_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT NOT NULL REFERENCES ghl_contacts(ghl_id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  UNIQUE(ghl_contact_id, project_code)
);
CREATE INDEX idx_contact_project_links_contact ON contact_project_links(ghl_contact_id);

-- Snooze support (enables existing snoozeContact() in api.ts)
ALTER TABLE relationship_health ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
