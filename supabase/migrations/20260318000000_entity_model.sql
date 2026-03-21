-- Entity-Aware Data Model for ACT Finance Engine
-- Supports sole trader → Pty Ltd → dual entity (Foundation + Ventures) transition
--
-- Timeline:
--   Now: ACT-ST (sole trader, ABN 21 591 780 066)
--   July 2026: ACT-V (ACT Ventures Pty Ltd, new ABN)
--   Later: ACT-F (ACT Foundation CLG)

-- 1. Entity registry
CREATE TABLE IF NOT EXISTS act_entities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,           -- 'ACT-ST', 'ACT-V', 'ACT-F'
  name text NOT NULL,
  entity_type text NOT NULL,           -- 'sole_trader', 'pty_ltd', 'clg'
  abn text,
  xero_tenant_id text,                 -- Links to Xero org
  active_from date NOT NULL,
  active_to date,                       -- NULL = currently active
  metadata jsonb DEFAULT '{}',         -- Flexible: bank details, registration info, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed current entity
INSERT INTO act_entities (code, name, entity_type, abn, xero_tenant_id, active_from)
VALUES (
  'ACT-ST',
  'Nicholas Marchesi T/as A Curious Tractor',
  'sole_trader',
  '21591780066',
  '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0',
  '2024-01-01'
) ON CONFLICT (code) DO NOTHING;

-- 2. Add entity_code to financial tables (default = current sole trader)
ALTER TABLE xero_transactions ADD COLUMN IF NOT EXISTS entity_code text DEFAULT 'ACT-ST';
ALTER TABLE xero_invoices ADD COLUMN IF NOT EXISTS entity_code text DEFAULT 'ACT-ST';
ALTER TABLE receipt_emails ADD COLUMN IF NOT EXISTS entity_code text DEFAULT 'ACT-ST';
ALTER TABLE vendor_project_rules ADD COLUMN IF NOT EXISTS entity_code text DEFAULT 'ACT-ST';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS entity_code text DEFAULT 'ACT-ST';
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS entity_code text DEFAULT 'ACT-ST';

-- 3. Indexes for entity filtering
CREATE INDEX IF NOT EXISTS idx_xero_transactions_entity ON xero_transactions(entity_code);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_entity ON xero_invoices(entity_code);
CREATE INDEX IF NOT EXISTS idx_receipt_emails_entity ON receipt_emails(entity_code);

-- 4. Comment for documentation
COMMENT ON TABLE act_entities IS 'ACT legal entity registry. Supports sole trader → Pty Ltd → dual entity transition.';
COMMENT ON COLUMN xero_transactions.entity_code IS 'Legal entity this transaction belongs to. Default ACT-ST (sole trader).';
