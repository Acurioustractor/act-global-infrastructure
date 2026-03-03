-- Track which billing emails have been forwarded to Dext
-- Used by scripts/forward-receipts-to-dext.mjs for deduplication
CREATE TABLE IF NOT EXISTS dext_forwarded_emails (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gmail_message_id TEXT NOT NULL UNIQUE,
  mailbox TEXT NOT NULL,
  vendor TEXT,
  subject TEXT,
  original_date TEXT,
  forwarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dext_forwarded_gmail_id ON dext_forwarded_emails (gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_dext_forwarded_mailbox ON dext_forwarded_emails (mailbox);
CREATE INDEX IF NOT EXISTS idx_dext_forwarded_at ON dext_forwarded_emails (forwarded_at);

-- Register in sync_status for integration health tracking
INSERT INTO sync_status (integration_name, status, updated_at)
VALUES ('dext_receipt_forwarding', 'unknown', NOW())
ON CONFLICT (integration_name) DO NOTHING;
