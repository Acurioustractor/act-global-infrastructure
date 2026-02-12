-- Add indexes for multi-source calendar filtering
-- sync_source column already exists with DEFAULT 'google'
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_source ON calendar_events(sync_source);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_source_start ON calendar_events(sync_source, start_time);
