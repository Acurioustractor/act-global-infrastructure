-- Migration: Add missing columns to sprint_snapshots table
-- Date: 2025-12-30
-- Purpose: Fix schema mismatch for dashboard historical trends

-- Add missing flow metric columns (if they don't exist)
ALTER TABLE sprint_snapshots
ADD COLUMN IF NOT EXISTS avg_cycle_time NUMERIC,
ADD COLUMN IF NOT EXISTS avg_lead_time NUMERIC,
ADD COLUMN IF NOT EXISTS throughput_per_week NUMERIC,
ADD COLUMN IF NOT EXISTS flow_efficiency NUMERIC;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sprint_snapshots'
ORDER BY ordinal_position;
