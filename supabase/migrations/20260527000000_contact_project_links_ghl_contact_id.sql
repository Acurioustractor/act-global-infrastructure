-- Add per-GHL-contact linking to contact_project_links.
--
-- The command-center already WRITES and READS ghl_contact_id (apps/command-center/src/app/api/
-- contacts/[id]/link-project + api/intelligence/actions) but the column never existed — the table
-- keyed only on the canonical entity_id. Per Ben's 2026-05-27 decision the link is per GHL contact.
-- Keep entity_id (FK → canonical_entities) for the canonical relationship; add ghl_contact_id with
-- its own unique key so the upsert onConflict ('ghl_contact_id,project_code') works.
--
-- Backfill verified against live data: all 487 existing rows map to a primary ghl_id via
-- ghl_contacts.canonical_entity_id, producing 0 duplicate (ghl_contact_id, project_code) pairs.

BEGIN;

ALTER TABLE contact_project_links ADD COLUMN IF NOT EXISTS ghl_contact_id text;

-- Each canonical entity → its primary (earliest-created) GHL contact's ghl_id.
UPDATE contact_project_links cpl
SET ghl_contact_id = sub.ghl_id
FROM (
  SELECT DISTINCT ON (canonical_entity_id) canonical_entity_id, ghl_id
  FROM ghl_contacts
  WHERE canonical_entity_id IS NOT NULL AND ghl_id IS NOT NULL
  ORDER BY canonical_entity_id, created_at
) sub
WHERE cpl.entity_id = sub.canonical_entity_id
  AND cpl.ghl_contact_id IS NULL;

-- NULLs are distinct in a multi-column UNIQUE, so any unmapped legacy rows (none today) don't collide.
ALTER TABLE contact_project_links
  ADD CONSTRAINT contact_project_links_ghl_contact_id_project_code_key
  UNIQUE (ghl_contact_id, project_code);

CREATE INDEX IF NOT EXISTS idx_cpl_ghl_contact_id ON contact_project_links (ghl_contact_id);

COMMIT;
