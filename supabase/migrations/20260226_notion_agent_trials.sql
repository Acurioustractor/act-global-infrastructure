-- Notion Agent Trials: track reliability of Notion 3.3 Custom Agents during trial phase
-- Part of Option B (Hybrid) migration: test agents before retiring ACT push scripts

CREATE TABLE IF NOT EXISTS notion_agent_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,          -- 'sprint_standup', 'meeting_prep', 'project_health', etc.
  phase TEXT NOT NULL DEFAULT '1',   -- '1' = Notion-internal, '2' = API-pulling
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failure', 'partial', 'timeout'
  run_started_at TIMESTAMPTZ DEFAULT NOW(),
  run_duration_ms INTEGER,           -- how long the agent took
  output_summary TEXT,               -- what the agent produced (brief)
  error_message TEXT,                -- if failed, what went wrong
  items_processed INTEGER DEFAULT 0, -- how many records it touched
  notes TEXT,                        -- manual observations
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notion_agent_trials_agent
  ON notion_agent_trials(agent_name, run_started_at DESC);

CREATE INDEX idx_notion_agent_trials_status
  ON notion_agent_trials(status)
  WHERE status != 'success';

-- View: agent reliability summary
CREATE OR REPLACE VIEW v_notion_agent_reliability AS
SELECT
  agent_name,
  phase,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE status = 'success') AS successes,
  COUNT(*) FILTER (WHERE status = 'failure') AS failures,
  COUNT(*) FILTER (WHERE status = 'partial') AS partial,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
    1
  ) AS success_rate_pct,
  AVG(run_duration_ms) FILTER (WHERE run_duration_ms IS NOT NULL) AS avg_duration_ms,
  MAX(run_started_at) AS last_run,
  MIN(run_started_at) AS first_run
FROM notion_agent_trials
GROUP BY agent_name, phase;
