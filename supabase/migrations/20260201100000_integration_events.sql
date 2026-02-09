-- Integration Events: Real-time event bus for webhook and poll data
-- Enables live dashboard updates via Supabase Realtime

-- 1. Integration Events: event bus for all integration activity
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  supabase_id UUID,
  payload JSONB,
  triggered_by TEXT DEFAULT 'webhook' CHECK (triggered_by IN ('webhook', 'poll', 'reconciliation')),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_events_source ON integration_events(source, created_at DESC);
CREATE INDEX idx_integration_events_entity ON integration_events(entity_type, entity_id);
CREATE INDEX idx_integration_events_recent ON integration_events(created_at DESC);

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE integration_events;

-- 2. Webhook Delivery Log: reliability tracking and replay
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  webhook_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'retried')),
  error_message TEXT,
  raw_headers JSONB,
  raw_body JSONB,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_log_status ON webhook_delivery_log(status, created_at DESC);
CREATE INDEX idx_webhook_log_source ON webhook_delivery_log(source, created_at DESC);

-- 3. Auto-cleanup: delete events older than 30 days (run via pg_cron or manual)
CREATE OR REPLACE FUNCTION cleanup_old_integration_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM integration_events
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM webhook_delivery_log
  WHERE created_at < NOW() - INTERVAL '90 days';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
