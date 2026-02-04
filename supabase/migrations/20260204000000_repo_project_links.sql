-- ============================================================
-- Editable repo-project links and repo-contact tags
-- for the Development Dashboard
-- ============================================================

-- Repo → Project links (replaces static REPO_PROJECT_MAP)
CREATE TABLE IF NOT EXISTS repo_project_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_name text NOT NULL,
  project_code text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(repo_name, project_code)
);

-- Repo → Contact tags (link GHL contacts to repos)
CREATE TABLE IF NOT EXISTS repo_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_name text NOT NULL,
  contact_id text NOT NULL,       -- GHL contact ID
  contact_name text,              -- cached display name
  role text,                      -- e.g. 'lead', 'stakeholder', 'developer'
  created_at timestamptz DEFAULT now(),
  UNIQUE(repo_name, contact_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_repo_project_links_repo ON repo_project_links(repo_name);
CREATE INDEX IF NOT EXISTS idx_repo_project_links_project ON repo_project_links(project_code);
CREATE INDEX IF NOT EXISTS idx_repo_contacts_repo ON repo_contacts(repo_name);
CREATE INDEX IF NOT EXISTS idx_repo_contacts_contact ON repo_contacts(contact_id);

-- Seed with current static mappings so existing links persist
INSERT INTO repo_project_links (repo_name, project_code) VALUES
  ('empathy-ledger-v2', 'EL'),
  ('justicehub-platform', 'JH'),
  ('goods-asset-tracker', 'GOODS'),
  ('theharvest', 'TH'),
  ('act-regenerative-studio', 'TS'),
  ('act-global-infrastructure', 'OPS'),
  ('act-farm', 'TF'),
  ('the-farm-website', 'TF'),
  ('barkly-research-platform', 'TS'),
  ('Oonchiumpa', 'TS'),
  ('palm-island-repository', 'TS'),
  ('Great-Palm-Island-PICC', 'TS'),
  ('picc-station-site-plan', 'TS'),
  ('custodian-economy-platform', 'TS'),
  ('mount-isa-service-map', 'TS'),
  ('bail-program-wiki', 'TS'),
  ('qld-youth-justice-tracker', 'TS'),
  ('diagrama-australia', 'TS'),
  ('mounty-yarns', 'TS')
ON CONFLICT (repo_name, project_code) DO NOTHING;
