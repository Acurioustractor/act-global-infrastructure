#!/usr/bin/env node
/**
 * build-network-worklist.mjs — the Getting Shit Done Alliance curation worklist.
 *
 * Mines the spine for ACT's REAL two-way network (people Ben/Nic actually reply to),
 * classifies a first-pass lane, and writes a CSV you mark up by hand:
 *   - ALLIANCE column  → put 'y' to pull someone into circle:gsd-alliance
 *   - LANE_FIX column   → correct the lane if the first-pass read is wrong
 *
 * Read-only against the shared DB. Writes ONE local CSV. No GHL/Notion writes.
 * Governing model: wiki/concepts/relationship-first-crm.md (belonging before money).
 *
 * Run:  node scripts/build-network-worklist.mjs
 * Out:  thoughts/shared/network-alliance-worklist.csv
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

dotenv.config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SHARED_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'); process.exit(1); }
const sb = createClient(url, key);

const PAGE = 1000;
const NOISE = /qantas|webflow|officeworks|amazon|pinterest|codepen|virgin australia|tumblr|ratepunk|frequent flyer|customer service|no-?reply|notification|mailer|cosec|orange ?sky/i;

// 1) Aggregate gmail comms per contact, paginating past the 1000-row cap.
console.log('Aggregating gmail comms by contact (paginated)…');
const byContact = new Map(); // ghl_contact_id -> {inb, outb, last}
let from = 0;
for (;;) {
  const { data, error } = await sb
    .from('communications_history')
    .select('ghl_contact_id, direction, occurred_at')
    .eq('source_system', 'gmail')
    .not('ghl_contact_id', 'is', null)
    .range(from, from + PAGE - 1);
  if (error) { console.error('comms query failed:', error.message); process.exit(1); }
  if (!data.length) break;
  for (const r of data) {
    const m = byContact.get(r.ghl_contact_id) || { inb: 0, outb: 0, last: null };
    if (r.direction === 'inbound') m.inb++; else if (r.direction === 'outbound') m.outb++;
    if (r.occurred_at && (!m.last || r.occurred_at > m.last)) m.last = r.occurred_at;
    byContact.set(r.ghl_contact_id, m);
  }
  from += PAGE;
  if (data.length < PAGE) break;
}
console.log(`  ${byContact.size} contacts have linked gmail.`);

// 2) Keep genuine two-way relationships (Ben/Nic actually replied).
const twoway = [...byContact.entries()].filter(([, m]) => m.outb > 0);
console.log(`  ${twoway.length} are two-way (outbound > 0).`);

// 3) Hydrate the contacts (batched .in()).
const ids = twoway.map(([id]) => id);
const contacts = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb
    .from('ghl_contacts')
    .select('ghl_id, full_name, company_name, email, tags, is_storyteller, newsletter_consent')
    .in('ghl_id', ids.slice(i, i + 200));
  if (error) { console.error('contacts query failed:', error.message); process.exit(1); }
  for (const c of data) contacts.set(c.ghl_id, c);
}

// 4) Build rows: lane first-pass + noise flag.
const COMMUNITY_ROLES = ['role:storyteller', 'role:community', 'role:community-controlled', 'role:elder'];
const rows = [];
for (const [id, m] of twoway) {
  const c = contacts.get(id);
  if (!c) continue;
  const email = (c.email || '').toLowerCase();
  if (email.endsWith('@act.place')) continue; // our own mailboxes
  const tags = c.tags || [];
  const roles = tags.filter(t => /^(role:|tier:|project:|circle:)/.test(t)).join(' ');
  const isCommunity = c.is_storyteller || tags.some(t => COMMUNITY_ROLES.includes(t));
  const noise = NOISE.test(c.full_name || '') || NOISE.test(email);
  rows.push({
    total: m.inb + m.outb, inbound: m.inb, outbound: m.outb,
    last_contact: (m.last || '').slice(0, 10),
    name: c.full_name || '', company: c.company_name || '', email: c.email || '',
    lane_firstpass: noise ? 'NOISE?' : (isCommunity ? 'community' : 'supporter'),
    roles, consent: c.newsletter_consent ? 'y' : '',
  });
}
rows.sort((a, b) => b.total - a.total);

// 5) Write CSV with empty curation columns.
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = ['ALLIANCE', 'LANE_FIX', 'NOTES', 'lane_firstpass', 'name', 'company', 'total', 'inbound', 'outbound', 'last_contact', 'consent', 'roles', 'email'];
const lines = [header.join(',')];
for (const r of rows) lines.push([
  '', '', '', r.lane_firstpass, r.name, r.company, r.total, r.inbound, r.outbound, r.last_contact, r.consent, r.roles, r.email,
].map(esc).join(','));
const out = 'thoughts/shared/network-alliance-worklist.csv';
writeFileSync(out, lines.join('\n'));

// 6) Summary.
const by = rows.reduce((a, r) => (a[r.lane_firstpass] = (a[r.lane_firstpass] || 0) + 1, a), {});
console.log(`\nWrote ${rows.length} people → ${out}`);
console.log('First-pass lane split:', by);
console.log('\nTop 12 by two-way volume:');
for (const r of rows.slice(0, 12)) console.log(`  ${String(r.total).padStart(3)}  ${r.lane_firstpass.padEnd(9)} ${r.name}${r.company ? ' · ' + r.company : ''}`);
console.log('\nNext: open the CSV, put "y" in ALLIANCE for your inner circle, fix any LANE_FIX, then I apply to GHL (gated).');
