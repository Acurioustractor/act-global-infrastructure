#!/usr/bin/env node
/**
 * Sync grant TRANCHES (paid grant invoices) → Notion "Grant Tranches" DB.
 *
 * An open/flexible grant (e.g. Snow Foundation) is paid in several tranches over time,
 * each funding a different thing (travel, R&D, equipment, wages, capital). This builds a
 * per-tranche, reportable ledger in Notion so each tranche can be acquitted/reported against
 * individually — sourced from the Xero mirror so the dollar figures stay RECONCILED, never
 * hand-typed.
 *
 * Source of truth:
 *   - Xero (Goods org, Nic's sole trader) = money truth. PAID ACCREC invoices = received cash.
 *   - Purpose comes from each invoice's line-item descriptions.
 *
 * Scope: driven by the FUNDERS allow-list below. V1 = Snow Foundation (verified, reconciles
 * to $402,929.79). Add a funder by appending to FUNDERS *after* reconciling its paid ACCREC
 * total against its known grant figure (don't assert a classification you haven't verified —
 * e.g. the VFFF/FRRR joint-$50k needs care).
 *
 * Re-runnable: upserts by External ID (xero:<invoice xero_id>). Idempotent.
 *
 * Usage:
 *   node scripts/sync-grant-tranches-to-notion.mjs            # sync all configured funders
 *   node scripts/sync-grant-tranches-to-notion.mjs --dry-run  # preview, no writes
 *   node scripts/sync-grant-tranches-to-notion.mjs --verbose
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

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIdsPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(notionDbIdsPath, 'utf-8'));
const PARENT_PAGE = notionDbIds.moneyFramework;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const verbose = (m) => { if (VERBOSE) log(m); };
const xeroInvoiceUrl = (id) => id ? `https://go.xero.com/app/invoicing/view/${id}` : null;

// ============================================
// Funder allow-list — only verified grant funders. exactName matches xero_invoices.contact_name.
// expectedTotal lets the run self-check the reconciliation (warns if mismatch).
// ============================================
const FUNDERS = [
  { exactName: 'The Snow Foundation',               funder: 'Snow Foundation',     fundingType: 'Grant', matchEligible: 'Yes', project: 'ACT-GD', expectedTotal: 402929.79 },
  { exactName: 'Centrecorp Foundation',             funder: 'Centrecorp Foundation', fundingType: 'Grant', matchEligible: 'Yes', project: 'ACT-GD', expectedTotal: 123332 }, // 2 PAID (INV-0259+0291); 10 voided/deleted excluded
  { exactName: 'Vincent Fairfax Family Foundation', funder: 'VFFF',                fundingType: 'Grant', matchEligible: 'Yes', project: 'ACT-GD', expectedTotal: 50000 },   // single invoice; = the FRRR joint $50k, not a separate contact
  { exactName: 'Red Dust Role Models Limited',      funder: 'Red Dust',            fundingType: 'Grant', matchEligible: 'Yes', project: 'ACT-GD', expectedTotal: 15950 },
  // BLOCKED — not addable as paid ACCREC tranches yet:
  //  · The Funding Network $144,558 — mis-booked as 2 ACCPAY expense bills (pending bookkeeper void+rebook).
  //  · AMP $21,900 — no ACCREC in this mirror (2024 income, likely different org / bank receipts).
];

// Per-invoice overrides for older invoices whose line items the Xero mirror never captured.
// Purpose verified from the LIVE Xero invoice (api.xro/2.0/Invoices/{id}). Keeps the row's
// name + purpose reproducible from code, so re-syncs stay idempotent and correct.
const OVERRIDES = {
  'INV-0208': {
    label: 'Bedding Project — Palm Island v2 Design & Delivery Sprint',
    purpose: 'Goods Bedding Project — Palm Island v2 Design and Delivery Sprint — $25,000 (ex GST; $27,500 incl). [Verified from live Xero invoice; mirror has no line items for this older invoice.]',
  },
};

// ============================================
// Notion schema
// ============================================
const SCHEMA = {
  Name: { title: {} },
  Funder: { select: { options: [
    { name: 'Snow Foundation', color: 'blue' },
    { name: 'Centrecorp Foundation', color: 'orange' },
    { name: 'VFFF', color: 'purple' },
    { name: 'Red Dust', color: 'red' },
  ] } },
  'Invoice #': { rich_text: {} },
  'Paid date': { date: {} },
  Amount: { number: { format: 'australian_dollar' } },
  Purpose: { rich_text: {} },
  Project: { rich_text: {} },
  'Funding type': { select: { options: [
    { name: 'Grant', color: 'purple' }, { name: 'Philanthropic', color: 'pink' },
    { name: 'Commercial sale', color: 'green' }, { name: 'Community contribution', color: 'blue' },
  ]}},
  'Match-eligible (QBE)': { select: { options: [
    { name: 'Yes', color: 'green' }, { name: 'No', color: 'red' }, { name: 'TBC', color: 'gray' },
  ]}},
  'Acquittal status': { select: { options: [
    { name: 'Not started', color: 'gray' }, { name: 'Reporting due', color: 'yellow' },
    { name: 'Reported', color: 'blue' }, { name: 'Acquitted', color: 'green' },
  ]}},
  'Xero link': { url: {} },
  'External ID': { rich_text: {} },
  'Last Synced': { date: {} },
};

async function ensureDatabase() {
  let databaseId = notionDbIds.grantTranchesDb;
  if (!databaseId) {
    if (!PARENT_PAGE) { log('ERROR: moneyFramework parent not in config'); process.exit(1); }
    log('Creating "Grant Tranches" database under ACT Money Framework...');
    const db = await notion.databases.create({
      parent: { type: 'page_id', page_id: PARENT_PAGE },
      title: [{ type: 'text', text: { content: 'Grant Tranches' } }],
      icon: { type: 'emoji', emoji: '\u{1F9FE}' }, // receipt
      properties: SCHEMA,
    });
    databaseId = db.id;
    notionDbIds.grantTranchesDb = databaseId;
    writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
    log(`Created database: ${databaseId}`);
  }
  let dataSourceId = notionDbIds.grantTranchesDataSource;
  if (!dataSourceId) {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    dataSourceId = db.data_sources?.[0]?.id || null;
    if (!dataSourceId) { log('ERROR: no data_source_id'); process.exit(1); }
    notionDbIds.grantTranchesDataSource = dataSourceId;
    writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
    log(`Resolved data_source_id: ${dataSourceId}`);
  }
  // Ensure all properties exist on the data source
  const ds = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  const existing = new Set(Object.keys(ds.properties || {}));
  const missing = Object.keys(SCHEMA).filter(k => k !== 'Name' && !existing.has(k));
  if (missing.length) {
    const addProps = {}; for (const p of missing) addProps[p] = SCHEMA[p];
    await notion.dataSources.update({ data_source_id: dataSourceId, properties: addProps });
    log(`Added ${missing.length} missing properties: ${missing.join(', ')}`);
  }
  return { databaseId, dataSourceId };
}

// ============================================
// Build a readable purpose + short label from line items
// ============================================
function buildPurpose(lineItems) {
  const items = (lineItems || [])
    .map(li => ({ desc: (li.description || '').trim(), amt: li.line_amount ?? li.amount }))
    .filter(li => li.desc);
  if (!items.length) return { purpose: '', label: '' };
  // Purpose = each line item "desc — $amt", joined; first sentence of the primary becomes the label.
  const purpose = items
    .map(li => li.amt != null ? `${li.desc} — $${Number(li.amt).toLocaleString()}` : li.desc)
    .join('\n')
    .slice(0, 1900);
  const label = items[0].desc.replace(/\s+/g, ' ').slice(0, 70);
  return { purpose, label };
}

// ============================================
// Fetch paid tranches for a funder
// ============================================
async function fetchTranches(funder) {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, amount_due, date, project_code, status, type, line_items')
    .eq('type', 'ACCREC')
    .eq('contact_name', funder.exactName)
    .order('date', { ascending: true });
  if (error) throw error;
  // Received cash = status PAID only. NOT amount_due===0 — VOIDED/DELETED invoices also have
  // amount_due 0 (Centrecorp had 10 voided/deleted bed-workshop + plant invoices = $709k of
  // phantom money). Canonical "exclude DELETED/VOIDED" rule (cf. ledger.ts, commit fd47762).
  const paid = (data || []).filter(r => r.status === 'PAID' && Number(r.total || 0) > 0);
  return paid.map(r => {
    const derived = buildPurpose(r.line_items);
    const ov = OVERRIDES[r.invoice_number] || {};
    const label = ov.label || derived.label;
    const purpose = ov.purpose || derived.purpose;
    return {
      externalId: `xero:${r.xero_id}`,
      name: `${funder.funder}: ${label || r.invoice_number || 'tranche'}`,
      funder: funder.funder,
      invoiceNo: r.invoice_number || '',
      paidDate: r.date,
      amount: Number(r.total || 0),
      purpose,
      project: r.project_code || funder.project || '',
      fundingType: funder.fundingType,
      matchEligible: funder.matchEligible,
      url: xeroInvoiceUrl(r.xero_id),
    };
  });
}

function rt(s) { return [{ type: 'text', text: { content: String(s).slice(0, 2000) } }]; }

function buildProps(t) {
  const props = {
    Name: { title: rt(t.name) },
    Funder: { select: { name: t.funder } },
    'Invoice #': { rich_text: t.invoiceNo ? rt(t.invoiceNo) : [] },
    Amount: { number: t.amount },
    Project: { rich_text: t.project ? rt(t.project) : [] },
    'Funding type': { select: { name: t.fundingType } },
    'Match-eligible (QBE)': { select: { name: t.matchEligible } },
    'External ID': { rich_text: rt(t.externalId) },
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
  if (t.paidDate) props['Paid date'] = { date: { start: t.paidDate } };
  if (t.url) props['Xero link'] = { url: t.url };
  // Only write Purpose when we derived one — never blank an existing value with an empty
  // mirror (some older invoices, e.g. INV-0208, have no line_items stored in the mirror).
  if (t.purpose) props.Purpose = { rich_text: rt(t.purpose) };
  return props;
}

async function fetchExisting(dataSourceId) {
  const map = new Map(); let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: dataSourceId, page_size: 100, start_cursor: cursor });
    for (const p of res.results) {
      const ext = p.properties['External ID']?.rich_text?.[0]?.plain_text;
      if (ext && !map.has(ext)) map.set(ext, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

async function main() {
  log('=== Grant Tranches → Notion ===');
  if (DRY_RUN) log('DRY RUN MODE');
  if (!process.env.NOTION_TOKEN) { log('ERROR: NOTION_TOKEN not set'); process.exit(1); }

  const { databaseId, dataSourceId } = await ensureDatabase();

  let tranches = [];
  for (const f of FUNDERS) {
    const t = await fetchTranches(f);
    const sum = t.reduce((s, x) => s + x.amount, 0);
    const flag = (f.expectedTotal != null && Math.abs(sum - f.expectedTotal) > 1) ? `  ⚠ expected ${f.expectedTotal}` : '';
    log(`  ${f.funder}: ${t.length} paid tranches = $${sum.toLocaleString()}${flag}`);
    tranches.push(...t);
  }
  log(`Total tranches: ${tranches.length} = $${tranches.reduce((s, t) => s + t.amount, 0).toLocaleString()}`);

  const existing = await fetchExisting(dataSourceId);
  let created = 0, updated = 0, errors = 0;
  for (const t of tranches) {
    try {
      const props = buildProps(t);
      const pageId = existing.get(t.externalId);
      if (pageId) {
        if (!DRY_RUN) await notion.pages.update({ page_id: pageId, properties: props });
        updated++;
      } else {
        if (!DRY_RUN) await notion.pages.create({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties: props });
        created++;
      }
      if (!DRY_RUN) await sleep(150);
    } catch (e) { errors++; verbose(`  Error ${t.externalId}: ${e.message}`); }
  }
  log(`Done: created ${created}, updated ${updated}, errors ${errors}`);
  log(`Notion DB: notion.so/${databaseId.replace(/-/g, '')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
