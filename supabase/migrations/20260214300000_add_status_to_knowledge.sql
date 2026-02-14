-- Add status column to project_knowledge for action lifecycle management
ALTER TABLE project_knowledge ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Archive stale actions: old follow_up_date OR old recorded_at
UPDATE project_knowledge SET status = 'archived'
  WHERE knowledge_type = 'action' AND (
    follow_up_date < '2025-01-01'
    OR recorded_at < '2025-07-01'
  );

-- Ensure remaining actions without explicit status are open
UPDATE project_knowledge SET status = 'open'
  WHERE knowledge_type = 'action' AND status IS NULL;
