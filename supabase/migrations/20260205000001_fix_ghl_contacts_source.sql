-- Fix: Add missing 'source' column to ghl_contacts
-- This column is used by contact-intelligence.mjs for auto-created contacts from Gmail sync.
-- Without it, auto-creation fails with: "Could not find the 'source' column of 'ghl_contacts' in the schema cache"

ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ghl';

COMMENT ON COLUMN ghl_contacts.source IS 'Origin of contact: ghl (synced from GHL), gmail_auto (auto-created from email), manual';
