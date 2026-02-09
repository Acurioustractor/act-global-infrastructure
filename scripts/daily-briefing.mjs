#!/usr/bin/env node
/**
 * Daily Briefing Generator
 *
 * Generates a morning digest summarizing everything important across the ACT ecosystem.
 *
 * Sections:
 *   1. Overdue Actions
 *   2. Upcoming Follow-ups (next 7 days)
 *   3. Recent Meetings
 *   4. Recent Decisions
 *   5. Relationship Alerts (stale hot/warm contacts)
 *   6. Financial Summary (pipeline totals)
 *   7. Active Projects Summary (activity counts per project)
 *
 * Usage:
 *   node scripts/daily-briefing.mjs
 *   node scripts/daily-briefing.mjs --days 14
 *   node scripts/daily-briefing.mjs --project ACT-HV
 *   node scripts/daily-briefing.mjs --json
 *
 * Created: 2026-01-30
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load project codes for name resolution
const projectCodesPath = join(__dirname, '..', 'config', 'project-codes.json');
let PROJECT_CODES = {};
if (existsSync(projectCodesPath)) {
  const raw = readFileSync(projectCodesPath, 'utf-8');
  PROJECT_CODES = JSON.parse(raw).projects || {};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI ARGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const args = process.argv.slice(2);

function getArg(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return args[idx + 1] || defaultValue;
}

const LOOKBACK_DAYS = parseInt(getArg('days', '7'), 10);
const PROJECT_FILTER = getArg('project', null);
const JSON_ONLY = args.includes('--json');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function futureDate(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function projectName(code) {
  return PROJECT_CODES[code]?.name || code;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function applyProjectFilter(query) {
  if (PROJECT_FILTER) {
    return query.eq('project_code', PROJECT_FILTER);
  }
  return query;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION FETCHERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 1. Overdue Actions - actions with follow_up_date in the past
 */
async function fetchOverdueActions() {
  let query = supabase
    .from('project_knowledge')
    .select('id, project_code, title, content, follow_up_date, action_items, importance, recorded_at')
    .eq('action_required', true)
    .lt('follow_up_date', todayStr())
    .order('follow_up_date', { ascending: true });

  query = applyProjectFilter(query);

  const { data, error } = await query;
  if (error) {
    console.warn('  Warning: Could not fetch overdue actions:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    project: row.project_code,
    projectName: projectName(row.project_code),
    title: row.title || '(untitled)',
    content: row.content?.substring(0, 200) || '',
    followUpDate: row.follow_up_date,
    importance: row.importance || 'normal',
    actionItems: row.action_items || [],
    daysOverdue: Math.floor((Date.now() - new Date(row.follow_up_date).getTime()) / 86400000),
  }));
}

/**
 * 2. Upcoming Follow-ups - actions due in the next N days
 */
async function fetchUpcomingFollowups() {
  let query = supabase
    .from('project_knowledge')
    .select('id, project_code, title, content, follow_up_date, action_items, importance')
    .eq('action_required', true)
    .gte('follow_up_date', todayStr())
    .lte('follow_up_date', futureDate(LOOKBACK_DAYS))
    .order('follow_up_date', { ascending: true });

  query = applyProjectFilter(query);

  const { data, error } = await query;
  if (error) {
    console.warn('  Warning: Could not fetch upcoming follow-ups:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    project: row.project_code,
    projectName: projectName(row.project_code),
    title: row.title || '(untitled)',
    content: row.content?.substring(0, 200) || '',
    followUpDate: row.follow_up_date,
    importance: row.importance || 'normal',
    actionItems: row.action_items || [],
  }));
}

/**
 * 3. Recent Meetings - meetings from the last N days
 */
