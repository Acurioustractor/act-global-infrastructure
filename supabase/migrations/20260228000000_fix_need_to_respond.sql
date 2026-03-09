-- Fix v_need_to_respond: add dismissal support + spam filtering
-- Phase 1d of data freshness plan

-- Add dismissal columns to communications_history
ALTER TABLE communications_history
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_reason text;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_comms_dismissed
  ON communications_history (dismissed_at)
  WHERE dismissed_at IS NOT NULL;

-- Recreate view with dismissal + spam + staleness filters
DROP VIEW IF EXISTS v_need_to_respond;

CREATE VIEW v_need_to_respond AS
SELECT
  ch.id,
  ch.ghl_contact_id,
  ch.channel,
  ch.direction,
  ch.from_identity,
  ch.to_identities,
  ch.subject,
  ch.content_preview,
  ch.full_content_ref,
  ch.summary,
  ch.sentiment,
  ch.topics,
  ch.action_items,
  ch.key_decisions,
  ch.waiting_for_response,
  ch.response_needed_by,
  ch.follow_up_date,
  ch.source_system,
  ch.source_id,
  ch.source_thread_id,
  ch.parent_id,
  ch.occurred_at,
  ch.synced_at,
  ch.enriched_at,
  ch.created_at,
  ch.updated_at,
  ch.dismissed_at,
  ch.dismissed_reason,
  c.full_name AS contact_name,
  c.email AS contact_email,
  EXTRACT(day FROM now() - ch.occurred_at) AS days_since
FROM communications_history ch
JOIN ghl_contacts c ON ch.ghl_contact_id = c.ghl_id
WHERE ch.waiting_for_response = true
  AND ch.response_needed_by = 'us'
  -- Exclude dismissed emails
  AND ch.dismissed_at IS NULL
  -- Exclude noreply/automated senders (use c.email from contacts, handle NULLs)
  AND COALESCE(c.email, '') NOT ILIKE '%noreply%'
  AND COALESCE(c.email, '') NOT ILIKE '%no-reply%'
  AND COALESCE(c.email, '') NOT ILIKE '%donotreply%'
  AND COALESCE(c.email, '') NOT ILIKE '%notifications@%'
  AND COALESCE(c.email, '') NOT ILIKE '%mailer-daemon@%'
  -- Exclude emails older than 90 days (stale)
  AND ch.occurred_at > now() - interval '90 days'
ORDER BY ch.occurred_at DESC;

COMMENT ON VIEW v_need_to_respond IS 'Emails waiting for our response, excluding dismissed, noreply senders, and >90 day old emails';
