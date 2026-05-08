-- Add lane and lcaa_phase tags to bank_statement_lines so every dollar can be
-- mapped to the four lanes (To Us / To Down / To Grow / To Others) and an
-- LCAA method phase (Listen / Curiosity / Action / Art).
--
-- Source-of-truth for the lanes: wiki/concepts/four-lanes.md
-- Source-of-truth for the method: wiki/concepts/lcaa-method.md
-- Strategy plan: thoughts/shared/plans/strategy-from-soul.md (item 8)
--
-- Applied via mcp__supabase__apply_migration on 2026-04-29.
-- This file mirrors that migration for git history.

-- Four-lane money flow tag
ALTER TABLE public.bank_statement_lines
  ADD COLUMN lane text
    CHECK (lane IS NULL OR lane IN ('to_us', 'to_down', 'to_grow', 'to_others'));

-- LCAA phase tag
ALTER TABLE public.bank_statement_lines
  ADD COLUMN lcaa_phase text
    CHECK (lcaa_phase IS NULL OR lcaa_phase IN ('listen', 'curiosity', 'action', 'art'));

-- Provenance: where each tag came from
ALTER TABLE public.bank_statement_lines
  ADD COLUMN lane_source text;

ALTER TABLE public.bank_statement_lines
  ADD COLUMN lcaa_phase_source text;

-- Indexes for dashboard rollups (partial indexes, only on tagged rows)
CREATE INDEX idx_bsl_lane ON public.bank_statement_lines(lane) WHERE lane IS NOT NULL;
CREATE INDEX idx_bsl_lcaa_phase ON public.bank_statement_lines(lcaa_phase) WHERE lcaa_phase IS NOT NULL;

-- Documentation
COMMENT ON COLUMN public.bank_statement_lines.lane IS
  'Four-lane money flow tag. See wiki/concepts/four-lanes.md. Values: to_us, to_down, to_grow, to_others.';

COMMENT ON COLUMN public.bank_statement_lines.lcaa_phase IS
  'LCAA method phase for the spend. See wiki/concepts/lcaa-method.md. Values: listen, curiosity, action, art.';

COMMENT ON COLUMN public.bank_statement_lines.lane_source IS
  'How lane was assigned. Values: rule, manual, agent. Mirrors project_source pattern.';

COMMENT ON COLUMN public.bank_statement_lines.lcaa_phase_source IS
  'How lcaa_phase was assigned. Values: rule, manual, agent. Mirrors project_source pattern.';
