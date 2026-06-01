#!/usr/bin/env node
/**
 * Sync ACT Opportunities to a Notion database
 *
 * Creates (or updates) a proper Notion database under the ACT Money Framework page.
 * Each opportunity = one row, with:
 *   - Name (title)
 *   - Pile (select: Voice/Flow/Ground/Grants/Other)
 *   - Source (select: GHL/Xero/Foundation)
 *   - Amount (number, AUD)
 *   - Stage (select: Open/Won/Lost/Outstanding/Overdue/Discovered)
 *   - Deadline (date)
 *   - Source URL (url — deep-link to Xero invoice / GHL deal / grant page)
 *   - Project Code (rich_text)
 *   - Funder/Contact (rich_text)
 *   - External ID (rich_text — upsert key)
 *   - Last Synced (date)
 *
 * Sources:
 *   - GHL open opportunities (315 rows)
 *   - Xero outstanding receivables (~30 rows)
 *   - Foundation grants — actionable, ACT-relevant ($50K-$5M, deadline open) (~50 rows)
 *
 * Re-runnable: upserts by External ID. Stale rows (in DB but not in source) are marked
 * Stage='Archived' so history is preserved.
 *
 * Usage:
 *   node scripts/sync-opportunities-to-notion-db.mjs              # full sync
 *   node scripts/sync-opportunities-to-notion-db.mjs --dry-run    # preview
 *   node scripts/sync-opportunities-to-notion-db.mjs --source ghl # only GHL
 *   node scripts/sync-opportunities-to-notion-db.mjs --source xero # only Xero
 *   node scripts/sync-opportunities-to-notion-db.mjs --source foundation # only grants
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const sourceArg = args.find(a => a.startsWith('--source'));
const SOURCES = sourceArg
  ? [sourceArg.split(/[ =]/)[1]]
  : ['ghl', 'xero', 'foundation'];
// --filter <substr> or --filter=<substr>: restrict to opps whose externalId/name contains
// <substr> (tracer runs). Accepts both the `=` form and a following token.
const filterIdx = args.findIndex(a => a === '--filter' || a.startsWith('--filter='));
const FILTER = filterIdx === -1
  ? null
  : (args[filterIdx].includes('=') ? args[filterIdx].split('=')[1] : args[filterIdx + 1]) || null;

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIdsPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(notionDbIdsPath, 'utf-8'));

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_HEADERS = { Authorization: `Bearer ${GHL_API_KEY}`, Version: '2021-07-28', Accept: 'application/json' };

// The 7 money-alignment custom fields on GHL opportunities (location agzsSZWgovjwgpcoASWG).
// The bulk /opportunities/search the mirror uses returns customFields:[] (unhydrated), so we
// read them live per-opp via GET /opportunities/{id}, which returns customFields:[{id,fieldValue}].
const MONEY_FIELD_IDS = {
  fundingType:   'UCFe9cyjk3sVKwtInfSG',
  matchEligible: '6tSoVICqtrTGQAzpPHn1',
  capitalStatus: 'QbfHdeNpz2JiMe5iRESS',
  amountBasis:   'LM1U3fVHJNB4KwvuK9ZF',
  xeroContactId: 'e1GTAmBc3HLwxNiRVZjS',
  xeroInvoiceNo: 'YFy6JM5tGjl4J4B5cHSV',
  actualPaid:    'R4QAmlXhi6gRRPrfuuz5',
};

const PARENT_PAGE = notionDbIds.moneyFramework;

// ============================================
// Helpers
// ============================================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const verbose = (m) => { if (VERBOSE) log(m); };

const xeroInvoiceUrl = (id) => id ? `https://go.xero.com/app/invoicing/view/${id}` : null;
const ghlOpportunityUrl = (id) => (GHL_LOCATION_ID && id) ? `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/list?opportunity=${id}` : null;
const isUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

// Live-read the 7 money-alignment custom fields for one GHL opportunity.
// Returns null on error (caller leaves Notion money props untouched). Numbers coerced.
async function fetchGhlMoneyFields(oppId) {
  try {
    const r = await fetch(`${GHL_BASE}/opportunities/${oppId}`, { headers: GHL_HEADERS });
    if (!r.ok) { verbose(`  GHL GET ${oppId} -> ${r.status}`); return null; }
    const opp = (await r.json())?.opportunity;
    const cf = {};
    for (const f of (opp?.customFields || [])) cf[f.id] = f.fieldValue;
    const num = (v) => (v === null || v === undefined || v === '') ? null : Number(v);
    return {
      fundingType:   cf[MONEY_FIELD_IDS.fundingType]   ?? null,
      matchEligible: cf[MONEY_FIELD_IDS.matchEligible] ?? null,
      capitalStatus: cf[MONEY_FIELD_IDS.capitalStatus] ?? null,
      amountBasis:   cf[MONEY_FIELD_IDS.amountBasis]   ?? null,
      xeroContactId: cf[MONEY_FIELD_IDS.xeroContactId] ?? null,
      xeroInvoiceNo: cf[MONEY_FIELD_IDS.xeroInvoiceNo] ?? null,
      actualPaid:    num(cf[MONEY_FIELD_IDS.actualPaid]),
    };
  } catch (e) { verbose(`  GHL GET ${oppId} error: ${e.message}`); return null; }
}

// ============================================
// Database schema + ensure
// ============================================

const SCHEMA = {
  Name: { title: {} },
  Pile: { select: { options: [
    { name: 'Voice', color: 'orange' },
    { name: 'Flow', color: 'blue' },
    { name: 'Ground', color: 'green' },
    { name: 'Grants', color: 'purple' },
    { name: 'Other', color: 'gray' },
    { name: 'Uncoded', color: 'default' },
  ]}},
  Source: { select: { options: [
    { name: 'GHL', color: 'purple' },
    { name: 'Xero', color: 'blue' },
    { name: 'Foundation', color: 'green' },
  ]}},
  Stage: { select: { options: [
    { name: 'Open', color: 'blue' },
    { name: 'Outstanding', color: 'yellow' },
    { name: 'Overdue', color: 'red' },
    { name: 'Won', color: 'green' },
    { name: 'Lost', color: 'gray' },
    { name: 'Discovered', color: 'purple' },
    { name: 'Researching', color: 'orange' },
    { name: 'Archived', color: 'default' },
  ]}},
  Amount: { number: { format: 'australian_dollar' } },
  Deadline: { date: {} },
  'Source URL': { url: {} },
  'Project Code': { rich_text: {} },
  'Funder / Contact': { rich_text: {} },
  Pipeline: { rich_text: {} },
  'External ID': { rich_text: {} },
  'Last Synced': { date: {} },
  // --- Money-alignment fields (sourced live from GHL opp custom fields, Goods opps) ---
  'Funding type': { select: { options: [
    { name: 'Grant', color: 'purple' },
    { name: 'Philanthropic', color: 'pink' },
    { name: 'Commercial sale', color: 'green' },
    { name: 'Community contribution', color: 'blue' },
    { name: 'Demand signal', color: 'yellow' },
    { name: 'Other', color: 'gray' },
  ]}},
  'Match-eligible (QBE)': { select: { options: [
    { name: 'Yes', color: 'green' },
    { name: 'No', color: 'red' },
    { name: 'TBC', color: 'gray' },
  ]}},
  'Capital status': { select: { options: [
    { name: 'Signal', color: 'gray' },
    { name: 'Ask made', color: 'yellow' },
    { name: 'Verbal yes', color: 'orange' },
    { name: 'Signed LOI', color: 'blue' },
    { name: 'Contracted', color: 'purple' },
    { name: 'Invoiced', color: 'pink' },
    { name: 'Paid', color: 'green' },
  ]}},
  'Amount basis': { select: { options: [
    { name: 'Estimate', color: 'gray' },
    { name: 'Quote', color: 'yellow' },
    { name: 'Invoiced', color: 'blue' },
    { name: 'Xero-actual', color: 'green' },
  ]}},
  'Actual paid (Xero) AUD': { number: { format: 'australian_dollar' } },
  'Xero invoice #': { rich_text: {} },
  'Xero contact ID': { rich_text: {} },
};

async function ensureDatabase() {
  let databaseId = notionDbIds.opportunitiesDb;

  if (!databaseId) {
    if (!PARENT_PAGE) {
      log('ERROR: parent page (moneyFramework) not found in config/notion-database-ids.json.');
      process.exit(1);
    }
    log('Creating "ACT Opportunities" database under ACT Money Framework page...');
    const db = await notion.databases.create({
      parent: { type: 'page_id', page_id: PARENT_PAGE },
      title: [{ type: 'text', text: { content: 'ACT Opportunities' } }],
      icon: { type: 'emoji', emoji: '\u{1F4B0}' },
      properties: SCHEMA,
    });
    databaseId = db.id;
    log(`Created database: ${databaseId}`);
    notionDbIds.opportunitiesDb = databaseId;
    writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
  }

  // Resolve data_source_id (Notion v2025-09 API model — databases have data sources)
  let dataSourceId = notionDbIds.opportunitiesDataSource;
  if (!dataSourceId) {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    dataSourceId = (db.data_sources && db.data_sources[0]?.id) || null;
    if (!dataSourceId) {
      log('ERROR: could not resolve data_source_id for the database');
      process.exit(1);
    }
    notionDbIds.opportunitiesDataSource = dataSourceId;
    writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
    log(`Resolved data_source_id: ${dataSourceId}`);
  }

  // Ensure schema is applied to the data source (databases.create in v2025-09 doesn't propagate properties to the DS)
  const ds = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  const existingProps = new Set(Object.keys(ds.properties || {}));
  const requiredProps = Object.keys(SCHEMA).filter(k => k !== 'Name'); // Name is the title, already exists
  const missing = requiredProps.filter(p => !existingProps.has(p));
  if (missing.length > 0) {
    log(`Adding ${missing.length} missing properties: ${missing.join(', ')}`);
    const addProps = {};
    for (const p of missing) addProps[p] = SCHEMA[p];
    await notion.dataSources.update({ data_source_id: dataSourceId, properties: addProps });
    log('Schema updated.');
  }

  return { databaseId, dataSourceId };
}

// ============================================
// Fetch from Supabase
// ============================================

async function fetchGhlRows() {
  const { data, error } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, monetary_value, status, pipeline_name, stage_name, project_code, pile, ghl_updated_at')
    .in('status', ['open', 'won', 'lost'])
    .order('monetary_value', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(r => ({
    externalId: `ghl:${r.ghl_id}`,
    name: r.name || 'unnamed',
    pile: r.pile || 'Uncoded',
    source: 'GHL',
    stage: r.status === 'open' ? 'Open' : r.status === 'won' ? 'Won' : r.status === 'lost' ? 'Lost' : 'Archived',
    amount: Number(r.monetary_value || 0),
    deadline: null,
    url: ghlOpportunityUrl(r.ghl_id),
    projectCode: r.project_code || '',
    funder: r.stage_name || '',
    pipeline: r.pipeline_name || '',
  }));
}

async function fetchXeroOutstandingRows() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, amount_due, due_date, project_code, status, type, entity_code')
    .eq('type', 'ACCREC')
    .gt('amount_due', 0)
    .order('amount_due', { ascending: false });
  if (error) throw error;
  const piles = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8')).projects;
  return (data || []).map(r => {
    const overdue = r.due_date && new Date(r.due_date) < new Date();
    const pile = piles[r.project_code] || 'Uncoded';
    return {
      externalId: `xero:${r.xero_id}`,
      name: `${r.invoice_number || 'no#'} — ${(r.contact_name || 'unknown').slice(0, 60)}`,
      pile,
      source: 'Xero',
      stage: overdue ? 'Overdue' : 'Outstanding',
      amount: Number(r.amount_due || 0),
      deadline: r.due_date,
      url: xeroInvoiceUrl(r.xero_id),
      projectCode: r.project_code || '',
      funder: r.contact_name || '',
      pipeline: 'Xero ACCREC',
    };
  });
}

async function fetchFoundationGrantRows() {
  const { data, error } = await supabase
    .from('grant_opportunities')
    .select('id, name, amount_max, deadline, url, pipeline_stage, foundation_id, foundations:foundation_id(name)')
    .or('pipeline_stage.eq.discovered,pipeline_stage.is.null,pipeline_stage.eq.researching')
    .gte('amount_max', 50000)
    .lte('amount_max', 5000000)
    .not('foundation_id', 'is', null)
    .not('name', 'ilike', 'ARC Centre%')
    .not('name', 'ilike', 'ARC Industrial%')
    .order('amount_max', { ascending: false })
    .limit(60);
  if (error) throw error;
  // Dedupe by name prefix + filter expired deadlines
  const seen = new Set();
  const items = [];
  for (const g of (data || [])) {
    if (g.deadline && new Date(g.deadline) < new Date()) continue;
    const key = (g.name || '').toLowerCase().slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(g);
  }
  return items.slice(0, 50).map(g => ({
    externalId: `foundation:${g.id}`,
    name: g.name?.slice(0, 100) || 'unnamed grant',
    pile: 'Grants',
    source: 'Foundation',
    stage: g.pipeline_stage === 'researching' ? 'Researching' : 'Discovered',
    amount: Number(g.amount_max || 0),
    deadline: g.deadline,
    url: isUrl(g.url) ? g.url : null,
    projectCode: '',
    funder: g.foundations?.name || '',
    pipeline: 'GrantScope research',
  }));
}

// ============================================
// Existing rows in Notion DB
// ============================================

// Map<externalId, Array<{id, lastEdited}>>. Multiple entries per id = duplicate pages
// (the DB accumulated 162 of them before upsert existed). upsert() keeps the newest and
// archives the rest, so the sync self-heals duplicates and stays idempotent thereafter.
async function fetchExistingRows(dataSourceId) {
  const map = new Map();
  let cursor = undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of res.results) {
      const ext = page.properties['External ID']?.rich_text?.[0]?.plain_text;
      if (!ext) continue;
      const arr = map.get(ext) || [];
      arr.push({ id: page.id, lastEdited: page.last_edited_time });
      map.set(ext, arr);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

// ============================================
// Build Notion properties for an opportunity row
// ============================================

function rt(s) { return [{ type: 'text', text: { content: String(s).slice(0, 2000) } }]; }

function buildProps(opp) {
  const props = {
    Name: { title: rt(opp.name) },
    Pile: { select: { name: opp.pile } },
    Source: { select: { name: opp.source } },
    Stage: { select: { name: opp.stage } },
    Amount: { number: opp.amount || 0 },
    'Project Code': { rich_text: opp.projectCode ? rt(opp.projectCode) : [] },
    'Funder / Contact': { rich_text: opp.funder ? rt(opp.funder) : [] },
    Pipeline: { rich_text: opp.pipeline ? rt(opp.pipeline) : [] },
    'External ID': { rich_text: rt(opp.externalId) },
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
  if (opp.deadline) props.Deadline = { date: { start: opp.deadline } };
  if (opp.url) props['Source URL'] = { url: opp.url };
  // Money-alignment fields (Goods opps only — set when live-hydrated from GHL).
  // Only emit props that have a value, so a partial-update never wipes an existing Notion value.
  const m = opp.money;
  if (m) {
    if (m.fundingType)   props['Funding type'] = { select: { name: m.fundingType } };
    if (m.matchEligible) props['Match-eligible (QBE)'] = { select: { name: m.matchEligible } };
    if (m.capitalStatus) props['Capital status'] = { select: { name: m.capitalStatus } };
    if (m.amountBasis)   props['Amount basis'] = { select: { name: m.amountBasis } };
    if (m.actualPaid != null) props['Actual paid (Xero) AUD'] = { number: m.actualPaid };
    if (m.xeroInvoiceNo) props['Xero invoice #'] = { rich_text: rt(m.xeroInvoiceNo) };
    if (m.xeroContactId) props['Xero contact ID'] = { rich_text: rt(m.xeroContactId) };
  }
  return props;
}

// ============================================
// Upsert
// ============================================

async function upsert(dataSourceId, opp, existing, stats) {
  const props = buildProps(opp);
  const copies = existing.get(opp.externalId);
  if (copies && copies.length) {
    // Keep the most-recently-edited page; refresh it; archive any duplicate copies.
    copies.sort((a, b) => String(b.lastEdited || '').localeCompare(String(a.lastEdited || '')));
    const survivor = copies[0].id;
    const extras = copies.slice(1);
    if (extras.length) {
      stats.deduped += extras.length;
      for (const ex of extras) {
        verbose(`  dedupe ${opp.externalId}: archive ${ex.id} (keep ${survivor})`);
        if (!DRY_RUN) { await notion.pages.update({ page_id: ex.id, archived: true }); await sleep(120); }
      }
    }
    if (DRY_RUN) return extras.length ? 'updated+deduped (dry)' : 'updated (dry)';
    await notion.pages.update({ page_id: survivor, properties: props });
    return extras.length ? 'updated+deduped' : 'updated';
  } else {
    if (DRY_RUN) return 'created (dry)';
    await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: dataSourceId },
      properties: props,
    });
    return 'created';
  }
}

async function archiveStale(databaseId, opps, existing) {
  const seenIds = new Set(opps.map(o => o.externalId));
  const stale = [];
  for (const [extId, copies] of existing.entries()) {
    // Only archive rows from sources we just synced
    const source = extId.split(':')[0]; // ghl|xero|foundation
    const sourceMap = { ghl: 'ghl', xero: 'xero', foundation: 'foundation' };
    if (!sourceMap[source]) continue;
    if (!SOURCES.includes(sourceMap[source])) continue; // didn't sync this source, leave alone
    if (!seenIds.has(extId)) for (const c of copies) stale.push({ extId, pageId: c.id });
  }
  log(`Archiving ${stale.length} stale rows...`);
  for (const { pageId } of stale) {
    if (DRY_RUN) continue;
    try {
      await notion.pages.update({
        page_id: pageId,
        properties: { Stage: { select: { name: 'Archived' } } },
      });
      await sleep(150);
    } catch (e) {
      verbose(`  Archive failed for ${pageId}: ${e.message}`);
    }
  }
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== ACT Opportunities → Notion DB ===');
  if (DRY_RUN) log('DRY RUN MODE');
  log(`Sources: ${SOURCES.join(', ')}`);

  if (!process.env.NOTION_TOKEN) { log('ERROR: NOTION_TOKEN not set'); process.exit(1); }
  if (!SUPABASE_URL) { log('ERROR: Supabase URL not set'); process.exit(1); }

  const { databaseId, dataSourceId } = await ensureDatabase();

  log('Fetching opportunities from Supabase...');
  const allOpps = [];
  if (SOURCES.includes('ghl')) {
    const rows = await fetchGhlRows();
    log(`  GHL: ${rows.length}`);
    allOpps.push(...rows);
  }
  if (SOURCES.includes('xero')) {
    const rows = await fetchXeroOutstandingRows();
    log(`  Xero outstanding: ${rows.length}`);
    allOpps.push(...rows);
  }
  if (SOURCES.includes('foundation')) {
    const rows = await fetchFoundationGrantRows();
    log(`  Foundation grants: ${rows.length}`);
    allOpps.push(...rows);
  }
  let opps = allOpps;
  if (FILTER) {
    opps = allOpps.filter(o => o.externalId.includes(FILTER) || (o.name || '').toLowerCase().includes(FILTER.toLowerCase()));
    log(`--filter "${FILTER}" -> ${opps.length} opps (of ${allOpps.length})`);
  }
  log(`Total opportunities to sync: ${opps.length}`);

  // Live-hydrate the 7 money-alignment fields for Goods opps. The mirror's custom_fields is
  // empty (bulk /opportunities/search doesn't return them), so read each Goods opp live from
  // GHL. Scoped to Goods pipelines = matches the backfill; ~239 opps, rate-limited ~1.1s/call.
  if (SOURCES.includes('ghl') && GHL_API_KEY) {
    const goods = opps.filter(o => o.source === 'GHL' && (o.pipeline || '').startsWith('Goods'));
    log(`Hydrating money fields for ${goods.length} Goods opps from live GHL...`);
    let hydrated = 0;
    for (const [i, o] of goods.entries()) {
      o.money = await fetchGhlMoneyFields(o.externalId.replace(/^ghl:/, ''));
      if (o.money && (o.money.capitalStatus || o.money.fundingType || o.money.actualPaid != null)) hydrated++;
      if ((i + 1) % 25 === 0) log(`  hydrated ${i + 1}/${goods.length}`);
      await sleep(1100); // GHL 60 req/min/tenant
    }
    log(`  ${hydrated}/${goods.length} Goods opps had money fields set`);
  } else if (SOURCES.includes('ghl')) {
    log('  WARN: GHL_API_KEY not set — skipping money-field hydration');
  }

  log('Fetching existing Notion DB rows...');
  const existing = await fetchExistingRows(dataSourceId);
  const dupCount = [...existing.values()].reduce((s, copies) => s + Math.max(0, copies.length - 1), 0);
  log(`  ${existing.size} unique External IDs, ${dupCount} duplicate pages to clean`);

  log('Upserting...');
  const stats = { created: 0, updated: 0, deduped: 0, errors: 0 };
  for (const [i, opp] of opps.entries()) {
    try {
      const result = await upsert(dataSourceId, opp, existing, stats);
      if (result.startsWith('created')) stats.created++;
      else if (result.startsWith('updated')) stats.updated++;
      if ((i + 1) % 25 === 0) log(`  ${i + 1}/${opps.length} (created ${stats.created}, updated ${stats.updated}, deduped ${stats.deduped})`);
      if (!DRY_RUN) await sleep(120); // Notion rate limit ~3 req/s
    } catch (e) {
      stats.errors++;
      verbose(`  Error on ${opp.externalId}: ${e.message}`);
    }
  }
  log(`Sync complete: created ${stats.created}, updated ${stats.updated}, deduped ${stats.deduped}, errors ${stats.errors}`);

  // Skip stale-archival on filtered/tracer runs (the source list is intentionally partial).
  if (!FILTER) await archiveStale(databaseId, opps, existing);

  log('Done!');
  log(`Notion database: notion.so/${databaseId.replace(/-/g, '')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
