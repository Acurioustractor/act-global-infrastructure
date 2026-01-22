-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EXECUTING AGENTS - Actions that actually DO things
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Add execution-related columns to agent_proposals if not exists
DO $$
BEGIN
  -- Add action_payload for the exact action to execute
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_proposals' AND column_name = 'action_payload'
  ) THEN
    ALTER TABLE agent_proposals ADD COLUMN action_payload JSONB;
  END IF;

  -- Add execution_channel for tracking which channel was used
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_proposals' AND column_name = 'execution_channel'
  ) THEN
    ALTER TABLE agent_proposals ADD COLUMN execution_channel TEXT;
  END IF;

  -- Add target_contact_id for linking to contacts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_proposals' AND column_name = 'target_contact_id'
  ) THEN
    ALTER TABLE agent_proposals ADD COLUMN target_contact_id TEXT;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- OUTREACH ACTION TYPES
-- These are the actions that actually send messages to real people
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO agent_actions (
  action_name, description, autonomy_level, risk_level, reversible,
  script_path, bounds
)
VALUES
  -- Level 2: Supervised - requires human approval before sending
  ('send_signal', 'Send Signal message to a contact', 2, 'medium', FALSE,
   'scripts/lib/action-executor.mjs', '{"max_messages_per_day": 10, "requires_contact_id": true}'),

  ('send_email', 'Send email to a contact', 2, 'medium', FALSE,
   'scripts/lib/action-executor.mjs', '{"max_messages_per_day": 10, "requires_contact_id": true}'),

  ('send_discord_dm', 'Send Discord direct message', 2, 'low', FALSE,
   'scripts/lib/action-executor.mjs', '{"max_messages_per_day": 20}'),

  -- Level 3: Autonomous - can log without approval
  ('log_interaction', 'Log communication to history', 3, 'low', TRUE,
   'scripts/lib/action-executor.mjs', '{}'),

  ('update_contact_lastcontact', 'Update contact last_contact_date', 3, 'low', TRUE,
   'scripts/lib/action-executor.mjs', '{}'),

  ('schedule_followup', 'Schedule a follow-up reminder', 3, 'low', TRUE,
   'scripts/lib/action-executor.mjs', '{"max_days": 90}'),

  -- Level 2: Supervised - CRM updates need approval
  ('update_contact', 'Update contact details in CRM', 2, 'medium', TRUE,
   'scripts/lib/action-executor.mjs', '{}'),

  ('create_task', 'Create a task or todo item', 2, 'low', TRUE,
   'scripts/lib/action-executor.mjs', '{}')

ON CONFLICT (action_name) DO UPDATE SET
  description = EXCLUDED.description,
  autonomy_level = EXCLUDED.autonomy_level,
  risk_level = EXCLUDED.risk_level,
  reversible = EXCLUDED.reversible,
  script_path = EXCLUDED.script_path,
  bounds = EXCLUDED.bounds,
  updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────
-- OUTREACH QUEUE VIEW
-- Shows pending outreach proposals ready for approval
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW outreach_approval_queue AS
SELECT
  p.id,
  p.agent_id,
  p.title,
  p.description,
  p.target_contact_id,
  p.action_payload->>'message' as message_preview,
  p.action_payload->>'to' as recipient,
  p.execution_channel,
  p.priority,
  p.reasoning->>'trigger' as trigger_reason,
  p.reasoning->>'confidence' as confidence,
  c.full_name as contact_name,
  c.email as contact_email,
  c.phone as contact_phone,
  rh.temperature as relationship_temp,
  rh.days_since_contact,
  p.created_at
FROM agent_proposals p
LEFT JOIN ghl_contacts c ON p.target_contact_id = c.ghl_id
LEFT JOIN relationship_health rh ON p.target_contact_id = rh.ghl_contact_id
WHERE p.status = 'pending'
  AND p.action_name IN ('send_signal', 'send_email', 'send_discord_dm')
ORDER BY
  CASE p.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    ELSE 4
  END,
  p.created_at;

