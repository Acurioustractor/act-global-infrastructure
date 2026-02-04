-- Project & Program Summaries
-- AI-generated summaries stored daily for dashboard display

-- Project summaries: per-project AI narratives
CREATE TABLE IF NOT EXISTS project_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text NOT NULL,
  summary_text text NOT NULL,
  data_sources_used text[] DEFAULT '{}',
  stats jsonb DEFAULT '{}',
  summary_date date NOT NULL DEFAULT CURRENT_DATE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_summaries_code ON project_summaries(project_code);
CREATE INDEX idx_project_summaries_generated ON project_summaries(generated_at DESC);

-- Keep only latest per project per day for dedup
CREATE UNIQUE INDEX idx_project_summaries_latest
  ON project_summaries(project_code, summary_date);

-- Program summaries: area-level rollups (weekly)
CREATE TABLE IF NOT EXISTS program_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  summary_text text NOT NULL,
  project_codes text[] DEFAULT '{}',
  stats jsonb DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_summaries_area ON program_summaries(area);
CREATE INDEX idx_program_summaries_generated ON program_summaries(generated_at DESC);

-- RLS: service role only (these are written by cron scripts)
ALTER TABLE project_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on project_summaries"
  ON project_summaries FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on program_summaries"
  ON program_summaries FOR ALL
  USING (auth.role() = 'service_role');
