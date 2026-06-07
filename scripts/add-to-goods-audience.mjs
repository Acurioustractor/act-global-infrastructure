#!/usr/bin/env node
/**
 * Add people from ANOTHER list into a Goods funnel audience — by email.
 *
 * For when contacts arrive from an imported/other list and need enrolling into a Goods
 * audience as needed. Looks them up by email, then additively stamps:
 *   project:act-gd + role:<audience> + comms:<audience>-drip
 * so they enter the funnel. Additive + idempotent; skips gone-from-ghl (stale) rows.
 *
 * NOTE: this enrols them as a SEGMENT. It does NOT opt them in — they must pass the Step-0
 * re-opt-in (newsletter_consent=true) before any send. A tag is a segment, not consent.
 *
 *   node scripts/add-to-goods-audience.mjs --audience funder --emails "a@x.com,b@y.com"
 *   node scripts/add-to-goods-audience.mjs --audience supporter --file ./list.txt   # one email per line
 *   ... add --apply to write (default is dry-run)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const get = (flag) => { const i = args.indexOf(flag); return i === -1 ? null : args[i + 1]; };
const audience = get('--audience');
const ROLE = { funder: 'role:funder', supporter: 'role:supporter', buyer: 'role:buyer', partner: 'role:partner' };
if (!audience || !ROLE[audience]) { console.error('--audience must be one of: funder | supporter | buyer | partner'); process.exit(1); }

let emails = [];
if (get('--emails')) emails = get('--emails').split(',');
else if (get('--file')) emails = readFileSync(get('--file'), 'utf8').split(/\r?\n/);
emails = emails.map(e => e.trim().toLowerCase()).filter(Boolean);
if (!emails.length) { console.error('Provide --emails "a@x,b@y" or --file list.txt'); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const GHL_H = { Authorization: `Bearer ${process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN}`,
  Version: '2021-07-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`=== Add ${emails.length} emails to Goods ${audience} audience — ${APPLY ? 'APPLY' : 'DRY RUN'} ===`);
  const wantTags = ['project:act-gd', ROLE[audience], `comms:${audience}-drip`];
  const { data, error } = await supabase.from('ghl_contacts').select('ghl_id, email, tags').in('email', emails);
  if (error) throw error;
  const found = new Map((data || []).map(c => [String(c.email || '').toLowerCase(), c]));
  const missing = emails.filter(e => !found.has(e));

  let toWrite = [];
  for (const c of (data || [])) {
    const tags = c.tags || [];
    if (tags.some(t => t.startsWith('gone-from-ghl'))) continue;
    const add = wantTags.filter(t => !tags.includes(t));
    if (add.length) toWrite.push({ ghl_id: c.ghl_id, email: c.email, add });
  }
  console.log(`Matched in mirror: ${found.size}/${emails.length} | will tag: ${toWrite.length} | already-tagged: ${found.size - toWrite.length}`);
  if (missing.length) console.log(`NOT in mirror (import them first, then re-run): ${missing.join(', ')}`);
  toWrite.slice(0, 20).forEach(w => console.log(`  + ${w.email}  ${w.add.join(', ')}`));

  if (!APPLY) { console.log('\nDRY RUN — nothing written.'); return; }
  let ok = 0, err = 0;
  for (const w of toWrite) {
    const r = await fetch(`https://services.leadconnectorhq.com/contacts/${w.ghl_id}/tags`,
      { method: 'POST', headers: GHL_H, body: JSON.stringify({ tags: w.add }) });
    if (r.ok) ok++; else err++;
    await sleep(150);
  }
  console.log(`Tagged: ${ok}, errors: ${err}. (Remember: they still need Step-0 opt-in before any send.)`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
