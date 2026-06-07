-- foundation-shortlist-view.draft.sql — DRAFT, NOT APPLIED.
--
-- Long-term shape for scripts/foundation-shortlist.mjs: a read-only view that
-- collapses the act_* relationship signals + power profile + giving-capacity
-- fields into one row per foundation, so the weekly ranker can ORDER BY a single
-- blended score. The Field-warmth lane (board_members[] -> Ben's ledger rings)
-- lives in JSONL files outside the DB and is NOT representable here — the script
-- overlays it in JS. So this view = signals + recency + capacity + power only;
-- the script's score will differ from `view_score` by the warmth term.
--
-- DO NOT apply via supabase/migrations. If adopted, review weights against the
-- constants block in scripts/foundation-shortlist.mjs first (single source of truth).
--
--   psql "$PG_URL" -f scripts/sql/foundation-shortlist-view.draft.sql   -- when/if approved

CREATE OR REPLACE VIEW v_foundation_shortlist AS
WITH sig AS (
  SELECT
    foundation_id,
    -- act_funded=100, act_pipeline=10, act_email_contact=1..100 (msg count)
    SUM(strength)                                            AS signal_strength_sum,
    MAX(strength)                                            AS signal_strength_max,
    COUNT(*) FILTER (WHERE signal_type = 'act_funded')       AS n_funded,
    COUNT(*) FILTER (WHERE signal_type = 'act_pipeline')     AS n_pipeline,
    COUNT(*) FILTER (WHERE signal_type = 'act_email_contact') AS n_email,
    -- dollars proven, not the score: funded total lives in metadata.total_paid
    COALESCE(SUM((metadata->>'total_paid')::numeric)
             FILTER (WHERE signal_type = 'act_funded'), 0)   AS act_funded_total,
    MAX(created_at)                                          AS last_signal_at
  FROM foundation_relationship_signals
  WHERE signal_type LIKE 'act_%'
    AND foundation_id IS NOT NULL
  GROUP BY foundation_id
)
SELECT
  f.id                       AS foundation_id,
  f.name,
  f.website,
  f.has_dgr,
  s.signal_strength_sum,
  s.signal_strength_max,
  s.n_funded,
  s.n_pipeline,
  s.n_email,
  s.act_funded_total,
  s.last_signal_at,
  -- giving capacity (best non-null of the capacity fields)
  COALESCE(f.total_giving_annual, f.grant_range_max, f.avg_grant_size, f.endowment_size) AS giving_capacity,
  f.total_giving_annual,
  f.grant_range_max,
  -- power profile (0..1 scores)
  p.openness_score,
  p.approachability_score,
  p.gatekeeping_score,
  p.capital_power_score,
  p.capital_holder_class,
  p.public_grant_surface
FROM sig s
JOIN foundations f             ON f.id = s.foundation_id
LEFT JOIN foundation_power_profiles p ON p.foundation_id = f.id;

-- Example consumer query (the ranker mirrors this blend, minus warmth, in JS):
-- SELECT name, signal_strength_sum, giving_capacity, approachability_score, last_signal_at
-- FROM v_foundation_shortlist
-- ORDER BY signal_strength_sum DESC, giving_capacity DESC NULLS LAST
-- LIMIT 10;