-- ─────────────────────────────────────────────────────────────────────
-- OUTREACH EXECUTION LOG
-- Track all executed outreach actions
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to proposal (if there was one)
  proposal_id UUID REFERENCES agent_proposals(id),

  -- Who and what
  agent_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  contact_name TEXT,

  -- The message
  channel TEXT NOT NULL, -- 'signal', 'email', 'discord'
  message_content TEXT NOT NULL,
  message_subject TEXT,

  -- Execution details
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
  delivery_error TEXT,

  -- Approval info
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  was_modified BOOLEAN DEFAULT FALSE,
  original_message TEXT, -- If human modified it

  -- Follow-up scheduling
  followup_scheduled_for TIMESTAMPTZ,
  followup_completed BOOLEAN DEFAULT FALSE,

  -- Metrics
  response_received BOOLEAN DEFAULT FALSE,
  response_received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach_executions(contact_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_agent ON outreach_executions(agent_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_followup ON outreach_executions(followup_scheduled_for)
  WHERE followup_completed = FALSE;

-- ─────────────────────────────────────────────────────────────────────
-- FUNCTION: Execute approved outreach
-- Called after approval to actually send and log
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_outreach_execution(
  p_proposal_id UUID,
  p_approved_by TEXT,
  p_modified_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_proposal agent_proposals%ROWTYPE;
  v_execution_id UUID;
BEGIN
  -- Get the proposal
  SELECT * INTO v_proposal FROM agent_proposals WHERE id = p_proposal_id;

  IF v_proposal.status != 'approved' THEN
    RAISE EXCEPTION 'Proposal must be approved first (current status: %)', v_proposal.status;
  END IF;

  -- Insert execution record
  INSERT INTO outreach_executions (
    proposal_id,
    agent_id,
    contact_id,
    contact_name,
    channel,
    message_content,
    approved_by,
    approved_at,
    was_modified,
    original_message
  )
  SELECT
    p_proposal_id,
    v_proposal.agent_id,
    v_proposal.target_contact_id,
    c.full_name,
    v_proposal.execution_channel,
    COALESCE(p_modified_message, v_proposal.action_payload->>'message'),
    p_approved_by,
    NOW(),
    p_modified_message IS NOT NULL,
    CASE WHEN p_modified_message IS NOT NULL
         THEN v_proposal.action_payload->>'message'
         ELSE NULL
    END
  FROM ghl_contacts c
  WHERE c.ghl_id = v_proposal.target_contact_id
  RETURNING id INTO v_execution_id;

  -- Update proposal status
  UPDATE agent_proposals SET
    status = 'executing',
    execution_started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_proposal_id;

  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────
-- FUNCTION: Mark outreach as sent
-- Called after the actual send is complete
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_outreach_sent(
  p_execution_id UUID,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL,
  p_followup_days INTEGER DEFAULT 14
)
RETURNS VOID AS $$
DECLARE
  v_execution outreach_executions%ROWTYPE;
BEGIN
  SELECT * INTO v_execution FROM outreach_executions WHERE id = p_execution_id;

  IF p_success THEN
    -- Update execution as sent
    UPDATE outreach_executions SET
      delivery_status = 'sent',
      followup_scheduled_for = NOW() + (p_followup_days || ' days')::INTERVAL
    WHERE id = p_execution_id;

    -- Update proposal as completed
    UPDATE agent_proposals SET
      status = 'completed',
      execution_completed_at = NOW(),
      execution_result = jsonb_build_object(
        'sent_at', NOW(),
        'channel', v_execution.channel,
        'followup_days', p_followup_days
      ),
      updated_at = NOW()
    WHERE id = v_execution.proposal_id;

    -- Log to communications history
    INSERT INTO communications_history (
      ghl_contact_id,
      channel,
      direction,
      content_preview,
      sentiment,
      occurred_at,
      raw_data
    ) VALUES (
      v_execution.contact_id,
      v_execution.channel,
      'outbound',
      LEFT(v_execution.message_content, 500),
      'positive',
      NOW(),
      jsonb_build_object(
        'agent_id', v_execution.agent_id,
        'execution_id', p_execution_id,
        'approved_by', v_execution.approved_by
      )
    );

    -- Update contact last_contact_date
    UPDATE ghl_contacts SET
      last_contact_date = NOW(),
      updated_at = NOW()
    WHERE ghl_id = v_execution.contact_id;

    -- Update relationship health
    UPDATE relationship_health SET
      last_contact_at = NOW(),
      days_since_contact = 0,
      updated_at = NOW()
    WHERE ghl_contact_id = v_execution.contact_id;

  ELSE
    -- Mark as failed
    UPDATE outreach_executions SET
      delivery_status = 'failed',
      delivery_error = p_error
    WHERE id = p_execution_id;

    UPDATE agent_proposals SET
      status = 'failed',
      execution_completed_at = NOW(),
      execution_error = p_error,
      updated_at = NOW()
    WHERE id = v_execution.proposal_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────
-- VIEW: Due follow-ups
-- Contacts where follow-up is due
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW due_followups AS
SELECT
  oe.id as execution_id,
  oe.contact_id,
  oe.contact_name,
  oe.channel,
  oe.sent_at as last_outreach,
  oe.followup_scheduled_for,
  oe.agent_id,
  c.email,
  c.phone,
  rh.temperature,
  rh.days_since_contact
FROM outreach_executions oe
JOIN ghl_contacts c ON oe.contact_id = c.ghl_id
LEFT JOIN relationship_health rh ON oe.contact_id = rh.ghl_contact_id
WHERE oe.followup_completed = FALSE
  AND oe.followup_scheduled_for <= NOW()
  AND oe.response_received = FALSE
ORDER BY oe.followup_scheduled_for ASC;

-- ─────────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-mark follow-up complete if response received
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_response_for_followup()
RETURNS TRIGGER AS $$
BEGIN
  -- If we get an inbound message from a contact with pending follow-up
  IF NEW.direction = 'inbound' THEN
    UPDATE outreach_executions SET
      response_received = TRUE,
      response_received_at = NOW(),
      followup_completed = TRUE
    WHERE contact_id = NEW.ghl_contact_id
      AND followup_completed = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_followup_on_inbound ON communications_history;
CREATE TRIGGER check_followup_on_inbound
  AFTER INSERT ON communications_history
  FOR EACH ROW
  WHEN (NEW.direction = 'inbound')
  EXECUTE FUNCTION check_response_for_followup();
