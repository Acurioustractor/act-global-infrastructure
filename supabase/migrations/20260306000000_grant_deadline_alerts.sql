-- Grant Deadline Alerts: track when we last sent an alert for each grant
-- Prevents duplicate alerts on the same day
ALTER TABLE grant_opportunities ADD COLUMN IF NOT EXISTS last_deadline_alert_at TIMESTAMPTZ;
