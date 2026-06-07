-- tagging_sweep_runs — persisted output of scripts/tagging-sweep.mjs (read-only sweep).
-- Lets the command-center render coverage / conflicts / fill-preview in prod WITHOUT re-porting
-- the resolver to TS (the .mjs sweep stays the single engine; the app just reads the latest run).
-- Plan: thoughts/shared/plans/2026-06-03-unified-tagging-engine.md (T3). Additive, no data touched.

CREATE TABLE IF NOT EXISTS public.tagging_sweep_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at      timestamptz NOT NULL DEFAULT now(),
  summary     jsonb NOT NULL DEFAULT '{}'::jsonb,   -- headline counts for quick display
  coverage    jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{area, n, tagged, pct}]
  conflicts   jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{id, name, oppCode, invoiceCode, proposed, reason}]
  fill        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {opps:{auto,review,none}, subs:{auto,review,none}}
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Newest-first reads (the API serves the latest run).
CREATE INDEX IF NOT EXISTS idx_tagging_sweep_runs_run_at ON public.tagging_sweep_runs (run_at DESC);
