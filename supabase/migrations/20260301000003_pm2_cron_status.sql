-- PM2 cron process status (synced from local machine every minute)
CREATE TABLE IF NOT EXISTS pm2_cron_status (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'stopped', -- online, stopped, errored
  restarts INTEGER NOT NULL DEFAULT 0,
  memory_bytes BIGINT NOT NULL DEFAULT 0,
  uptime_ms BIGINT NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'daily', -- high-freq, daily, weekly, monthly
  cron_expression TEXT,
  recent_errors TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm2_cron_status_updated ON pm2_cron_status(updated_at);
