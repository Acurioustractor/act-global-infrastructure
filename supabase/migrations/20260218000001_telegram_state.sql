-- Persistent Telegram conversation state (survives Vercel cold starts)

CREATE TABLE IF NOT EXISTS telegram_conversations (
  chat_id BIGINT PRIMARY KEY,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_pending_actions (
  chat_id BIGINT PRIMARY KEY,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleaning up expired pending actions
CREATE INDEX IF NOT EXISTS idx_pending_actions_expires
  ON telegram_pending_actions (expires_at);
