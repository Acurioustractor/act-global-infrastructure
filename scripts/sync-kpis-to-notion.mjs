#!/usr/bin/env node
/**
 * KPIs & Concentration Risk → Notion sub-page.
 *
 * Surfaces: runway, customer concentration top 3, AR aging buckets,
 * R&D-eligible spend %, win rate, DSO, burn vs revenue ratio, pile mix.
 *
 * Cron: Mon 8:55am AEST.
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
const pct = (n) => `${(n * 100).toFixed(1)}%`;

const rt = (text, opts = {}) => {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.bold || opts.color) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
};

async function main() {
  log('=== KPIs & Concentration Risk ===');

  // 1. Runway
  const { data: bankAccts } = await supabase
    .from('xero_bank_accounts')
    .select('name, current_balance')
    .eq('type', 'BANK').eq('status', 'ACTIVE');
  const tradingBalance = (bankAccts || [])
    .filter(a => /everyday|maximiser/i.test(a.name))
    .reduce((s, a) => s + Number(a.current_balance || 0), 0);

  const { data: spend90 } = await supabase
    .from('xero_transactions')
    .select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runwayMonths = monthlyBurn > 0 ? tradingBalance / monthlyBurn : 999;

  // 2. Customer concentration FY26
  const { data: accrec } = await supabase
    .from('xero_invoices')
    .select('contact_name, amount_paid')
    .eq('type', 'ACCREC').gt('amount_paid', 0)
    .gte('date', '2025-07-01');
  const byContact = {};
  let totalRev = 0;
  for (const i of (accrec || [])) {
    const name = i.contact_name || 'Unknown';
    byContact[name] = (byContact[name] || 0) + Number(i.amount_paid || 0);
    totalRev += Number(i.amount_paid || 0);
  }
  const topContacts = Object.entries(byContact).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const top3Pct = topContacts.slice(0, 3).reduce((s, [_, v]) => s + v, 0) / (totalRev || 1);

  // 3. AR aging
  const { data: outstanding } = await supabase
    .from('xero_invoices')
    .select('amount_due, due_date, contact_name, invoice_number')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED')
    .gt('amount_due', 0);
  const today = new Date();
  const buckets = { current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const i of (outstanding || [])) {
    if (!i.due_date) { buckets.current += Number(i.amount_due); continue; }
    const days = Math.floor((today - new Date(i.due_date)) / 86400000);
    if (days < 0) buckets.current += Number(i.amount_due);
    else if (days <= 30) buckets['0-30'] += Number(i.amount_due);
    else if (days <= 60) buckets['31-60'] += Number(i.amount_due);
    else if (days <= 90) buckets['61-90'] += Number(i.amount_due);
    else buckets['90+'] += Number(i.amount_due);
  }
  const totalAR = Object.values(buckets).reduce((s, v) => s + v, 0);

  // 4. R&D eligible % of FY26 spend
  const { data: rdSpend } = await supabase
    .from('xero_transactions')
    .select('total, rd_eligible')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', '2025-07-01');
  const totalSpendFY26 = (rdSpend || []).reduce((s, t) => s + Number(t.total || 0), 0);
  const rdSpendFY26 = (rdSpend || []).filter(t => t.rd_eligible).reduce((s, t) => s + Number(t.total || 0), 0);
  const rdPct = totalSpendFY26 > 0 ? rdSpendFY26 / totalSpendFY26 : 0;

  // 5. Win rate (GHL)
  const { data: closed } = await supabase
    .from('ghl_opportunities')
    .select('status, monetary_value')
    .in('status', ['won', 'lost']);
  const wonCount = (closed || []).filter(o => o.status === 'won').length;
  const lostCount = (closed || []).filter(o => o.status === 'lost').length;
  const wonValue = (closed || []).filter(o => o.status === 'won').reduce((s, o) => s + Number(o.monetary_value || 0), 0);
  const lostValue = (closed || []).filter(o => o.status === 'lost').reduce((s, o) => s + Number(o.monetary_value || 0), 0);
  const winRate = (wonCount + lostCount) > 0 ? wonCount / (wonCount + lostCount) : 0;
  const winValueRate = (wonValue + lostValue) > 0 ? wonValue / (wonValue + lostValue) : 0;

  // 6. DSO (days sales outstanding) — avg days from invoice date to fully_paid_date
  const { data: paidInvs } = await supabase
    .from('xero_invoices')
    .select('date, fully_paid_date')
    .eq('type', 'ACCREC').eq('status', 'PAID')
    .not('fully_paid_date', 'is', null)
    .gte('date', '2025-04-01');
  const dsoDays = (paidInvs || []).map(i => Math.floor((new Date(i.fully_paid_date) - new Date(i.date)) / 86400000));
  const avgDSO = dsoDays.length > 0 ? Math.round(dsoDays.reduce((s, d) => s + d, 0) / dsoDays.length) : null;

  // 7. Pile mix
  const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));
  const pilesMap = PILE_CONFIG.projects;
  const TARGET = { Voice: 0.077, Flow: 0.558, Ground: 0.058, Grants: 0.385 };
  const { data: pileInv } = await supabase
    .from('xero_invoices')
    .select('total, project_code, income_type')
    .eq('type', 'ACCREC').eq('entity_code', 'ACT-ST')
    .gte('date', '2025-07-01');
  const byPile = { Voice: 0, Flow: 0, Ground: 0, Grants: 0, Other: 0 };
  let pileTotal = 0;
  for (const i of (pileInv || [])) {
    let pile = i.income_type === 'grant' ? 'Grants' : (pilesMap[i.project_code] || 'Other');
    byPile[pile] = (byPile[pile] || 0) + Number(i.total || 0);
    pileTotal += Number(i.total || 0);
  }

  // ========= Build Notion blocks =========
  const blocks = [];
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt('📊 KPIs & Concentration Risk')] } });

  // Header callout
  blocks.push({
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        rt(`Runway: ${runwayMonths.toFixed(1)} months  •  `, { bold: true, color: runwayMonths < 6 ? 'red' : runwayMonths < 12 ? 'orange' : 'green' }),
        rt(`Top 3 customer share: ${pct(top3Pct)}  •  `, { color: top3Pct > 0.6 ? 'red' : 'default' }),
        rt(`AR outstanding: ${fmt(totalAR)}  •  `),
        rt(`R&D-eligible spend: ${pct(rdPct)} of ${fmt(totalSpendFY26)}`, { color: 'green' }),
      ],
      icon: { type: 'emoji', emoji: '\u{1F4CA}' }, color: 'gray_background',
    },
  });

  // Runway detail
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('🛬 Runway')] } });
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt(`Cash (trading): `), rt(fmt(tradingBalance), { bold: true })
  ]}});
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt(`Avg monthly burn (90d): `), rt(fmt(monthlyBurn), { bold: true })
  ]}});
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt(`Runway: `), rt(`${runwayMonths.toFixed(1)} months`, { bold: true, color: runwayMonths < 6 ? 'red' : runwayMonths < 12 ? 'orange' : 'green' })
  ]}});
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt(`Note: excludes scheduled R&D refund (~$190K Sept-Dec) which extends runway by ~5-6 months.`, { color: 'gray' })] } });

  // Customer concentration
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('🎯 Customer concentration (FY26)')] } });
  const concRows = topContacts.map(([name, v]) => [
    name.slice(0, 50), fmt(v), pct(v / (totalRev || 1)),
  ]);
  blocks.push({
    object: 'block', type: 'table',
    table: {
      table_width: 3, has_column_header: true, has_row_header: false,
      children: [
        { object: 'block', type: 'table_row', table_row: { cells: [[rt('Customer')], [rt('FY26 paid')], [rt('% of total')]] } },
        ...concRows.map(r => ({ object: 'block', type: 'table_row', table_row: { cells: r.map(c => [rt(c)]) } })),
      ],
    },
  });
  if (top3Pct > 0.6) {
    blocks.push({
      object: 'block', type: 'callout',
      callout: {
        rich_text: [rt(`⚠️ Top 3 customers = ${pct(top3Pct)} of FY26 income. High concentration risk — diversification priority.`, { bold: true })],
        icon: { type: 'emoji', emoji: '\u{1F6A8}' }, color: 'red_background',
      },
    });
  }

  // AR aging
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('📋 AR aging (outstanding receivables)')] } });
  blocks.push({
    object: 'block', type: 'table',
    table: {
      table_width: 3, has_column_header: true, has_row_header: false,
      children: [
        { object: 'block', type: 'table_row', table_row: { cells: [[rt('Bucket')], [rt('Amount')], [rt('% of AR')]] } },
        ...['current', '0-30', '31-60', '61-90', '90+'].map(b => ({
          object: 'block', type: 'table_row', table_row: { cells: [
            [rt(b === 'current' ? 'Current (not yet due)' : `${b} days overdue`)],
            [rt(fmt(buckets[b]))],
            [rt(pct(buckets[b] / (totalAR || 1)))],
          ]},
        })),
      ],
    },
  });
  if (buckets['90+'] > 50000) {
    blocks.push({
      object: 'block', type: 'callout',
      callout: { rich_text: [rt(`${fmt(buckets['90+'])} of receivables 90+ days overdue. Likely uncollectable — consider write-off.`, { bold: true })],
        icon: { type: 'emoji', emoji: '\u{26A0}\u{FE0F}' }, color: 'orange_background' },
    });
  }

  // R&D and other metrics
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('🔬 Other KPIs')] } });
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt(`R&D-eligible spend: `), rt(`${pct(rdPct)} of ${fmt(totalSpendFY26)} FY26 spend`, { bold: true, color: 'green' }),
    rt(` (forecast refund @43.5% = `), rt(fmt(rdSpendFY26 * 0.435), { bold: true }), rt(`)`),
  ]}});
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt(`Win rate (GHL): `), rt(`${pct(winRate)} by count, ${pct(winValueRate)} by value`, { bold: true }),
    rt(` (${wonCount}W / ${lostCount}L · won ${fmt(wonValue)} / lost ${fmt(lostValue)})`, { color: 'gray' }),
  ]}});
  if (avgDSO) {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`DSO (days sales outstanding): `), rt(`${avgDSO} days avg`, { bold: true, color: avgDSO > 60 ? 'orange' : 'green' }),
      rt(` (across ${dsoDays.length} paid invoices since Apr 2025)`, { color: 'gray' }),
    ]}});
  } else {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
      rt(`DSO: insufficient fully_paid_date data — needs Xero sync improvement`, { color: 'gray' })
    ]}});
  }

  // Pile mix
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('🥧 Pile mix vs FY27 target')] } });
  blocks.push({
    object: 'block', type: 'table',
    table: {
      table_width: 4, has_column_header: true, has_row_header: false,
      children: [
        { object: 'block', type: 'table_row', table_row: { cells: [[rt('Pile')], [rt('FY26 actual')], [rt('% actual')], [rt('% FY27 target')]] } },
        ...['Voice', 'Flow', 'Ground', 'Grants', 'Other'].map(p => ({
          object: 'block', type: 'table_row', table_row: { cells: [
            [rt(p)],
            [rt(fmt(byPile[p] || 0))],
            [rt(pct((byPile[p] || 0) / (pileTotal || 1)))],
            [rt(TARGET[p] != null ? pct(TARGET[p]) : '—')],
          ]},
        })),
      ],
    },
  });

  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [
    rt('Refresh: ', { color: 'gray' }), rt('node scripts/sync-kpis-to-notion.mjs', { color: 'gray' })
  ]}});

  // Push
  let pageId = cfg.kpisPage;
  if (!pageId) {
    log('Creating KPIs page...');
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'KPIs & Concentration Risk' } }] },
      icon: { type: 'emoji', emoji: '\u{1F4CA}' },
    });
    pageId = page.id;
    cfg.kpisPage = pageId;
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
