#!/usr/bin/env node
/**
 * GHL Quarantine Sweep — D1 of the target architecture ADR
 * (wiki/decisions/2026-07-12-ghl-target-architecture.md)
 *
 * Tags noise contacts with `status:quarantine` so every list, segment, and
 * count describes real relationships. Reversible: nothing is deleted, and the
 * tag can be bulk-removed.
 *
 * Cohort predicate (conservative — mirror-derived, all must hold):
 *   - active in mirror (sync_status <> 'deleted')
 *   - email IS NULL
 *   - NO tag in the protected namespaces: project:* comms:* consent:* lane:*
 *     member-level:* role:* cultural:* or 'storyteller'
 *   - newsletter_consent is not true
 *   - no active opportunity
 *   - not already quarantined
 *
 * Usage:
 *   node scripts/ghl-quarantine-sweep.mjs                # dry-run: count + sample
 *   node scripts/ghl-quarantine-sweep.mjs --tracer       # apply to exactly 1 contact
 *   node scripts/ghl-quarantine-sweep.mjs --apply        # full batch
 *   node scripts/ghl-quarantine-sweep.mjs --apply --limit 100
 *
 * Tier 3: only run --tracer/--apply with explicit human go.
 * Created: 2026-07-12
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const QUARANTINE_TAG = 'status:quarantine';
const PROTECTED_PREFIXES = ['project:', 'comms:', 'consent:', 'lane:', 'member-level:', 'role:', 'cultural:'];
const PROTECTED_EXACT = ['storyteller'];

const APPLY = process.argv.includes('--apply');
const TRACER = process.argv.includes('--tracer');
const limIdx = process.argv.indexOf('--limit');
const LIMIT = limIdx > -1 ? parseInt(process.argv[limIdx + 1], 10) : null;

function isProtected(tags = []) {
  return tags.some(t =>
    PROTECTED_PREFIXES.some(p => t.startsWith(p)) || PROTECTED_EXACT.includes(t)
  );
}

async function loadAllRows(supabase, table, columns, applyFilter) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).order('ghl_id').range(from, from + PAGE - 1);
    if (applyFilter) q = applyFilter(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function buildCohort(supabase) {
  const contacts = await loadAllRows(
    supabase, 'ghl_contacts',
    'ghl_id, first_name, last_name, email, tags, newsletter_consent',
    q => q.neq('sync_status', 'deleted').is('email', null)
  );
  const opps = await loadAllRows(
    supabase, 'ghl_opportunities', 'ghl_contact_id',
    q => q.neq('sync_status', 'deleted')
  );
  const oppContactIds = new Set(opps.map(o => o.ghl_contact_id).filter(Boolean));

  return contacts.filter(c =>
    !isProtected(c.tags || []) &&
    !(c.tags || []).includes(QUARANTINE_TAG) &&
    c.newsletter_consent !== true &&
    !oppContactIds.has(c.ghl_id)
  );
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Missing Supabase credentials');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const ghl = createGHLService();

  console.log('═══════════════════════════════════════');
  console.log('   GHL Quarantine Sweep (D1)');
  console.log('═══════════════════════════════════════\n');

  let cohort = await buildCohort(supabase);
  console.log(`Cohort: ${cohort.length} contacts match the quarantine predicate\n`);

  if (TRACER) cohort = cohort.slice(0, 1);
  else if (LIMIT) cohort = cohort.slice(0, LIMIT);

  if (!APPLY && !TRACER) {
    console.log('DRY RUN — no writes. Sample (first 20):\n');
    for (const c of cohort.slice(0, 20)) {
      console.log(`   ${c.ghl_id}  ${[c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)'}  tags=[${(c.tags || []).join(',')}]`);
    }
    console.log(`\nRun with --tracer (1 contact) then --apply (all ${cohort.length}).`);
    return;
  }

  console.log(`${TRACER ? 'TRACER' : 'APPLY'} — tagging ${cohort.length} contact(s) with ${QUARANTINE_TAG}\n`);
  let ok = 0, failed = 0;
  const failures = [];

  for (const c of cohort) {
    try {
      // GHL write first (source of truth), then mirror so lists are honest now
      await ghl.addTagToContact(c.ghl_id, QUARANTINE_TAG);
      const newTags = [...new Set([...(c.tags || []), QUARANTINE_TAG])];
      const { data, error } = await supabase
        .from('ghl_contacts')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('ghl_id', c.ghl_id)
        .select('ghl_id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error(`mirror update matched ${data?.length ?? 0} rows`);
      ok++;
      process.stdout.write('+');
    } catch (err) {
      failed++;
      failures.push({ ghl_id: c.ghl_id, error: err.message });
      process.stdout.write('!');
    }
  }

  console.log(`\n\nAttempted: ${cohort.length}  Succeeded: ${ok}  Failed: ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.slice(0, 10).forEach(f => console.log(`   ${f.ghl_id}: ${f.error}`));
    process.exit(1);
  }

  if (TRACER && ok === 1) {
    // Independent verification: re-fetch the contact from GHL
    const live = await ghl.getContactById(cohort[0].ghl_id);
    const hasTag = (live.tags || []).includes(QUARANTINE_TAG);
    console.log(`\nTracer verification (live GHL re-fetch): tag present = ${hasTag}`);
    if (!hasTag) process.exit(1);
  }
  console.log('\n✅ Done. Remember: smart lists/segments must exclude status:quarantine.');
}

main().catch(err => { console.error('❌ Sweep failed:', err.message); process.exit(1); });
