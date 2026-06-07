#!/usr/bin/env node
/**
 * 13-week rolling cash forecast → Notion sub-page.
 *
 * Inputs:
 *   - Current bank balance (xero_bank_accounts, ACT Everyday trading account)
 *   - AUTHORISED ACCREC invoices with due_date in next 13 weeks (expected receipts)
 *   - AUTHORISED ACCPAY invoices with due_date in next 13 weeks (expected payments)
 *   - Recurring weekly burn estimate (from last 90d SPEND average)
 *   - Scheduled items (R&D refund Sept-Dec, post-cutover salary from 1 Jul, etc)
 *
 * Output:
 *   - Notion table per week with running balance
 *   - Risk callout for weeks where balance dips below threshold
 *   - Summary: peak cash, trough cash, lowest balance week
 *
 * Cron: Mon 8:50am AEST (after pile-pages-sync at 8:45)
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
const MARKDOWN_ONLY = args.includes('--markdown');
const VERBOSE = args.includes('--verbose');

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

const rt = (text, opts = {}) => {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.bold || opts.color) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
};

// ============================================
// Forecast inputs
// ============================================

async function getStartingBalance() {
  // Use the trading account as primary signal
  const { data } = await supabase
    .from('xero_bank_accounts')
    .select('name, current_balance')
    .eq('type', 'BANK').eq('status', 'ACTIVE');
  let trading = 0, total = 0;
  for (const a of (data || [])) {
    const b = Number(a.current_balance || 0);
    total += b;
    if (/everyday/i.test(a.name) || /maximiser/i.test(a.name)) trading += b;
  }
  return { trading, total };
}

async function getExpectedReceipts(startDate, endDate) {
  // AUTHORISED ACCREC invoices with due_date in window
  const { data } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date, project_code')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED')
    .gt('amount_due', 0)
    .gte('due_date', startDate)
    .lte('due_date', endDate);
  return data || [];
}

async function getExpectedPayments(startDate, endDate) {
  // AUTHORISED ACCPAY bills with due_date in window
  const { data } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date, project_code')
    .eq('type', 'ACCPAY').eq('status', 'AUTHORISED')
    .gt('amount_due', 0)
    .gte('due_date', startDate)
    .lte('due_date', endDate);
  return data || [];
}

async function getRecurringWeeklyBurn() {
  // Avg weekly SPEND over last 90 days
  const { data } = await supabase
    .from('xero_transactions')
    .select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const total = (data || []).reduce((s, t) => s + Number(t.total || 0), 0);
  return Math.round(total / 13); // 13 weeks ≈ 90 days
}

// ============================================
// Scheduled / known events
// ============================================

function getScheduledEvents() {
  const today = new Date();
  const events = [];

  // Post-cutover founder salary — $24K/month gross (×2 founders incl super) from 1 Jul 2026
  const cutover = new Date('2026-07-01');
  for (let m = 0; m < 12; m++) {
    const payDate = new Date(cutover);
    payDate.setMonth(cutover.getMonth() + m);
    if (payDate <= today) continue;
    events.push({
      date: payDate.toISOString().slice(0, 10),
      amount: -24000, // negative = outflow
      label: `Pty payroll #${m + 1} (Ben + Nic + super)`,
      kind: 'salary',
    });
  }

  // R&D refund FY26: $190K mid-estimate, expected Sept 2026
  events.push({
    date: '2026-09-15',
    amount: 190000,
    label: 'R&D refund FY26 (mid-estimate, Sep window)',
    kind: 'rd',
  });

  // Pty 328-G election + setup costs (one-off Jul)
  events.push({
    date: '2026-07-15',
    amount: -8000,
    label: 'Standard Ledger + 328-G setup (estimate)',
    kind: 'setup',
  });

  return events;
}

// ============================================
// Roll up by week
// ============================================

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday-start
  return d;
}

function buildWeeks(receipts, payments, scheduledEvents, weeklyBurn, startBal) {
  const today = startOfWeek(new Date());
  const weeks = [];
  let runningBal = startBal;

  for (let w = 0; w < 13; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    let rcpt = 0, pay = 0;
    const items = [];

    for (const r of receipts) {
      const d = new Date(r.due_date);
      if (d >= weekStart && d <= weekEnd) {
        rcpt += Number(r.amount_due);
        items.push(`+${fmt(r.amount_due)} ${r.invoice_number} (${r.contact_name?.slice(0, 25)})`);
      }
    }
    for (const p of payments) {
      const d = new Date(p.due_date);
      if (d >= weekStart && d <= weekEnd) {
        pay += Number(p.amount_due);
        items.push(`-${fmt(p.amount_due)} ${p.invoice_number} (${p.contact_name?.slice(0, 25)})`);
      }
    }
    for (const e of scheduledEvents) {
      const d = new Date(e.date);
      if (d >= weekStart && d <= weekEnd) {
        if (e.amount > 0) rcpt += e.amount;
        else pay += -e.amount;
        items.push(`${e.amount > 0 ? '+' : '-'}${fmt(Math.abs(e.amount))} ${e.label}`);
      }
    }

    // Recurring weekly burn (estimate)
    pay += weeklyBurn;

    const net = rcpt - pay;
    runningBal += net;
    weeks.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      weekLabel: weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      receipts: rcpt,
      payments: pay,
      net,
      runningBal,
      items: items.slice(0, 4),
      weeklyBurnIncluded: weeklyBurn,
    });
  }
  return weeks;
}

// ============================================
// Build Notion blocks
// ============================================

function buildBlocks(startBal, weeks, weeklyBurn) {
  const blocks = [];
  blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt('📈 13-week rolling cash forecast')] } });

  const trough = weeks.reduce((min, w) => w.runningBal < min.runningBal ? w : min, weeks[0]);
  const peak = weeks.reduce((max, w) => w.runningBal > max.runningBal ? w : max, weeks[0]);

  blocks.push({
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        rt(`Starting balance: ${fmt(startBal)}  •  `),
        rt(`Trough: ${fmt(trough.runningBal)} (week of ${trough.weekLabel})`, { color: trough.runningBal < 100000 ? 'red' : trough.runningBal < 300000 ? 'orange' : 'default' }),
        rt(`  •  Peak: ${fmt(peak.runningBal)}  •  Weekly burn: ${fmt(weeklyBurn)}/wk recurring`),
      ],
      icon: { type: 'emoji', emoji: '\u{1F4B5}' },
      color: trough.runningBal < 100000 ? 'red_background' : 'gray_background',
    },
  });

  blocks.push({
    object: 'block', type: 'paragraph',
    paragraph: { rich_text: [rt('Inputs: AUTHORISED Xero invoices/bills with due_date in window + recurring weekly burn (90d avg) + scheduled events (R&D refund, Pty payroll). Updates Mon 8:50am.', { color: 'gray' })] },
  });

  // Forecast table
  const headerRow = { object: 'block', type: 'table_row', table_row: { cells: [
    [rt('Week of')], [rt('Receipts')], [rt('Payments')], [rt('Net')], [rt('Running')], [rt('Notes')],
  ]}};
  const rows = weeks.map(w => ({
    object: 'block', type: 'table_row',
    table_row: { cells: [
      [rt(w.weekLabel)],
      [rt(fmt(w.receipts))],
      [rt(fmt(w.payments))],
      [rt(fmt(w.net), { color: w.net >= 0 ? 'green' : 'red' })],
      [rt(fmt(w.runningBal), { color: w.runningBal < 100000 ? 'red' : w.runningBal < 300000 ? 'orange' : 'default', bold: true })],
      [rt(w.items.length ? w.items.slice(0, 2).join(' · ') : '(recurring only)', { color: 'gray' })],
    ]},
  }));
  blocks.push({
    object: 'block', type: 'table',
    table: {
      table_width: 6,
      has_column_header: true,
      has_row_header: false,
      children: [headerRow, ...rows],
    },
  });

  // Risk callouts
  if (trough.runningBal < 100000) {
    blocks.push({
      object: 'block', type: 'callout',
      callout: {
        rich_text: [rt(`⚠️ RUNWAY WARNING: forecast hits ${fmt(trough.runningBal)} in week of ${trough.weekLabel}. Below $100K = action required (R&D loan finance, accelerate collections, or defer non-critical spend).`, { bold: true })],
        icon: { type: 'emoji', emoji: '\u{1F6A8}' }, color: 'red_background',
      },
    });
  } else if (trough.runningBal < 300000) {
    blocks.push({
      object: 'block', type: 'callout',
      callout: {
        rich_text: [rt(`⚠️ Tight week: ${fmt(trough.runningBal)} forecast for week of ${trough.weekLabel}. Watch closely; consider chasing overdue receivables.`, { bold: true })],
        icon: { type: 'emoji', emoji: '\u{1F7E0}' }, color: 'orange_background',
      },
    });
  }

  // Top expected receipts
  const topReceipts = weeks.flatMap(w => w.items.filter(i => i.startsWith('+'))).slice(0, 8);
  if (topReceipts.length > 0) {
    blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('💰 Top expected receipts (next 13 weeks)')] } });
    for (const item of topReceipts) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt(item, { color: 'green' })] } });
    }
  }

  // Caveats
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('📋 Caveats + assumptions')] } });
  const caveats = [
    `Starting balance = sum of trading accounts (Everyday + Maximiser). Excludes credit card liabilities.`,
    `Weekly burn (${fmt(weeklyBurn)}) = 90-day SPEND average. Doesn't include scheduled future events.`,
    `R&D refund $190K mid-Sep is a mid-estimate — actual range $180-220K, timing Sept-Dec.`,
    `Pty payroll starts 1 Jul 2026 (post-cutover). $24K/month for both founders incl 12% super.`,
    `Standard Ledger + 328-G setup ~$8K one-off mid-Jul (estimate).`,
    `No probability weighting on pipeline opportunities — only AUTHORISED invoices count.`,
  ];
  for (const c of caveats) {
    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt(c, { color: 'gray' })] } });
  }

  return blocks;
}

// ============================================
// Push to Notion
// ============================================

async function pushToNotion(blocks) {
  let pageId = cfg.cashForecast;
  if (!pageId) {
    log('Creating Cash Forecast page...');
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'Cash Forecast (13-week rolling)' } }] },
      icon: { type: 'emoji', emoji: '\u{1F4C8}' },
    });
    pageId = page.id;
    cfg.cashForecast = pageId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
    log(`Created: ${pageId}`);
  }

  // Replace body
  let cursor;
  const ids = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    ids.push(...res.results.filter(b => b.type !== "child_database" && b.type !== "child_page").map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  for (const id of ids) {
    try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {}
  }
  for (let k = 0; k < blocks.length; k += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(k, k + 50) });
    await sleep(300);
  }
  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== 13-week cash forecast ===');

  const balance = await getStartingBalance();
  const startBal = balance.trading;
  log(`Starting balance: ${fmt(startBal)} (trading: ${fmt(balance.trading)} of total ${fmt(balance.total)})`);

  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 13 * 7 * 86400000).toISOString().slice(0, 10);

  const [receipts, payments, weeklyBurn] = await Promise.all([
    getExpectedReceipts(startDate, endDate),
    getExpectedPayments(startDate, endDate),
    getRecurringWeeklyBurn(),
  ]);
  log(`Expected receipts in window: ${receipts.length}`);
  log(`Expected payments in window: ${payments.length}`);
  log(`Recurring weekly burn: ${fmt(weeklyBurn)}`);

  const events = getScheduledEvents();
  log(`Scheduled events: ${events.length}`);

  const weeks = buildWeeks(receipts, payments, events, weeklyBurn, startBal);
  if (VERBOSE) {
    for (const w of weeks) log(`  ${w.weekLabel}: in ${fmt(w.receipts)} out ${fmt(w.payments)} net ${fmt(w.net)} bal ${fmt(w.runningBal)}`);
  }

  const blocks = buildBlocks(startBal, weeks, weeklyBurn);
  log(`Built ${blocks.length} blocks`);

  if (MARKDOWN_ONLY) { log('MARKDOWN mode — not pushing'); return; }
  await pushToNotion(blocks);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
