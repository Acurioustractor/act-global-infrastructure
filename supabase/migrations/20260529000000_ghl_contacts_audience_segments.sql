-- Phase 1 of the GHL tag-canonicalization plan
-- (thoughts/shared/plans/2026-05-29-ghl-tag-canonicalization.md).
--
-- Gives ghl_contacts a first-class audience field so segments stop living
-- only in free-text tags. MULTI-VALUED by design: contacts are genuinely in
-- several audiences at once (e.g. a partner who is also a storyteller), so a
-- single enum would drop real memberships. `audience_segments` is the full set;
-- `primary_audience` is the optional lead segment for sorting/headlines.
--
-- DDL only. The data backfill (deterministic map from current tags, incl. legacy
-- encodings) is a separate reviewed step so the mapping logic can be approved on
-- its own. Apply with psql (DDL — exec_sql RPC does not support DDL).

ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS audience_segments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_audience  text;

-- Constrain values to the controlled vocabulary. `<@` = "is contained by",
-- so every element of audience_segments must be in the allowed set; '{}' passes.
ALTER TABLE ghl_contacts
  ADD CONSTRAINT ghl_contacts_audience_segments_valid
  CHECK (audience_segments <@ ARRAY['funder','partner','storyteller','brand','buyer','community']::text[]);

ALTER TABLE ghl_contacts
  ADD CONSTRAINT ghl_contacts_primary_audience_valid
  CHECK (primary_audience IS NULL
         OR primary_audience = ANY (ARRAY['funder','partner','storyteller','brand','buyer','community']));

-- GIN index so segment membership queries (audience_segments @> ARRAY['funder'])
-- are fast for send-list building.
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_audience_segments
  ON ghl_contacts USING GIN (audience_segments);

COMMENT ON COLUMN ghl_contacts.audience_segments IS
  'Controlled multi-valued audience set (funder/partner/storyteller/brand/buyer/community). Source of truth for send-list segmentation; populated by deterministic map from canonical tags. Tag *types* (partner-<type>/funder-<type>) and project tags carry finer context.';
COMMENT ON COLUMN ghl_contacts.primary_audience IS
  'Optional single lead audience for sorting/headlines; must be one of the audience_segments values.';
