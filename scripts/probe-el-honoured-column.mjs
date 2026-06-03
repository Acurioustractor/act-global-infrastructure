#!/usr/bin/env node
/**
 * probe-el-honoured-column.mjs — READ-ONLY diagnostic.
 * Finds the real "honoured / live / shown" column on Empathy Ledger `stories`,
 * so the owes-gap signal isn't a `published_at`-always-null artifact.
 * Dumps candidate columns + value distributions (paginated past the 1000-cap).
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });
const URL = process.env.EL_SUPABASE_URL || process.env.STORY_SUPABASE_URL;
const KEY = process.env.EL_SUPABASE_SERVICE_KEY || process.env.STORY_SUPABASE_SERVICE_ROLE_KEY;
const el = createClient(URL, KEY);

const { data: probe, error } = await el.from('stories').select('*').limit(1);
if (error) { console.error('probe failed:', error.message); process.exit(1); }
const cols = Object.keys(probe[0] || {});
console.log('ALL stories columns:\n  ' + cols.join(', '));

// candidate "is it live / honoured / visible" columns
const CANDIDATES = cols.filter(c => /public|status|state|visib|privac|consent|syndicat|live|honou?r|shown|display|approv|stage|publish|share/i.test(c));
console.log('\nCANDIDATE honoured/live columns:', CANDIDATES.join(', ') || '(none matched)');

// paginate ALL stories, tally distributions for each candidate + total row count
const dist = Object.fromEntries(CANDIDATES.map(c => [c, new Map()]));
let total = 0;
for (let from = 0; ; from += 1000) {
  const { data, error } = await el.from('stories').select(CANDIDATES.join(',')).range(from, from + 999);
  if (error) { console.error('page failed:', error.message); process.exit(1); }
  if (!data.length) break;
  total += data.length;
  for (const r of data) for (const c of CANDIDATES) {
    let v = r[c];
    if (typeof v === 'string' && v.length > 30) v = v.slice(0, 30) + '…'; // truncate dates/text
    if (v !== null && typeof v === 'object') v = JSON.stringify(v).slice(0, 30);
    const key = v === null ? '<null>' : v === '' ? '<empty>' : String(v);
    dist[c].set(key, (dist[c].get(key) || 0) + 1);
  }
  if (data.length < 1000) break;
}
console.log(`\nTotal stories: ${total}\n`);
for (const c of CANDIDATES) {
  const entries = [...dist[c].entries()].sort((a, b) => b[1] - a[1]);
  // for date-ish columns, collapse to null vs non-null
  const isDateish = /_at$|date/i.test(c) && entries.length > 12;
  if (isDateish) {
    const nullN = dist[c].get('<null>') || 0;
    console.log(`${c}:  <null>=${nullN}  non-null=${total - nullN}  (date/timestamp — ${entries.length} distinct)`);
  } else {
    console.log(`${c}:`);
    for (const [k, n] of entries.slice(0, 12)) console.log(`    ${String(n).padStart(5)}  ${k}`);
    if (entries.length > 12) console.log(`    … ${entries.length - 12} more distinct values`);
  }
}
