-- iMessage Sync Support
-- Adds imessage to sync_type constraint and creates attachment table

-- Add imessage to sync_type check constraint
ALTER TABLE sync_state DROP CONSTRAINT sync_state_sync_type_check;
ALTER TABLE sync_state ADD CONSTRAINT sync_state_sync_type_check
  CHECK (sync_type = ANY (ARRAY['gmail', 'calendar', 'ghl', 'notion', 'github', 'google_auth', 'xero', 'imessage']));

-- Insert sync state for iMessage
INSERT INTO sync_state (id, sync_type, last_sync_token, state, metadata)
VALUES ('imessage-sync', 'imessage', '0', '{"last_rowid": 0}', '{"handles": [], "chat_ids": []}')
ON CONFLICT (id) DO NOTHING;

-- Table for storing iMessage attachment metadata and AI descriptions
CREATE TABLE IF NOT EXISTS imessage_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID REFERENCES communications_history(id) ON DELETE CASCADE,
  message_rowid BIGINT NOT NULL,
  filename TEXT,
  mime_type TEXT,
  file_size BIGINT,
  local_path TEXT,
  storage_path TEXT,          -- Supabase Storage path
  ai_description TEXT,        -- Claude Vision description
  ocr_text TEXT,              -- Extracted text from screenshots
  embedding vector(384),      -- Searchable embedding of description
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imessage_attachments_comm
  ON imessage_attachments (communication_id);

CREATE INDEX IF NOT EXISTS idx_imessage_attachments_embedding
  ON imessage_attachments USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- Index for communications_history on channel=imessage
CREATE INDEX IF NOT EXISTS idx_comms_history_imessage
  ON communications_history (channel)
  WHERE channel = 'imessage';

COMMENT ON TABLE imessage_attachments IS 'Stores metadata and AI descriptions for iMessage images/attachments';
