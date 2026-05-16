-- Issue #66 pivot — write tracking categories to Xero after the AI grader
-- accepts a high-confidence project_code suggestion.
--
-- Background: ai-route-dext-doc.mjs --apply already writes project_code to
-- the source row in Supabase (xero_transactions.project_code), but the
-- Xero record itself stays untracked — so R&D pack + project reports miss
-- the spend even after the AI accepted it.
--
-- This migration adds two columns that the new push-ai-tracking-to-xero.mjs
-- cron uses to track its own progress so we don't double-apply or silently
-- drop API failures.

ALTER TABLE public.finance_ai_routing_suggestions
  ADD COLUMN IF NOT EXISTS applied_to_xero_at timestamptz,
  ADD COLUMN IF NOT EXISTS applied_to_xero_error text;

CREATE INDEX IF NOT EXISTS finance_ai_routing_xero_pending_idx
  ON public.finance_ai_routing_suggestions (confidence DESC, created_at DESC)
  WHERE source_table = 'xero_transactions'
    AND applied_to_source = true
    AND applied_to_xero_at IS NULL
    AND rejected_at IS NULL
    AND confidence >= 0.85;

COMMENT ON COLUMN public.finance_ai_routing_suggestions.applied_to_xero_at IS
  'Set by scripts/push-ai-tracking-to-xero.mjs once the Xero BankTransaction has been PATCHed with the tracking categories. NULL means pending (or not applicable for non-xero_transactions source).';
COMMENT ON COLUMN public.finance_ai_routing_suggestions.applied_to_xero_error IS
  'Most recent Xero API error from push-ai-tracking-to-xero.mjs (HTTP status + truncated body). Cleared on success.';
