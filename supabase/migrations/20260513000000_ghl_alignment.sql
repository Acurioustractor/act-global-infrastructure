-- GHL ↔ Xero ↔ Supabase canonical-code alignment
-- 2026-05-13 / 2026-05-14
--
-- Schema-only DDL for the alignment work in this PR. Data-side backfills were
-- run by scripts in this PR (idempotent — safe to re-run on fresh environments).
--
-- See: thoughts/shared/audits/ghl-tag-alignment-2026-05-13.md

-- 1. Allow 'background' tier value (was missing despite use in config + wiki)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_tier_check;
ALTER TABLE projects ADD CONSTRAINT projects_tier_check
  CHECK (tier = ANY (ARRAY['engine','campaign','community','art','ecosystem','studio','satellite','background']));

-- 2. Add canonical 5 projects that existed in wiki but not in projects table
INSERT INTO projects (code, name, status, tier, ghl_tags, organization_id)
SELECT * FROM (VALUES
  ('ACT-DLB', 'DeadlyLabs', 'active', 'background',
    ARRAY['deadlylabs','deadly-labs','deadlyscience'],
    (SELECT organization_id FROM projects WHERE code = 'ACT-CORE' LIMIT 1)),
  ('ACT-PB', 'Place-Based Policy Lab', 'active', 'background',
    ARRAY['place-based-policy-lab','place-based-policy','ppl'],
    (SELECT organization_id FROM projects WHERE code = 'ACT-CORE' LIMIT 1)),
  ('ACT-QD', 'Quandamooka Justice and Healing Strategy', 'active', 'satellite',
    ARRAY['quandamooka','quandamooka-justice','qjhs'],
    (SELECT organization_id FROM projects WHERE code = 'ACT-CORE' LIMIT 1)),
  ('ACT-RS', 'ReSOLEution', 'active', 'satellite',
    ARRAY['resoleution','re-soleution'],
    (SELECT organization_id FROM projects WHERE code = 'ACT-CORE' LIMIT 1))
) AS v(code, name, status, tier, ghl_tags, organization_id)
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.code = v.code);

-- 3. Disambiguate 'justicehub' tag: ACT-JH owns it, ACT-JC uses 'justicehub-coe'
UPDATE projects
SET ghl_tags = ARRAY['justicehub-coe','coe']
WHERE code = 'ACT-JC';

-- 4. Link columns on ghl_contacts
ALTER TABLE ghl_contacts ADD COLUMN IF NOT EXISTS xero_contact_id UUID;
ALTER TABLE ghl_contacts ADD COLUMN IF NOT EXISTS xero_match_method TEXT;
ALTER TABLE ghl_contacts ADD COLUMN IF NOT EXISTS xero_matched_at TIMESTAMPTZ;
ALTER TABLE ghl_contacts ADD COLUMN IF NOT EXISTS canonical_contact_id UUID;

CREATE INDEX IF NOT EXISTS ghl_contacts_xero_contact_id_idx ON ghl_contacts(xero_contact_id);
CREATE INDEX IF NOT EXISTS ghl_contacts_canonical_idx ON ghl_contacts(canonical_contact_id);

-- 5. View: canonical-only contacts (excludes dups)
CREATE OR REPLACE VIEW v_canonical_contacts AS
SELECT * FROM ghl_contacts WHERE canonical_contact_id IS NULL;

-- 6. View: send-eligible newsletter audience (consent + tag + real email)
CREATE OR REPLACE VIEW v_newsletter_audience AS
SELECT
  gc.id, gc.ghl_id, gc.full_name, gc.email,
  gc.newsletter_consent, gc.newsletter_consent_at, gc.newsletter_unsubscribed_at,
  gc.projects,
  CASE
    WHEN EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) = 'goods-newsletter') THEN 'goods'
    WHEN EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) = 'harvest-newsletter') THEN 'harvest'
    WHEN EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) = 'newsletter') THEN 'generic'
    ELSE NULL
  END AS newsletter_segment,
  array_agg(DISTINCT t) FILTER (WHERE t LIKE '%newsletter%') AS newsletter_tags
FROM ghl_contacts gc
LEFT JOIN LATERAL unnest(gc.tags) t ON LOWER(t) LIKE '%newsletter%'
WHERE gc.newsletter_consent = true
  AND gc.newsletter_unsubscribed_at IS NULL
  AND gc.email IS NOT NULL
  AND gc.email NOT LIKE '%.local'
  AND gc.email NOT LIKE '%.temp'
GROUP BY gc.id, gc.ghl_id, gc.full_name, gc.email, gc.newsletter_consent,
         gc.newsletter_consent_at, gc.newsletter_unsubscribed_at, gc.projects, gc.tags;

-- 7. View: re-prompt candidates (tagged a newsletter, no consent yet)
CREATE OR REPLACE VIEW v_newsletter_reprompt_candidates AS
SELECT
  gc.id, gc.ghl_id, gc.full_name, gc.email,
  CASE
    WHEN EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) = 'goods-newsletter') THEN 'goods'
    WHEN EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) = 'harvest-newsletter') THEN 'harvest'
    WHEN EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) = 'newsletter') THEN 'generic'
  END AS newsletter_segment,
  gc.projects, gc.tags, gc.last_contact_date
FROM ghl_contacts gc
WHERE EXISTS (SELECT 1 FROM unnest(gc.tags) t WHERE LOWER(t) LIKE '%newsletter%')
  AND COALESCE(gc.newsletter_consent, false) = false
  AND gc.email IS NOT NULL
  AND gc.email NOT LIKE '%.local'
  AND gc.email NOT LIKE '%.temp';
