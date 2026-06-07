#!/usr/bin/env node
/**
 * One-shot cleanup: archive Mukurtu node opps + tag-then-archive Festivals.
 *
 * - Mukurtu Node Activation pipeline (5 opps, $0, Scoping, abandoned) → mark lost
 * - Festivals pipeline (14 opps, $0) → add `festivals-target` tag to each contact, mark opp lost
 *
 * After this runs, both pipelines are empty in GHL — delete them via UI:
 *   Settings → Pipelines → (pipeline) → Delete
 *
 * Usage:
 *   node scripts/cleanup-mukurtu-festivals.mjs --dry-run
 *   node scripts/cleanup-mukurtu-festivals.mjs --apply
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function markOppLost(ghlId) {
  const res = await fetch(`https://services.leadconnectorhq.com/opportunities/${ghlId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({ status: 'lost' }),
  });
  if (!res.ok) throw new Error(`status ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function addContactTag(contactId, tag) {
  const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({ tags: [tag] }),
  });
  if (!res.ok) throw new Error(`status ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  log('=== Mukurtu + Festivals cleanup ===');
  if (!APPLY) log('DRY RUN');

  const { data: rows } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, ghl_contact_id, name, pipeline_name, stage_name')
    .eq('status', 'open')
    .in('pipeline_name', ['Mukurtu Node Activation', 'Festivals']);

  const mukurtu = (rows || []).filter(r => r.pipeline_name === 'Mukurtu Node Activation');
  const festivals = (rows || []).filter(r => r.pipeline_name === 'Festivals');

  log(`\nMukurtu: ${mukurtu.length} opps to archive`);
  for (const r of mukurtu) log(`  · ${r.name}`);

  log(`\nFestivals: ${festivals.length} opps to tag-then-archive`);
  for (const r of festivals) log(`  · ${r.name} (contact ${r.ghl_contact_id})`);

  if (!APPLY) {
    log('\nPass --apply to action. After: delete both pipelines in GHL Settings UI.');
    return;
  }

  // Mukurtu
  log('\n--- Archiving Mukurtu opps ---');
  let mOk = 0, mErr = 0;
  for (const r of mukurtu) {
    try { await markOppLost(r.ghl_id); mOk++; log(`  ✓ ${r.name}`); }
    catch (e) { mErr++; log(`  ✗ ${r.name}: ${e.message}`); }
  }
  log(`Mukurtu: ${mOk} ok, ${mErr} errors`);

  // Festivals
  log('\n--- Festivals: tag contacts + archive opps ---');
  let fOk = 0, fErr = 0;
  const seenContacts = new Set();
  for (const r of festivals) {
    try {
      if (r.ghl_contact_id && !seenContacts.has(r.ghl_contact_id)) {
        await addContactTag(r.ghl_contact_id, 'festivals-target');
        seenContacts.add(r.ghl_contact_id);
      }
      await markOppLost(r.ghl_id);
      fOk++;
      log(`  ✓ ${r.name}`);
    } catch (e) {
      fErr++;
      log(`  ✗ ${r.name}: ${e.message}`);
    }
  }
  log(`Festivals: ${fOk} ok, ${fErr} errors. Tagged ${seenContacts.size} contacts.`);

  log('\nDone. Now delete both pipelines in GHL UI:');
  log('  https://app.gohighlevel.com/v2/location/agzsSZWgovjwgpcoASWG/settings/pipelines');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
