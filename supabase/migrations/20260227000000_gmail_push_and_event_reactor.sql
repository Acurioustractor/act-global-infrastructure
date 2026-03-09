-- Gmail Push Notifications + Event Reactor
-- Supports Phase 1 (Gmail push sync state) and Phase 2 (event reactions)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Phase 1: Gmail Push Sync State
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS gmail_sync_state (
  email_address TEXT PRIMARY KEY,
  history_id TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  watch_expiration TIMESTAMPTZ,
  last_watch_renewal TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE gmail_sync_state IS 'Tracks Gmail History API sync position per mailbox for incremental push-based sync';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Phase 2: Event Reaction Tracking
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS event_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES integration_events(id),
  rule_name TEXT NOT NULL,
  reaction_type TEXT NOT NULL, -- 'telegram_notification', 'action_created', etc.
  priority INTEGER DEFAULT 50,
  message TEXT,
  actions JSONB, -- inline keyboard actions for Telegram
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reactions_event_id ON event_reactions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reactions_created ON event_reactions(created_at DESC);

COMMENT ON TABLE event_reactions IS 'Tracks reactions generated from integration events by the event reactor';

-- Rate limiting: track recent notifications to prevent spam
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  rule_name TEXT NOT NULL,
  entity_key TEXT NOT NULL, -- e.g., contact email, grant ID
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count_today INTEGER DEFAULT 1,
  PRIMARY KEY (rule_name, entity_key)
);

COMMENT ON TABLE notification_rate_limits IS 'Prevents duplicate/spammy notifications from the event reactor';
