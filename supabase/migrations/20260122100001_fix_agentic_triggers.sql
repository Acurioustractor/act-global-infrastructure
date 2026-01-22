-- Fix trigger recursion in agentic workflow

-- Drop the problematic trigger that causes infinite recursion
DROP TRIGGER IF EXISTS check_expired_proposals ON agent_proposals;

-- Replace with a simpler function that doesn't cause recursion
-- This should be called via a cron job instead of a trigger
CREATE OR REPLACE FUNCTION cleanup_expired_proposals()
RETURNS void AS $$
BEGIN
  UPDATE agent_proposals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND deadline IS NOT NULL
    AND deadline < NOW();
END;
$$ LANGUAGE plpgsql;

-- The flag trigger is fine - it only fires BEFORE INSERT, not on UPDATE
-- Just ensure it doesn't cause issues
DROP TRIGGER IF EXISTS auto_flag_executions ON autonomous_executions;
CREATE TRIGGER auto_flag_executions
  BEFORE INSERT ON autonomous_executions
  FOR EACH ROW
  EXECUTE FUNCTION flag_low_confidence_executions();
