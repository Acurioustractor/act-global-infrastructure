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
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { loadProjects } from './lib/project-loader.mjs';
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
let PROJECT_CODES = {};
try {
  PROJECT_CODES = await loadProjects();
} catch (e) {
  console.warn('Could not load project codes:', e.message);
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
 * 5. Relationship Alerts - signal-based relationship health
 *    Uses relationship_health table with multi-signal temperature scores.
 *    Groups by risk type: going_cold, awaiting_response, high_value_inactive, one_way_outbound.
 *    Falls back to simple date threshold if no signal data available.
 */
async function fetchRelationshipAlerts() {
  // Primary: signal-based alerts from relationship_health
  const { data: healthData, error: healthError } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, temperature_trend, last_temperature_change, risk_flags, email_score, calendar_score, financial_score, pipeline_score, knowledge_score, last_contact_at')
    .or('temperature_trend.eq.falling,risk_flags.not.is.null')
    .order('temperature', { ascending: true })
    .limit(30);

  if (healthError) {
    console.warn('  Warning: Could not fetch relationship health:', healthError.message);
  }

  const ghlIds = (healthData || []).map(h => h.ghl_contact_id);

  // Get contact details for matched health records
  let contacts = [];
  if (ghlIds.length > 0) {
    const { data } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, first_name, last_name, email, company_name, engagement_status, last_contact_date, projects')
      .in('ghl_id', ghlIds);
    contacts = data || [];
  }

  const contactMap = {};
  for (const c of contacts) {
    contactMap[c.ghl_id] = c;
  }

  const alerts = (healthData || []).map(h => {
    const c = contactMap[h.ghl_contact_id] || {};
    const name = c.full_name?.trim() || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unknown';
    const daysSinceContact = h.last_contact_at
      ? Math.floor((Date.now() - new Date(h.last_contact_at).getTime()) / 86400000)
      : null;

    return {
      name,
      email: c.email,
      company: c.company_name,
      engagementStatus: c.engagement_status,
      daysSinceContact,
      projects: c.projects || [],
      temperature: h.temperature,
      trend: h.temperature_trend,
      temperatureChange: h.last_temperature_change,
      riskFlags: h.risk_flags || [],
      signals: {
        email: h.email_score,
        calendar: h.calendar_score,
        financial: h.financial_score,
        pipeline: h.pipeline_score,
        knowledge: h.knowledge_score,
      },
    };
  });

  // Fallback if no signal data
  if (alerts.length === 0) {
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
        name, email: row.email, company: row.company_name,
        engagementStatus: row.engagement_status, daysSinceContact,
        projects: row.projects || [], temperature: null, trend: null,
        temperatureChange: null, riskFlags: [], signals: null,
      };
    });
  }

  return alerts;
}

/**
 * 5b. Deal Risks - open opportunities with relationship risk signals
 */
