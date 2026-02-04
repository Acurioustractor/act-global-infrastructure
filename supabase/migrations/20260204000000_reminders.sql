-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- REMINDERS TABLE
-- Personal reminders sent via Telegram notifications
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    trigger_at TIMESTAMPTZ NOT NULL,
    recurring TEXT CHECK (recurring IN ('daily', 'weekday', 'weekly')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient reminder checking (cron runs every 5 min)
CREATE INDEX idx_reminders_active_trigger ON reminders (trigger_at)
    WHERE active = true;

-- Index for listing reminders by chat
CREATE INDEX idx_reminders_chat_id ON reminders (chat_id)
    WHERE active = true;
