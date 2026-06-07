#!/usr/bin/env node
/**
 * Sync Xero customers (xero_invoices type=ACCREC) → Notion Organisations DB.
 *
 * Aggregates paid/outstanding totals per Xero contact and writes them onto
 * the existing org page when names match. For unmatched Xero customers
 * with revenue, creates a new org page in the orbit DB so the universe of
 * "orgs we transact with" is complete.
 *
 * Strategic value:
 *   - Open Pipeline (from opps) AND Total Paid + Outstanding (from Xero)
 *     visible side-by-side on the same org row
 *   - The orbit now spans both "people-network" AND "money-network"
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_ORGANISATIONS_DB_ID,
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/sync-xero-customers-to-notion-orgs.mjs           # dry-run
 *   node scripts/sync-xero-customers-to-notion-orgs.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
const NOTION_ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [k, v] of Object.entries({ NOTION_MIRROR_TOKEN: NOTION_TOKEN, NOTION_ORGANISATIONS_DB_ID: NOTION_ORGS_DB, SUPABASE_URL, SUPABASE_KEY })) {
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

let lastNotionAt = 0;
async function notionFetch(path, init = {}, attempt = 0) {
  const dt = Date.now() - lastNotionAt;
  if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt));
  lastNotionAt = Date.now();
  let r;
  try {
    r = await fetch(`${NOTION_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } catch (netErr) {
    if (attempt < 4) {
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`  net error: ${netErr.message} retry in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      return notionFetch(path, init, attempt + 1);
    }
    throw netErr;
  }
  if (r.status >= 500 || r.status === 429) {
    if (attempt < 4) {
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`  Notion ${r.status} retry in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      return notionFetch(path, init, attempt + 1);
    }
  }
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Notion ${r.status} ${path}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

// Normalisation: lowercase, strip legal suffixes + brackets + punctuation.
// Used for matching Xero contact_name ↔ Notion Org Key.
const LEGAL_SUFFIXES = /\b(pty\.?\s*ltd\.?|proprietary\s+limited|p\/l|limited|ltd\.?|incorporated|inc\.?|llc|llp|gmbh|aboriginal\s+corporation|aboriginal\s+council)\b/gi;
function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchOrgs() {
  // Pull all pages of the Orgs DB, keyed by Org Key (lowercased original company_name)
  const map = new Map(); // orgKey → { pageId, displayName, normalised }
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${NOTION_ORGS_DB}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    for (const r of data.results) {
      const orgKey = r.properties['Org Key']?.rich_text?.[0]?.plain_text || '';
      const displayName = r.properties['Name']?.title?.[0]?.plain_text || '';
      if (!orgKey) continue;
      map.set(orgKey, {
        pageId: r.id,
        displayName,
        normalised: normaliseName(displayName),
      });
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return map;
}

async function fetchXeroCustomerAggregates() {
  // Pull invoice line per-contact, aggregate in JS
  const out = new Map(); // xero_contact_id → { xero_contact_id, name, paid, outstanding, last_invoice }
  let offset = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('xero_invoices')
      .select('contact_xero_id, contact_name, type, status, amount_paid, amount_due, date')
      .eq('type', 'ACCREC')
      .in('status', ['PAID', 'AUTHORISED', 'DRAFT'])
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const i of data) {
      if (!i.contact_xero_id) continue;
      if (!out.has(i.contact_xero_id)) {
        out.set(i.contact_xero_id, {
          xero_contact_id: i.contact_xero_id,
          name: i.contact_name,
          paid: 0,
          outstanding: 0,
          last_invoice: null,
        });
      }
      const c = out.get(i.contact_xero_id);
      c.paid += Number(i.amount_paid || 0);
      if (i.status === 'AUTHORISED') c.outstanding += Number(i.amount_due || 0);
      if (i.date && (!c.last_invoice || i.date > c.last_invoice)) c.last_invoice = i.date;
    }
    if (data.length < page) break;
    offset += page;
  }
  // Keep only those with actual revenue or outstanding
  return [...out.values()].filter(c => c.paid > 0 || c.outstanding > 0);
}

function matchXeroToOrg(xc, orgMap) {
  const xn = normaliseName(xc.name);
  if (!xn) return null;
  // 1) Exact normalised match
  for (const [orgKey, org] of orgMap) {
    if (org.normalised === xn) return { orgKey, org, match: 'exact' };
  }
  // 2) Substring (longer contains shorter)
  for (const [orgKey, org] of orgMap) {
    if (!org.normalised || org.normalised.length < 4) continue;
    if (xn.includes(org.normalised) || org.normalised.includes(xn)) {
      return { orgKey, org, match: 'substring' };
    }
  }
  return null;
}

function richText(s) {
  return { rich_text: [{ text: { content: (s || '').slice(0, 2000) } }] };
}

// ────────────────────────────────────────────────────────────────

console.log(`sync-xero-customers-to-notion-orgs — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

console.log('Loading Notion orgs…');
const orgMap = await fetchOrgs();
console.log(`  ${orgMap.size} orgs in Notion`);

console.log('Aggregating Xero customers…');
const xeroCustomers = await fetchXeroCustomerAggregates();
console.log(`  ${xeroCustomers.length} Xero customers with revenue`);

const stats = { matched: 0, exact: 0, substring: 0, unmatched: 0, created: 0, updated: 0, errors: 0 };
const unmatched = [];

for (const xc of xeroCustomers) {
  const m = matchXeroToOrg(xc, orgMap);
  if (m) {
    stats.matched++;
    if (m.match === 'exact') stats.exact++; else stats.substring++;
  } else {
    stats.unmatched++;
    unmatched.push(xc);
  }
}

console.log(`\nMatching:`);
console.log(`  matched:    ${stats.matched}  (exact=${stats.exact}, substring=${stats.substring})`);
console.log(`  unmatched:  ${stats.unmatched}`);
if (unmatched.length) {
  console.log(`\nUnmatched (will be CREATED on apply):`);
  for (const u of unmatched.slice(0, 30)) {
    console.log(`  $${u.paid.toFixed(2).padStart(12)}  open=$${u.outstanding.toFixed(2).padStart(10)}  ${u.name}`);
  }
}

if (!APPLY) {
  console.log(`\nRe-run with --apply to update Notion.`);
  process.exit(0);
}

console.log(`\nWriting to Notion…`);
for (const xc of xeroCustomers) {
  const m = matchXeroToOrg(xc, orgMap);
  const props = {
    'Xero Contact ID': richText(xc.xero_contact_id),
    'Total Paid (Xero)': { number: xc.paid },
    'Outstanding (Xero)': { number: xc.outstanding },
    'Last Invoice Date': { date: xc.last_invoice ? { start: xc.last_invoice.split('T')[0] || xc.last_invoice } : null },
  };
  try {
    if (m) {
      // Patch existing org page; preserve other fields
      await notionFetch(`/pages/${m.org.pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: props }),
      });
      stats.updated++;
    } else {
      // Create new org page sourced from Xero
      const fullProps = {
        Name: { title: [{ text: { content: xc.name.slice(0, 200) } }] },
        'Org Key': richText(normaliseName(xc.name)),
        Source: { multi_select: [{ name: 'Xero' }] },
        ...props,
      };
      await notionFetch(`/pages`, {
        method: 'POST',
        body: JSON.stringify({ parent: { database_id: NOTION_ORGS_DB }, properties: fullProps }),
      });
      stats.created++;
    }
  } catch (e) {
    stats.errors++;
    if (stats.errors <= 5) console.error(`  err ${xc.name}: ${e.message.slice(0, 200)}`);
  }
}

console.log(`\n─── results ───`);
console.log(`updated:  ${stats.updated}`);
console.log(`created:  ${stats.created}`);
console.log(`errors:   ${stats.errors}`);
