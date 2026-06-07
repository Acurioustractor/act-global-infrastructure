#!/usr/bin/env node
/**
 * Reorganize GHL CONTACT custom fields into 8 clean folders.
 *
 * Principle (wiki/decisions/act-ghl-master-operating-system.md): tags = categories you filter
 * and run journeys by; fields = facts about the person. This script only ORGANIZES fields into
 * folders. It NEVER deletes a field and NEVER touches field data on any contact. The only
 * deletions are OLD folders that end up EMPTY after the moves (zero data loss).
 *
 * Confirmed legacy API (/locations/{loc}/customFields), all probed 2026-06-02:
 *   create folder: POST {name, model:'contact', documentType:'folder'} -> {customFieldFolder:{id}}
 *   move field:    PUT  /{id} {name, parentId}        (preserves options — verified on "Interests")
 *   delete folder: DELETE /{id}                        (only ever called on a verified-empty folder)
 *
 * USAGE:
 *   node scripts/reorg-ghl-custom-fields.mjs            # DRY RUN (default) — prints the full plan
 *   node scripts/reorg-ghl-custom-fields.mjs --apply    # create folders, move fields, delete empties
 *   node scripts/reorg-ghl-custom-fields.mjs --apply --keep-old   # skip deleting emptied old folders
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const KEEP_OLD = process.argv.includes('--keep-old');
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' };
const BASE = 'https://services.leadconnectorhq.com';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// The 8 target folders, in display order.
const FOLDERS = ['Identity', 'Consent & Culture', 'Preferences', 'Engagement & AI', 'Goods Ops', 'Storytelling', 'Campaign Ops', 'Forms'];

// fieldKey (without the contact. prefix) -> target folder. All 57 contact custom fields mapped.
const FIELD_MAP = {
  // Identity — who they are
  preferred_name: 'Identity', pronouns: 'Identity', supabase_user_id: 'Identity', abn: 'Identity', civicgraph_profile: 'Identity',
  // Consent & Culture — permission + cultural protocol
  newsletter_consent: 'Consent & Culture', consent_status: 'Consent & Culture', ai_processing_consent: 'Consent & Culture',
  indigenous_status: 'Consent & Culture', cultural_protocols: 'Consent & Culture', accessibility_needs: 'Consent & Culture',
  // Preferences — how to reach them
  communication_preference: 'Preferences', best_contact_time: 'Preferences', emergency_contact_name: 'Preferences',
  emergency_contact_phone: 'Preferences', how_did_you_hear: 'Preferences',
  // Engagement & AI — scores + machine state
  relationship_score: 'Engagement & AI', engagement_score: 'Engagement & AI', engagement_tier: 'Engagement & AI',
  engagement_scored_at: 'Engagement & AI', engagement_actions: 'Engagement & AI', last_ai_action: 'Engagement & AI', suggested_action: 'Engagement & AI',
  // Goods Ops — assets, orders, delivery
  goods__asset_id: 'Goods Ops', goods__sponsor_dedication: 'Goods Ops', goods__linkedin_tags: 'Goods Ops',
  beds_delivered: 'Goods Ops', washers_delivered: 'Goods Ops', order_number: 'Goods Ops', order_total: 'Goods Ops',
  product_type: 'Goods Ops', community: 'Goods Ops', last_delivery_date: 'Goods Ops',
  // Storytelling — Empathy Ledger
  storyteller_status: 'Storytelling', stories_count: 'Storytelling', mukurtu_node_community: 'Storytelling',
  // Campaign Ops — advocacy, world tour, nominations
  world_tour_stop: 'Campaign Ops', electorate: 'Campaign Ops', mp_contacted: 'Campaign Ops', nominated_person: 'Campaign Ops',
  nomination_category: 'Campaign Ops', contained_feelings: 'Campaign Ops', partnership_thread: 'Campaign Ops', help_options: 'Campaign Ops',
  // Forms — raw form-capture inputs + the tag-source overlaps (these feed tags; you filter on the tag)
  donation_amount: 'Forms', project_designation: 'Forms', message__other_amount: 'Forms', availability: 'Forms',
  volunteer_interests: 'Forms', interests: 'Forms', project_interest: 'Forms', how_did_you_hear_about_us: 'Forms',
  message: 'Forms', project_role: 'Forms', project_links: 'Forms', seeds: 'Forms', partnership_type: 'Forms',
};

const keyOf = (f) => (f.fieldKey || '').replace(/^contact\./, '');

async function getFields() {
  const r = await fetch(`${BASE}/locations/${LOC}/customFields`, { headers: H });
  if (!r.ok) throw new Error(`list fields ${r.status}`);
  return (await r.json()).customFields || [];
}
async function getFolderName(id) {
  const r = await fetch(`${BASE}/locations/${LOC}/customFields/${id}`, { headers: H });
  if (!r.ok) return null;
  const j = await r.json(); const o = j.customField || j.customFieldFolder || j;
  return o.documentType === 'folder' ? o.name : null;
}

async function main() {
  console.log(`\n=== Reorg GHL contact custom fields — ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);
  const fields = await getFields();
  console.log(`Fetched ${fields.length} custom fields.`);

  // discover existing folders from distinct parentIds
  const parentIds = [...new Set(fields.map(f => f.parentId).filter(Boolean))];
  const existingFolders = {}; // id -> name
  for (const id of parentIds) { existingFolders[id] = await getFolderName(id) || '(unknown)'; }
  const nameToExistingId = Object.fromEntries(Object.entries(existingFolders).map(([id, n]) => [n, id]));
  console.log('Existing folders:', Object.values(existingFolders).map((n, i) => `${n} [${parentIds[i].slice(0,6)}]`).join(' · '));

  // resolve target folder ids: reuse by exact name, else mark for create
  const targetId = {};          // folderName -> id (filled after create on apply)
  const toCreate = [];
  for (const name of FOLDERS) {
    if (nameToExistingId[name]) targetId[name] = nameToExistingId[name];
    else toCreate.push(name);
  }

  // build the move plan
  const moves = [];     // {field, folder}
  const unmapped = [];
  for (const f of fields) {
    const k = keyOf(f);
    const folder = FIELD_MAP[k];
    if (!folder) { unmapped.push(k); continue; }
    moves.push({ id: f.id, name: f.name, key: k, dataType: f.dataType, folder });
  }

  // ---- print plan ----
  console.log(`\nFolders to create (${toCreate.length}): ${toCreate.join(', ') || '(none — all reused)'}`);
  console.log(`\nMove plan (${moves.length} fields):`);
  for (const folder of FOLDERS) {
    const inFolder = moves.filter(m => m.folder === folder);
    console.log(`  ▸ ${folder} (${inFolder.length}): ${inFolder.map(m => m.key).join(', ')}`);
  }
  if (unmapped.length) console.log(`\n⚠️  UNMAPPED (left in place): ${unmapped.join(', ')}`);

  // old folders that will be emptied (every existing folder, since none match target names)
  const oldFolderIds = parentIds.filter(id => !FOLDERS.includes(existingFolders[id]));
  console.log(`\nOld folders to remove once empty (${oldFolderIds.length}): ${oldFolderIds.map(id => existingFolders[id]).join(', ')}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing changed. Re-run with --apply to execute.\n');
    return;
  }

  // ---- apply ----
  console.log('\n--- creating folders ---');
  for (const name of toCreate) {
    const r = await fetch(`${BASE}/locations/${LOC}/customFields`, { method: 'POST', headers: H, body: JSON.stringify({ name, model: 'contact', documentType: 'folder' }) });
    const j = await r.json();
    const id = j.customFieldFolder?.id || j.customField?.id;
    if (!r.ok || !id) { console.log(`  ✗ ${name} -> ${r.status} ${JSON.stringify(j).slice(0,120)}`); throw new Error('folder create failed — aborting'); }
    targetId[name] = id;
    console.log(`  ✓ ${name} -> ${id}`);
    await sleep(150);
  }

  console.log('\n--- moving fields ---');
  let ok = 0, err = 0;
  for (const m of moves) {
    const dest = targetId[m.folder];
    const r = await fetch(`${BASE}/locations/${LOC}/customFields/${m.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ name: m.name, parentId: dest }) });
    if (r.ok) { ok++; } else { err++; if (err <= 8) console.log(`  ✗ ${m.key} -> ${r.status} ${(await r.text()).slice(0,100)}`); }
    if ((ok + err) % 15 === 0) console.log(`  ${ok + err}/${moves.length}`);
    await sleep(140);
  }
  console.log(`Moved: ${ok}, errors: ${err}`);

  // ---- delete emptied old folders ----
  if (!KEEP_OLD) {
    console.log('\n--- removing emptied old folders ---');
    const after = await getFields();
    for (const id of oldFolderIds) {
      const still = after.filter(f => f.parentId === id).length;
      if (still > 0) { console.log(`  ⏭  ${existingFolders[id]} still has ${still} field(s) — keeping`); continue; }
      const d = await fetch(`${BASE}/locations/${LOC}/customFields/${id}`, { method: 'DELETE', headers: H });
      console.log(`  ${d.ok ? '🗑' : '✗'} ${existingFolders[id]} -> ${d.status}`);
      await sleep(150);
    }
  }
  console.log('\nDone. Reload the GHL custom-fields page to see the 8 folders.\n');
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
