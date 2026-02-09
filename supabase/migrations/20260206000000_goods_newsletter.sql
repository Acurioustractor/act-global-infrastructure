-- Goods Newsletter: Contact consent + outreach tracking
-- Adds newsletter subscription fields to ghl_contacts
-- and outreach context fields to communications_history.

ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS newsletter_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS newsletter_unsubscribed_at TIMESTAMPTZ;

ALTER TABLE communications_history
  ADD COLUMN IF NOT EXISTS outreach_reason TEXT,
  ADD COLUMN IF NOT EXISTS outreach_campaign TEXT;

CREATE INDEX IF NOT EXISTS idx_ghl_contacts_newsletter
  ON ghl_contacts (newsletter_consent) WHERE newsletter_consent = TRUE;
