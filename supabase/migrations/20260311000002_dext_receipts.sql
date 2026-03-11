-- Dext receipts imported from export files
-- Tracks every receipt in Dext and its matching status against Xero
CREATE TABLE IF NOT EXISTS dext_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT,
  receipt_date DATE,
  dext_id TEXT,
  file_type TEXT,
  filename TEXT NOT NULL UNIQUE,
  -- Xero matching
  xero_transaction_id TEXT,
  match_confidence INT CHECK (match_confidence BETWEEN 0 AND 100),
  match_method TEXT, -- 'vendor_date', 'vendor_amount', 'manual'
  -- Metadata
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_dext_receipts_vendor ON dext_receipts(vendor_name);
CREATE INDEX IF NOT EXISTS idx_dext_receipts_date ON dext_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_dext_receipts_xero ON dext_receipts(xero_transaction_id);
CREATE INDEX IF NOT EXISTS idx_dext_receipts_unmatched ON dext_receipts(vendor_name) WHERE xero_transaction_id IS NULL;
