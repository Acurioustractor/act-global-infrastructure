-- AI routing suggestions for unrouted Dext / bank / Xero documents.
-- The grader script writes here; the workbench reads here; --apply mode
-- copies high-confidence suggestions into the source row's project_code.

CREATE TABLE IF NOT EXISTS public.finance_ai_routing_suggestions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table           text NOT NULL CHECK (source_table IN (
    'bank_statement_lines', 'receipt_emails', 'xero_transactions', 'finance_receipt_documents'
  )),
  source_record_id       text NOT NULL,

  -- Frozen inputs at grade time
  vendor_name            text,
  amount                 numeric,
  txn_date               date,
  bank_account           text,
  description            text,

  -- Grader output
  suggested_project_code text NOT NULL,
  confidence             numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reason                 text,
  risk_flags             text[] DEFAULT '{}',

  model                  text NOT NULL,
  prompt_version         text NOT NULL DEFAULT 'v1',
  input_tokens           integer,
  output_tokens          integer,

  -- Lifecycle
  created_at             timestamptz NOT NULL DEFAULT now(),
  applied_at             timestamptz,
  applied_to_source      boolean NOT NULL DEFAULT false,
  rejected_at            timestamptz,
  rejected_reason        text,
  superseded_at          timestamptz,

  UNIQUE (source_table, source_record_id, prompt_version, model)
);

CREATE INDEX IF NOT EXISTS finance_ai_routing_source_idx
  ON public.finance_ai_routing_suggestions (source_table, source_record_id);

CREATE INDEX IF NOT EXISTS finance_ai_routing_unapplied_idx
  ON public.finance_ai_routing_suggestions (suggested_project_code, confidence DESC)
  WHERE applied_to_source = false AND rejected_at IS NULL;

CREATE INDEX IF NOT EXISTS finance_ai_routing_high_conf_idx
  ON public.finance_ai_routing_suggestions (created_at DESC)
  WHERE confidence >= 0.85 AND applied_to_source = false;

COMMENT ON TABLE public.finance_ai_routing_suggestions IS
  'AI grader (Sonnet 4.6) suggestions for project codes on unrouted bank/receipt/Xero rows. Written by scripts/ai-route-dext-doc.mjs. High-confidence (>= 0.85, not ASK_USER/SL_REVIEW) auto-apply with --apply.';
