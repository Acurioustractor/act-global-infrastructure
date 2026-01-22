-- Project Updates Table
-- Tracks updates and milestones for ACT projects

DROP TABLE IF EXISTS project_updates;

CREATE TABLE project_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    update_type TEXT DEFAULT 'update',
    content TEXT NOT NULL,
    author TEXT DEFAULT 'ben',
    tags TEXT[] DEFAULT '{}',
    notion_synced BOOLEAN DEFAULT FALSE,
    notion_page_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created ON project_updates(created_at DESC);

-- Comment
COMMENT ON TABLE project_updates IS 'Project updates and milestones tracked by ACT Studio Bot';
