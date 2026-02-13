#!/usr/bin/env node
/**
 * Sync Mission Control to Notion
 *
 * Builds a single "Mission Control" page in Notion that shows everything
 * across all systems: alerts, today's focus, project health, recent activity,
 * finances, and quick links.
 *
 * Data sources:
 *   - v_projects_needing_attention: Projects with alerts
 *   - v_project_summary: Health scores, pipeline, financials per project
 *   - v_activity_stream: Recent cross-domain activity
 *   - v_outstanding_invoices: Overdue invoices
 *   - v_cashflow_summary: Monthly cashflow
 *   - calendar_events: Today's schedule
 *   - ghl_opportunities: Pipeline summary
 *   - v_subscription_alerts: Subscription issues
 *
 * Usage:
 *   node scripts/sync-mission-control-to-notion.mjs              # Full update
 *   node scripts/sync-mission-control-to-notion.mjs --dry-run    # Preview only
 *   node scripts/sync-mission-control-to-notion.mjs --verbose    # Detailed output
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || 'https://command-center.vercel.app';
const SECTION_MARKER = '\u{1F3E0} Mission Control';

// Clients
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load config
const notionDbIds = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));
const projectCodesData = await loadProjectsConfig();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatCurrency(amount) {
  if (amount == null) return '$0';
  return `$${Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysAgoLabel(days) {
  if (days === null || days === undefined) return 'unknown';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
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
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [richText(text)], is_toggleable: false },
  };
}

function heading3(text) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: [richText(text)] },
  };
}

function paragraph(parts) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: Array.isArray(parts) ? parts : [richText(parts)] },
  };
}

function bulletItem(parts) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [richText(parts)] },
  };
}

function calloutBlock(parts, emoji, color) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: Array.isArray(parts) ? parts : [richText(parts)],
      icon: { type: 'emoji', emoji },
      color: color || 'default',
    },
  };
}

function todoItem(parts, checked = false) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: Array.isArray(parts) ? parts : [richText(parts)],
      checked,
    },
  };
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

// ============================================
// Data Fetching
// ============================================

async function fetchAlerts() {
  const { data } = await supabase
    .from('v_projects_needing_attention')
    .select('project_code, project_name, overall_score, health_status, alerts')
    .order('overall_score', { ascending: true })
    .limit(10);
  return data || [];
}

async function fetchProjectHealth() {
  const { data } = await supabase
    .from('v_project_summary')
    .select('project_code, project_name, health_score, health_status, pipeline_value, outstanding_amount, last_email_date, email_count')
    .order('health_score', { ascending: true });
  return data || [];
}

async function fetchTodayCalendar() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, location, detected_project_code, attendees')
    .gte('start_time', startOfDay)
    .lt('start_time', endOfDay)
    .order('start_time', { ascending: true })
    .limit(20);
  return data || [];
}

async function fetchRecentActivity() {
  const { data } = await supabase
    .from('v_activity_stream')
    .select('activity_type, project_code, activity_date, title, description, amount')
    .order('activity_date', { ascending: false })
    .limit(15);
  return data || [];
}

async function fetchOverdueInvoices() {
  const { data } = await supabase
    .from('v_outstanding_invoices')
    .select('invoice_number, contact_name, project_code, type, amount_due, due_date, days_overdue, aging_bucket')
    .gt('days_overdue', 0)
    .order('days_overdue', { ascending: false })
    .limit(10);
  return data || [];
}

async function fetchCashflow() {
  const { data } = await supabase
    .from('v_cashflow_summary')
    .select('month, income, expenses, net, closing_balance, is_projection')
    .order('month', { ascending: false })
    .limit(3);
  return (data || []).reverse();
}

async function fetchPipelineSummary() {
  const { data } = await supabase
    .from('ghl_opportunities')
    .select('name, stage_name, monetary_value, status, updated_at')
    .eq('status', 'open')
    .order('monetary_value', { ascending: false })
    .limit(10);
  return data || [];
}

async function fetchSubscriptionAlerts() {
  const { data } = await supabase
    .from('v_subscription_alerts')
    .select('vendor_name, amount, alert_status, alert_priority, next_billing_date')
    .in('alert_status', ['warning', 'critical'])
    .order('alert_priority', { ascending: false })
    .limit(5);
  return data || [];
}

async function fetchPendingActions() {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('project_knowledge')
    .select('title, content, recorded_at, project_code, source_url')
    .eq('knowledge_type', 'action')
    .eq('action_required', true)
    .gte('recorded_at', sixMonthsAgo)
    .order('recorded_at', { ascending: false })
    .limit(10);
  return data || [];
}

// ============================================
// Section Builders
// ============================================

function buildAlertSection(alerts, overdueInvoices, subscriptionAlerts, pendingActions) {
  const blocks = [];
  blocks.push(heading3('\u{1F6A8} Alerts'));

  let hasAlerts = false;

  // Overdue invoices
  for (const inv of overdueInvoices) {
    hasAlerts = true;
    const parts = [
      richText('Overdue: ', { bold: true, color: 'red' }),
      richText(`${inv.contact_name} — ${inv.invoice_number} — ${formatCurrency(inv.amount_due)}`),
      richText(` (${inv.days_overdue}d overdue)`, { color: 'gray' }),
    ];
    blocks.push(bulletItem(parts));
  }

  // Subscription alerts
  for (const sub of subscriptionAlerts) {
    hasAlerts = true;
    const parts = [
      richText('Subscription: ', { bold: true, color: 'orange' }),
      richText(`${sub.vendor_name} — ${formatCurrency(sub.amount)}`),
      richText(` (${sub.alert_status})`, { color: 'gray' }),
    ];
    blocks.push(bulletItem(parts));
  }

  // Project health alerts
  for (const proj of alerts) {
    if (proj.health_status === 'critical' || proj.health_status === 'warning') {
      hasAlerts = true;
      const color = proj.health_status === 'critical' ? 'red' : 'orange';
      const alertsText = Array.isArray(proj.alerts) ? proj.alerts.join(', ') : (proj.alerts || '');
      const parts = [
        richText(`${proj.project_name}: `, { bold: true, color }),
        richText(alertsText || `Health ${proj.overall_score}/100`),
      ];
      blocks.push(bulletItem(parts));
    }
  }

  if (!hasAlerts) {
    blocks.push(calloutBlock([richText('All clear — no alerts', { bold: true })], '\u2705', 'green_background'));
  }

  return blocks;
}

function buildFocusSection(calendar, pendingActions) {
  const blocks = [];
  blocks.push(heading3('\u{1F3AF} Today\'s Focus'));

  // Calendar
  if (calendar.length > 0) {
    for (const event of calendar) {
      const time = new Date(event.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
      const parts = [
        richText(time, { bold: true }),
        richText(` ${event.title}`),
      ];
      if (event.location) parts.push(richText(` @ ${event.location}`, { color: 'gray' }));
      if (event.detected_project_code) parts.push(richText(` [${event.detected_project_code}]`, { color: 'blue' }));
      blocks.push(bulletItem(parts));
    }
  } else {
    blocks.push(paragraph([richText('No calendar events today', { color: 'gray', italic: true })]));
  }

  // Top pending actions
  if (pendingActions.length > 0) {
    blocks.push(paragraph([])); // spacer
    blocks.push(paragraph([richText('Pending actions:', { bold: true })]));
    for (const action of pendingActions.slice(0, 5)) {
      const title = action.title || action.content?.split('\n')[0] || 'Untitled';
      const parts = [];
      if (action.source_url) {
        parts.push(richText(title, { link: action.source_url }));
      } else {
        parts.push(richText(title));
      }
      if (action.project_code) parts.push(richText(` [${action.project_code}]`, { color: 'blue' }));
      parts.push(richText(` — ${formatDateShort(action.recorded_at)}`, { color: 'gray' }));
      blocks.push(todoItem(parts));
    }
  }

  return blocks;
}

function buildProjectHealthTable(projects) {
  const blocks = [];
  blocks.push(heading3('\u{1F4CA} Project Health'));

  // Filter to active projects only
  const activeProjects = projects.filter(p => {
    const config = projectCodesData.projects[p.project_code];
    return config && config.status !== 'archived';
  });

  if (activeProjects.length === 0) {
    blocks.push(paragraph([richText('No active projects', { color: 'gray', italic: true })]));
    return blocks;
  }

  // Status emoji mapping
  const statusEmoji = {
    healthy: '\u{1F7E2}',
    warning: '\u{1F7E1}',
    critical: '\u{1F534}',
    unknown: '\u26AA',
  };

  for (const p of activeProjects) {
    const emoji = statusEmoji[p.health_status] || '\u26AA';
    const score = p.health_score != null ? `${p.health_score}/100` : 'N/A';
    const pipeline = p.pipeline_value > 0 ? ` | Pipeline: ${formatCurrency(p.pipeline_value)}` : '';
    const outstanding = p.outstanding_amount > 0 ? ` | Owed: ${formatCurrency(p.outstanding_amount)}` : '';
    const lastEmail = p.last_email_date ? ` | Last email: ${daysAgoLabel(daysAgo(p.last_email_date))}` : '';

    const parts = [
      richText(`${emoji} `, {}),
      richText(p.project_name || p.project_code, { bold: true }),
      richText(` — ${score}${pipeline}${outstanding}${lastEmail}`, { color: 'gray' }),
    ];
    blocks.push(bulletItem(parts));
  }

  blocks.push(paragraph([
    richText('\u2192 ', { color: 'gray' }),
    richText('Full dashboard', { link: `${DASHBOARD_BASE_URL}/projects`, color: 'gray', italic: true }),
  ]));

  return blocks;
}

function buildFinanceSection(cashflow, overdueInvoices, pipeline) {
  const blocks = [];
  blocks.push(heading3('\u{1F4B0} Finance Snapshot'));

  // Current month cashflow
  const currentMonth = cashflow.find(c => !c.is_projection);
  if (currentMonth) {
    blocks.push(calloutBlock([
      richText(`Income: ${formatCurrency(currentMonth.income)}`, { bold: true }),
      richText(` | Expenses: ${formatCurrency(currentMonth.expenses)}`),
      richText(` | Net: ${formatCurrency(currentMonth.net)}`, { bold: true, color: currentMonth.net >= 0 ? 'green' : 'red' }),
    ], '\u{1F4B0}', 'blue_background'));
  }

  // Pipeline total
  const pipelineTotal = pipeline.reduce((sum, p) => sum + (Number(p.monetary_value) || 0), 0);
  if (pipelineTotal > 0) {
    blocks.push(bulletItem([
      richText('Pipeline: ', { bold: true }),
      richText(`${formatCurrency(pipelineTotal)} across ${pipeline.length} open opportunities`),
    ]));
  }

  // Outstanding receivables
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.amount_due) || 0), 0);
  if (totalOverdue > 0) {
    blocks.push(bulletItem([
      richText('Overdue receivables: ', { bold: true, color: 'red' }),
      richText(`${formatCurrency(totalOverdue)} across ${overdueInvoices.length} invoices`),
    ]));
  }

  blocks.push(paragraph([
    richText('\u2192 ', { color: 'gray' }),
    richText('Finance dashboard', { link: `${DASHBOARD_BASE_URL}/cashflow`, color: 'gray', italic: true }),
  ]));

  return blocks;
}

function buildActivitySection(activity) {
  const blocks = [];
  blocks.push(heading3('\u{1F4DD} Recent Activity'));

  const typeEmoji = {
    meeting: '\u{1F91D}',
    email: '\u{1F4E7}',
    decision: '\u{2696}',
    action: '\u26A1',
    transaction: '\u{1F4B3}',
    invoice: '\u{1F4C4}',
    knowledge: '\u{1F4DA}',
  };

  for (const item of activity.slice(0, 10)) {
    const emoji = typeEmoji[item.activity_type] || '\u{1F4CC}';
    const date = formatDateShort(item.activity_date);
    const parts = [
      richText(`${emoji} `, {}),
      richText(item.title || 'Untitled', { bold: true }),
    ];
    if (item.project_code) parts.push(richText(` [${item.project_code}]`, { color: 'blue' }));
    if (item.amount) parts.push(richText(` ${formatCurrency(item.amount)}`, { color: 'green' }));
    parts.push(richText(` — ${date}`, { color: 'gray' }));
    blocks.push(bulletItem(parts));
  }

  return blocks;
}

function buildQuickLinks() {
  const blocks = [];
  blocks.push(heading3('\u{1F517} Quick Links'));

  const links = [
    { label: 'Projects Dashboard', url: `${DASHBOARD_BASE_URL}/projects` },
    { label: 'People Directory', url: `${DASHBOARD_BASE_URL}/people` },
    { label: 'Cashflow & Finance', url: `${DASHBOARD_BASE_URL}/cashflow` },
    { label: 'System Health', url: `${DASHBOARD_BASE_URL}/system` },
  ];

  const parts = [];
  links.forEach((link, i) => {
    if (i > 0) parts.push(richText('  \u00B7  ', { color: 'gray' }));
    parts.push(richText(link.label, { link: link.url }));
  });

  blocks.push(paragraph(parts));
  return blocks;
}

function buildFooter() {
  const now = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return paragraph([
    richText(`Last updated: ${now}`, { color: 'gray', italic: true }),
    richText(' \u00B7 ', { color: 'gray' }),
    richText('Auto-synced 3x daily', { color: 'gray', italic: true }),
  ]);
}

// ============================================
// Notion Page Update (same pattern as project-intelligence)
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

    for (const block of children.results) {
      allBlocks.push(block);
    }

    cursor = children.has_more ? children.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);

  // Find the marker heading
  let markerIndex = -1;
  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_2' && block.heading_2?.rich_text) {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (text.includes('Mission Control')) {
        markerIndex = i;
        break;
      }
    }
  }

  if (markerIndex === -1) return { blockIdsToDelete: [], insertAfterId: null };

  // Collect all blocks from marker to end (or next heading_1)
  const blockIdsToDelete = [allBlocks[markerIndex].id];
  for (let i = markerIndex + 1; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === 'heading_1') break;
    // Stop at another heading_2 that isn't one of ours
    if (block.type === 'heading_2') {
      const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
      const ourHeadings = ['Alerts', 'Focus', 'Project Health', 'Finance', 'Recent Activity', 'Quick Links'];
      if (!ourHeadings.some(h => text.includes(h))) break;
    }
    blockIdsToDelete.push(block.id);
  }

  const insertAfterId = markerIndex > 0 ? allBlocks[markerIndex - 1].id : null;
  return { blockIdsToDelete, insertAfterId };
}

async function updatePage(pageId) {
  log('Fetching data from Supabase...');

  const [alerts, projects, calendar, activity, overdueInvoices, cashflow, pipeline, subscriptionAlerts, pendingActions] = await Promise.all([
    fetchAlerts(),
    fetchProjectHealth(),
    fetchTodayCalendar(),
    fetchRecentActivity(),
    fetchOverdueInvoices(),
    fetchCashflow(),
    fetchPipelineSummary(),
    fetchSubscriptionAlerts(),
    fetchPendingActions(),
  ]);

  verbose(`  Alerts: ${alerts.length} projects`);
  verbose(`  Projects: ${projects.length}`);
  verbose(`  Calendar: ${calendar.length} events today`);
  verbose(`  Activity: ${activity.length} recent items`);
  verbose(`  Overdue invoices: ${overdueInvoices.length}`);
  verbose(`  Cashflow months: ${cashflow.length}`);
  verbose(`  Pipeline: ${pipeline.length} open opportunities`);
  verbose(`  Subscription alerts: ${subscriptionAlerts.length}`);
  verbose(`  Pending actions: ${pendingActions.length}`);

  // Build blocks
  const blocks = [];
  blocks.push(heading2(SECTION_MARKER));
  blocks.push(...buildAlertSection(alerts, overdueInvoices, subscriptionAlerts, pendingActions));
  blocks.push(divider());
  blocks.push(...buildFocusSection(calendar, pendingActions));
  blocks.push(divider());
  blocks.push(...buildProjectHealthTable(projects));
  blocks.push(divider());
  blocks.push(...buildFinanceSection(cashflow, overdueInvoices, pipeline));
  blocks.push(divider());
  blocks.push(...buildActivitySection(activity));
  blocks.push(divider());
  blocks.push(...buildQuickLinks());
  blocks.push(divider());
  blocks.push(buildFooter());

  log(`Built ${blocks.length} blocks`);

  if (DRY_RUN) {
    log('[DRY RUN] Would push blocks to Notion page');
    return;
  }

  // Find and clear existing section
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

  // Append new blocks in batches
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
  log('=== Mission Control Sync ===');
  if (DRY_RUN) log('DRY RUN MODE');

  const pageId = notionDbIds.missionControl;
  if (!pageId) {
    log('ERROR: No missionControl page ID in config/notion-database-ids.json');
    log('Create a "Mission Control" page in Notion and add its ID to the config.');
    process.exit(1);
  }

  await updatePage(pageId);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
