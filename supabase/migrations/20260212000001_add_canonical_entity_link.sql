-- Add canonical_entity_id to ghl_contacts for entity resolution linkage
ALTER TABLE ghl_contacts ADD COLUMN IF NOT EXISTS canonical_entity_id UUID REFERENCES canonical_entities(id);
CREATE INDEX IF NOT EXISTS idx_ghl_canonical ON ghl_contacts(canonical_entity_id);
