-- ACT 2026 Goals table
-- Synced from Notion 2026 ACT Goals database (ID: 9fa589ce-5252-40ab-9fbd-f1c3c26f71d1)

CREATE TABLE IF NOT EXISTS goals_2026 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'Yearly Goal' or 'Quarterly Sprint'
  lane TEXT,  -- 'A — Core Ops', 'B — Platforms', 'C — Place/Seasonal'
  status TEXT DEFAULT 'Not started',  -- 'Not started', 'Planning', 'In progress', 'Completed'
  owner JSONB DEFAULT '[]',  -- Array of owner names
  key_results TEXT,
  start_date DATE,
  due_date DATE,
  parent_goal_id TEXT,  -- Links quarterly sprints to yearly goals
  pillar_id TEXT,
  project_id TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goals_2026_lane ON goals_2026(lane);
CREATE INDEX IF NOT EXISTS idx_goals_2026_type ON goals_2026(type);
CREATE INDEX IF NOT EXISTS idx_goals_2026_status ON goals_2026(status);
CREATE INDEX IF NOT EXISTS idx_goals_2026_notion_id ON goals_2026(notion_id);

-- Enable RLS
ALTER TABLE goals_2026 ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (internal system)
CREATE POLICY "Allow all for service role" ON goals_2026
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_goals_2026_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_2026_updated_at
  BEFORE UPDATE ON goals_2026
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_2026_updated_at();

-- ACT Ecosystem Sites table for health monitoring
CREATE TABLE IF NOT EXISTS ecosystem_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'core', 'platform', 'community'
  status TEXT DEFAULT 'unknown',  -- 'healthy', 'degraded', 'offline', 'unknown'
  last_check_at TIMESTAMPTZ,
  response_time_ms INTEGER,
  icon_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default ecosystem sites
INSERT INTO ecosystem_sites (name, slug, url, description, category, display_order) VALUES
  ('ACT Main', 'act-main', 'https://act.place', 'Main ACT website', 'core', 1),
  ('Farm', 'farm', 'https://farm.act.place', 'Witta Farm project', 'community', 2),
  ('JusticeHub', 'justicehub', 'https://justicehub.act.place', 'Youth justice platform', 'platform', 3),
  ('Empathy Ledger', 'empathy-ledger', 'https://empathyledger.com', 'Story collection platform', 'platform', 4),
  ('Goods on Country', 'goods', 'https://goodsoncountry.au', 'First Nations products', 'community', 5),
  ('Studios', 'studios', 'https://studios.act.place', 'Creative studios', 'community', 6),
  ('Command Center', 'command-center', 'http://localhost:3456', 'API dashboard', 'core', 7)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE ecosystem_sites ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role
CREATE POLICY "Allow all for service role" ON ecosystem_sites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER ecosystem_sites_updated_at
  BEFORE UPDATE ON ecosystem_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_2026_updated_at();
