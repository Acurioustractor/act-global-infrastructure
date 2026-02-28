-- Project Intelligence Hub — Phase 1
-- Pre-calculated snapshots, focus areas, activity stream, and relationships views

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: project_intelligence_snapshots
-- Daily pre-calculated snapshot per project for fast dashboard loads
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS project_intelligence_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Financial summary (FY)
  fy_revenue numeric DEFAULT 0,
  fy_expenses numeric DEFAULT 0,
  fy_net numeric DEFAULT 0,
  monthly_burn_rate numeric DEFAULT 0,
  pipeline_value numeric DEFAULT 0,

  -- Counts
  contact_count int DEFAULT 0,
  active_grant_count int DEFAULT 0,
  email_count_30d int DEFAULT 0,
  meeting_count_30d int DEFAULT 0,
  knowledge_count_30d int DEFAULT 0,

  -- Health scores (from project_health)
  health_score int,
  momentum_score int,
  engagement_score int,
  financial_score int,
  timeline_score int,

  -- Narrative
  current_focus text,
  blockers text[],
  recent_wins text[],

  -- Opportunity pipeline
  opportunity_summary jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),

  UNIQUE(project_code, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_pis_project_code ON project_intelligence_snapshots(project_code);
CREATE INDEX IF NOT EXISTS idx_pis_snapshot_date ON project_intelligence_snapshots(snapshot_date DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: project_focus_areas
-- Explicit focus tracking per project
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS project_focus_areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'upcoming', 'blocked', 'completed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Links to other entities
  linked_grant_ids uuid[],
  linked_contact_ids text[],
  linked_knowledge_ids uuid[],

  started_at timestamptz DEFAULT now(),
  target_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfa_project_code ON project_focus_areas(project_code);
CREATE INDEX IF NOT EXISTS idx_pfa_status ON project_focus_areas(status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEW: v_project_activity_stream
-- Chronological activity feed across communications, transactions,
-- grant milestones, and knowledge items
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW v_project_activity_stream AS

-- Emails
SELECT
  ch.id::text AS activity_id,
  'email' AS activity_type,
  COALESCE(ch.project_codes[1], 'UNLINKED') AS project_code,
  ch.subject AS title,
  ch.summary AS description,
  ch.occurred_at AS activity_date,
  jsonb_build_object(
    'from', ch.from_identity,
    'direction', ch.direction,
    'sentiment', ch.sentiment
  ) AS metadata
FROM communications_history ch
WHERE ch.channel = 'email'
  AND ch.occurred_at > now() - interval '90 days'

UNION ALL

-- Transactions
SELECT
  xt.id::text AS activity_id,
  'transaction' AS activity_type,
  COALESCE(xt.project_code, 'UNLINKED') AS project_code,
  xt.contact_name AS title,
  xt.type AS description,
  xt.date::timestamptz AS activity_date,
  jsonb_build_object(
    'amount', xt.total,
    'type', xt.type
  ) AS metadata
FROM xero_transactions xt
WHERE xt.date > now() - interval '90 days'

UNION ALL

-- Knowledge items
SELECT
  pk.id::text AS activity_id,
  'knowledge' AS activity_type,
  COALESCE(pk.project_code, 'UNLINKED') AS project_code,
  pk.title,
  pk.content AS description,
  pk.recorded_at AS activity_date,
  jsonb_build_object(
    'knowledge_type', pk.knowledge_type,
    'importance', pk.importance
  ) AS metadata
FROM project_knowledge pk
WHERE pk.recorded_at > now() - interval '90 days'

UNION ALL

-- Calendar events
SELECT
  ce.id::text AS activity_id,
  'meeting' AS activity_type,
  COALESCE(ce.project_code, 'UNLINKED') AS project_code,
  ce.title,
  ce.description,
  ce.start_time AS activity_date,
  jsonb_build_object(
    'attendees', ce.attendees,
    'calendar', ce.google_calendar_id
  ) AS metadata
FROM calendar_events ce
WHERE ce.start_time > now() - interval '90 days';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VIEW: v_project_relationships
-- Key people per project with temperature and recent topics
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW v_project_relationships AS
SELECT
  gc.ghl_id AS contact_id,
  gc.full_name AS contact_name,
  gc.email,
  gc.company_name,
  gc.tags,
  p.code AS project_code,
  rh.temperature,
  rh.temperature_trend,
  rh.last_contact_at,
  rh.email_score,
  rh.calendar_score,
  rh.risk_flags
FROM ghl_contacts gc
CROSS JOIN LATERAL unnest(gc.tags) AS tag
JOIN projects p ON (
  lower(p.name) = lower(tag)
  OR lower(replace(p.name, ' ', '-')) = lower(tag)
  OR lower(replace(p.name, ' ', '')) = lower(tag)
  OR lower(p.code) = lower(tag)
)
LEFT JOIN relationship_health rh ON rh.ghl_contact_id = gc.ghl_id
WHERE gc.tags IS NOT NULL AND array_length(gc.tags, 1) > 0;
