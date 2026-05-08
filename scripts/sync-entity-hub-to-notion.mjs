#!/usr/bin/env node
/**
 * Master Entity Hub → Notion database.
 *
 * Aggregates every organisation/entity we've engaged with across:
 *   - Xero invoices (customers + funders + vendors via invoices)
 *   - GHL opportunities (active, won, lost)
 *   - Foundations table (funders we've researched)
 *
 * One row per unique entity (deduped by canonical name).
 * Each row carries: total Xero $, GHL pipeline $, role tags, foundation flag.
 *
 * Re-runnable: upserts by Canonical Name (rich_text used as upsert key).
 *
 * Cron: Mon 9:25am AEST (after planning rhythm at 9:20).
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
const PARENT = cfg.moneyFramework;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toFixed(2);

const SCHEMA = {
  Name: { title: {} },
  Roles: { multi_select: { options: [
    { name: 'Customer', color: 'green' },
    { name: 'Funder', color: 'purple' },
    { name: 'Vendor', color: 'orange' },
    { name: 'Partner', color: 'blue' },
    { name: 'Government', color: 'gray' },
    { name: 'Foundation', color: 'pink' },
    { name: 'Indigenous Org', color: 'red' },
  ]}},
  'Xero Receipts $ (FY26)': { number: { format: 'australian_dollar' } },
  'Xero Outstanding $': { number: { format: 'australian_dollar' } },
  'Xero Bills $ (FY26)': { number: { format: 'australian_dollar' } },
  'Xero Payments Count': { number: { format: 'number' } },
  'Xero Last Payment Date': { date: {} },
  'GHL Open $': { number: { format: 'australian_dollar' } },
  'GHL Won $ (lifetime)': { number: { format: 'australian_dollar' } },
  'GHL Opps Open': { number: { format: 'number' } },
  'Has Foundation Profile': { checkbox: {} },
  'In Stakeholders DB': { checkbox: {} },
  'Last Activity': { date: {} },
  'Source Systems': { multi_select: { options: [
    { name: 'Xero', color: 'blue' },
    { name: 'GHL', color: 'purple' },
    { name: 'Foundations', color: 'pink' },
    { name: 'GrantScope', color: 'green' },
  ]}},
  'Canonical Name': { rich_text: {} },
};

function canonical(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

async function ensureDb() {
  let dbId = cfg.entityHub;
  let dsId = cfg.entityHubDataSource;
  if (!dbId) {
    log('Creating Entity Hub database...');
    const db = await notion.databases.create({
      parent: { type: 'page_id', page_id: PARENT },
      title: [{ type: 'text', text: { content: 'Entity Hub (orgs across all systems)' } }],
      icon: { type: 'emoji', emoji: '\u{1F310}' },
      properties: SCHEMA,
    });
    dbId = db.id;
    dsId = db.data_sources?.[0]?.id;
    cfg.entityHub = dbId;
    cfg.entityHubDataSource = dsId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
    log(`  Created: ${dbId}`);
  } else if (!dsId) {
    const db = await notion.databases.retrieve({ database_id: dbId });
    dsId = db.data_sources?.[0]?.id;
    cfg.entityHubDataSource = dsId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  }

  // Add missing properties
  const ds = await notion.dataSources.retrieve({ data_source_id: dsId });
  const existing = new Set(Object.keys(ds.properties || {}));
  const missing = Object.keys(SCHEMA).filter(p => p !== 'Name' && !existing.has(p));
  if (missing.length > 0) {
    const add = {};
    for (const m of missing) add[m] = SCHEMA[m];
    await notion.dataSources.update({ data_source_id: dsId, properties: add });
    log(`  Added ${missing.length} props`);
  }
  return { dbId, dsId };
}

async function gatherEntities() {
  // 1. Xero customers + vendors (FY26)
  const { data: xero } = await supabase
    .from('xero_invoices')
    .select('contact_name, type, total, amount_paid, amount_due, date, status, income_type')
    .gte('date', '2025-07-01')
    .neq('status', 'VOIDED').neq('status', 'DELETED');

  // 2. GHL contacts (active)
  const { data: ghl } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, status, stage_name, last_stage_change_at, pipeline_name')
    .order('monetary_value', { ascending: false, nullsFirst: false });

  // 3. Foundations referenced in current grants
  const { data: foundationsLinked } = await supabase
    .from('grant_opportunities')
    .select('foundation_id, foundations:foundation_id(name, type)')
    .not('foundation_id', 'is', null)
    .eq('pipeline_stage', 'researching');

  // 4. Xero Payments — aggregate per contact (via invoice→contact_name lookup)
  const { data: payments } = await supabase
    .from('xero_payments')
    .select('invoice_xero_id, amount, date, status')
    .eq('status', 'AUTHORISED');
  const invoiceIdToContact = new Map();
  for (const i of (xero || [])) {
    // We don't have xero_id in the basic select — re-fetch lightly
  }
  // Fetch invoice→contact map separately
  const { data: invMap } = await supabase
    .from('xero_invoices')
    .select('xero_id, contact_name');
  const idToContact = new Map();
  for (const i of (invMap || [])) {
    if (i.xero_id && i.contact_name) idToContact.set(i.xero_id, i.contact_name);
  }
  const paymentsByContact = new Map();
  for (const p of (payments || [])) {
    const contact = idToContact.get(p.invoice_xero_id);
    if (!contact) continue;
    const c = canonical(contact);
    if (!paymentsByContact.has(c)) paymentsByContact.set(c, { count: 0, lastDate: null, total: 0 });
    const e = paymentsByContact.get(c);
    e.count += 1;
    e.total += Number(p.amount || 0);
    if (p.date && (!e.lastDate || p.date > e.lastDate)) e.lastDate = p.date;
  }

  // Build entity map keyed by canonical name
  const entities = new Map();
  function ensure(name, source) {
    const key = canonical(name);
    if (!key) return null;
    if (!entities.has(key)) {
      entities.set(key, {
        name,
        canonical: key,
        roles: new Set(),
        sources: new Set(),
        xeroReceipts: 0,
        xeroOutstanding: 0,
        xeroBills: 0,
        ghlOpenAmount: 0,
        ghlWonAmount: 0,
        ghlOppsOpen: 0,
        hasFoundation: false,
        lastActivity: null,
      });
    }
    const e = entities.get(key);
    e.sources.add(source);
    return e;
  }

  for (const i of (xero || [])) {
    const e = ensure(i.contact_name, 'Xero');
    if (!e) continue;
    if (i.type === 'ACCREC') {
      e.xeroReceipts += Number(i.amount_paid || 0);
      e.xeroOutstanding += Number(i.amount_due || 0);
      if (i.income_type === 'grant') e.roles.add('Funder');
      else e.roles.add('Customer');
    } else if (i.type === 'ACCPAY') {
      e.xeroBills += Number(i.total || 0);
      e.roles.add('Vendor');
    }
    if (i.date && (!e.lastActivity || i.date > e.lastActivity)) e.lastActivity = i.date;
  }

  for (const o of (ghl || [])) {
    // GHL doesn't really have a contact_name on opportunity, only deal name
    // Use the deal name as proxy for the contact (acknowledging this is imperfect)
    const e = ensure(o.name, 'GHL');
    if (!e) continue;
    if (o.status === 'open') {
      e.ghlOpenAmount += Number(o.monetary_value || 0);
      e.ghlOppsOpen += 1;
    } else if (o.status === 'won') {
      e.ghlWonAmount += Number(o.monetary_value || 0);
    }
    if (o.last_stage_change_at) {
      const d = o.last_stage_change_at.slice(0, 10);
      if (!e.lastActivity || d > e.lastActivity) e.lastActivity = d;
    }
  }

  for (const r of (foundationsLinked || [])) {
    if (!r.foundations?.name) continue;
    const e = ensure(r.foundations.name, 'Foundations');
    if (!e) continue;
    e.hasFoundation = true;
    e.roles.add('Foundation');
    e.roles.add('Funder');
  }

  // Apply payments aggregates to entities (whose canonical name matches)
  for (const [c, p] of paymentsByContact.entries()) {
    if (entities.has(c)) {
      const e = entities.get(c);
      e.paymentsCount = p.count;
      e.lastPaymentDate = p.lastDate;
    }
  }

  // Government heuristic
  for (const e of entities.values()) {
    const n = e.canonical;
    if (/government|department|council|nsw|qld|wa|sa|vic|nt|act |australian/.test(n)) {
      e.roles.add('Government');
    }
    if (/aboriginal|indigenous|first nations|community.*corporation/i.test(e.name || '')) {
      e.roles.add('Indigenous Org');
    }
  }

  return entities;
}

async function fetchExisting(dsId) {
  const map = new Map();
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: dsId, page_size: 100, start_cursor: cursor });
    for (const p of res.results) {
      const c = p.properties['Canonical Name']?.rich_text?.[0]?.plain_text;
      if (c) map.set(c, p.id);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return map;
}

function rt(t) { return [{ type: 'text', text: { content: String(t || '').slice(0, 2000) } }]; }

function buildProps(e) {
  const props = {
    Name: { title: rt(e.name) },
    'Canonical Name': { rich_text: rt(e.canonical) },
    'Xero Receipts $ (FY26)': { number: e.xeroReceipts },
    'Xero Outstanding $': { number: e.xeroOutstanding },
    'Xero Bills $ (FY26)': { number: e.xeroBills },
    'Xero Payments Count': { number: e.paymentsCount || 0 },
    'GHL Open $': { number: e.ghlOpenAmount },
    'GHL Won $ (lifetime)': { number: e.ghlWonAmount },
    'GHL Opps Open': { number: e.ghlOppsOpen },
    'Has Foundation Profile': { checkbox: e.hasFoundation },
    'In Stakeholders DB': { checkbox: false }, // user updates manually
  };
  if (e.lastPaymentDate) props['Xero Last Payment Date'] = { date: { start: e.lastPaymentDate } };
  if (e.lastActivity) props['Last Activity'] = { date: { start: e.lastActivity } };
  if (e.roles.size > 0) props.Roles = { multi_select: [...e.roles].map(name => ({ name })) };
  if (e.sources.size > 0) props['Source Systems'] = { multi_select: [...e.sources].map(name => ({ name })) };
  return props;
}

async function main() {
  log('=== Entity Hub sync ===');
  const { dbId, dsId } = await ensureDb();

  log('Gathering entities...');
  const entities = await gatherEntities();
  log(`  ${entities.size} unique entities across all systems`);

  log('Fetching existing Notion rows...');
  const existing = await fetchExisting(dsId);
  log(`  ${existing.size} existing rows`);

  // Filter to only "interesting" entities — has any real activity
  const significant = [...entities.values()].filter(e =>
    e.xeroReceipts > 0 || e.xeroOutstanding > 0 || e.xeroBills > 100 ||
    e.ghlOpenAmount > 0 || e.ghlWonAmount > 0 || e.hasFoundation
  );
  log(`  ${significant.length} significant entities (have $ activity or foundation profile)`);

  let created = 0, updated = 0, errors = 0;
  for (const [i, e] of significant.entries()) {
    try {
      const pageId = existing.get(e.canonical);
      if (pageId) {
        await notion.pages.update({ page_id: pageId, properties: buildProps(e) });
        updated++;
      } else {
        await notion.pages.create({
          parent: { type: 'data_source_id', data_source_id: dsId },
          properties: buildProps(e),
        });
        created++;
      }
      if ((i + 1) % 50 === 0) log(`  ${i + 1}/${significant.length} (created ${created}, updated ${updated})`);
      await sleep(120);
    } catch (err) {
      errors++;
      if (errors <= 5) log(`  ✗ ${e.name}: ${err.message.slice(0, 100)}`);
    }
  }
  log(`\nDone: ${created} created, ${updated} updated, ${errors} errors`);
  log(`Open: notion.so/${dbId.replace(/-/g, '')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
