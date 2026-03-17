-- Pipeline run tracking for receipt-pipeline.mjs
-- Enables: identifying partial runs, debugging mid-pipeline crashes, run history

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',  -- 'running', 'success', 'partial_failure', 'crashed'
  phases jsonb DEFAULT '[]',               -- ordered list of phases attempted
  failed_phases jsonb DEFAULT '[]',        -- which phases failed
  duration_s numeric,
  entity_code text DEFAULT 'ACT-ST',
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE pipeline_runs IS 'Tracks each receipt pipeline invocation. Identifies partial failures and crash recovery.';
