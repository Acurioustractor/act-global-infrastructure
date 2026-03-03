-- Meeting Transcription Intelligence
-- Adds columns to project_knowledge for Notion AI meeting transcription data.
-- Notion's API now exposes transcription blocks with AI-generated summaries,
-- action items, and full transcripts — this captures all of it.

ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS ai_action_items JSONB;
ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS meeting_duration_minutes INTEGER;
ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS transcription_status TEXT;

COMMENT ON COLUMN project_knowledge.transcript IS 'Full word-for-word meeting transcript from Notion AI';
COMMENT ON COLUMN project_knowledge.ai_summary IS 'Notion AI-generated summary (free, no LLM cost)';
COMMENT ON COLUMN project_knowledge.ai_action_items IS 'Notion AI-extracted action items as JSONB array';
COMMENT ON COLUMN project_knowledge.meeting_duration_minutes IS 'Meeting duration from calendar event start/end';
COMMENT ON COLUMN project_knowledge.transcription_status IS 'Notion transcription status: notes_ready, processing, etc.';
