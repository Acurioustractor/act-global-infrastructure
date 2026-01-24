-- Add position field for drag-and-drop ordering
ALTER TABLE goals_2026 ADD COLUMN IF NOT EXISTS lane_position INTEGER DEFAULT 0;

-- Add view settings for personalized layouts
ALTER TABLE goals_2026 ADD COLUMN IF NOT EXISTS view_settings JSONB DEFAULT '{}';

-- Add cross-system linking fields
ALTER TABLE goals_2026 ADD COLUMN IF NOT EXISTS related_contact_ids TEXT[] DEFAULT '{}';
ALTER TABLE goals_2026 ADD COLUMN IF NOT EXISTS related_communities TEXT[] DEFAULT '{}';

-- Update index for position queries
DROP INDEX IF EXISTS idx_goals_2026_lane_position;
CREATE INDEX IF NOT EXISTS idx_goals_2026_lane_position ON goals_2026(lane, lane_position);
