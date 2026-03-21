-- Receipt Emails Pipeline
-- Replaces Dext as the receipt capture and matching system
-- Flow: Gmail -> receipt_emails -> AI match -> Xero Attachments API

CREATE TABLE IF NOT EXISTS receipt_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id text UNIQUE NOT NULL,
  mailbox text NOT NULL,
  from_email text,
  subject text,
  received_at timestamptz,
  vendor_name text,
  amount_detected numeric(10,2),
  currency text DEFAULT 'AUD',

  -- Attachment storage (Supabase Storage bucket: receipt-attachments)
  attachment_url text,
  attachment_filename text,
  attachment_content_type text,
  attachment_size_bytes integer,

  -- Xero matching
  xero_transaction_id text,          -- Our internal xero_transactions.id
  xero_bank_transaction_id text,     -- Xero API BankTransactionID (for attachment upload)
  xero_invoice_id text,              -- Xero API InvoiceID (for bill receipts)
  match_confidence numeric(5,2),
  match_method text,                 -- 'auto_heuristic', 'auto_ai', 'manual', 'native_integration'

  -- Project tracking
  project_code text,                 -- ACT-XX project code

  -- Pipeline status
  status text DEFAULT 'captured' CHECK (status IN (
    'captured',      -- Email saved, attachment stored
    'matched',       -- Matched to Xero transaction
    'uploaded',      -- Attachment uploaded to Xero
    'failed',        -- Upload failed (see error_message)
    'no_match',      -- No matching transaction found (yet)
    'skipped',       -- Deliberately skipped (duplicate, personal, etc.)
    'review'         -- Needs human review
  )),
  error_message text,
  retry_count integer DEFAULT 0,

  -- Source tracking (for Dext migration)
  source text DEFAULT 'gmail',       -- 'gmail', 'dext_import', 'mobile', 'manual'
  dext_item_id text,                 -- Dext Item ID if imported from Dext export

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for pipeline queries
CREATE INDEX idx_receipt_emails_status ON receipt_emails(status);
CREATE INDEX idx_receipt_emails_vendor ON receipt_emails(vendor_name);
CREATE INDEX idx_receipt_emails_date ON receipt_emails(received_at);
CREATE INDEX idx_receipt_emails_xero_txn ON receipt_emails(xero_transaction_id);
CREATE INDEX idx_receipt_emails_project ON receipt_emails(project_code);
CREATE INDEX idx_receipt_emails_source ON receipt_emails(source);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_receipt_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipt_emails_updated_at
  BEFORE UPDATE ON receipt_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_emails_updated_at();

-- Storage bucket for receipt attachments (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-attachments', 'receipt-attachments', false);

COMMENT ON TABLE receipt_emails IS 'Receipt capture pipeline — replaces Dext. Gmail->capture->AI match->Xero Attachments API';
