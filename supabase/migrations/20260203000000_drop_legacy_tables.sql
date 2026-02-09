-- Drop legacy tables that have been superseded by canonical_entities/entity_identifiers
-- Confirmed zero production dependencies (2026-02-03 audit)
--
-- entities → replaced by canonical_entities
-- entity_mappings → replaced by entity_identifiers
-- contact_review_decisions → one-off migration artifact, never used in production

-- Safety: create backup tables first (can drop these after confirming)
CREATE TABLE IF NOT EXISTS _backup_entities AS SELECT * FROM entities;
CREATE TABLE IF NOT EXISTS _backup_entity_mappings AS SELECT * FROM entity_mappings;
CREATE TABLE IF NOT EXISTS _backup_contact_review_decisions AS SELECT * FROM contact_review_decisions;

-- Drop the legacy tables
DROP TABLE IF EXISTS contact_review_decisions;
DROP TABLE IF EXISTS entity_mappings;
DROP TABLE IF EXISTS entities;

-- Add a comment for audit trail
COMMENT ON TABLE _backup_entities IS 'Backup of legacy entities table, dropped 2026-02-03. Safe to drop after 30 days.';
COMMENT ON TABLE _backup_entity_mappings IS 'Backup of legacy entity_mappings table, dropped 2026-02-03. Safe to drop after 30 days.';
COMMENT ON TABLE _backup_contact_review_decisions IS 'Backup of legacy contact_review_decisions table, dropped 2026-02-03. Safe to drop after 30 days.';