async function fetchDealRisks() {
  const { data: opportunities, error } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, stage_name, pipeline_name, ghl_contact_id, status, updated_at')
    .eq('status', 'open')
    .order('monetary_value', { ascending: false });

  if (error) {
    console.warn('  Warning: Could not fetch opportunities:', error.message);
    return [];
  }

  if (!opportunities || opportunities.length === 0) return [];

  const contactIds = [...new Set(opportunities.map(o => o.ghl_contact_id).filter(Boolean))];
  if (contactIds.length === 0) return [];

  const [healthResult, contactResult] = await Promise.all([
    supabase.from('relationship_health')
      .select('ghl_contact_id, temperature, temperature_trend, risk_flags, last_contact_at')
      .in('ghl_contact_id', contactIds),
    supabase.from('ghl_contacts')
      .select('ghl_id, full_name')
      .in('ghl_id', contactIds),
  ]);

  const healthMap = {};
  for (const h of (healthResult.data || [])) healthMap[h.ghl_contact_id] = h;
  const contactMap = {};
  for (const c of (contactResult.data || [])) contactMap[c.ghl_id] = c;

  const now = Date.now();
  return opportunities
    .map(opp => {
      const health = healthMap[opp.ghl_contact_id];
      const contact = contactMap[opp.ghl_contact_id];
      const daysSinceUpdate = Math.floor((now - new Date(opp.updated_at).getTime()) / 86400000);

      const risks = [];
      if (health?.temperature_trend === 'falling') risks.push('temperature falling');
      if (health?.risk_flags?.includes('going_cold')) risks.push('going cold');
      if (health?.risk_flags?.includes('high_value_inactive')) risks.push('high value inactive');
      if (health?.risk_flags?.includes('awaiting_response')) risks.push('awaiting response');
      if (daysSinceUpdate > 14) risks.push(`stale ${daysSinceUpdate}d`);

      if (risks.length === 0) return null;
      return {
        deal: opp.name,
        value: opp.monetary_value,
        stage: opp.stage_name,
        contact: contact?.full_name || 'Unknown',
        temperature: health?.temperature,
        risks,
      };
    })
    .filter(Boolean);
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
 * 7. Sprint Suggestions - auto-generated from ecosystem signals
 */
async function fetchSprintSuggestions() {
  const { data, error } = await supabase
    .from('sprint_suggestions')
    .select('id, title, stream, priority, notes, source_type, due_date, project_code')
    .eq('dismissed', false)
    .is('promoted_to', null)
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true })
    .limit(10);

  if (error) {
    console.warn('  Warning: Could not fetch sprint suggestions:', error.message);
    return [];
  }

  const SOURCE_ICONS = {
    grant_deadline: '🎯',
    overdue_action: '✅',
    email_followup: '📧',
    calendar_deadline: '📅',
    insight: '💡',
  };

  return (data || []).map(s => ({
    title: s.title,
    stream: s.stream,
    priority: s.priority,
    notes: s.notes,
    sourceType: s.source_type,
    icon: SOURCE_ICONS[s.source_type] || '💡',
    dueDate: s.due_date,
    project: s.project_code,
    projectName: projectName(s.project_code),
  }));
}

