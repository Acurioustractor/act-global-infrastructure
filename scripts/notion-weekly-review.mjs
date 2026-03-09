#!/usr/bin/env node
/**
 * Notion Weekly Review
 *
 * Creates a weekly review page in Notion with:
 *   - Financial summary (spend, income, untagged)
 *   - Project health trends (scores + changes)
 *   - Relationship changes (temperature drops, new contacts)
 *   - Grant pipeline status
 *   - Key metrics from the week
 *
 * Usage:
 *   node scripts/notion-weekly-review.mjs             # Create this week's review
 *   node scripts/notion-weekly-review.mjs --dry-run   # Preview without writing
 *   node scripts/notion-weekly-review.mjs --verbose    # Detailed output
 *
 * Schedule: Sunday 5pm AEST via PM2
 */

import '../lib/load-env.mjs';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { retrieveDatabase } from './lib/notion-datasource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
const WEEKLY_REPORTS_DB_ID = dbIds.weeklyReports;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

function verbose(...msg) {
  if (VERBOSE) console.log(...msg);
}

function weekLabel() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `Week of ${weekStart.toISOString().split('T')[0]}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function getFinancialSummary() {
  const since = daysAgo(7);
  const { data: txns } = await supabase
    .from('xero_transactions')
    .select('project_code, total, type')
    .gte('date', since.split('T')[0]);

  let income = 0, spend = 0, untagged = 0;
  const byProject = {};

  for (const tx of (txns || [])) {
    const amt = Math.abs(tx.total || 0);
    if (!tx.project_code) { untagged += amt; continue; }
    if (!byProject[tx.project_code]) byProject[tx.project_code] = { spend: 0, income: 0 };
    if ((tx.total || 0) < 0) { spend += amt; byProject[tx.project_code].spend += amt; }
    else { income += amt; byProject[tx.project_code].income += amt; }
  }

  const lines = [`Income: $${income.toLocaleString()} | Spend: $${spend.toLocaleString()} | Net: $${(income - spend).toLocaleString()}`];
  if (untagged > 0) lines.push(`Untagged: $${untagged.toLocaleString()}`);

  const topProjects = Object.entries(byProject)
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 5)
    .map(([code, p]) => `  ${code}: -$${p.spend.toLocaleString()} / +$${p.income.toLocaleString()}`);

  if (topProjects.length) lines.push('Top projects:\n' + topProjects.join('\n'));
  return lines.join('\n');
}

async function getProjectHealth() {
  const { data: health } = await supabase
    .from('project_health')
    .select('project_code, overall_score, health_status, calculated_at')
    .order('overall_score', { ascending: true });

  if (!health?.length) return 'No project health data.';

  return health.map(p =>
    `${p.health_status === 'critical' ? '🔴' : p.health_status === 'warning' ? '🟡' : '🟢'} ${p.project_code}: ${p.overall_score}/100`
  ).join('\n');
}

async function getRelationshipChanges() {
  const { data: alerts } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, temperature_trend')
    .eq('temperature_trend', 'falling')
    .order('temperature', { ascending: true })
    .limit(10);

  if (!alerts?.length) return 'No relationship alerts this week.';

  const ghlIds = alerts.map(a => a.ghl_contact_id);
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name')
    .in('ghl_id', ghlIds);

  const nameMap = new Map((contacts || []).map(c => [c.ghl_id, c.full_name]));

  return alerts.map(a =>
    `⚠️ ${nameMap.get(a.ghl_contact_id) || 'Unknown'}: ${a.temperature}/100 (falling)`
  ).join('\n');
}

async function getGrantPipeline() {
  const { data: grants } = await supabase
    .from('grant_applications')
    .select('application_name, project_code, status, amount_requested')
    .in('status', ['draft', 'in_progress', 'submitted', 'under_review']);

  if (!grants?.length) return 'No active grant applications.';

  let total = 0;
  const lines = grants.map(g => {
    total += g.amount_requested || 0;
    return `  ${g.project_code}: ${g.application_name} (${g.status}) — $${(g.amount_requested || 0).toLocaleString()}`;
  });

  return `${grants.length} active applications, $${total.toLocaleString()} pipeline:\n${lines.join('\n')}`;
}

async function getEmailStats() {
  const { count: unanswered } = await supabase
    .from('v_need_to_respond')
    .select('id', { count: 'exact', head: true });

  const since = daysAgo(7);
  const { count: received } = await supabase
    .from('communications_history')
    .select('id', { count: 'exact', head: true })
    .eq('direction', 'inbound')
    .gte('occurred_at', since);

  return `Received this week: ${received || 0} | Unanswered: ${unanswered || 0}`;
}

async function getInvoiceAging() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date, status')
    .in('status', ['AUTHORISED', 'SENT'])
    .eq('type', 'ACCREC')
    .gt('amount_due', 0);

  const buckets = { current: 0, '1-30d': 0, '31-60d': 0, '61-90d': 0, '90d+': 0 };
  let totalDue = 0;
  const overdueList = [];

  for (const inv of invoices || []) {
    const amt = Number(inv.amount_due) || 0;
    totalDue += amt;
    if (!inv.due_date || inv.due_date >= today) {
      buckets.current += amt;
    } else {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 30) buckets['1-30d'] += amt;
      else if (daysOverdue <= 60) buckets['31-60d'] += amt;
      else if (daysOverdue <= 90) buckets['61-90d'] += amt;
      else buckets['90d+'] += amt;
      overdueList.push(`  ${inv.contact_name || 'Unknown'} — $${amt.toLocaleString()} (${daysOverdue}d overdue)`);
    }
  }

  const lines = [
    `Total due: $${Math.round(totalDue).toLocaleString()} (${(invoices || []).length} invoices)`,
    `Aging: Current $${Math.round(buckets.current).toLocaleString()} | 1-30d $${Math.round(buckets['1-30d']).toLocaleString()} | 31-60d $${Math.round(buckets['31-60d']).toLocaleString()} | 61-90d $${Math.round(buckets['61-90d']).toLocaleString()} | 90d+ $${Math.round(buckets['90d+']).toLocaleString()}`,
  ];
  if (overdueList.length > 0) {
    lines.push(`Overdue (${overdueList.length}):`);
    lines.push(...overdueList.slice(0, 10));
  } else {
    lines.push('All invoices current — none overdue!');
  }
  return lines.join('\n');
}

async function getReceiptGap() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const since = threeMonthsAgo.toISOString().split('T')[0];

  const { count: totalExpenses } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'SPEND')
    .gte('date', since);

  const { count: withReceipts } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'SPEND')
    .eq('has_attachment', true)
    .gte('date', since);

  const total = totalExpenses || 0;
  const matched = withReceipts || 0;
  const missing = total - matched;
  const score = total > 0 ? Math.round((matched / total) * 100) : 100;

  return `Receipt score: ${score}% (${matched} of ${total} matched, ${missing} missing)`;
}

async function getRdSpend() {
  const now = new Date();
  const fyStart = now.getMonth() >= 6
    ? `${now.getFullYear()}-07-01`
    : `${now.getFullYear() - 1}-07-01`;

  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name')
    .eq('rd_eligible', true);

  const rdVendors = new Set((rules || []).map(r => r.vendor_name));

  const since = daysAgo(7).split('T')[0];
  const { data: weekTxns } = await supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .lt('total', 0)
    .gte('date', since);

  let weekRd = 0;
  for (const tx of weekTxns || []) {
    if (rdVendors.has(tx.contact_name)) weekRd += Math.abs(Number(tx.total) || 0);
  }

  const { data: ytdTxns } = await supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .lt('total', 0)
    .gte('date', fyStart);

  let ytdRd = 0;
  for (const tx of ytdTxns || []) {
    if (rdVendors.has(tx.contact_name)) ytdRd += Math.abs(Number(tx.total) || 0);
  }

  return `This week: $${Math.round(weekRd).toLocaleString()} | YTD: $${Math.round(ytdRd).toLocaleString()} | 43.5% offset: $${Math.round(ytdRd * 0.435).toLocaleString()}`;
}

function generateActions(financial, invoiceAging, receiptGap, rdSpend) {
  const actions = [];

  // Parse overdue count from invoice aging text
  const overdueMatch = invoiceAging.match(/Overdue \((\d+)\)/);
  if (overdueMatch) actions.push(`→ CHASE: ${overdueMatch[1]} overdue invoices`);

  // Parse missing receipts
  const missingMatch = receiptGap.match(/(\d+) missing/);
  if (missingMatch && parseInt(missingMatch[1]) > 5) actions.push(`→ CAPTURE: ${missingMatch[1]} missing receipts`);

  // Parse untagged from financial
  const untaggedMatch = financial.match(/Untagged: \$([0-9,]+)/);
  if (untaggedMatch) actions.push(`→ TAG: $${untaggedMatch[1]} in untagged transactions`);

  return actions.length > 0 ? actions.join('\n') : '✅ No urgent actions this week';
}

async function getMeetingsSummary() {
  const since = daysAgo(7);

  const [{ data: events }, { data: notes }, { data: actions }] = await Promise.all([
    supabase.from('calendar_events')
      .select('title, start_time, attendees, detected_project_code')
      .lte('end_time', new Date().toISOString())
      .gte('start_time', since)
      .order('start_time', { ascending: true }),
    supabase.from('project_knowledge')
      .select('title, summary, ai_summary, participants, project_code')
      .eq('knowledge_type', 'meeting')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false }),
    supabase.from('project_knowledge')
      .select('title, participants, project_code')
      .eq('knowledge_type', 'action')
      .eq('action_required', true)
      .gte('recorded_at', since),
  ]);

  if (!events?.length) return 'No meetings this week.';

  const multiAttendee = events.filter(e => {
    const att = Array.isArray(e.attendees) ? e.attendees : [];
    return att.length >= 2;
  });

  const noteSet = new Set((notes || []).map(n => n.title?.toLowerCase()));
  const lines = [];
  lines.push(`${multiAttendee.length} meetings held, ${notes?.length || 0} with notes captured`);
  lines.push('');

  for (const e of multiAttendee.slice(0, 10)) {
    const names = (Array.isArray(e.attendees) ? e.attendees : [])
      .map(a => a.displayName || a.email?.split('@')[0])
      .filter(n => n && !n.endsWith('@act.place'))
      .slice(0, 4).join(', ');
    const hasNotes = Array.from(noteSet).some(t =>
      e.title.toLowerCase().includes(t) || t.includes(e.title.toLowerCase()));
    const project = e.detected_project_code ? ` [${e.detected_project_code}]` : '';
    lines.push(`• ${e.title}${project} — ${names}${hasNotes ? '' : ' ⚠ no notes'}`);

    if (hasNotes) {
      const note = notes.find(n => e.title.toLowerCase().includes(n.title?.toLowerCase()));
      const summary = note?.ai_summary || note?.summary;
      if (summary) lines.push(`  → ${summary.substring(0, 150)}`);
    }
  }

  if (actions?.length > 0) {
    lines.push('');
    lines.push(`Open actions from meetings: ${actions.length}`);
    for (const a of actions.slice(0, 5)) {
      lines.push(`  → ${a.title}${a.project_code ? ` [${a.project_code}]` : ''}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const start = Date.now();
  const title = weekLabel();

  console.log(`Creating weekly review: ${title}`);

  const [financial, health, relationships, grants, emails, invoiceAging, receiptGap, rdSpend, meetings] = await Promise.all([
    getFinancialSummary(),
    getProjectHealth(),
    getRelationshipChanges(),
    getGrantPipeline(),
    getEmailStats(),
    getInvoiceAging(),
    getReceiptGap(),
    getRdSpend(),
    getMeetingsSummary(),
  ]);

  const actions = generateActions(financial, invoiceAging, receiptGap, rdSpend);

  verbose('\n--- Financial ---\n' + financial);
  verbose('\n--- Project Health ---\n' + health);
  verbose('\n--- Relationships ---\n' + relationships);
  verbose('\n--- Grants ---\n' + grants);
  verbose('\n--- Emails ---\n' + emails);
  verbose('\n--- Invoice Aging ---\n' + invoiceAging);
  verbose('\n--- Receipt Gap ---\n' + receiptGap);
  verbose('\n--- R&D Spend ---\n' + rdSpend);
  verbose('\n--- Meetings ---\n' + meetings);
  verbose('\n--- Actions ---\n' + actions);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would create Notion page with above content.');
    return;
  }

  if (!WEEKLY_REPORTS_DB_ID) {
    console.error('❌ No weeklyReports database ID in config/notion-database-ids.json');
    process.exit(1);
  }

  const children = [
    heading('Action Items'),
    paragraph(actions),
    heading('Financial Summary'),
    paragraph(financial),
    heading('Invoice Aging'),
    paragraph(invoiceAging),
    heading('Receipt Gap'),
    paragraph(receiptGap),
    heading('R&D Spend'),
    paragraph(rdSpend),
    heading('Project Health'),
    paragraph(health),
    heading('Relationships'),
    paragraph(relationships),
    heading('Grant Pipeline'),
    paragraph(grants),
    heading('Meetings'),
    paragraph(meetings),
    heading('Email Activity'),
    paragraph(emails),
  ];

  // Auto-detect title property name from database schema
  const dbMeta = await retrieveDatabase(notion, WEEKLY_REPORTS_DB_ID);
  const titleProp = Object.entries(dbMeta.properties).find(([, v]) => v.type === 'title');
  const dateProp = Object.entries(dbMeta.properties).find(([, v]) => v.type === 'date');
  const titleKey = titleProp ? titleProp[0] : 'Name';

  const properties = {
    [titleKey]: { title: [{ text: { content: `📊 ${title}` } }] },
  };
  if (dateProp) {
    properties[dateProp[0]] = { date: { start: new Date().toISOString().split('T')[0] } };
  }

  await notion.pages.create({
    parent: { database_id: WEEKLY_REPORTS_DB_ID },
    properties,
    children,
  });

  console.log(`\n✅ Weekly review created: ${title} (${((Date.now() - start) / 1000).toFixed(1)}s)`);

  await recordSyncStatus(supabase, 'notion_weekly_review', {
    success: true,
    recordCount: 1,
    durationMs: Date.now() - start,
  });
}

function heading(text) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: text } }] },
  };
}

function paragraph(text) {
  // Notion blocks max 2000 chars
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: (text || 'No data.').slice(0, 2000) } }] },
  };
}

main().catch(async (err) => {
  console.error('Fatal error:', err.message);
  await recordSyncStatus(supabase, 'notion_weekly_review', { success: false, error: err.message });
  process.exit(1);
});
