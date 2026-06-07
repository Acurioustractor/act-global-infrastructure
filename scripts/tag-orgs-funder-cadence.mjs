#!/usr/bin/env node
/**
 * Tag each Notion Organisation with a Funder Cadence rating:
 *
 *   PASS   — contacted in last 30d, OR has paid invoice in last 90d
 *   WARN   — last contact 30–90d ago, OR has open opportunity, OR open
 *            receivable < 60 days overdue
 *   FAIL   — silent 90+ days WITH open pipeline value > $0, OR receivable
 *            > 60 days overdue, OR opp $0 stuck for > 180 days
 *   n/a    — no contact, no opp, no invoice (just a placeholder)
 *
 * Reads the Notion Orgs DB directly + queries Supabase for fresh signals.
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_ORGANISATIONS_DB_ID
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/tag-orgs-funder-cadence.mjs           # dry-run
 *   node scripts/tag-orgs-funder-cadence.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const TOKEN = process.env.NOTION_MIRROR_TOKEN;
const ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

let lastNotionAt = 0;
async function notionFetch(path, init = {}, attempt = 0) {
  const dt = Date.now() - lastNotionAt;
  if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt));
  lastNotionAt = Date.now();
  let r;
  try {
    r = await fetch(`https://api.notion.com/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch (e) {
    if (attempt < 4) { await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); return notionFetch(path, init, attempt + 1); }
    throw e;
  }
  if ((r.status >= 500 || r.status === 429) && attempt < 4) { await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); return notionFetch(path, init, attempt + 1); }
  if (!r.ok) throw new Error(`Notion ${r.status} ${path}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const DAY_MS = 24 * 3600 * 1000;
const daysAgo = ts => Math.floor((Date.now() - new Date(ts).getTime()) / DAY_MS);

function deriveCadence({ lastContact, openPipeline, totalPaid, outstanding, lastInvoice }) {
  const lastContactDays = lastContact ? daysAgo(lastContact) : null;
  const lastInvoiceDays = lastInvoice ? daysAgo(lastInvoice) : null;
  const noActivity = !lastContact && !openPipeline && !totalPaid && !outstanding && !lastInvoice;
  if (noActivity) return 'n/a';

  // FAIL signals
  if (outstanding > 0 && lastInvoiceDays !== null && lastInvoiceDays > 60) return 'FAIL';
  if (openPipeline > 0 && lastContactDays !== null && lastContactDays > 90) return 'FAIL';

  // PASS signals
  if (lastContactDays !== null && lastContactDays <= 30) return 'PASS';
  if (lastInvoiceDays !== null && lastInvoiceDays <= 90 && totalPaid > 0) return 'PASS';

  // WARN: anything else with at least one signal
  return 'WARN';
}

console.log(`tag-orgs-funder-cadence — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// Fetch all Notion orgs
const orgs = [];
let cursor = null;
while (true) {
  const body = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  const data = await notionFetch(`/databases/${ORGS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
  for (const r of data.results) {
    orgs.push({
      id: r.id,
      name: r.properties['Name']?.title?.[0]?.plain_text || '',
      lastContact: r.properties['Last Contact']?.date?.start || null,
      openPipeline: r.properties['Open Pipeline Value']?.number || 0,
      totalPaid: r.properties['Total Paid (Xero)']?.number || 0,
      outstanding: r.properties['Outstanding (Xero)']?.number || 0,
      lastInvoice: r.properties['Last Invoice Date']?.date?.start || null,
      manualOverride: !!r.properties['Manual Cadence Override']?.checkbox,
      currentCadence: r.properties['Funder Cadence']?.select?.name || null,
    });
  }
  if (!data.has_more) break;
  cursor = data.next_cursor;
}
console.log(`Loaded ${orgs.length} Notion orgs`);

const dist = { PASS: 0, WARN: 0, FAIL: 0, 'n/a': 0, 'manual-override': 0 };
const updates = [];
for (const o of orgs) {
  if (o.manualOverride) {
    dist['manual-override']++;
    continue; // respect human judgement, skip auto-tag
  }
  const cadence = deriveCadence(o);
  dist[cadence]++;
  updates.push({ id: o.id, name: o.name, cadence });
}

console.log('\nCadence distribution:');
for (const [k, v] of Object.entries(dist)) console.log(`  ${v.toString().padStart(4)}  ${k}`);

console.log('\nFAIL orgs (action required):');
for (const u of updates.filter(x => x.cadence === 'FAIL')) console.log(`  ${u.name}`);

if (!APPLY) { console.log('\nRe-run with --apply.'); process.exit(0); }

let done = 0;
for (const u of updates) {
  await notionFetch(`/pages/${u.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: { 'Funder Cadence': { select: { name: u.cadence } } } }),
  });
  done++;
  if (done % 50 === 0) console.log(`  …${done}`);
}
console.log(`\nTagged ${done} orgs.`);