async function fetchRecentMeetings() {
  let query = supabase
    .from('project_knowledge')
    .select('id, project_code, title, summary, content, recorded_at, participants, importance')
    .eq('knowledge_type', 'meeting')
    .gte('recorded_at', daysAgo(LOOKBACK_DAYS))
    .order('recorded_at', { ascending: false });

  query = applyProjectFilter(query);

  const { data, error } = await query;
  if (error) {
    console.warn('  Warning: Could not fetch recent meetings:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    project: row.project_code,
    projectName: projectName(row.project_code),
    title: row.title || '(untitled meeting)',
    summary: row.summary || row.content?.substring(0, 300) || '',
    recordedAt: row.recorded_at,
    participants: row.participants || [],
    importance: row.importance || 'normal',
  }));
}

/**
 * 4. Recent Decisions - decisions from the last N days
 */
async function fetchRecentDecisions() {
  let query = supabase
    .from('project_knowledge')
    .select('id, project_code, title, content, decision_status, decision_rationale, recorded_at, importance')
    .eq('knowledge_type', 'decision')
    .gte('recorded_at', daysAgo(LOOKBACK_DAYS))
    .order('recorded_at', { ascending: false });

  query = applyProjectFilter(query);

  const { data, error } = await query;
  if (error) {
    console.warn('  Warning: Could not fetch recent decisions:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    project: row.project_code,
    projectName: projectName(row.project_code),
    title: row.title || '(untitled decision)',
    content: row.content?.substring(0, 300) || '',
    status: row.decision_status || 'unknown',
    rationale: row.decision_rationale || '',
    recordedAt: row.recorded_at,
    importance: row.importance || 'normal',
  }));
}

/**
 * 5. Relationship Alerts - contacts that are engaged but inactive
 *    ghl_contacts uses engagement_status (lead, prospect, active, alumni, lapsed, opted-out)
 *    and last_contact_date. We flag active/prospect contacts with stale last_contact_date.
 */
async function fetchRelationshipAlerts() {
  const staleThreshold = daysAgo(30);

  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, first_name, last_name, email, company_name, engagement_status, last_contact_date, tags, projects')
    .in('engagement_status', ['active', 'prospect'])
    .lt('last_contact_date', staleThreshold)
    .order('last_contact_date', { ascending: true })
    .limit(20);

  if (error) {
    console.warn('  Warning: Could not fetch relationship alerts:', error.message);
    return [];
  }

  return (data || []).map(row => {
    const name = row.full_name?.trim() || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || 'Unknown';
    const daysSinceContact = row.last_contact_date
      ? Math.floor((Date.now() - new Date(row.last_contact_date).getTime()) / 86400000)
      : null;

    return {
      id: row.id,
      ghlId: row.ghl_id,
      name,
      email: row.email,
      company: row.company_name,
      engagementStatus: row.engagement_status,
      lastContactDate: row.last_contact_date,
      daysSinceContact,
      tags: row.tags || [],
      projects: row.projects || [],
    };
  });
}

/**
 * 6. Financial Summary - pipeline totals from ghl_opportunities
 */
async function fetchFinancialSummary() {
  const { data, error } = await supabase
    .from('ghl_opportunities')
    .select('status, monetary_value, pipeline_name, stage_name');

  if (error) {
    console.warn('  Warning: Could not fetch financial summary:', error.message);
    return { totalPipeline: 0, openValue: 0, wonValue: 0, lostValue: 0, byPipeline: {}, byStage: {} };
  }

  const rows = data || [];
  let totalPipeline = 0;
  let openValue = 0;
  let wonValue = 0;
  let lostValue = 0;
  const byPipeline = {};
  const byStage = {};

  for (const row of rows) {
    const val = parseFloat(row.monetary_value) || 0;
    totalPipeline += val;

    if (row.status === 'open') openValue += val;
    else if (row.status === 'won') wonValue += val;
    else if (row.status === 'lost') lostValue += val;

    const pName = row.pipeline_name || 'Unknown Pipeline';
    if (!byPipeline[pName]) byPipeline[pName] = { open: 0, won: 0, lost: 0, total: 0, count: 0 };
    byPipeline[pName].total += val;
    byPipeline[pName].count += 1;
    if (row.status === 'open') byPipeline[pName].open += val;
    else if (row.status === 'won') byPipeline[pName].won += val;
    else if (row.status === 'lost') byPipeline[pName].lost += val;

    const sName = row.stage_name || 'Unknown Stage';
    if (!byStage[sName]) byStage[sName] = { value: 0, count: 0 };
    byStage[sName].value += val;
    byStage[sName].count += 1;
  }

  return { totalPipeline, openValue, wonValue, lostValue, byPipeline, byStage, opportunityCount: rows.length };
}

