-- Pass 2B B4 follow-up — track stage-entered timestamp so staleness reminders
-- measure time-in-current-stage, not time-since-any-edit (which the updated_at
-- trigger trg_idea_board_updated_at touches on every UPDATE).
--
-- Backfills from created_at since all existing 73 rows predate the lifecycle
-- system. Going forward, executeTransitionIdeaStage writes this field on
-- stage moves.

BEGIN;

ALTER TABLE idea_board
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz;

UPDATE idea_board
   SET stage_entered_at = COALESCE(stage_entered_at, created_at);

ALTER TABLE idea_board
  ALTER COLUMN stage_entered_at SET DEFAULT now(),
  ALTER COLUMN stage_entered_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idea_board_stage_entered_idx
  ON idea_board (lifecycle_stage, stage_entered_at);

COMMIT;
