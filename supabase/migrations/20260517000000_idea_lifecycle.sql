-- Pass 2B B1 — Idea board lifecycle migration
-- Plan: ~/.claude/plans/coo-cio-cfo-money-brain-phase2.md (Q3, Q4, Q6, Q7)
--
-- Adds explicit lifecycle stages, owner tracking, kill reasons, and a snooze
-- table to idea_board so the pilot pipeline (73 captured ideas) becomes
-- observable and accountable.

BEGIN;

-- 1. lifecycle_stage — explicit pre-funding flow
ALTER TABLE idea_board
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'idea';

ALTER TABLE idea_board
  DROP CONSTRAINT IF EXISTS idea_board_lifecycle_stage_check;

ALTER TABLE idea_board
  ADD CONSTRAINT idea_board_lifecycle_stage_check
  CHECK (lifecycle_stage IN ('idea','scope','fundraise','start','killed'));

-- 2. owner — per-person staleness reminders (default ben, Nic later)
ALTER TABLE idea_board
  ADD COLUMN IF NOT EXISTS owner text DEFAULT 'ben';

-- 3. kill_reason — optional free-text when stage = 'killed' (Q12 default: optional)
ALTER TABLE idea_board
  ADD COLUMN IF NOT EXISTS kill_reason text;

-- 4. Backfill 73 existing rows from legacy status field
--    open      → idea       (still raw, not scoped yet)
--    exploring → scope      (actively being shaped)
--    doing     → start      (already in-flight, becomes look-back)
--    done      → start      (shipped, also a look-back)
UPDATE idea_board
   SET lifecycle_stage = CASE status
     WHEN 'open'      THEN 'idea'
     WHEN 'exploring' THEN 'scope'
     WHEN 'doing'     THEN 'start'
     WHEN 'done'      THEN 'start'
     ELSE 'idea'
   END,
       owner = COALESCE(owner, 'ben');

-- 5. Index for stage filters + per-owner reminder queries
CREATE INDEX IF NOT EXISTS idea_board_lifecycle_owner_idx
  ON idea_board (lifecycle_stage, owner, updated_at DESC);

-- 6. idea_snoozes — Q6: cap at 3 snoozes before forced decision
CREATE TABLE IF NOT EXISTS idea_snoozes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id      uuid NOT NULL REFERENCES idea_board(id) ON DELETE CASCADE,
  snoozed_at   timestamptz NOT NULL DEFAULT now(),
  snoozed_until date NOT NULL,
  by_owner     text NOT NULL DEFAULT 'ben'
);

CREATE INDEX IF NOT EXISTS idea_snoozes_idea_id_idx ON idea_snoozes (idea_id);
CREATE INDEX IF NOT EXISTS idea_snoozes_until_idx   ON idea_snoozes (snoozed_until);

COMMIT;
