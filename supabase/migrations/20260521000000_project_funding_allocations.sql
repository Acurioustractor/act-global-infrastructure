-- S1: Funder → Project allocation source of truth
-- Tracks committed funding per funder per project, and drawdowns against each commitment.
-- See thoughts/shared/reviews/finance-system-review-2026-05-21.md S1.
-- Applied via Supabase MCP 2026-05-21 (project tednluwflfhxyucgwigh).

CREATE TABLE IF NOT EXISTS project_funding_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text NOT NULL,
  funder_org_name text NOT NULL,
  funder_contact_id text,
  grant_or_contract_ref text,
  committed_amount numeric NOT NULL CHECK (committed_amount >= 0),
  committed_currency text NOT NULL DEFAULT 'AUD',
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'committed'
    CHECK (status IN ('proposed','committed','drawing','closed','withdrawn')),
  drawdown_method text
    CHECK (drawdown_method IN ('invoice','milestone','reimbursement','grant_lump_sum','other') OR drawdown_method IS NULL),
  pile_tag text
    CHECK (pile_tag IN ('voice','flow','ground','grants') OR pile_tag IS NULL),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfa_project_code ON project_funding_allocations(project_code);
CREATE INDEX IF NOT EXISTS idx_pfa_funder ON project_funding_allocations(funder_org_name);
CREATE INDEX IF NOT EXISTS idx_pfa_status ON project_funding_allocations(status);

CREATE TABLE IF NOT EXISTS project_funding_drawdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES project_funding_allocations(id) ON DELETE CASCADE,
  xero_invoice_id text REFERENCES xero_invoices(xero_id),
  drawn_amount numeric NOT NULL CHECK (drawn_amount >= 0),
  drawn_at date NOT NULL,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','xero_invoice_auto','xero_payment_auto','reimbursement')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfd_allocation ON project_funding_drawdowns(allocation_id);
CREATE INDEX IF NOT EXISTS idx_pfd_invoice ON project_funding_drawdowns(xero_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pfd_drawn_at ON project_funding_drawdowns(drawn_at);

CREATE OR REPLACE FUNCTION trigger_set_updated_at_pfa()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS set_pfa_updated_at ON project_funding_allocations;
CREATE TRIGGER set_pfa_updated_at BEFORE UPDATE ON project_funding_allocations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at_pfa();

ALTER TABLE project_funding_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_funding_drawdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pfa_service_role ON project_funding_allocations;
CREATE POLICY pfa_service_role ON project_funding_allocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pfd_service_role ON project_funding_drawdowns;
CREATE POLICY pfd_service_role ON project_funding_drawdowns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE project_funding_allocations IS 'Funder commitments per project. Source of truth for "where are we in our $X allocation?" queries. Created by S1 (2026-05-21).';
COMMENT ON TABLE project_funding_drawdowns IS 'Individual drawdowns against a project_funding_allocations row. Links to xero_invoices when invoiced through Xero; manual entries supported for milestone/reimbursement models.';

CREATE OR REPLACE VIEW v_project_funding_position AS
SELECT
  a.id as allocation_id,
  a.project_code,
  a.funder_org_name,
  a.grant_or_contract_ref,
  a.committed_amount,
  a.status,
  a.period_start,
  a.period_end,
  COALESCE(d.drawn_total, 0) as drawn_amount,
  a.committed_amount - COALESCE(d.drawn_total, 0) as remaining_amount,
  CASE WHEN a.committed_amount > 0
       THEN ROUND(100 * COALESCE(d.drawn_total, 0) / a.committed_amount, 1)
       ELSE NULL END as drawn_pct,
  COALESCE(d.drawdown_count, 0) as drawdown_count,
  d.last_drawn_at,
  a.pile_tag,
  a.notes
FROM project_funding_allocations a
LEFT JOIN (
  SELECT
    allocation_id,
    SUM(drawn_amount) as drawn_total,
    COUNT(*) as drawdown_count,
    MAX(drawn_at) as last_drawn_at
  FROM project_funding_drawdowns
  GROUP BY allocation_id
) d ON d.allocation_id = a.id;

GRANT SELECT ON v_project_funding_position TO authenticated, service_role;
GRANT ALL ON project_funding_allocations TO service_role;
GRANT ALL ON project_funding_drawdowns TO service_role;
