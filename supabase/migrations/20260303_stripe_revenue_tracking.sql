-- Add Stripe payment tracking columns to revenue_stream_entries
-- Enables linking individual Stripe payments to revenue entries

ALTER TABLE revenue_stream_entries
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

-- Index for deduplication — prevent double-recording from webhook retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_entries_stripe_pi
  ON revenue_stream_entries (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Index for contact lookups
CREATE INDEX IF NOT EXISTS idx_revenue_entries_customer_email
  ON revenue_stream_entries (customer_email)
  WHERE customer_email IS NOT NULL;

COMMENT ON COLUMN revenue_stream_entries.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for deduplication';
COMMENT ON COLUMN revenue_stream_entries.ghl_contact_id IS 'Linked GHL contact for CRM attribution';
