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

async function main() {
  const start = Date.now();
  const title = weekLabel();

  console.log(`Creating weekly review: ${title}`);

  const [financial, health, relationships, grants, emails] = await Promise.all([
    getFinancialSummary(),
    getProjectHealth(),
    getRelationshipChanges(),
    getGrantPipeline(),
    getEmailStats(),
  ]);

  verbose('\n--- Financial ---\n' + financial);
  verbose('\n--- Project Health ---\n' + health);
  verbose('\n--- Relationships ---\n' + relationships);
  verbose('\n--- Grants ---\n' + grants);
  verbose('\n--- Emails ---\n' + emails);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would create Notion page with above content.');
    return;
  }

  if (!WEEKLY_REPORTS_DB_ID) {
    console.error('❌ No weeklyReports database ID in config/notion-database-ids.json');
    process.exit(1);
  }

  const children = [
    heading('Financial Summary'),
    paragraph(financial),
    heading('Project Health'),
    paragraph(health),
    heading('Relationships'),
    paragraph(relationships),
    heading('Grant Pipeline'),
    paragraph(grants),
    heading('Email Activity'),
    paragraph(emails),
  ];

  await notion.pages.create({
    parent: { database_id: WEEKLY_REPORTS_DB_ID },
    properties: {
      'Name': { title: [{ text: { content: `📊 ${title}` } }] },
      'Date': { date: { start: new Date().toISOString().split('T')[0] } },
    },
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
