-- Add tags column to calendar_events for event tagging
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_calendar_events_tags ON calendar_events USING GIN(tags);
