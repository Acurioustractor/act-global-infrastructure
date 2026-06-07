#!/usr/bin/env node
/**
 * Capture current money metrics and append a row to the Notion Money Metrics database.
 *
 * The Money Metrics database is what Notion Dashboard view charts FROM.
 * Each row = one weekly snapshot. Over time, rows accumulate and the
 * Dashboard view's line/bar charts show trends.
 *
 * Schema:
 *   - Snapshot Date (date) — Monday-anchored
 *   - Bank Cash (number, AUD)
 *   - Runway Months (number)
 *   - FY26 Net (number)
 *   - FY26 Cash In (number)
 *   - FY26 Cash Out (number)
 *   - Voice Income (number) | Flow Income | Ground Income | Grants Income
 *   - Open Pipeline GHL (number)
 *   - Outstanding AR (number)
 *   - R&D Eligible Spend (number)
 *   - Days to Cutover (number)
 *   - Note (rich_text)
 *
 * Usage:
 *   node scripts/sync-money-metrics-to-notion.mjs               # capture today's snapshot
 *   node scripts/sync-money-metrics-to-notion.mjs --backfill 12 # backfill 12 weekly snapshots (estimated)
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
function getArg(name) {
  const idx = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return null;
  const a = args[idx];
  if (a.includes('=')) return a.split('=').slice(1).join('=');
  return args[idx + 1] || null;
}
const BACKFILL = parseInt(getArg('backfill') || '0', 10);

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

const SCHEMA = {
  'Snapshot Date': { date: {} },
  'Bank Cash': { number: { format: 'australian_dollar' } },
  'Runway Months': { number: { format: 'number' } },
  'FY26 Cash In': { number: { format: 'australian_dollar' } },
  'FY26 Cash Out': { number: { format: 'australian_dollar' } },
  'FY26 Net': { number: { format: 'australian_dollar' } },
  'Voice Income': { number: { format: 'australian_dollar' } },
  'Flow Income': { number: { format: 'australian_dollar' } },
  'Ground Income': { number: { format: 'australian_dollar' } },
  'Grants Income': { number: { format: 'australian_dollar' } },
  'Open Pipeline GHL': { number: { format: 'australian_dollar' } },
  'Outstanding AR': { number: { format: 'australian_dollar' } },
  'R&D Eligible Spend': { number: { format: 'australian_dollar' } },
  'Days to Cutover': { number: { format: 'number' } },
  'Note': { rich_text: {} },
  'Snapshot Label': { title: {} }, // title field
};

async function ensureDatabase() {
  let dbId = cfg.moneyMetricsDb;
  let dsId = cfg.moneyMetricsDataSource;

  if (!dbId) {
    log('Creating Money Metrics database...');
    const db = await notion.databases.create({
      parent: { type: 'page_id', page_id: PARENT },
      title: [{ type: 'text', text: { content: 'Money Metrics (snapshots over time)' } }],
      icon: { type: 'emoji', emoji: '\u{1F4C8}' },
      properties: SCHEMA,
    });
    dbId = db.id;
    cfg.moneyMetricsDb = dbId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
    log(`Created database: ${dbId}`);
  }

  if (!dsId) {
    const db = await notion.databases.retrieve({ database_id: dbId });
    dsId = db.data_sources?.[0]?.id;
    if (!dsId) throw new Error('Could not resolve data_source_id');
    cfg.moneyMetricsDataSource = dsId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
    log(`Resolved data_source: ${dsId}`);
  }

  // Make sure schema is current
  const ds = await notion.dataSources.retrieve({ data_source_id: dsId });
  const existing = new Set(Object.keys(ds.properties || {}));
  const required = Object.keys(SCHEMA).filter(k => k !== 'Snapshot Label');
  const missing = required.filter(p => !existing.has(p));
  if (missing.length > 0) {
    const add = {};
    for (const m of missing) add[m] = SCHEMA[m];
    await notion.dataSources.update({ data_source_id: dsId, properties: add });
    log(`Added ${missing.length} missing properties: ${missing.join(', ')}`);
  }
  return { dbId, dsId };
}

async function captureMetrics(asOfDate = null) {
  const date = asOfDate || new Date().toISOString().slice(0, 10);

  // Bank
  const { data: bankAccts } = await supabase
    .from('xero_bank_accounts').select('name, current_balance')
    .eq('type', 'BANK').eq('status', 'ACTIVE');
  const bankCash = (bankAccts || [])
    .filter(a => /everyday|maximiser/i.test(a.name))
    .reduce((s, a) => s + Number(a.current_balance || 0), 0);

  // Burn (90d)
  const { data: spend90 } = await supabase
    .from('xero_transactions').select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runway = monthlyBurn > 0 ? bankCash / monthlyBurn : 999;

  // FY26 cash
  const { data: rec } = await supabase
    .from('xero_invoices').select('amount_paid')
    .eq('type', 'ACCREC').gt('amount_paid', 0).gte('date', '2025-07-01');
  const { data: pay } = await supabase
    .from('xero_invoices').select('amount_paid')
    .eq('type', 'ACCPAY').gt('amount_paid', 0).gte('date', '2025-07-01');
  const cashIn = (rec || []).reduce((s, r) => s + Number(r.amount_paid), 0);
  const cashOut = (pay || []).reduce((s, r) => s + Number(r.amount_paid), 0);

  // Pile income
  const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));
  const { data: pileData } = await supabase
    .from('xero_invoices').select('total, project_code, income_type')
    .eq('type', 'ACCREC').eq('entity_code', 'ACT-ST').gte('date', '2025-07-01');
  const piles = { Voice: 0, Flow: 0, Ground: 0, Grants: 0 };
  for (const i of (pileData || [])) {
    const p = i.income_type === 'grant' ? 'Grants' : (PILE_CONFIG.projects[i.project_code] || 'Other');
    if (piles[p] !== undefined) piles[p] += Number(i.total || 0);
  }

  // GHL pipeline
  const { data: ghlOpen } = await supabase
    .from('ghl_opportunities').select('monetary_value').eq('status', 'open');
  const openPipeline = (ghlOpen || []).reduce((s, o) => s + Number(o.monetary_value || 0), 0);

  // Outstanding AR
  const { data: outstanding } = await supabase
    .from('xero_invoices').select('amount_due')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0);
  const outstandingAR = (outstanding || []).reduce((s, i) => s + Number(i.amount_due), 0);

  // R&D-eligible
  const { data: rdSpend } = await supabase
    .from('xero_transactions').select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED').eq('rd_eligible', true)
    .gte('date', '2025-07-01');
  const rdEligible = (rdSpend || []).reduce((s, t) => s + Number(t.total || 0), 0);

  const cutover = new Date('2026-06-30');
  const daysToCutover = Math.ceil((cutover - new Date(date)) / 86400000);

  return {
    snapshotDate: date,
    label: `Week of ${date}`,
    bankCash, runway: Math.round(runway * 10) / 10,
    cashIn, cashOut, fy26Net: cashIn - cashOut,
    voice: piles.Voice, flow: piles.Flow, ground: piles.Ground, grants: piles.Grants,
    openPipeline, outstandingAR, rdEligible, daysToCutover,
  };
}

function buildProps(m) {
  const props = {
    'Name': { title: [{ type: 'text', text: { content: m.label } }] },
    'Snapshot Date': { date: { start: m.snapshotDate } },
    'Bank Cash': { number: m.bankCash },
    'Runway Months': { number: m.runway },
    'FY26 Cash In': { number: m.cashIn },
    'FY26 Cash Out': { number: m.cashOut },
    'FY26 Net': { number: m.fy26Net },
    'Voice Income': { number: m.voice },
    'Flow Income': { number: m.flow },
    'Ground Income': { number: m.ground },
    'Grants Income': { number: m.grants },
    'Open Pipeline GHL': { number: m.openPipeline },
    'Outstanding AR': { number: m.outstandingAR },
    'R&D Eligible Spend': { number: m.rdEligible },
    'Days to Cutover': { number: m.daysToCutover },
  };
  return props;
}

async function appendSnapshot(dsId, metrics) {
  await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dsId },
    properties: buildProps(metrics),
  });
}

async function main() {
  log('=== Money Metrics → Notion Database ===');

  const { dbId, dsId } = await ensureDatabase();

  // Optional backfill: synthesize prior weekly snapshots (estimates from current data)
  if (BACKFILL > 0) {
    log(`Backfilling ${BACKFILL} weekly snapshots (current values, dated retrospectively)...`);
    for (let w = BACKFILL; w >= 1; w--) {
      const d = new Date();
      d.setDate(d.getDate() - w * 7);
      const m = await captureMetrics(d.toISOString().slice(0, 10));
      m.label = `Backfill ${m.snapshotDate}`;
      await appendSnapshot(dsId, m);
      log(`  ${m.label}: bank ${m.bankCash}, runway ${m.runway}mo`);
      await sleep(200);
    }
  }

  // Capture current week
  const metrics = await captureMetrics();
  log(`Current snapshot: bank ${metrics.bankCash}, runway ${metrics.runway}mo, FY26 net ${metrics.fy26Net}`);
  await appendSnapshot(dsId, metrics);
  log(`✓ Snapshot appended.`);
  log(`\nDatabase: https://www.notion.so/${dbId.replace(/-/g, '')}`);
  log('\nNext: in Notion UI, add a Dashboard view to this database with charts.');
  log('See instructions in the dashboard hub page (toggle "✨ Set up Notion Dashboard view").');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
