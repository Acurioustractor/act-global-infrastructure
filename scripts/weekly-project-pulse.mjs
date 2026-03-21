#!/usr/bin/env node
/**
 * Weekly Project Pulse
 *
 * Monday morning pulse: for each active project, collects open actions,
 * pending decisions, last meeting, outstanding invoices, active grants,
 * key contacts with relationship health, and days since last activity.
 *
 * Stores per-project summaries in `project_summaries` table and sends
 * a condensed Telegram message.
 *
 * Usage:
 *   node scripts/weekly-project-pulse.mjs
 *   node scripts/weekly-project-pulse.mjs --dry-run
 *   node scripts/weekly-project-pulse.mjs --verbose
 *
 * Schedule: Monday 5:30am AEST (Sunday 19:30 UTC)
 */

import '../lib/load-env.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOAD ACTIVE PROJECTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadActiveProjects() {
  const configPath = join(__dirname, '..', 'config', 'project-codes.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const active = [];
  for (const [code, proj] of Object.entries(config.projects)) {
    if (proj.status === 'active') {
      active.push({ code, name: proj.name });
    }
  }
  return active;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA COLLECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function collectProjectData(projectCodes) {
  const today = todayStr();
  const now = new Date();

  // Parallel fetch all data
  const [
    { data: allActions },
    { data: allDecisions },
    { data: allMeetings },
    { data: allGrants },
    { data: allInvoices },
    { data: allContacts },
    { data: allHealth },
  ] = await Promise.all([
    supabase
      .from('project_knowledge')
      .select('project_code, title, recorded_at, importance, action_required')
      .eq('action_required', true)
      .in('project_code', projectCodes)
      .order('recorded_at', { ascending: false })
      .limit(500),
    supabase
      .from('project_knowledge')
      .select('project_code, title, recorded_at, decision_status')
      .eq('knowledge_type', 'decision')
      .in('decision_status', ['pending', 'proposed'])
      .in('project_code', projectCodes)
      .limit(200),
    supabase
      .from('project_knowledge')
      .select('project_code, title, recorded_at')
      .eq('knowledge_type', 'meeting')
      .in('project_code', projectCodes)
      .order('recorded_at', { ascending: false })
      .limit(500),
    supabase
      .from('grant_applications')
      .select('project_code, application_name, status, amount_requested, milestones')
      .in('status', ['draft', 'in_progress', 'submitted', 'under_review', 'successful'])
      .in('project_code', projectCodes),
    supabase
      .from('xero_invoices')
      .select('contact_name, amount_due, due_date, status, tracking_category')
      .in('status', ['AUTHORISED', 'SENT'])
      .gt('amount_due', 0),
    supabase
      .from('ghl_contacts')
      .select('full_name, temperature, temperature_trend, engagement_status, projects')
      .not('full_name', 'is', null)
      .not('projects', 'is', null)
      .limit(500),
    supabase
      .from('project_health')
      .select('project_code, health_score, computed_at')
      .in('project_code', projectCodes)
      .order('computed_at', { ascending: false })
      .limit(200),
  ]);

  return { allActions, allDecisions, allMeetings, allGrants, allInvoices, allContacts, allHealth, now, today };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PER-PROJECT PULSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildProjectPulse(code, name, data) {
  const { allActions, allDecisions, allMeetings, allGrants, allInvoices, allContacts, allHealth, now, today } = data;

  // Actions
  const actions = (allActions || []).filter(a => a.project_code === code);
  const overdueActions = actions.filter(a => a.recorded_at && new Date(a.recorded_at) < new Date(daysAgo(7)));

  // Decisions
  const decisions = (allDecisions || []).filter(d => d.project_code === code);

  // Last meeting
  const meetings = (allMeetings || []).filter(m => m.project_code === code);
  const lastMeeting = meetings[0];
  const daysSinceMeeting = lastMeeting
    ? Math.floor((now.getTime() - new Date(lastMeeting.recorded_at).getTime()) / 86400000)
    : null;

  // Grants
  const grants = (allGrants || []).filter(g => g.project_code === code);
  const grantPipelineValue = grants.reduce((s, g) => s + (g.amount_requested || 0), 0);
  let nextGrantDeadline = null;
  for (const g of grants) {
    for (const m of g.milestones || []) {
      if (m.due && m.due >= today && !m.completed) {
        if (!nextGrantDeadline || m.due < nextGrantDeadline) nextGrantDeadline = m.due;
      }
    }
  }

  // Invoices
  const invoices = (allInvoices || []).filter(inv => inv.tracking_category?.includes(code));
  const totalOutstanding = invoices.reduce((s, inv) => s + (Number(inv.amount_due) || 0), 0);

  // Contacts
  const contacts = (allContacts || []).filter(c => {
    const projs = Array.isArray(c.projects) ? c.projects : [];
    return projs.some(p => p.includes(code));
  });
  const coolingContacts = contacts.filter(c => c.temperature_trend === 'cooling');

  // Health
  const healthEntries = (allHealth || []).filter(h => h.project_code === code);
  const latestHealth = healthEntries[0];

  // Last activity
  const allDates = [
    ...actions.map(a => a.recorded_at),
    ...decisions.map(d => d.recorded_at),
    ...meetings.map(m => m.recorded_at),
  ].filter(Boolean).map(d => new Date(d).getTime());
  const lastActivityMs = allDates.length > 0 ? Math.max(...allDates) : 0;
  const daysSinceActivity = lastActivityMs > 0 ? Math.floor((now.getTime() - lastActivityMs) / 86400000) : null;

  const statusLabel = daysSinceActivity !== null && daysSinceActivity <= 7 ? 'ACTIVE'
    : daysSinceActivity !== null && daysSinceActivity <= 30 ? 'QUIET' : 'STALE';

  return {
    code,
    name,
    status: statusLabel,
    daysSinceActivity,
    healthScore: latestHealth?.health_score || null,
    overdueActions: overdueActions.length,
    openActions: actions.length,
    pendingDecisions: decisions.length,
    lastMeetingDate: lastMeeting ? new Date(lastMeeting.recorded_at).toISOString().split('T')[0] : null,
    daysSinceMeeting,
    activeGrants: grants.length,
    grantPipelineValue,
    nextGrantDeadline,
    outstandingInvoices: invoices.length,
    totalOutstanding,
    coolingContacts: coolingContacts.length,
    totalContacts: contacts.length,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMAT PULSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatPulse(pulses) {
  // Sort: ACTIVE first, then QUIET, then STALE. Within each, by overdue actions desc.
  const order = { ACTIVE: 0, QUIET: 1, STALE: 2 };
  pulses.sort((a, b) => (order[a.status] || 3) - (order[b.status] || 3) || b.overdueActions - a.overdueActions);

  const lines = [];
  for (const p of pulses) {
    // Skip projects with zero activity signals
    if (p.daysSinceActivity === null && p.openActions === 0 && p.activeGrants === 0) continue;

    let line = `${p.code} — ${p.name}`;
    line += ` [${p.status}]`;
    if (p.daysSinceActivity !== null) line += ` ${p.daysSinceActivity}d ago`;

    const parts = [];
    if (p.overdueActions > 0) parts.push(`${p.overdueActions} overdue`);
    if (p.openActions > 0) parts.push(`${p.openActions} actions`);
    if (p.pendingDecisions > 0) parts.push(`${p.pendingDecisions} decisions`);
    if (p.activeGrants > 0) parts.push(`${p.activeGrants} grants ($${p.grantPipelineValue.toLocaleString()})`);
    if (p.outstandingInvoices > 0) parts.push(`${p.outstandingInvoices} invoices ($${p.totalOutstanding.toLocaleString()})`);
    if (p.coolingContacts > 0) parts.push(`${p.coolingContacts} cooling`);

    if (parts.length > 0) line += ` | ${parts.join(', ')}`;
    lines.push(line);
  }
  return lines.join('\n');
}

function formatTelegramPulse(pulses) {
  const activePulses = pulses.filter(p =>
    p.daysSinceActivity !== null || p.openActions > 0 || p.activeGrants > 0
  );

  const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  let msg = `📋 *Weekly Project Pulse — ${dateStr}*\n\n`;

  // Attention-needed projects first
  const needsAttention = activePulses.filter(p => p.overdueActions > 0 || p.coolingContacts > 0 || p.status === 'STALE');
  if (needsAttention.length > 0) {
    msg += `⚠️ *Needs Attention*\n`;
    for (const p of needsAttention) {
      const parts = [];
      if (p.overdueActions > 0) parts.push(`${p.overdueActions} overdue`);
      if (p.coolingContacts > 0) parts.push(`${p.coolingContacts} cooling contacts`);
      if (p.status === 'STALE') parts.push('stale');
      msg += `• ${p.code} ${p.name}: ${parts.join(', ')}\n`;
    }
    msg += '\n';
  }

  // Summary stats
  const totalActions = activePulses.reduce((s, p) => s + p.openActions, 0);
  const totalOverdue = activePulses.reduce((s, p) => s + p.overdueActions, 0);
  const totalGrants = activePulses.reduce((s, p) => s + p.activeGrants, 0);
  const totalPipeline = activePulses.reduce((s, p) => s + p.grantPipelineValue, 0);
  const totalInvoices = activePulses.reduce((s, p) => s + p.totalOutstanding, 0);

  msg += `📊 *Summary*\n`;
  msg += `${activePulses.length} active projects\n`;
  msg += `${totalActions} open actions (${totalOverdue} overdue)\n`;
  if (totalGrants > 0) msg += `${totalGrants} active grants ($${totalPipeline.toLocaleString()} pipeline)\n`;
  if (totalInvoices > 0) msg += `$${totalInvoices.toLocaleString()} outstanding invoices\n`;

  return msg;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TELEGRAM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendToTelegram(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.log('  Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    if (res.ok) {
      console.log('  Sent to Telegram');
    } else {
      const err = await res.text();
      console.error('  Telegram send failed:', err);
    }
  } catch (err) {
    console.error('  Telegram send error:', err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('=== Weekly Project Pulse ===');
  console.log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
  if (dryRun) console.log('DRY RUN — no database writes');
  console.log('');

  // Load active projects
  const projects = loadActiveProjects();
  console.log(`Found ${projects.length} active projects`);

  const projectCodes = projects.map(p => p.code);

  // Collect data
  console.log('Collecting project data...');
  const data = await collectProjectData(projectCodes);

  // Build pulse for each project
  const pulses = [];
  for (const proj of projects) {
    const pulse = buildProjectPulse(proj.code, proj.name, data);
    pulses.push(pulse);
  }

  // Format
  const pulseText = formatPulse(pulses);
  console.log(`\n${pulseText}\n`);

  if (verbose) {
    console.log('--- RAW PULSE DATA ---');
    for (const p of pulses) {
      if (p.openActions > 0 || p.activeGrants > 0 || p.daysSinceActivity !== null) {
        console.log(JSON.stringify(p, null, 2));
      }
    }
    console.log('--- END ---\n');
  }

  // Store per-project summaries
  if (!dryRun) {
    const today = todayStr();

    for (const pulse of pulses) {
      // Skip projects with zero signals
      if (pulse.daysSinceActivity === null && pulse.openActions === 0 && pulse.activeGrants === 0) continue;

      const summaryText = [
        `${pulse.status}`,
        pulse.daysSinceActivity !== null ? `last activity ${pulse.daysSinceActivity}d ago` : null,
        pulse.openActions > 0 ? `${pulse.openActions} actions (${pulse.overdueActions} overdue)` : null,
        pulse.pendingDecisions > 0 ? `${pulse.pendingDecisions} pending decisions` : null,
        pulse.lastMeetingDate ? `last meeting ${pulse.lastMeetingDate}` : null,
        pulse.activeGrants > 0 ? `${pulse.activeGrants} grants ($${pulse.grantPipelineValue.toLocaleString()})` : null,
        pulse.outstandingInvoices > 0 ? `${pulse.outstandingInvoices} invoices ($${pulse.totalOutstanding.toLocaleString()})` : null,
        pulse.coolingContacts > 0 ? `${pulse.coolingContacts} cooling contacts` : null,
      ].filter(Boolean).join('. ');

      const { error } = await supabase
        .from('project_summaries')
        .upsert({
          project_code: pulse.code,
          summary_text: summaryText,
          data_sources_used: ['project_knowledge', 'grant_applications', 'xero_invoices', 'ghl_contacts', 'project_health'],
          stats: pulse,
          summary_date: today,
          generated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_code,summary_date',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`  Failed to store pulse for ${pulse.code}:`, error.message);
      }
    }

    console.log('Pulse data stored in project_summaries');

    // Send Telegram summary
    console.log('Sending to Telegram...');
    const telegramMsg = formatTelegramPulse(pulses);
    await sendToTelegram(telegramMsg);
  }

  console.log('=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
