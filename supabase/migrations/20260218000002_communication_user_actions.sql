-- Persistent user actions on communications (archive, prioritize)
-- Survives page refreshes, cold starts — not ephemeral UI state

CREATE TABLE IF NOT EXISTS communication_user_actions (
  communication_id UUID PRIMARY KEY REFERENCES communications_history(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('archived', 'important', 'follow_up_today')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_actions_action
  ON communication_user_actions (action);
