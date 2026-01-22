-- Calendar Events Table for Google Calendar Sync
-- Stores synced events with project linking and attendee extraction

-- Create the calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Calendar identifiers
  google_event_id TEXT UNIQUE NOT NULL,
  google_calendar_id TEXT DEFAULT 'primary',
  calendar_name TEXT,
  calendar_color TEXT,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,

  -- Attendees (JSONB array of {email, name, response_status, organizer})
  attendees JSONB DEFAULT '[]',
  organizer_email TEXT,

  -- Event metadata
  is_all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurring_event_id TEXT, -- Parent event for recurring series
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  transparency TEXT, -- opaque, transparent
  visibility TEXT, -- default, public, private, confidential

  -- Event classification
  event_type TEXT DEFAULT 'meeting', -- meeting, focus, travel, personal, deadline, milestone, gathering

  -- Project linking
  project_code TEXT, -- ACT project code (e.g., ACT-JH)
  detected_project_code TEXT, -- Auto-detected from title/description
  manual_project_code TEXT, -- User override

  -- GHL contact linking
  ghl_contact_ids TEXT[] DEFAULT '{}',
  attendee_contact_matches JSONB DEFAULT '[]', -- [{email, ghl_contact_id, match_confidence}]

  -- Metadata
  metadata JSONB DEFAULT '{}',
  html_link TEXT,

  -- Sync tracking
  etag TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  sync_source TEXT DEFAULT 'google', -- google, manual, import

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time_range ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_code);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer_email);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON calendar_events(google_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_synced ON calendar_events(synced_at);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_calendar_events_title_search ON calendar_events USING gin(to_tsvector('english', title));

-- GIN index for attendees JSONB querying
CREATE INDEX IF NOT EXISTS idx_calendar_events_attendees ON calendar_events USING gin(attendees);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Auto-set effective project_code
  NEW.project_code = COALESCE(NEW.manual_project_code, NEW.detected_project_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- Create view for calendar events with project details
CREATE OR REPLACE VIEW v_calendar_events_with_projects AS
SELECT
  ce.*,
  CASE
    WHEN ce.project_code IS NOT NULL THEN jsonb_build_object(
      'code', ce.project_code,
      'has_manual_override', ce.manual_project_code IS NOT NULL
    )
    ELSE NULL
  END as project_info,
  jsonb_array_length(ce.attendees) as attendee_count,
  EXTRACT(EPOCH FROM (ce.end_time - ce.start_time))/3600 as duration_hours
FROM calendar_events ce
WHERE ce.status != 'cancelled';

-- Helper function to get events for a date range
CREATE OR REPLACE FUNCTION get_calendar_events(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_project_code TEXT DEFAULT NULL,
  p_calendar_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  google_event_id TEXT,
  title TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  event_type TEXT,
  project_code TEXT,
  attendee_count INTEGER,
  calendar_name TEXT,
  calendar_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.google_event_id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.location,
    ce.event_type,
    ce.project_code,
    jsonb_array_length(ce.attendees)::INTEGER as attendee_count,
    ce.calendar_name,
    ce.calendar_color
  FROM calendar_events ce
  WHERE ce.status != 'cancelled'
    AND ce.start_time >= p_start_date
    AND ce.start_time < p_end_date
    AND (p_project_code IS NULL OR ce.project_code = p_project_code)
    AND (p_calendar_id IS NULL OR ce.google_calendar_id = p_calendar_id)
  ORDER BY ce.start_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get calendar stats for a period
CREATE OR REPLACE FUNCTION get_calendar_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_events INTEGER,
  total_hours NUMERIC,
  events_by_type JSONB,
  events_by_project JSONB,
  top_attendees JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH event_data AS (
    SELECT
      ce.*,
      EXTRACT(EPOCH FROM (ce.end_time - ce.start_time))/3600 as duration_hours
    FROM calendar_events ce
    WHERE ce.status != 'cancelled'
      AND ce.start_time >= p_start_date
      AND ce.start_time < p_end_date
  ),
  type_stats AS (
    SELECT jsonb_object_agg(
      COALESCE(event_type, 'unknown'),
      cnt
    ) as stats
    FROM (
      SELECT event_type, COUNT(*) as cnt
      FROM event_data
      GROUP BY event_type
    ) t
  ),
  project_stats AS (
    SELECT jsonb_object_agg(
      COALESCE(project_code, 'unlinked'),
      cnt
    ) as stats
    FROM (
      SELECT project_code, COUNT(*) as cnt
      FROM event_data
      WHERE project_code IS NOT NULL
      GROUP BY project_code
    ) t
  ),
  attendee_stats AS (
    SELECT jsonb_agg(jsonb_build_object(
      'email', att->>'email',
      'count', att_count
    ) ORDER BY att_count DESC) as stats
    FROM (
      SELECT att, COUNT(*) as att_count
      FROM event_data, jsonb_array_elements(attendees) att
      GROUP BY att
      ORDER BY att_count DESC
      LIMIT 10
    ) t
  )
  SELECT
    COUNT(*)::INTEGER as total_events,
    COALESCE(SUM(duration_hours), 0)::NUMERIC as total_hours,
    COALESCE((SELECT stats FROM type_stats), '{}'::JSONB) as events_by_type,
    COALESCE((SELECT stats FROM project_stats), '{}'::JSONB) as events_by_project,
    COALESCE((SELECT stats FROM attendee_stats), '[]'::JSONB) as top_attendees
  FROM event_data;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE calendar_events IS 'Synced Google Calendar events with project linking and attendee extraction for ACT Intelligence Platform';
