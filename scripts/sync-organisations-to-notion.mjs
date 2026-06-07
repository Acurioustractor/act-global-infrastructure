#!/usr/bin/env node
/**
 * Sync organisations ("our orbit") → Notion DB.
 *
 * Anchors on company_name from v_canonical_contacts — i.e. the orgs where
 * we have at least one human contact. This is the strategic universe, not
 * the 98k-row generic organizations table.
 *
 * For each org:
 *   - Contact count (rollup of canonical contacts with this company_name)
 *   - Open pipeline $ (sum of open ghl_opportunities for those contacts)
 *   - Project codes (union of project codes across linked contacts)
 *   - Type/Tier (derived from foundations match if any)
 *   - Last activity (max last_contact_date across linked contacts)
 *
 * Notion relations:
 *   - Contacts (relation → NOTION_CONTACTS_DB, multi)
 *   - Opportunities (relation → NOTION_OPPORTUNITIES_DB, multi)
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_ORGANISATIONS_DB_ID,
 *   NOTION_CONTACTS_DB_ID, NOTION_OPPORTUNITIES_DB_ID,
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/sync-organisations-to-notion.mjs           # dry-run
 *   node scripts/sync-organisations-to-notion.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));
const { buildProjectTagMap, deriveProjectCodes } = await import(join(__dirname, 'lib/project-code-resolver.mjs'));

const APPLY = process.argv.includes('--apply');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
const NOTION_ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const NOTION_CONTACTS_DB = process.env.NOTION_CONTACTS_DB_ID;
const NOTION_OPPS_DB = process.env.NOTION_OPPORTUNITIES_DB_ID;
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [k, v] of Object.entries({ NOTION_MIRROR_TOKEN: NOTION_TOKEN, NOTION_ORGANISATIONS_DB_ID: NOTION_ORGS_DB, NOTION_CONTACTS_DB_ID: NOTION_CONTACTS_DB, NOTION_OPPORTUNITIES_DB_ID: NOTION_OPPS_DB, SUPABASE_URL, SUPABASE_KEY })) {
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
      console.warn(`  net error on ${path} (attempt ${attempt + 1}/5): ${netErr.message} — retry in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      return notionFetch(path, init, attempt + 1);
    }
    throw netErr;
  }
  if (r.status >= 500 || r.status === 429) {
    if (attempt < 4) {
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`  Notion ${r.status} on ${path} (attempt ${attempt + 1}/5) — retry in ${backoff}ms`);
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

async function findOrgPageByKey(orgKey) {
  const data = await notionFetch(`/databases/${NOTION_ORGS_DB}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'Org Key', rich_text: { equals: orgKey } },
      page_size: 1,
    }),
  });
  return data.results[0]?.id || null;
}

async function buildPageMap(dbId, keyProp = 'GHL ID') {
  const map = new Map();
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    for (const r of data.results) {
      const key = r.properties[keyProp]?.rich_text?.[0]?.plain_text;
      if (key) map.set(key, r.id);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return map;
}

// Aggregate orgs from our orbit: { orgKey, name, contacts[], opps[], projects[], last_contact, total_open_value }
async function buildOrbitOrgs() {
  // 1. Load all canonical contacts with their tags + dates + company_name + ghl_id
  const contacts = [];
  let offset = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('v_canonical_contacts')
      .select('ghl_id, full_name, company_name, tags, last_contact_date')
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    contacts.push(...data);
    if (data.length < page) break;
    offset += page;
  }

  // 2. Load all opps (with ghl_contact_id → join key)
  const opps = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_opportunities')
      .select('ghl_id, ghl_contact_id, name, status, monetary_value, project_code')
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    opps.push(...data);
    if (data.length < page) break;
    offset += page;
  }

  // 3. Build project resolver
  const { directMap } = await buildProjectTagMap(supabase);

  // 4. Bucket contacts by normalised org key
  const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const orgs = new Map(); // orgKey → org object
  for (const c of contacts) {
    if (!c.company_name) continue;
    const key = normalize(c.company_name);
    if (!key || key.length < 2) continue;
    if (!orgs.has(key)) {
      orgs.set(key, {
        orgKey: key,
        displayName: c.company_name.trim(),
        contactGhlIds: [],
        contactTags: new Set(),
        last_contact: null,
      });
    }
    const o = orgs.get(key);
    o.contactGhlIds.push(c.ghl_id);
    for (const t of c.tags || []) o.contactTags.add(String(t).toLowerCase());
    if (c.last_contact_date && (!o.last_contact || c.last_contact_date > o.last_contact)) {
      o.last_contact = c.last_contact_date;
    }
  }

  // 5. Add opps to their org via contact lookup
  const contactToOrgKey = new Map();
  for (const c of contacts) {
    if (c.company_name) contactToOrgKey.set(c.ghl_id, normalize(c.company_name));
  }
  for (const o of orgs.values()) {
    o.oppGhlIds = [];
    o.openValue = 0;
  }
  for (const op of opps) {
    const orgKey = contactToOrgKey.get(op.ghl_contact_id);
    if (!orgKey || !orgs.has(orgKey)) continue;
    const o = orgs.get(orgKey);
    o.oppGhlIds.push(op.ghl_id);
    if (op.status === 'open') o.openValue += Number(op.monetary_value || 0);
  }

  // 6. Derive project codes for each org from its contacts' tag union
  for (const o of orgs.values()) {
    o.projectCodes = deriveProjectCodes([...o.contactTags], directMap);
  }

  return [...orgs.values()].sort((a, b) => b.openValue - a.openValue || a.displayName.localeCompare(b.displayName));
}

function richText(s) {
  return { rich_text: [{ text: { content: (s || '').slice(0, 2000) } }] };
}

function selectOpt(name) {
  return name ? { select: { name: String(name).slice(0, 100) } } : { select: null };
}

function toProperties(org, contactMap, oppMap) {
  const contactRelations = org.contactGhlIds
    .map(g => contactMap.get(g))
    .filter(Boolean)
    .slice(0, 100) // Notion relation property max 100 items
    .map(id => ({ id }));
  const oppRelations = org.oppGhlIds
    .map(g => oppMap.get(g))
    .filter(Boolean)
    .slice(0, 100)
    .map(id => ({ id }));
  return {
    Name: { title: [{ text: { content: org.displayName.slice(0, 200) } }] },
    'Org Key': richText(org.orgKey),
    Projects: { multi_select: org.projectCodes.map(name => ({ name: name.slice(0, 100) })) },
    'Contact Count': { number: org.contactGhlIds.length },
    'Opportunity Count': { number: org.oppGhlIds.length },
    'Open Pipeline Value': { number: org.openValue },
    'Last Contact': { date: org.last_contact ? { start: org.last_contact.split('T')[0] || org.last_contact } : null },
    'Contacts': { relation: contactRelations },
    'Opportunities': { relation: oppRelations },
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
}

// ──────────────────────────────────────────────────────────────────────

console.log(`sync-organisations-to-notion — ${APPLY ? 'APPLY' : 'DRY-RUN'}${LIMIT ? ` (limit ${LIMIT})` : ''}`);

const orgs = await buildOrbitOrgs();
console.log(`Built ${orgs.length} orgs in orbit (anchored on company_name from canonical contacts)`);
console.log(`Top 5 by open pipeline $:`);
for (const o of orgs.slice(0, 5)) {
  console.log(`  $${o.openValue.toLocaleString()}  ${o.displayName}  (${o.contactGhlIds.length} contacts, ${o.oppGhlIds.length} opps, projects=${o.projectCodes.join(',') || '-'})`);
}

if (!APPLY) {
  console.log(`\nWould upsert ${LIMIT ? Math.min(LIMIT, orgs.length) : orgs.length} orgs to Notion.`);
  console.log(`Re-run with --apply to write.`);
  process.exit(0);
}

console.log(`\nBuilding Notion page maps for relations…`);
const contactMap = await buildPageMap(NOTION_CONTACTS_DB, 'GHL ID');
console.log(`  contacts: ${contactMap.size}`);
const oppMap = await buildPageMap(NOTION_OPPS_DB, 'GHL ID');
console.log(`  opps:     ${oppMap.size}`);

const stats = { upserts: 0, updates: 0, creates: 0, errors: 0 };
let processed = 0;

for (const o of orgs) {
  if (LIMIT && processed >= LIMIT) break;
  processed++;

  try {
    const existing = await findOrgPageByKey(o.orgKey);
    const props = toProperties(o, contactMap, oppMap);
    if (existing) {
      await notionFetch(`/pages/${existing}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: props }),
      });
      stats.updates++;
    } else {
      await notionFetch(`/pages`, {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: NOTION_ORGS_DB },
          properties: props,
        }),
      });
      stats.creates++;
    }
    stats.upserts++;
  } catch (e) {
    stats.errors++;
    if (stats.errors <= 5) console.error(`  err ${o.orgKey}: ${e.message.slice(0, 200)}`);
  }

  if (processed % 25 === 0) {
    console.log(`  …processed ${processed}  upserts=${stats.upserts} updates=${stats.updates} creates=${stats.creates} errors=${stats.errors}`);
  }
}

console.log(`\n─── results ───`);
console.log(`processed: ${processed}`);
console.log(`upserts:   ${stats.upserts}`);
console.log(`updates:   ${stats.updates}`);
console.log(`creates:   ${stats.creates}`);
console.log(`errors:    ${stats.errors}`);
