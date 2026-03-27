-- R&D Tax Incentive tracking + Income classification
-- These columns were applied directly to production during the FY26 financial
-- infrastructure build. This migration captures them for version control.
--
-- Context: Australian R&D Tax Incentive (43.5% refundable offset for <$20M turnover)
-- requires tracking which transactions are R&D eligible and their category
-- (core vs supporting). Income classification enables grant vs commercial
-- vs philanthropy revenue breakdown.

-- 1. xero_transactions: R&D eligibility flag + category
ALTER TABLE xero_transactions
  ADD COLUMN IF NOT EXISTS rd_eligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rd_category text;

COMMENT ON COLUMN xero_transactions.rd_eligible IS 'Whether this transaction qualifies for Australian R&D Tax Incentive';
COMMENT ON COLUMN xero_transactions.rd_category IS 'R&D category: core (experimental), supporting (directly related), salary (founder time)';

-- 2. xero_invoices: Income type classification
ALTER TABLE xero_invoices
  ADD COLUMN IF NOT EXISTS income_type text;

COMMENT ON COLUMN xero_invoices.income_type IS 'Revenue classification: grant, commercial, philanthropy, passive, internal-transfer, unclassified';

-- 3. vendor_project_rules: Auto-tagging rules for income type + R&D category
ALTER TABLE vendor_project_rules
  ADD COLUMN IF NOT EXISTS income_type text,
  ADD COLUMN IF NOT EXISTS rd_category text;

COMMENT ON COLUMN vendor_project_rules.income_type IS 'Default income_type to apply when this vendor rule matches an invoice';
COMMENT ON COLUMN vendor_project_rules.rd_category IS 'Default rd_category to apply when this vendor rule matches a transaction';

-- 4. Trigger: Auto-tag invoice income_type from vendor_project_rules
CREATE OR REPLACE FUNCTION auto_tag_invoice_income_type()
RETURNS trigger AS $$
BEGIN
  IF NEW.income_type IS NULL AND NEW.contact_name IS NOT NULL THEN
    SELECT vpr.income_type INTO NEW.income_type
    FROM vendor_project_rules vpr
    WHERE vpr.vendor_name = NEW.contact_name
      AND vpr.income_type IS NOT NULL
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate to ensure latest version
DROP TRIGGER IF EXISTS trg_auto_tag_invoice_income_type ON xero_invoices;
CREATE TRIGGER trg_auto_tag_invoice_income_type
  BEFORE INSERT OR UPDATE ON xero_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_tag_invoice_income_type();