/**
 * 7. Active Projects Summary - activity counts per project in last 30 days
 */
async function fetchActiveProjectsSummary() {
  const thirtyDaysAgo = daysAgo(30);

  let query = supabase
    .from('project_knowledge')
    .select('project_code, knowledge_type, recorded_at')
    .gte('recorded_at', thirtyDaysAgo);

  query = applyProjectFilter(query);

  const { data, error } = await query;
  if (error) {
    console.warn('  Warning: Could not fetch active projects summary:', error.message);
    return [];
  }

  const byProject = {};
  for (const row of (data || [])) {
    const code = row.project_code;
    if (!byProject[code]) {
      byProject[code] = { code, name: projectName(code), meetings: 0, actions: 0, decisions: 0, other: 0, total: 0, lastActivity: null };
    }
    byProject[code].total += 1;

    if (row.knowledge_type === 'meeting') byProject[code].meetings += 1;
    else if (row.knowledge_type === 'decision') byProject[code].decisions += 1;
    else if (row.knowledge_type === 'action' || (row.knowledge_type && row.knowledge_type.includes('action'))) byProject[code].actions += 1;
    else byProject[code].other += 1;

    // Track latest activity
    if (!byProject[code].lastActivity || row.recorded_at > byProject[code].lastActivity) {
      byProject[code].lastActivity = row.recorded_at;
    }
  }

  // Also count items that have action_required=true as "actions"
  let actionQuery = supabase
    .from('project_knowledge')
    .select('project_code')
    .eq('action_required', true)
    .gte('recorded_at', thirtyDaysAgo);

  actionQuery = applyProjectFilter(actionQuery);

  const { data: actionData } = await actionQuery;
  for (const row of (actionData || [])) {
    const code = row.project_code;
    if (!byProject[code]) {
      byProject[code] = { code, name: projectName(code), meetings: 0, actions: 0, decisions: 0, other: 0, total: 0, lastActivity: null };
    }
    // Only increment if not already counted via knowledge_type
    // We already counted these in the main loop, so skip double-counting
  }

  return Object.values(byProject).sort((a, b) => b.total - a.total);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMATTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatCurrency(val) {
  return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function importanceBadge(imp) {
  const badges = { critical: '[CRITICAL]', high: '[HIGH]', normal: '', low: '[low]' };
  return badges[imp] || '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OUTPUT GENERATORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateMarkdown(briefing) {
  const lines = [];
  const today = todayStr();

  lines.push(`# ACT Daily Briefing - ${today}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Lookback: ${LOOKBACK_DAYS} days${PROJECT_FILTER ? ` | Project: ${PROJECT_FILTER}` : ''}`);
  lines.push('');

  // 1. Overdue Actions
  lines.push('## 1. Overdue Actions');
  if (briefing.overdueActions.length === 0) {
    lines.push('No overdue actions. All clear.');
  } else {
    lines.push(`**${briefing.overdueActions.length} overdue action(s):**`);
    lines.push('');
    for (const a of briefing.overdueActions) {
      const badge = importanceBadge(a.importance);
      lines.push(`- ${badge} **${a.title}** (${a.projectName}) - ${a.daysOverdue} days overdue (due ${formatDate(a.followUpDate)})`);
      if (a.content) lines.push(`  > ${a.content.substring(0, 150).replace(/\n/g, ' ')}`);
    }
  }
  lines.push('');

  // 2. Upcoming Follow-ups
  lines.push('## 2. Upcoming Follow-ups');
  if (briefing.upcomingFollowups.length === 0) {
    lines.push('No follow-ups in the next ' + LOOKBACK_DAYS + ' days.');
  } else {
    lines.push(`**${briefing.upcomingFollowups.length} upcoming follow-up(s):**`);
    lines.push('');
    for (const f of briefing.upcomingFollowups) {
      const badge = importanceBadge(f.importance);
      lines.push(`- ${badge} **${f.title}** (${f.projectName}) - due ${formatDate(f.followUpDate)}`);
      if (f.content) lines.push(`  > ${f.content.substring(0, 150).replace(/\n/g, ' ')}`);
    }
  }
  lines.push('');

  // 3. Recent Meetings
  lines.push('## 3. Recent Meetings');
  if (briefing.recentMeetings.length === 0) {
    lines.push('No meetings recorded in the last ' + LOOKBACK_DAYS + ' days.');
  } else {
    lines.push(`**${briefing.recentMeetings.length} meeting(s):**`);
    lines.push('');
    for (const m of briefing.recentMeetings) {
      const participants = m.participants.length > 0 ? ` (${m.participants.join(', ')})` : '';
      lines.push(`### ${m.title} - ${m.projectName}`);
      lines.push(`*${formatDate(m.recordedAt)}*${participants}`);
      if (m.summary) lines.push(`\n${m.summary.substring(0, 500)}`);
      lines.push('');
    }
  }
  lines.push('');

  // 4. Recent Decisions
  lines.push('## 4. Recent Decisions');
  if (briefing.recentDecisions.length === 0) {
    lines.push('No decisions recorded in the last ' + LOOKBACK_DAYS + ' days.');
  } else {
    lines.push(`**${briefing.recentDecisions.length} decision(s):**`);
    lines.push('');
    for (const d of briefing.recentDecisions) {
      const badge = importanceBadge(d.importance);
      lines.push(`- ${badge} **${d.title}** (${d.projectName}) - Status: ${d.status}`);
      if (d.content) lines.push(`  > ${d.content.substring(0, 200).replace(/\n/g, ' ')}`);
      if (d.rationale) lines.push(`  Rationale: ${d.rationale.substring(0, 150).replace(/\n/g, ' ')}`);
    }
  }
  lines.push('');

  // 5. Relationship Alerts
  lines.push('## 5. Relationship Alerts');
  if (briefing.relationshipAlerts.length === 0) {
    lines.push('No stale relationships detected. All active/prospect contacts are recently engaged.');
  } else {
    lines.push(`**${briefing.relationshipAlerts.length} contact(s) need attention** (active/prospect, no contact >30 days):`);
    lines.push('');
    for (const r of briefing.relationshipAlerts) {
      const daysStr = r.daysSinceContact != null ? `${r.daysSinceContact} days ago` : 'never';
      const company = r.company ? ` (${r.company})` : '';
      const projects = r.projects.length > 0 ? ` [${r.projects.join(', ')}]` : '';
      lines.push(`- **${r.name}**${company} - ${r.engagementStatus} - last contact: ${daysStr}${projects}`);
    }
  }
  lines.push('');

  // 6. Financial Summary
  lines.push('## 6. Financial Summary');
  const fin = briefing.financialSummary;
  if (fin.opportunityCount === 0) {
    lines.push('No opportunities in pipeline.');
  } else {
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Pipeline | ${formatCurrency(fin.totalPipeline)} |`);
    lines.push(`| Open | ${formatCurrency(fin.openValue)} |`);
    lines.push(`| Won | ${formatCurrency(fin.wonValue)} |`);
    lines.push(`| Lost | ${formatCurrency(fin.lostValue)} |`);
    lines.push(`| Opportunities | ${fin.opportunityCount} |`);
    lines.push('');

    if (Object.keys(fin.byPipeline).length > 0) {
      lines.push('### By Pipeline');
      for (const [name, stats] of Object.entries(fin.byPipeline)) {
        lines.push(`- **${name}**: ${formatCurrency(stats.total)} total (${stats.count} opps) - Open: ${formatCurrency(stats.open)}, Won: ${formatCurrency(stats.won)}`);
      }
      lines.push('');
    }
  }
  lines.push('');

  // 7. Active Projects
  lines.push('## 7. Active Projects Summary (Last 30 Days)');
  if (briefing.activeProjects.length === 0) {
    lines.push('No project activity recorded in the last 30 days.');
  } else {
    lines.push('| Project | Meetings | Decisions | Other | Total | Last Activity |');
    lines.push('|---------|----------|-----------|-------|-------|---------------|');
    for (const p of briefing.activeProjects) {
      lines.push(`| ${p.name} (${p.code}) | ${p.meetings} | ${p.decisions} | ${p.other} | ${p.total} | ${formatDate(p.lastActivity)} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

function generateConsoleOutput(briefing) {
  const sep = '='.repeat(60);
  const lines = [];

  lines.push('');
  lines.push(sep);
  lines.push(`  ACT DAILY BRIEFING - ${todayStr()}`);
  lines.push(`  Lookback: ${LOOKBACK_DAYS} days${PROJECT_FILTER ? ` | Project: ${PROJECT_FILTER}` : ''}`);
  lines.push(sep);

  // 1. Overdue
  lines.push('');
  lines.push('--- 1. OVERDUE ACTIONS ---');
  if (briefing.overdueActions.length === 0) {
    lines.push('  All clear - no overdue actions.');
  } else {
    for (const a of briefing.overdueActions) {
      const badge = importanceBadge(a.importance);
      lines.push(`  ${badge} ${a.title} [${a.projectName}] - ${a.daysOverdue}d overdue (due ${formatDate(a.followUpDate)})`);
    }
  }

  // 2. Upcoming
  lines.push('');
  lines.push('--- 2. UPCOMING FOLLOW-UPS ---');
  if (briefing.upcomingFollowups.length === 0) {
    lines.push('  No upcoming follow-ups.');
  } else {
    for (const f of briefing.upcomingFollowups) {
      lines.push(`  ${importanceBadge(f.importance)} ${f.title} [${f.projectName}] - due ${formatDate(f.followUpDate)}`);
    }
  }

  // 3. Meetings
  lines.push('');
  lines.push('--- 3. RECENT MEETINGS ---');
  if (briefing.recentMeetings.length === 0) {
    lines.push('  No meetings in the last ' + LOOKBACK_DAYS + ' days.');
  } else {
    for (const m of briefing.recentMeetings) {
      const participants = m.participants.length > 0 ? ` with ${m.participants.join(', ')}` : '';
      lines.push(`  ${formatDate(m.recordedAt)} - ${m.title} [${m.projectName}]${participants}`);
      if (m.summary) lines.push(`    Summary: ${m.summary.substring(0, 120).replace(/\n/g, ' ')}`);
    }
  }

  // 4. Decisions
  lines.push('');
  lines.push('--- 4. RECENT DECISIONS ---');
  if (briefing.recentDecisions.length === 0) {
    lines.push('  No decisions in the last ' + LOOKBACK_DAYS + ' days.');
  } else {
    for (const d of briefing.recentDecisions) {
      lines.push(`  ${importanceBadge(d.importance)} ${d.title} [${d.projectName}] - ${d.status}`);
      if (d.content) lines.push(`    ${d.content.substring(0, 100).replace(/\n/g, ' ')}`);
    }
  }

  // 5. Relationship Alerts
  lines.push('');
  lines.push('--- 5. RELATIONSHIP ALERTS ---');
  if (briefing.relationshipAlerts.length === 0) {
    lines.push('  No stale relationships detected.');
  } else {
    for (const r of briefing.relationshipAlerts) {
      const daysStr = r.daysSinceContact != null ? `${r.daysSinceContact}d ago` : 'never';
      lines.push(`  ${r.name} (${r.engagementStatus}) - last contact: ${daysStr}`);
    }
  }

  // 6. Financial
  lines.push('');
  lines.push('--- 6. FINANCIAL SUMMARY ---');
  const fin = briefing.financialSummary;
  if (fin.opportunityCount === 0) {
    lines.push('  No opportunities in pipeline.');
  } else {
    lines.push(`  Total Pipeline:  ${formatCurrency(fin.totalPipeline)}`);
    lines.push(`  Open:            ${formatCurrency(fin.openValue)}`);
    lines.push(`  Won:             ${formatCurrency(fin.wonValue)}`);
    lines.push(`  Lost:            ${formatCurrency(fin.lostValue)}`);
    lines.push(`  Opportunities:   ${fin.opportunityCount}`);
  }

  // 7. Active Projects
  lines.push('');
  lines.push('--- 7. ACTIVE PROJECTS (LAST 30 DAYS) ---');
  if (briefing.activeProjects.length === 0) {
    lines.push('  No project activity recorded.');
  } else {
    const header = '  Project'.padEnd(35) + 'Mtgs'.padStart(6) + 'Decs'.padStart(6) + 'Other'.padStart(7) + 'Total'.padStart(7);
    lines.push(header);
    lines.push('  ' + '-'.repeat(55));
    for (const p of briefing.activeProjects) {
      const name = `${p.name} (${p.code})`.substring(0, 30);
      lines.push(`  ${name.padEnd(33)}${String(p.meetings).padStart(6)}${String(p.decisions).padStart(6)}${String(p.other).padStart(7)}${String(p.total).padStart(7)}`);
    }
  }

  lines.push('');
  lines.push(sep);
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push(sep);
  lines.push('');

  return lines.join('\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  if (!JSON_ONLY) {
    console.log('Generating ACT Daily Briefing...');
    console.log(`  Lookback: ${LOOKBACK_DAYS} days`);
    if (PROJECT_FILTER) console.log(`  Project filter: ${PROJECT_FILTER}`);
    console.log('');
  }

  // Fetch all sections in parallel
  const [
    overdueActions,
    upcomingFollowups,
    recentMeetings,
    recentDecisions,
    relationshipAlerts,
    financialSummary,
    activeProjects,
  ] = await Promise.all([
    fetchOverdueActions(),
    fetchUpcomingFollowups(),
    fetchRecentMeetings(),
    fetchRecentDecisions(),
    fetchRelationshipAlerts(),
    fetchFinancialSummary(),
    fetchActiveProjectsSummary(),
  ]);

  const briefing = {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    projectFilter: PROJECT_FILTER,
    overdueActions,
    upcomingFollowups,
    recentMeetings,
    recentDecisions,
    relationshipAlerts,
    financialSummary,
    activeProjects,
    summary: {
      overdueCount: overdueActions.length,
      upcomingCount: upcomingFollowups.length,
      meetingCount: recentMeetings.length,
      decisionCount: recentDecisions.length,
      relationshipAlertCount: relationshipAlerts.length,
      activeProjectCount: activeProjects.length,
      pipelineTotal: financialSummary.totalPipeline,
    },
  };

  // Output JSON
  if (JSON_ONLY) {
    console.log(JSON.stringify(briefing, null, 2));
  } else {
    // Console output
    console.log(generateConsoleOutput(briefing));
  }

  // Save markdown
  const cacheDir = join(__dirname, '..', '.claude', 'cache', 'agents', 'scout');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  const mdPath = join(cacheDir, `daily-briefing-${todayStr()}.md`);
  writeFileSync(mdPath, generateMarkdown(briefing), 'utf-8');

  // Save JSON
  const jsonPath = join(cacheDir, `daily-briefing-${todayStr()}.json`);
  writeFileSync(jsonPath, JSON.stringify(briefing, null, 2), 'utf-8');

  if (!JSON_ONLY) {
    console.log(`Saved markdown: ${mdPath}`);
    console.log(`Saved JSON:     ${jsonPath}`);
  }
}

main().catch(err => {
  console.error('Daily briefing failed:', err.message);
  process.exit(1);
});
