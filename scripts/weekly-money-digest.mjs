#!/usr/bin/env node
/**
 * Friday weekly money digest — pushes to Notion as a "Friday Digest" page.
 *
 * Surfaces what changed this week vs last:
 *   - Cash position delta
 *   - Invoices paid this week
 *   - New opportunities entered pipeline
 *   - Stale items getting staler
 *   - Open questions accumulated in Money Sync Page
 *   - Top 3 actions for next week
 *
 * Cron: Friday 3pm AEST.
 *
 * Usage:
 *   node scripts/weekly-money-digest.mjs              # generate + push
 *   node scripts/weekly-money-digest.mjs --markdown   # local file only
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

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const notionDbIdsPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(notionDbIdsPath, 'utf-8'));
const PARENT = notionDbIds.moneyFramework;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

const rt = (text, opts = {}) => {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.bold || opts.italic || opts.color || opts.code) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.italic) r.annotations.italic = true;
    if (opts.code) r.annotations.code = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
};
const h2 = (t) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(t)] } });
const h3 = (t) => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(t)] } });
const para = (parts) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const bullet = (parts) => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const callout = (parts, emoji, color) => ({ object: 'block', type: 'callout', callout: { rich_text: Array.isArray(parts) ? parts : [rt(parts)], icon: { type: 'emoji', emoji }, color: color || 'default' } });

async function main() {
  log('=== Weekly money digest ===');

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // Invoices paid this week
  const { data: paidThisWeek } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_paid, fully_paid_date')
    .eq('type', 'ACCREC')
    .eq('status', 'PAID')
    .gte('updated_at', weekAgo)
    .order('amount_paid', { ascending: false });
  const paidWeekTotal = (paidThisWeek || []).reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  // New invoices issued this week
  const { data: newInvoices } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, total, status, date')
    .eq('type', 'ACCREC')
    .gte('date', weekAgo);
  const newInvoiceTotal = (newInvoices || []).reduce((s, i) => s + Number(i.total || 0), 0);

  // New opportunities entered GHL this week
  const { data: newOpps } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, pipeline_name, pile')
    .gte('ghl_created_at', weekAgo)
    .eq('status', 'open')
    .order('monetary_value', { ascending: false, nullsFirst: false });
  const newOppTotal = (newOpps || []).reduce((s, o) => s + Number(o.monetary_value || 0), 0);

  // Newly stale (no movement in last 60d)
  const sixty = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: stale } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, last_stage_change_at, pile')
    .eq('status', 'open')
    .lt('last_stage_change_at', sixty)
    .order('monetary_value', { ascending: false, nullsFirst: false })
    .limit(5);

  // Cashflow latest
  const { data: cashflow } = await supabase
    .from('v_cashflow_summary')
    .select('month, closing_balance')
    .order('month', { ascending: false })
    .limit(1);
  const bankNow = cashflow?.[0]?.closing_balance;

  // Build blocks
  const blocks = [];
  blocks.push(h2(`💵 Friday Digest — ${today}`));
  blocks.push(callout([
    rt(`Week of ${weekAgo} → ${today}. `, { bold: true }),
    rt(`Bank: ${fmt(bankNow)}. `, { color: 'green' }),
    rt(`Cash in this week: ${fmt(paidWeekTotal)} (${(paidThisWeek || []).length} invoices). `),
    rt(`New pipeline: ${fmt(newOppTotal)} (${(newOpps || []).length} opps).`),
  ], '\u{1F4B5}', 'blue_background'));

  // Wins
  blocks.push(h3('\u{2705} Wins this week'));
  if ((paidThisWeek || []).length === 0) {
    blocks.push(para([rt('(no invoices paid this week)', { italic: true, color: 'gray' })]));
  } else {
    for (const i of (paidThisWeek || []).slice(0, 8)) {
      blocks.push(bullet([
        rt(`${fmt(i.amount_paid)}  `, { bold: true, color: 'green' }),
        rt(i.invoice_number || '—'),
        rt(`  · ${i.contact_name?.slice(0, 40)}`, { color: 'gray' }),
        rt(`  · ${i.fully_paid_date || ''}`, { color: 'gray' }),
      ]));
    }
  }

  // New invoices issued
  blocks.push(h3('\u{1F4DD} New invoices sent'));
  if ((newInvoices || []).length === 0) {
    blocks.push(para([rt('(no new invoices issued)', { italic: true, color: 'gray' })]));
  } else {
    for (const i of (newInvoices || []).slice(0, 8)) {
      blocks.push(bullet([
        rt(`${fmt(i.total)}  `, { bold: true }),
        rt(i.invoice_number || '—'),
        rt(`  · ${i.contact_name?.slice(0, 40)}`, { color: 'gray' }),
        rt(`  · ${i.status}`, { color: i.status === 'PAID' ? 'green' : 'gray' }),
      ]));
    }
  }

  // New opportunities
  blocks.push(h3('\u{2728} New pipeline'));
  if ((newOpps || []).length === 0) {
    blocks.push(para([rt('(no new opportunities entered GHL this week)', { italic: true, color: 'gray' })]));
  } else {
    for (const o of (newOpps || []).slice(0, 8)) {
      blocks.push(bullet([
        rt(`${fmt(o.monetary_value)}  `, { bold: true }),
        rt(o.name || 'unnamed'),
        rt(`  · ${o.pipeline_name || ''} · ${o.pile || 'untagged'}`, { color: 'gray' }),
      ]));
    }
  }

  // Stale items
  blocks.push(h3('\u{1F525} Aging — top 5 stale opps'));
  if ((stale || []).length === 0) {
    blocks.push(para([rt('(none — pipeline is moving!)', { italic: true, color: 'green' })]));
  } else {
    for (const s of (stale || [])) {
      const days = Math.floor((new Date() - new Date(s.last_stage_change_at)) / 86400000);
      blocks.push(bullet([
        rt(`${fmt(s.monetary_value)}  `, { bold: true }),
        rt(s.name || 'unnamed'),
        rt(`  · ${days}d no movement · ${s.pile}`, { color: 'red' }),
      ]));
    }
  }

  // Suggested actions
  blocks.push(h3('\u{1F4CC} Suggested next-week actions'));
  blocks.push(bullet('Open the 5 stalest opps in GHL — Won/Lost or move stage'));
  blocks.push(bullet('Chase any invoice overdue >30d on the framework page'));
  blocks.push(bullet('Add unanswered questions to the Money Sync Page'));
  blocks.push(bullet('Review the Money Framework page — does the pile mix match what we worked on this week?'));

  blocks.push(para([
    rt('Refresh: ', { italic: true, color: 'gray' }),
    rt('node scripts/weekly-money-digest.mjs', { code: true }),
  ]));

  if (MARKDOWN_ONLY) {
    log('MARKDOWN mode — would write to file');
    return;
  }

  // Push to Notion
  let pageId = notionDbIds.weeklyDigest;
  if (!pageId) {
    log('Creating Friday Digest page...');
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'Friday Money Digest' } }] },
      icon: { type: 'emoji', emoji: '\u{1F4B5}' },
    });
    pageId = page.id;
    notionDbIds.weeklyDigest = pageId;
    writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
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
    try { await notion.blocks.delete({ block_id: id }); await sleep(100); } catch {}
  }

  for (let i = 0; i < blocks.length; i += 50) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks.slice(i, i + 50),
    });
    await sleep(300);
  }
  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