/**
 * 8. Active Projects Summary - activity counts per project in last 30 days
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

  // 5. Relationship Alerts (signal-based)
  lines.push('## 5. Relationship Alerts');
  if (briefing.relationshipAlerts.length === 0) {
    lines.push('No relationship alerts. All contacts are healthy.');
  } else {
    lines.push(`**${briefing.relationshipAlerts.length} contact(s) need attention:**`);
    lines.push('');

    // Group by risk type
    const byRisk = { going_cold: [], awaiting_response: [], high_value_inactive: [], one_way_outbound: [], other: [] };
    for (const r of briefing.relationshipAlerts) {
      const flags = r.riskFlags || [];
      let placed = false;
      for (const flag of ['going_cold', 'awaiting_response', 'high_value_inactive', 'one_way_outbound']) {
        if (flags.includes(flag)) { byRisk[flag].push(r); placed = true; break; }
      }
      if (!placed) byRisk.other.push(r);
    }

    const riskLabels = {
      going_cold: 'Going Cold',
      awaiting_response: 'Awaiting Your Response',
      high_value_inactive: 'High Value — Inactive',
      one_way_outbound: 'One-Way Outbound',
      other: 'Falling Temperature',
    };

    for (const [key, contacts] of Object.entries(byRisk)) {
      if (contacts.length === 0) continue;
      lines.push(`### ${riskLabels[key]}`);
      for (const r of contacts) {
        const tempStr = r.temperature != null ? `${r.temperature}/100` : '?';
        const trendStr = r.trend ? ` ${r.trend === 'falling' ? '↓' : r.trend === 'rising' ? '↑' : '→'}` : '';
        const company = r.company ? ` (${r.company})` : '';
        const daysStr = r.daysSinceContact != null ? ` — ${r.daysSinceContact}d ago` : '';
        lines.push(`- **${r.name}**${company} — temp: ${tempStr}${trendStr}${daysStr}`);
      }
      lines.push('');
    }
  }

  // 5b. Deal Risks
  if (briefing.dealRisks && briefing.dealRisks.length > 0) {
    lines.push('### Deal Risks');
    const totalAtRisk = briefing.dealRisks.reduce((sum, d) => sum + (d.value || 0), 0);
    lines.push(`**${briefing.dealRisks.length} deal(s) at risk** ($${totalAtRisk.toLocaleString()} total value):`);
    lines.push('');
    for (const d of briefing.dealRisks) {
      const tempStr = d.temperature != null ? ` temp: ${d.temperature}/100` : '';
      lines.push(`- **${d.deal}** ($${(d.value || 0).toLocaleString()}) — ${d.contact} — ${d.risks.join(', ')}${tempStr}`);
    }
    lines.push('');
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

  // 7. Sprint Suggestions
  lines.push('## 7. Sprint Suggestions');
  if (briefing.sprintSuggestions.length === 0) {
    lines.push('No sprint suggestions. All signals clear.');
  } else {
    lines.push(`**${briefing.sprintSuggestions.length} suggestion(s) from ecosystem signals:**`);
    lines.push('');
    const byPriority = { now: [], next: [] };
    for (const s of briefing.sprintSuggestions) {
      (byPriority[s.priority] || byPriority.next).push(s);
    }
    if (byPriority.now.length > 0) {
      lines.push('### Urgent (Now)');
      for (const s of byPriority.now) {
        const due = s.dueDate ? ` — due ${formatDate(s.dueDate)}` : '';
        lines.push(`- ${s.icon} **${s.title}**${due}`);
      }
      lines.push('');
    }
    if (byPriority.next.length > 0) {
      lines.push('### Next');
      for (const s of byPriority.next) {
        const due = s.dueDate ? ` — due ${formatDate(s.dueDate)}` : '';
        lines.push(`- ${s.icon} **${s.title}**${due}`);
      }
      lines.push('');
    }
  }
  lines.push('');

  // 8. Active Projects
  lines.push('## 8. Active Projects Summary (Last 30 Days)');
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
    lines.push('  No relationship alerts.');
  } else {
    for (const r of briefing.relationshipAlerts) {
      const daysStr = r.daysSinceContact != null ? `${r.daysSinceContact}d ago` : 'never';
      const tempStr = r.temperature != null ? ` [${r.temperature}/100 ${r.trend || ''}]` : '';
      const flags = (r.riskFlags || []).length > 0 ? ` ⚠ ${r.riskFlags.join(', ')}` : '';
      lines.push(`  ${r.name} - last: ${daysStr}${tempStr}${flags}`);
    }
  }

  // 5b. Deal Risks
  if (briefing.dealRisks && briefing.dealRisks.length > 0) {
    lines.push('');
    lines.push('--- 5b. DEAL RISKS ---');
    for (const d of briefing.dealRisks) {
      lines.push(`  ${d.deal} ($${(d.value || 0).toLocaleString()}) - ${d.contact} - ${d.risks.join(', ')}`);
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

  // 7. Sprint Suggestions
  lines.push('');
  lines.push('--- 7. SPRINT SUGGESTIONS ---');
  if (briefing.sprintSuggestions.length === 0) {
    lines.push('  No sprint suggestions.');
  } else {
    const nowItems = briefing.sprintSuggestions.filter(s => s.priority === 'now');
    const nextItems = briefing.sprintSuggestions.filter(s => s.priority !== 'now');
    if (nowItems.length > 0) {
      lines.push('  [URGENT]');
      for (const s of nowItems) {
        const due = s.dueDate ? ` (due ${formatDate(s.dueDate)})` : '';
        lines.push(`  ${s.icon} ${s.title}${due}`);
      }
    }
    if (nextItems.length > 0) {
      if (nowItems.length > 0) lines.push('');
      lines.push('  [NEXT]');
      for (const s of nextItems) {
        const due = s.dueDate ? ` (due ${formatDate(s.dueDate)})` : '';
        lines.push(`  ${s.icon} ${s.title}${due}`);
      }
    }
  }

  // 8. Active Projects
  lines.push('');
  lines.push('--- 8. ACTIVE PROJECTS (LAST 30 DAYS) ---');
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
    dealRisks,
    financialSummary,
    sprintSuggestions,
    activeProjects,
  ] = await Promise.all([
    fetchOverdueActions(),
    fetchUpcomingFollowups(),
    fetchRecentMeetings(),
    fetchRecentDecisions(),
    fetchRelationshipAlerts(),
    fetchDealRisks(),
    fetchFinancialSummary(),
    fetchSprintSuggestions(),
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
    dealRisks,
    financialSummary,
    sprintSuggestions,
    activeProjects,
    summary: {
      overdueCount: overdueActions.length,
      upcomingCount: upcomingFollowups.length,
      meetingCount: recentMeetings.length,
      decisionCount: recentDecisions.length,
      relationshipAlertCount: relationshipAlerts.length,
      dealRiskCount: dealRisks.length,
      sprintSuggestionCount: sprintSuggestions.length,
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
