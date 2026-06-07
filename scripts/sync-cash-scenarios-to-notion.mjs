#!/usr/bin/env node
/**
 * Cash scenarios → Notion sub-page.
 *
 * Extends the 13-week forecast to 12 months with 4 scenarios:
 *   - Base (current trajectory)
 *   - No PICC renewal (Voice -$478K)
 *   - R&D refund delayed Q4 FY27 (-$190K from Sept slot, +$190K Mar)
 *   - CivicGraph first sale Q1 FY27 (+$50K Aug, +$50K Nov, +$100K Feb)
 *
 * Side-by-side monthly comparison.
 *
 * Cron: Mon 9:05am AEST.
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
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const fmtK = (n) => {
  const v = Math.round(Number(n) / 1000);
  return `${v >= 0 ? '$' : '-$'}${Math.abs(v)}K`;
};

const rt = (text, opts = {}) => {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.bold || opts.color) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
};

// Build a simple monthly forecast (12 months from current month)
async function buildBaseForecast() {
  // Starting balance: trading accounts
  const { data: bankAccts } = await supabase
    .from('xero_bank_accounts').select('name, current_balance').eq('type', 'BANK').eq('status', 'ACTIVE');
  const startBal = (bankAccts || [])
    .filter(a => /everyday|maximiser/i.test(a.name))
    .reduce((s, a) => s + Number(a.current_balance || 0), 0);

  // Monthly burn estimate (90d avg)
  const { data: spend90 } = await supabase
    .from('xero_transactions').select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;

  // AUTHORISED receivables in next 12 months
  const { data: outstanding } = await supabase
    .from('xero_invoices').select('amount_due, due_date, contact_name')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0);

  // Build month-by-month
  const today = new Date(); today.setDate(1); today.setHours(0, 0, 0, 0);
  const months = [];
  let bal = startBal;

  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(today); monthStart.setMonth(today.getMonth() + m);
    const monthEnd = new Date(monthStart); monthEnd.setMonth(monthStart.getMonth() + 1); monthEnd.setDate(0);

    let inflow = 0;
    for (const i of (outstanding || [])) {
      if (!i.due_date) continue;
      const d = new Date(i.due_date);
      if (d >= monthStart && d <= monthEnd) inflow += Number(i.amount_due);
    }

    // Recurring monthly burn
    let outflow = monthlyBurn;

    // Post-cutover salary from 1 July 2026 (if applicable)
    if (monthStart >= new Date('2026-07-01')) outflow += 24000; // Pty payroll Ben + Nic + super

    // 328-G setup one-off in July 2026
    if (monthStart.getFullYear() === 2026 && monthStart.getMonth() === 6) outflow += 8000;

    months.push({
      label: monthStart.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      monthStart: monthStart.toISOString().slice(0, 10),
      base_inflow: inflow,
      base_outflow: outflow,
    });
  }

  return { startBal, monthlyBurn, months };
}

function applyScenarios(base) {
  const scenarios = ['Base', 'No PICC', 'R&D delayed', 'CG first sale'];
  // Initialise per-scenario monthly numbers
  const data = {};
  for (const s of scenarios) {
    data[s] = base.months.map(m => ({
      label: m.label,
      monthStart: m.monthStart,
      inflow: m.base_inflow,
      outflow: m.base_outflow,
    }));
  }

  // Add R&D refund (Base assumption: $190K in Sept 2026)
  for (const s of ['Base', 'No PICC', 'CG first sale']) {
    const sept = data[s].find(m => m.monthStart === '2026-09-01');
    if (sept) sept.inflow += 190000;
  }
  // R&D delayed: refund moved to March 2027
  const marRD = data['R&D delayed'].find(m => m.monthStart === '2027-03-01');
  if (marRD) marRD.inflow += 190000;
  // No PICC: -$478K spread over Q3-Q4 (Aug + Nov when PICC normally pays)
  const noPiccAug = data['No PICC'].find(m => m.monthStart === '2026-08-01');
  const noPiccNov = data['No PICC'].find(m => m.monthStart === '2026-11-01');
  if (noPiccAug) noPiccAug.inflow -= 240000; // half of PICC contract value
  if (noPiccNov) noPiccNov.inflow -= 240000;
  // CG first sale: +$50K Aug + $50K Nov + $100K Feb 27
  const cgAug = data['CG first sale'].find(m => m.monthStart === '2026-08-01');
  const cgNov = data['CG first sale'].find(m => m.monthStart === '2026-11-01');
  const cgFeb = data['CG first sale'].find(m => m.monthStart === '2027-02-01');
  if (cgAug) cgAug.inflow += 50000;
  if (cgNov) cgNov.inflow += 50000;
  if (cgFeb) cgFeb.inflow += 100000;

  // Compute running balance per scenario
  const result = {};
  for (const s of scenarios) {
    let bal = base.startBal;
    result[s] = data[s].map(m => {
      bal += (m.inflow - m.outflow);
      return { ...m, runningBal: bal };
    });
  }
  return { scenarios, result };
}

async function main() {
  log('=== Cash scenarios ===');

  const base = await buildBaseForecast();
  log(`  Starting bal: ${fmt(base.startBal)}, monthly burn: ${fmt(base.monthlyBurn)}`);

  const { scenarios, result } = applyScenarios(base);

  // Find lowest balance per scenario
  const troughs = {};
  for (const s of scenarios) {
    troughs[s] = result[s].reduce((min, m) => m.runningBal < min.runningBal ? m : min, result[s][0]);
  }

  // Build Notion blocks
  const blocks = [];
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt('🔮 Cash scenarios (12-month look-ahead)')] } });

  blocks.push({
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        rt(`Starting balance: ${fmt(base.startBal)}  •  `),
        rt(`Monthly burn baseline: ${fmt(base.monthlyBurn)}  •  `),
        rt(`Pty payroll +$24K/mo from 1 Jul 2026`),
      ],
      icon: { type: 'emoji', emoji: '\u{1F52E}' }, color: 'gray_background',
    },
  });

  // Trough summary
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('🎯 Lowest balance per scenario')] } });
  for (const s of scenarios) {
    const t = troughs[s];
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`${s.padEnd(20)}  `),
      rt(`${fmt(t.runningBal)} in ${t.label}`, { bold: true, color: t.runningBal < 100000 ? 'red' : t.runningBal < 300000 ? 'orange' : 'green' }),
    ]}});
  }

  // Side-by-side table — running balance per month
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('📅 Month-by-month running balance')] } });
  blocks.push({
    object: 'block', type: 'table',
    table: {
      table_width: 5, has_column_header: true, has_row_header: false,
      children: [
        { object: 'block', type: 'table_row', table_row: { cells: [
          [rt('Month')], [rt('Base')], [rt('No PICC')], [rt('R&D delayed')], [rt('CG first sale')]
        ]}},
        ...base.months.map((m, idx) => ({
          object: 'block', type: 'table_row', table_row: { cells: [
            [rt(m.label)],
            [rt(fmtK(result['Base'][idx].runningBal), { color: result['Base'][idx].runningBal < 100000 ? 'red' : 'default' })],
            [rt(fmtK(result['No PICC'][idx].runningBal), { color: result['No PICC'][idx].runningBal < 100000 ? 'red' : 'default' })],
            [rt(fmtK(result['R&D delayed'][idx].runningBal), { color: result['R&D delayed'][idx].runningBal < 100000 ? 'red' : 'default' })],
            [rt(fmtK(result['CG first sale'][idx].runningBal), { color: result['CG first sale'][idx].runningBal < 100000 ? 'red' : 'default' })],
          ]},
        })),
      ],
    },
  });

  // Decisions implied
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('💡 What the scenarios suggest')] } });
  const noPiccTrough = troughs['No PICC'].runningBal;
  const rdDelayedTrough = troughs['R&D delayed'].runningBal;

  if (noPiccTrough < 100000) {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`PICC concentration risk is REAL — losing PICC alone takes us below $100K runway in ${troughs['No PICC'].label}. Diversification + new commercial Voice contract is critical.`, { color: 'red' })
    ]}});
  } else {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`PICC dropping is survivable — trough still ${fmt(noPiccTrough)}. But pile mix would shift dramatically.`)
    ]}});
  }

  if (rdDelayedTrough < 200000) {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`R&D refund timing matters — delay to March 2027 takes trough to ${fmt(rdDelayedTrough)} (${troughs['R&D delayed'].label}). Have R&D loan finance (Radium/Fundsquire) ready as bridge.`, { color: 'orange' })
    ]}});
  } else {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`R&D refund timing not critical — even delayed to March 2027, trough ${fmt(rdDelayedTrough)} still healthy.`)
    ]}});
  }

  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt(`CG first sale (+$200K over 6 months) noticeably extends runway. Even modest progress materially helps.`)
  ]}});

  // Caveats
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('📋 Scenario assumptions')] } });
  for (const c of [
    'Base = AUTHORISED invoices due-dates + recurring monthly burn (90d avg) + scheduled R&D refund Sept 2026',
    'No PICC = -$240K Aug + -$240K Nov (proxy for PICC contract not renewing)',
    'R&D delayed = -$190K Sept move to +$190K Mar 2027',
    'CG first sale = +$50K Aug, +$50K Nov, +$100K Feb 2027 (gradual ramp)',
    'No probability weighting on pipeline — only AUTHORISED invoices count for base receipts',
    'No new contracts beyond what\'s already in Xero — actual scenarios likely outperform',
  ]) {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt(c, { color: 'gray' })] } });
  }

  let pageId = cfg.cashScenarios;
  if (!pageId) {
    log('Creating Cash Scenarios page...');
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'Cash Scenarios (12-month)' } }] },
      icon: { type: 'emoji', emoji: '\u{1F52E}' },
    });
    pageId = page.id;
    cfg.cashScenarios = pageId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  }
  let cursor; const ids = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    ids.push(...res.results.filter(b => b.type !== "child_database" && b.type !== "child_page").map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  for (const id of ids) { try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {} }
  for (let k = 0; k < blocks.length; k += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(k, k + 50) });
    await sleep(300);
  }
  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
