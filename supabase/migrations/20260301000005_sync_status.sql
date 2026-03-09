-- Sync Status: tracks freshness of each data integration
-- Phase 3a of data freshness plan

CREATE TABLE IF NOT EXISTS sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text UNIQUE NOT NULL,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'stale', 'error', 'unknown')),
  record_count integer,
  last_error text,
  avg_duration_ms integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for freshness monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_status_name ON sync_status (integration_name);
CREATE INDEX IF NOT EXISTS idx_sync_status_last_success ON sync_status (last_success_at);

-- Seed with known integrations
INSERT INTO sync_status (integration_name, status) VALUES
  ('gmail_sync', 'unknown'),
  ('enrich_communications', 'unknown'),
  ('compute_project_health', 'unknown'),
  ('sync_notion', 'unknown'),
  ('sync_calendar', 'unknown'),
  ('gmail_push', 'unknown'),
  ('sync_xero', 'unknown'),
  ('sync_ghl_contacts', 'unknown'),
  ('sync_ghl_opportunities', 'unknown'),
  ('auto_tag_transactions', 'unknown'),
  ('entity_resolution', 'unknown'),
  ('knowledge_sync', 'unknown'),
  ('health_check_service', 'unknown'),
  ('data_freshness_monitor', 'unknown')
ON CONFLICT (integration_name) DO NOTHING;

COMMENT ON TABLE sync_status IS 'Tracks last sync time and health for each data integration pipeline';
