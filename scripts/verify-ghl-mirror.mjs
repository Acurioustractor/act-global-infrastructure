#!/usr/bin/env node
/**
 * GHL Mirror Verification (gapcheck)
 *
 * Compares live GHL counts against the Supabase mirror's ACTIVE rows
 * (sync_status <> 'deleted'). Exits 1 on drift beyond tolerance — wire it
 * into cron so silent mirror rot fails loudly.
 *
 * The expensive finance failure mode is a silently wrong number: on
 * 2026-07-12 the mirror over-reported contacts by 48% (4,861 vs 3,280 live)
 * because deletions never propagated and the sync's existing-row load was
 * capped at Supabase's 1,000-row default.
 *
 * Usage:
 *   node scripts/verify-ghl-mirror.mjs            # 2% tolerance
 *   node scripts/verify-ghl-mirror.mjs --tolerance 0.05
 *
 * Created: 2026-07-12 (GHL cleanup plan, Phase 1/7)
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const tolIdx = process.argv.indexOf('--tolerance');
const TOLERANCE = tolIdx > -1 ? parseFloat(process.argv[tolIdx + 1]) : 0.02;

async function countMirrorActive(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .neq('sync_status', 'deleted');
  if (error) {
    // Table without sync_status (pre-migration): count everything, flag it
    if (/sync_status/.test(error.message)) {
      const { count: all, error: e2 } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (e2) throw e2;
      return { count: all, noSyncStatus: true };
    }
    throw error;
  }
  return { count, noSyncStatus: false };
}

async function countLiveContacts(ghl) {
  // POST /contacts/search with pageLimit 1 returns total without paging everything.
  // (ghl.searchContacts() takes a free-text string and discards `total`, so hit
  // the endpoint via the service's request helper.)
  const res = await ghl.request('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({ locationId: ghl.locationId, pageLimit: 1 }),
  });
  if (typeof res?.total === 'number') return res.total;
  // Fallback: full pagination count
  let total = 0;
  let result = await ghl.getContacts({ limit: 100 });
  total += result.contacts.length;
  while (result.hasMore && result.startAfter && result.startAfterId) {
    result = await ghl.getContacts({ limit: 100, startAfter: result.startAfter, startAfterId: result.startAfterId });
    total += result.contacts.length;
  }
  return total;
}

async function countLiveOpportunities(ghl) {
  const pipelines = await ghl.getPipelines();
  let total = 0;
  for (const p of pipelines) {
    const opps = await ghl.getOpportunities(p.id);
    total += opps.length;
  }
  return total;
}

function checkDrift(label, live, mirror, tolerance) {
  const drift = live === 0 ? (mirror === 0 ? 0 : 1) : Math.abs(mirror - live) / live;
  const pct = (drift * 100).toFixed(2);
  const ok = drift <= tolerance;
  console.log(`${ok ? '✅' : '❌'} ${label}: live=${live} mirror=${mirror} drift=${pct}% (tolerance ${(tolerance * 100).toFixed(0)}%)`);
  return ok;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const ghl = createGHLService();

  console.log('═══════════════════════════════════════');
  console.log('   GHL Mirror Gapcheck');
  console.log('═══════════════════════════════════════\n');

  const [liveContacts, liveOpps, mirrorContacts, mirrorOpps] = await Promise.all([
    countLiveContacts(ghl),
    countLiveOpportunities(ghl),
    countMirrorActive(supabase, 'ghl_contacts'),
    countMirrorActive(supabase, 'ghl_opportunities'),
  ]);

  const contactsOk = checkDrift('Contacts', liveContacts, mirrorContacts.count, TOLERANCE);
  const oppsOk = checkDrift('Opportunities', liveOpps, mirrorOpps.count, TOLERANCE);

  if (mirrorOpps.noSyncStatus) {
    console.log('⚠️  ghl_opportunities has no sync_status column — apply migration 20260712 (drift figure includes stale rows)');
  }

  if (!contactsOk || !oppsOk) {
    console.log('\n❌ Mirror drift beyond tolerance — run sync:ghl:supabase and investigate before trusting mirror-derived segments.');
    process.exit(1);
  }
  console.log('\n✅ Mirror within tolerance.');
}

main().catch(err => {
  console.error('❌ Gapcheck failed:', err.message);
  process.exit(1);
});
