-- Pass 2C C1 — Ack tables for compliance + idea accountability
-- Plan: ~/.claude/plans/coo-cio-cfo-money-brain-phase2.md (Pass 2C)
--
-- Lightweight ack tables let the AT RISK pane and weekly digest answer:
-- "did Ben actually see/action this, or did it just sit there?"
--
-- - compliance_ack tracks acks of wiki/GHL obligations (BAS, R&D, grant acquittals).
-- - idea_ack tracks acks of nightly idea reminders (Pass 2B output).
--
-- IDs are slugs (e.g. 'bas-q4-fy26'), not FKs — the canonical list lives in
-- wiki/finance/compliance-calendar.md + GHL opportunities, not a Postgres table.

BEGIN;

CREATE TABLE IF NOT EXISTS compliance_ack (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id text NOT NULL,
  acked_at      timestamptz NOT NULL DEFAULT now(),
  acked_by      text NOT NULL,
  acked_via     text                  -- 'telegram' | 'command-page' | 'api'
);

CREATE INDEX IF NOT EXISTS compliance_ack_obligation_idx
  ON compliance_ack (obligation_id, acked_at DESC);

CREATE TABLE IF NOT EXISTS idea_ack (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     uuid NOT NULL REFERENCES idea_board(id) ON DELETE CASCADE,
  acked_at    timestamptz NOT NULL DEFAULT now(),
  acked_by    text NOT NULL,
  reminder_id text                    -- which nightly reminder run this acks
);

CREATE INDEX IF NOT EXISTS idea_ack_idea_idx
  ON idea_ack (idea_id, acked_at DESC);

COMMIT;
