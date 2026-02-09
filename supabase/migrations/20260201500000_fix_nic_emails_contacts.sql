-- Fix Nic's unlinked emails + create missing contacts
-- Related: multi-mailbox Gmail sync + internal sender contact matching
-- NOTE: Already executed manually 2026-02-01. Migration file kept for reference.

-- 1. Create missing contacts for recipients on Nic's emails
-- (full_name is a generated column; ghl_location_id is NOT NULL)
INSERT INTO ghl_contacts (ghl_id, ghl_location_id, email, first_name, last_name, company_name, auto_created, auto_created_from, created_at, updated_at)
VALUES
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'a.machuca@snowfoundation.org.au', 'Ashley', 'Machuca', 'Snow Foundation', true, 'manual_import', now(), now()),
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'm.meredith@snowfoundation.org.au', 'Maree', 'Meredith', 'Snow Foundation', true, 'manual_import', now(), now()),
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'brad@powerwells.org', 'Brad', NULL, 'Powerwells', true, 'manual_import', now(), now()),
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'ceo@jvtrust.org.au', NULL, NULL, 'JV Trust', true, 'manual_import', now(), now()),
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'jenn@anat.org.au', 'Jenn', 'Brazier', 'ANAT', true, 'manual_import', now(), now()),
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'pix@anat.org.au', 'Steven', 'Pickles', 'ANAT', true, 'manual_import', now(), now()),
  ('manual_' || gen_random_uuid(), 'agzsSZWgovjwgpcoASWG', 'accounts@julalikari.com.au', 'Julalikari', 'Accounts', 'Julalikari Council', true, 'manual_import', now(), now());

-- 2. Relink Nic's emails that have ghl_contact_id = null
-- These are emails FROM @act.place/@acurioustractor.com where the system
-- tried to match the sender (own-domain) instead of the external recipient.
-- We match TO/CC recipients to the newly created (or existing) contacts.
UPDATE communications_history ch
SET ghl_contact_id = gc.ghl_id
FROM ghl_contacts gc
WHERE ch.ghl_contact_id IS NULL
  AND ch.channel = 'email'
  AND ch.source_system = 'gmail'
  AND (
    ch.metadata->>'from' ILIKE '%@act.place%'
    OR ch.metadata->>'from' ILIKE '%@acurioustractor.com%'
    OR ch.metadata->>'from' ILIKE '%@akindtractor.org%'
  )
  AND (
    ch.metadata->>'to' ILIKE '%' || gc.email || '%'
    OR ch.metadata->>'cc' ILIKE '%' || gc.email || '%'
  );

-- 3. Reset intelligence_version on own-domain emails so enrichment re-processes them
UPDATE communications_history
SET intelligence_version = NULL
WHERE channel = 'email'
  AND source_system = 'gmail'
  AND (
    metadata->>'from' ILIKE '%@act.place%'
    OR metadata->>'from' ILIKE '%@acurioustractor.com%'
    OR metadata->>'from' ILIKE '%@akindtractor.org%'
  );
