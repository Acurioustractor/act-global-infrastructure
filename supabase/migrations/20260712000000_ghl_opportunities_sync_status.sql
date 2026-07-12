-- GHL cleanup Phase 1 (2026-07-12): deletion reconciliation for opportunities.
-- ghl_opportunities had no sync_status, so opportunities deleted in GHL lived
-- forever in the mirror (548 stale rows vs 503 live at 2026-07-12).
-- Additive only; same semantics as ghl_contacts.sync_status.

ALTER TABLE ghl_opportunities
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'synced';

COMMENT ON COLUMN ghl_opportunities.sync_status IS
  'synced | deleted (soft-delete when absent from live GHL; see sync-ghl-to-supabase.mjs reconciliation)';

CREATE INDEX IF NOT EXISTS idx_ghl_opportunities_sync_status
  ON ghl_opportunities (sync_status)
  WHERE sync_status = 'deleted';
