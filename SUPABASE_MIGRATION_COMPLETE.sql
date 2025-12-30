-- Complete Migration: Create or fix sprint_snapshots table
-- Date: 2025-12-30
-- Purpose: Ensure all required columns exist for dashboard

-- Option 1: If table exists, add missing columns
ALTER TABLE sprint_snapshots
ADD COLUMN IF NOT EXISTS sprint_name TEXT,
ADD COLUMN IF NOT EXISTS snapshot_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_issues INTEGER,
ADD COLUMN IF NOT EXISTS completed INTEGER,
ADD COLUMN IF NOT EXISTS in_progress INTEGER,
ADD COLUMN IF NOT EXISTS todo INTEGER,
ADD COLUMN IF NOT EXISTS blocked INTEGER,
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER,
ADD COLUMN IF NOT EXISTS avg_cycle_time NUMERIC,
ADD COLUMN IF NOT EXISTS avg_lead_time NUMERIC,
ADD COLUMN IF NOT EXISTS throughput_per_week NUMERIC,
ADD COLUMN IF NOT EXISTS flow_efficiency NUMERIC,
ADD COLUMN IF NOT EXISTS wip_count INTEGER;

-- Option 2: If you want to start fresh, drop and recreate
-- WARNING: This will delete existing data!
-- DROP TABLE IF EXISTS sprint_snapshots;

-- CREATE TABLE sprint_snapshots (
--   id BIGSERIAL PRIMARY KEY,
--   sprint_name TEXT NOT NULL,
--   snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   total_issues INTEGER NOT NULL,
--   completed INTEGER NOT NULL,
--   in_progress INTEGER NOT NULL,
--   todo INTEGER NOT NULL,
--   blocked INTEGER NOT NULL,
--   completion_percentage INTEGER NOT NULL,
--   avg_cycle_time NUMERIC,
--   avg_lead_time NUMERIC,
--   throughput_per_week NUMERIC,
--   flow_efficiency NUMERIC,
--   wip_count INTEGER NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_sprint_date
ON sprint_snapshots(sprint_name, snapshot_date DESC);

-- Verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sprint_snapshots'
ORDER BY ordinal_position;
