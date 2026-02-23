-- Sprint Items table for daily task tracking
CREATE TABLE IF NOT EXISTS sprint_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  stream TEXT NOT NULL DEFAULT 'Infrastructure', -- Harvest, Business, PICC, Empathy Ledger, Infrastructure, Goods, JusticeHub
  status TEXT NOT NULL DEFAULT 'backlog', -- backlog, today, in_progress, done, blocked
  priority TEXT NOT NULL DEFAULT 'next', -- now, next, later
  owner TEXT, -- Ben, Nicholas, Joey, Sophie, Thais, Suzie
  project_code TEXT, -- ACT-HV, ACT-IN, ACT-PI, etc.
  time_est TEXT, -- quick, short, medium, long
  notes TEXT,
  due_date DATE,
  done_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INT DEFAULT 0
);

-- Index for common queries
CREATE INDEX idx_sprint_items_status ON sprint_items(status);
CREATE INDEX idx_sprint_items_stream ON sprint_items(stream);
