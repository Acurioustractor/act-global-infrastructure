#!/usr/bin/env node
/**
 * Budget vs Actual per project → Notion sub-page.
 *
 * Pulls project_budgets (FY26 budgeted revenue + expense per project)
 * and aggregates xero_invoices by project_code for actuals.
 *
 * Cron: Mon 9:00am AEST.
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
const pct = (n) => Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—';

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
  log('=== Budget vs Actual ===');

  // 1. Pull all FY26 project_budgets
  const { data: budgets } = await supabase
    .from('project_budgets')
    .select('project_code, budget_type, budget_amount')
    .eq('fy_year', 'FY26');
  const budMap = {};
  for (const b of (budgets || [])) {
    if (!budMap[b.project_code]) budMap[b.project_code] = { revenue: 0, expense: 0 };
    if (b.budget_type === 'expense') budMap[b.project_code].expense += Number(b.budget_amount || 0);
    else budMap[b.project_code].revenue += Number(b.budget_amount || 0);
  }
  log(`  Budgets loaded for ${Object.keys(budMap).length} projects`);

  // 2. Pull FY26 actuals per project (revenue from ACCREC paid + outstanding, expense from ACCPAY total)
  const { data: invs } = await supabase
    .from('xero_invoices')
    .select('project_code, type, total, amount_paid, status')
    .gte('date', '2025-07-01')
    .neq('status', 'VOIDED').neq('status', 'DELETED');

  const actMap = {};
  for (const i of (invs || [])) {
    if (!i.project_code) continue;
    if (!actMap[i.project_code]) actMap[i.project_code] = { revenue_invoiced: 0, revenue_paid: 0, expense: 0 };
    if (i.type === 'ACCREC') {
      actMap[i.project_code].revenue_invoiced += Number(i.total || 0);
      actMap[i.project_code].revenue_paid += Number(i.amount_paid || 0);
    } else if (i.type === 'ACCPAY') {
      actMap[i.project_code].expense += Number(i.total || 0);
    }
  }

  // 3. Build merged rows
  const allCodes = new Set([...Object.keys(budMap), ...Object.keys(actMap)]);
  const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));
  const piles = PILE_CONFIG.projects;

  const rows = [];
  for (const code of allCodes) {
    const bud = budMap[code] || { revenue: 0, expense: 0 };
    const act = actMap[code] || { revenue_invoiced: 0, revenue_paid: 0, expense: 0 };
    rows.push({
      code,
      pile: piles[code] || 'Other',
      budRev: bud.revenue,
      actRevInv: act.revenue_invoiced,
      actRevPaid: act.revenue_paid,
      revPct: bud.revenue > 0 ? act.revenue_invoiced / bud.revenue : null,
      budExp: bud.expense,
      actExp: act.expense,
      expPct: bud.expense > 0 ? act.expense / bud.expense : null,
    });
  }
  rows.sort((a, b) => (b.actRevInv + b.actExp) - (a.actRevInv + a.actExp));

  // 4. Build Notion blocks
  const blocks = [];
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt('🎯 Budget vs Actual per project (FY26)')] } });

  const totBudRev = rows.reduce((s, r) => s + r.budRev, 0);
  const totActRev = rows.reduce((s, r) => s + r.actRevInv, 0);
  const totBudExp = rows.reduce((s, r) => s + r.budExp, 0);
  const totActExp = rows.reduce((s, r) => s + r.actExp, 0);

  blocks.push({
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        rt(`Revenue: `), rt(`${fmt(totActRev)} actual / ${fmt(totBudRev)} budget`, { bold: true }),
        rt(`  •  Expense: `), rt(`${fmt(totActExp)} actual / ${fmt(totBudExp)} budget`, { bold: true }),
        rt(`  •  Net: `), rt(fmt(totActRev - totActExp), { bold: true, color: (totActRev - totActExp) >= 0 ? 'green' : 'red' }),
      ],
      icon: { type: 'emoji', emoji: '\u{1F4B0}' }, color: 'gray_background',
    },
  });

  // Per-project table
  blocks.push({
    object: 'block', type: 'table',
    table: {
      table_width: 7, has_column_header: true, has_row_header: false,
      children: [
        { object: 'block', type: 'table_row', table_row: { cells: [
          [rt('Project')], [rt('Pile')], [rt('Bud Rev')], [rt('Act Rev')], [rt('Rev %')], [rt('Act Exp')], [rt('Exp %')]
        ]}},
        ...rows.filter(r => r.actRevInv > 0 || r.actExp > 0 || r.budRev > 0).map(r => ({
          object: 'block', type: 'table_row', table_row: { cells: [
            [rt(r.code)],
            [rt(r.pile)],
            [rt(r.budRev > 0 ? fmt(r.budRev) : '—')],
            [rt(fmt(r.actRevInv))],
            [rt(r.revPct != null ? pct(r.revPct) : '—', { color: r.revPct >= 1 ? 'green' : r.revPct >= 0.5 ? 'default' : 'orange' })],
            [rt(fmt(r.actExp))],
            [rt(r.expPct != null ? pct(r.expPct) : '—', { color: r.expPct > 1 ? 'red' : r.expPct > 0.8 ? 'orange' : 'green' })],
          ]},
        })),
      ],
    },
  });

  // Notes
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('Notes')] } });
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt('Rev % > 100% (green) = beat budget (good).'),
  ]}});
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt('Exp % > 100% (red) = over-budget. >80% (orange) = approaching.'),
  ]}});
  blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [
    rt('Projects with no budget = ad-hoc work or new since FY26 start. Add budget if recurring.'),
  ]}});

  let pageId = cfg.budgetActual;
  if (!pageId) {
    log('Creating Budget vs Actual page...');
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'Budget vs Actual per Project' } }] },
      icon: { type: 'emoji', emoji: '\u{1F3AF}' },
    });
    pageId = page.id;
    cfg.budgetActual = pageId;
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
