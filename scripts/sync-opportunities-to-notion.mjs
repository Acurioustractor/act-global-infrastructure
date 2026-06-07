#!/usr/bin/env node
/**
 * Sync GHL opportunities (Supabase ghl_opportunities) → Notion DB.
 *
 * Phase 2 of wiki/decisions/2026-05-14-notion-platform-architecture.md.
 * Pairs with sync-canonical-contacts-to-notion.mjs — each opportunity gets
 * a Notion relation back to its Contact (by GHL contact id), so a Contact
 * page automatically displays their entire pipeline.
 *
 * Strategic view this unlocks (in Notion):
 *   - Sort opportunities by Value desc, filter Status=open → top of pipeline
 *   - Group by Pipeline or Project → cohort-level $ totals
 *   - Open a Contact page → see every opp linked to them
 *
 * Env:
 *   NOTION_MIRROR_TOKEN
 *   NOTION_CONTACTS_DB_ID        (target of Contact relation)
 *   NOTION_OPPORTUNITIES_DB_ID
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/sync-opportunities-to-notion.mjs           # dry-run
 *   node scripts/sync-opportunities-to-notion.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
const NOTION_OPPS_DB = process.env.NOTION_OPPORTUNITIES_DB_ID;
const NOTION_CONTACTS_DB = process.env.NOTION_CONTACTS_DB_ID;
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [k, v] of Object.entries({ NOTION_MIRROR_TOKEN: NOTION_TOKEN, NOTION_OPPORTUNITIES_DB_ID: NOTION_OPPS_DB, NOTION_CONTACTS_DB_ID: NOTION_CONTACTS_DB, SUPABASE_URL, SUPABASE_KEY })) {
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

async function findOpportunityPageByGhlId(ghlId) {
  const data = await notionFetch(`/databases/${NOTION_OPPS_DB}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'GHL ID', rich_text: { equals: ghlId } },
      page_size: 1,
    }),
  });
  return data.results[0]?.id || null;
}

// Build a map of GHL contact id → Notion contact page id, so we can populate
// the Contact relation on each opportunity. One Notion query per page of 100.
async function buildContactPageMap() {
  const map = new Map();
  let cursor = null;
  let page = 0;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${NOTION_CONTACTS_DB}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    page++;
    for (const r of data.results) {
      const ghlIdProp = r.properties['GHL ID']?.rich_text?.[0]?.plain_text;
      if (ghlIdProp) map.set(ghlIdProp, r.id);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  console.log(`Built contact-page map: ${map.size} contacts across ${page} pages`);
  return map;
}

async function fetchAllOpportunities() {
  const out = [];
  const page = 500;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_opportunities')
      .select('ghl_id, ghl_contact_id, name, pipeline_name, stage_name, status, monetary_value, project_code, ghl_created_at, ghl_updated_at, xero_invoice_id, received_date')
      .order('ghl_id', { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < page) break;
    offset += page;
  }
  return out;
}

// Resolve org name for the opportunity: prefer canonical entity's name via
// contact's canonical_entity_id, fall back to contact's company_name.
async function buildOrgNameMap() {
  const map = new Map();
  const page = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, company_name, canonical_entity_id')
      .not('canonical_contact_id', 'is', null) // skip the merged duplicates
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) {
      if (c.company_name) map.set(c.ghl_id, c.company_name);
    }
    if (data.length < page) break;
    offset += page;
  }
  // Also pull from v_canonical_contacts (canonical_contact_id IS NULL)
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('v_canonical_contacts')
      .select('ghl_id, company_name')
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) {
      if (c.company_name && !map.has(c.ghl_id)) map.set(c.ghl_id, c.company_name);
    }
    if (data.length < page) break;
    offset += page;
  }
  return map;
}

function richText(s) {
  return { rich_text: [{ text: { content: (s || '').slice(0, 2000) } }] };
}

function selectOpt(name) {
  return name ? { select: { name: String(name).slice(0, 100) } } : { select: null };
}

function toProperties(o, contactPageId, orgName) {
  const props = {
    Name: { title: [{ text: { content: (o.name || `(unnamed ${o.ghl_id.slice(0, 8)})`).slice(0, 200) } }] },
    'GHL ID': richText(o.ghl_id),
    Pipeline: selectOpt(o.pipeline_name),
    Stage: selectOpt(o.stage_name),
    Status: selectOpt(o.status),
    Value: { number: o.monetary_value ? Number(o.monetary_value) : null },
    Project: { multi_select: o.project_code ? [{ name: String(o.project_code).slice(0, 100) }] : [] },
    'Received Date': { date: o.received_date ? { start: o.received_date.split('T')[0] } : null },
    'Last Activity': { date: o.ghl_updated_at ? { start: o.ghl_updated_at.split('T')[0] } : null },
    'Org Name': richText(orgName || ''),
    'Xero Invoice ID': richText(o.xero_invoice_id || ''),
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
  if (contactPageId) {
    props.Contact = { relation: [{ id: contactPageId }] };
  }
  return props;
}

// ──────────────────────────────────────────────────────────────────────

console.log(`sync-opportunities-to-notion — ${APPLY ? 'APPLY' : 'DRY-RUN'}${LIMIT ? ` (limit ${LIMIT})` : ''}`);

const opps = await fetchAllOpportunities();
console.log(`Loaded ${opps.length} opportunities from Supabase`);

const orgMap = await buildOrgNameMap();
console.log(`Built org-name map: ${orgMap.size} contacts → company_name`);

const contactPageMap = APPLY ? await buildContactPageMap() : new Map();

const stats = { upserts: 0, updates: 0, creates: 0, errors: 0, no_contact_link: 0 };
let processed = 0;

for (const o of opps) {
  if (LIMIT && processed >= LIMIT) break;
  processed++;

  const contactPageId = contactPageMap.get(o.ghl_contact_id) || null;
  const orgName = orgMap.get(o.ghl_contact_id) || '';
  if (!contactPageId && APPLY) stats.no_contact_link++;

  if (!APPLY) {
    if (processed <= 5) {
      console.log(`  WOULD UPSERT  ${o.ghl_id.slice(0, 12)}  ${(o.name || '?').slice(0, 50)}  $${o.monetary_value || 0}  ${o.status}  ${o.stage_name || '?'}  org="${orgName.slice(0, 30)}"`);
    }
    stats.upserts++;
    continue;
  }

  try {
    const existing = await findOpportunityPageByGhlId(o.ghl_id);
    if (existing) {
      await notionFetch(`/pages/${existing}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: toProperties(o, contactPageId, orgName) }),
      });
      stats.updates++;
    } else {
      await notionFetch(`/pages`, {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: NOTION_OPPS_DB },
          properties: toProperties(o, contactPageId, orgName),
        }),
      });
      stats.creates++;
    }
    stats.upserts++;
  } catch (e) {
    stats.errors++;
    if (stats.errors <= 5) console.error(`  err ${o.ghl_id}: ${e.message.slice(0, 200)}`);
  }

  if (processed % 50 === 0) {
    console.log(`  …processed ${processed}  upserts=${stats.upserts} updates=${stats.updates} creates=${stats.creates} no-contact=${stats.no_contact_link} errors=${stats.errors}`);
  }
}

console.log(`\n─── results ───`);
console.log(`processed: ${processed}`);
if (APPLY) {
  console.log(`upserts:    ${stats.upserts}`);
  console.log(`updates:    ${stats.updates}`);
  console.log(`creates:    ${stats.creates}`);
  console.log(`no-contact: ${stats.no_contact_link} (orphan opps with no GHL contact_id match)`);
  console.log(`errors:     ${stats.errors}`);
} else {
  console.log(`Would upsert: ${stats.upserts}`);
  console.log(`Re-run with --apply to write.`);
}
