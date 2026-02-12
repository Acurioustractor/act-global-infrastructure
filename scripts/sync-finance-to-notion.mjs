#!/usr/bin/env node
/**
 * Sync Finance Summary to Notion
 *
 * Pushes financial data from Xero/Supabase to a Notion "Finance Overview" page.
 * Shows: cashflow, outstanding invoices, pipeline, revenue by project.
 *
 * Data sources:
 *   - v_cashflow_summary: Monthly income/expenses/net/balance
 *   - v_outstanding_invoices: Overdue receivables & payables
 *   - v_project_financials: Revenue/expenses per project
 *   - ghl_opportunities: Pipeline summary
 *   - v_subscription_alerts: Subscription warnings
 *
 * Usage:
 *   node scripts/sync-finance-to-notion.mjs              # Full update
 *   node scripts/sync-finance-to-notion.mjs --dry-run    # Preview
 *   node scripts/sync-finance-to-notion.mjs --verbose    # Detailed
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || 'https://command-center.vercel.app';
const SECTION_MARKER = '\u{1F4B0} Finance Overview';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIds = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

function formatCurrency(amount) {
  if (amount == null) return '$0';
  const num = Number(amount);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatMonth(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr + '-01').toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

// ============================================
// Notion Block Builders
// ============================================

function richText(text, opts = {}) {
  const rt = { type: 'text', text: { content: text } };
  if (opts.link) rt.text.link = { url: opts.link };
  if (opts.bold || opts.italic || opts.color) {
    rt.annotations = {};
    if (opts.bold) rt.annotations.bold = true;
    if (opts.italic) rt.annotations.italic = true;
    if (opts.color) rt.annotations.color = opts.color;
  }
  return rt;
}

function heading2(text) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: [richText(text)], is_toggleable: false } };
}

function heading3(text) {
  return { object: 'block', type: 'heading_3', heading_3: { rich_text: [richText(text)] } };
}

function paragraph(parts) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(parts) ? parts : [richText(parts)] } };
}

function bulletItem(parts) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [richText(parts)] } };
}

function calloutBlock(parts, emoji, color) {
  return { object: 'block', type: 'callout', callout: { rich_text: Array.isArray(parts) ? parts : [richText(parts)], icon: { type: 'emoji', emoji }, color: color || 'default' } };
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

// ============================================
// Data Fetching
// ============================================

async function fetchCashflow() {
  const { data } = await supabase
    .from('v_cashflow_summary')
    .select('month, income, expenses, net, closing_balance, is_projection')
    .order('month', { ascending: false })
    .limit(6);
  return (data || []).reverse();
}

async function fetchOutstandingInvoices() {
  const { data } = await supabase
    .from('v_outstanding_invoices')
    .select('invoice_number, contact_name, project_code, type, total, amount_due, amount_paid, due_date, days_overdue, aging_bucket')
    .order('amount_due', { ascending: false })
    .limit(20);
  return data || [];
}

async function fetchProjectFinancials() {
  const { data } = await supabase
    .from('v_project_financials')
    .select('*')
    .limit(20);
  return data || [];
}

async function fetchPipeline() {
  const { data } = await supabase
    .from('ghl_opportunities')
    .select('name, stage_name, monetary_value, status')
    .eq('status', 'open')
    .order('monetary_value', { ascending: false })
    .limit(15);
  return data || [];
}

async function fetchSubscriptionAlerts() {
  const { data } = await supabase
    .from('v_subscription_alerts')
    .select('vendor_name, amount, billing_cycle, alert_status, next_billing_date')
    .in('alert_status', ['warning', 'critical'])
    .order('amount', { ascending: false })
    .limit(10);
  return data || [];
}

// ============================================
// Section Builders
// ============================================

function buildCashflowSection(cashflow) {
  const blocks = [];
  blocks.push(heading3('\u{1F4C8} Cashflow'));

  const actual = cashflow.filter(c => !c.is_projection);
  const projected = cashflow.filter(c => c.is_projection);

  // Current month summary callout
  const current = actual[actual.length - 1];
  if (current) {
    const netColor = current.net >= 0 ? 'green' : 'red';
    blocks.push(calloutBlock([
      richText(`${formatMonth(current.month)}: `, { bold: true }),
      richText(`Income ${formatCurrency(current.income)}`, { color: 'green' }),
      richText(' | ', { color: 'gray' }),
      richText(`Expenses ${formatCurrency(current.expenses)}`, { color: 'red' }),
      richText(' | ', { color: 'gray' }),
      richText(`Net ${formatCurrency(current.net)}`, { bold: true, color: netColor }),
    ], '\u{1F4B0}', 'blue_background'));
  }

  // Monthly breakdown
  for (const month of actual) {
    if (month === current) continue;
    blocks.push(bulletItem([
      richText(formatMonth(month.month), { bold: true }),
      richText(`: Income ${formatCurrency(month.income)} | Expenses ${formatCurrency(month.expenses)} | Net ${formatCurrency(month.net)}`, { color: 'gray' }),
    ]));
  }

  // Projections
  if (projected.length > 0) {
    blocks.push(paragraph([richText('Projections:', { bold: true, italic: true, color: 'gray' })]));
    for (const month of projected) {
      blocks.push(bulletItem([
        richText(`${formatMonth(month.month)}`, { italic: true }),
        richText(`: Net ${formatCurrency(month.net)}`, { color: 'gray', italic: true }),
      ]));
    }
  }

  return blocks;
}

function buildReceivablesSection(invoices) {
  const blocks = [];

  const receivables = invoices.filter(i => i.type === 'ACCREC' || i.type === 'receivable');
  const payables = invoices.filter(i => i.type === 'ACCPAY' || i.type === 'payable');

  // Receivables
  if (receivables.length > 0) {
    blocks.push(heading3('\u{1F4E5} Outstanding Receivables'));
    const totalReceivable = receivables.reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0);
    blocks.push(calloutBlock([
      richText(`${formatCurrency(totalReceivable)} owed to you`, { bold: true }),
      richText(` across ${receivables.length} invoices`),
    ], '\u{1F4E5}', 'green_background'));

    for (const inv of receivables.slice(0, 10)) {
      const overdue = inv.days_overdue > 0 ? ` (${inv.days_overdue}d overdue)` : '';
      const color = inv.days_overdue > 30 ? 'red' : inv.days_overdue > 0 ? 'orange' : 'default';
      blocks.push(bulletItem([
        richText(`${inv.contact_name}`, { bold: true }),
        richText(` — ${inv.invoice_number} — ${formatCurrency(inv.amount_due)}`),
        richText(overdue, { color }),
        inv.project_code ? richText(` [${inv.project_code}]`, { color: 'blue' }) : richText(''),
      ]));
    }
  }

  // Payables
  if (payables.length > 0) {
    blocks.push(heading3('\u{1F4E4} Outstanding Payables'));
    const totalPayable = payables.reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0);
    blocks.push(calloutBlock([
      richText(`${formatCurrency(totalPayable)} you owe`, { bold: true }),
      richText(` across ${payables.length} invoices`),
    ], '\u{1F4E4}', 'orange_background'));

    for (const inv of payables.slice(0, 10)) {
      const overdue = inv.days_overdue > 0 ? ` (${inv.days_overdue}d overdue)` : '';
      blocks.push(bulletItem([
        richText(`${inv.contact_name}`, { bold: true }),
        richText(` — ${formatCurrency(inv.amount_due)}${overdue}`),
      ]));
    }
  }

  return blocks;
}

function buildPipelineSection(pipeline) {
  const blocks = [];
  if (pipeline.length === 0) return blocks;

  blocks.push(heading3('\u{1F4CA} Pipeline'));
  const total = pipeline.reduce((sum, p) => sum + (Number(p.monetary_value) || 0), 0);

  blocks.push(calloutBlock([
    richText(`${formatCurrency(total)} total pipeline`, { bold: true }),
    richText(` across ${pipeline.length} open opportunities`),
  ], '\u{1F680}', 'purple_background'));

  // Group by stage
  const byStage = {};
  for (const opp of pipeline) {
    const stage = opp.stage_name || 'Unknown';
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0, items: [] };
    byStage[stage].count++;
    byStage[stage].value += Number(opp.monetary_value) || 0;
    byStage[stage].items.push(opp);
  }

  for (const [stage, data] of Object.entries(byStage)) {
    blocks.push(bulletItem([
      richText(`${stage}: `, { bold: true }),
      richText(`${formatCurrency(data.value)} (${data.count} deals)`),
    ]));
  }

  return blocks;
}

function buildProjectFinancialsSection(projectFinancials) {
  const blocks = [];
  if (projectFinancials.length === 0) return blocks;

  blocks.push(heading3('\u{1F4CB} Revenue by Project'));

  for (const pf of projectFinancials) {
    const parts = [richText(pf.project_code || pf.project_name || 'Unknown', { bold: true })];
    if (pf.total_income != null) parts.push(richText(`: Income ${formatCurrency(pf.total_income)}`, { color: 'green' }));
    if (pf.total_expenses != null) parts.push(richText(` | Expenses ${formatCurrency(pf.total_expenses)}`, { color: 'red' }));
    if (pf.net != null) {
      const netColor = pf.net >= 0 ? 'green' : 'red';
      parts.push(richText(` | Net ${formatCurrency(pf.net)}`, { bold: true, color: netColor }));
    }
    blocks.push(bulletItem(parts));
  }

  return blocks;
}

function buildSubscriptionAlertsSection(alerts) {
  const blocks = [];
  if (alerts.length === 0) return blocks;

  blocks.push(heading3('\u26A0 Subscription Alerts'));
  for (const sub of alerts) {
    const color = sub.alert_status === 'critical' ? 'red' : 'orange';
    blocks.push(bulletItem([
      richText(`${sub.vendor_name}`, { bold: true, color }),
      richText(`: ${formatCurrency(sub.amount)}/${sub.billing_cycle || 'month'}`),
      richText(` — ${sub.alert_status}`, { color: 'gray' }),
    ]));
  }

  return blocks;
}

function buildFooter() {
  const now = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return paragraph([
    richText(`Updated: ${now}`, { color: 'gray', italic: true }),
    richText(' \u00B7 ', { color: 'gray' }),
    richText('Full dashboard', { link: `${DASHBOARD_BASE_URL}/cashflow`, color: 'gray', italic: true }),
  ]);
}

// ============================================
// Notion Page Update
// ============================================

async function findSectionRange(pageId) {
  let cursor;
  let allBlocks = [];

  do {
    const children = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const block of children.results) allBlocks.push(block);
    cursor = children.has_more ? children.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);

  let markerIndex = -1;
  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_2' && block.heading_2?.rich_text) {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (text.includes('Finance Overview')) {
        markerIndex = i;
        break;
      }
    }
  }

  if (markerIndex === -1) return { blockIdsToDelete: [], insertAfterId: null };

  const blockIdsToDelete = [allBlocks[markerIndex].id];
  const ourHeadings = ['Cashflow', 'Receivables', 'Payables', 'Pipeline', 'Revenue', 'Subscription'];

  for (let i = markerIndex + 1; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_1') break;
    if (block.type === 'heading_2') {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (!ourHeadings.some(h => text.includes(h))) break;
    }
    blockIdsToDelete.push(block.id);
  }

  const insertAfterId = markerIndex > 0 ? allBlocks[markerIndex - 1].id : null;
  return { blockIdsToDelete, insertAfterId };
}

async function updatePage(pageId) {
  log('Fetching financial data...');

  const [cashflow, invoices, projectFinancials, pipeline, subscriptionAlerts] = await Promise.all([
    fetchCashflow(),
    fetchOutstandingInvoices(),
    fetchProjectFinancials(),
    fetchPipeline(),
    fetchSubscriptionAlerts(),
  ]);

  verbose(`  Cashflow months: ${cashflow.length}`);
  verbose(`  Outstanding invoices: ${invoices.length}`);
  verbose(`  Project financials: ${projectFinancials.length}`);
  verbose(`  Pipeline: ${pipeline.length}`);
  verbose(`  Subscription alerts: ${subscriptionAlerts.length}`);

  const blocks = [];
  blocks.push(heading2(SECTION_MARKER));
  blocks.push(...buildCashflowSection(cashflow));
  blocks.push(divider());
  blocks.push(...buildReceivablesSection(invoices));
  blocks.push(divider());
  blocks.push(...buildPipelineSection(pipeline));

  const projFinBlocks = buildProjectFinancialsSection(projectFinancials);
  if (projFinBlocks.length > 0) {
    blocks.push(divider());
    blocks.push(...projFinBlocks);
  }

  const subAlertBlocks = buildSubscriptionAlertsSection(subscriptionAlerts);
  if (subAlertBlocks.length > 0) {
    blocks.push(divider());
    blocks.push(...subAlertBlocks);
  }

  blocks.push(divider());
  blocks.push(buildFooter());

  log(`Built ${blocks.length} blocks`);

  if (DRY_RUN) {
    log('[DRY RUN] Would push blocks to Notion page');
    return;
  }

  log('Finding existing section...');
  const { blockIdsToDelete, insertAfterId } = await findSectionRange(pageId);
  await sleep(350);

  if (blockIdsToDelete.length > 0) {
    log(`Deleting ${blockIdsToDelete.length} existing blocks...`);
    for (const blockId of blockIdsToDelete) {
      try {
        await notion.blocks.delete({ block_id: blockId });
        await sleep(200);
      } catch (err) {
        verbose(`  Warning: could not delete block ${blockId}: ${err.message}`);
      }
    }
  }

  log(`Appending ${blocks.length} blocks...`);
  const batchSize = 100;
  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);
    const appendOpts = { block_id: pageId, children: batch };
    if (i === 0 && insertAfterId) appendOpts.after = insertAfterId;
    await notion.blocks.children.append(appendOpts);
    await sleep(500);
  }

  log('Done!');
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Finance → Notion Sync ===');
  if (DRY_RUN) log('DRY RUN MODE');

  const pageId = notionDbIds.financeOverview;
  if (!pageId) {
    log('ERROR: No financeOverview page ID in config/notion-database-ids.json');
    log('Create a "Finance Overview" page in Notion and add its ID.');
    process.exit(1);
  }

  await updatePage(pageId);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
