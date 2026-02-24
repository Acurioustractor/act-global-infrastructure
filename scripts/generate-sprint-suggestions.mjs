#!/usr/bin/env node

/**
 * Sprint Suggestion Generator
 *
 * Queries 5 ecosystem signal sources and upserts suggestions into sprint_suggestions.
 * Deduped by source_type + source_ref. Dismissed/promoted suggestions are not re-created.
 *
 * Signal sources:
 *   1. Grant deadlines (7-day window)
 *   2. Overdue actions from meetings
 *   3. Stale email follow-ups (>48h awaiting response)
 *   4. Calendar deadlines (3-day window)
 *   5. High-priority insights
 *
 * Usage:
 *   node scripts/generate-sprint-suggestions.mjs --verbose
 *   node scripts/generate-sprint-suggestions.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { loadProjects } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VERBOSE = process.argv.includes('--verbose');
const DRY_RUN = process.argv.includes('--dry-run');

function log(...args) {
  if (VERBOSE || DRY_RUN) console.log(...args);
}

/**
 * Map project_code to a stream name using the projects table category.
 */
let _streamMap = null;
async function getStreamForProject(projectCode) {
  if (!_streamMap) {
    const projects = await loadProjects({ supabase });
    _streamMap = {};
    for (const [code, proj] of Object.entries(projects)) {
      // Map category → stream
      const cat = (proj.category || '').toLowerCase();
      if (cat.includes('harvest') || cat.includes('agriculture')) _streamMap[code] = 'Harvest';
      else if (cat.includes('justice') || cat.includes('justicehub')) _streamMap[code] = 'JusticeHub';
      else if (cat.includes('picc')) _streamMap[code] = 'PICC';
      else if (cat.includes('empathy') || cat.includes('ledger')) _streamMap[code] = 'Empathy Ledger';
      else if (cat.includes('goods')) _streamMap[code] = 'Goods';
      else if (cat.includes('infra') || cat.includes('tech')) _streamMap[code] = 'Infrastructure';
      else _streamMap[code] = 'Business';
    }
  }
  return _streamMap[projectCode] || 'Business';
}

function daysBetween(dateA, dateB) {
  const msPerDay = 86400000;
  return Math.round((new Date(dateA) - new Date(dateB)) / msPerDay);
}

// ── Signal 1: Grant Deadlines ──────────────────────────────────────────

async function getGrantDeadlines() {
  const { data, error } = await supabase
    .from('grant_opportunities')
    .select('id, name, closes_at, fit_score, aligned_projects, application_status')
    .gte('closes_at', new Date().toISOString())
    .lte('closes_at', new Date(Date.now() + 7 * 86400000).toISOString())
    .or('application_status.is.null,application_status.neq.closed');

  if (error) {
    console.error('[Grant Deadlines] Error:', error.message);
    return [];
  }

  log(`[Grant Deadlines] Found ${(data || []).length} upcoming grants`);

  return (data || []).map(g => {
    const daysLeft = daysBetween(g.closes_at, new Date());
    const priority = daysLeft <= 3 ? 'now' : 'next';
    const projectCode = Array.isArray(g.aligned_projects) ? g.aligned_projects[0] : null;

    return {
      title: `Grant deadline: ${g.name} — ${daysLeft}d left`,
      stream: 'Business',
      priority,
      notes: g.fit_score ? `Fit score: ${g.fit_score}` : null,
      source_type: 'grant_deadline',
      source_ref: String(g.id),
      due_date: g.closes_at?.split('T')[0] || null,
      project_code: projectCode,
      expires_at: g.closes_at,
    };
  });
}

// ── Signal 2: Overdue Actions ──────────────────────────────────────────

async function getOverdueActions() {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('id, title, content, project_code, follow_up_date, importance, metadata')
    .eq('knowledge_type', 'action')
    .eq('action_required', true)
    .lt('follow_up_date', new Date().toISOString())
    .or('status.is.null,status.eq.open');

  if (error) {
    console.error('[Overdue Actions] Error:', error.message);
    return [];
  }

  log(`[Overdue Actions] Found ${(data || []).length} overdue actions`);

  const suggestions = [];
  for (const a of data || []) {
    const stream = a.project_code ? await getStreamForProject(a.project_code) : 'Business';
    const priority = ['critical', 'high'].includes(a.importance) ? 'now' : 'next';
    const owner = a.metadata?.owner || null;
    const daysOverdue = daysBetween(new Date(), a.follow_up_date);

    suggestions.push({
      title: a.title || `Overdue action (${daysOverdue}d)`,
      stream,
      priority,
      notes: a.content ? a.content.slice(0, 200) : null,
      source_type: 'overdue_action',
      source_ref: String(a.id),
      due_date: a.follow_up_date?.split('T')[0] || null,
      project_code: a.project_code,
      owner,
      expires_at: new Date(new Date(a.follow_up_date).getTime() + 14 * 86400000).toISOString(),
    });
  }
  return suggestions;
}

// ── Signal 3: Stale Email Follow-ups ───────────────────────────────────

async function getStaleEmails() {
  const cutoff48h = new Date(Date.now() - 48 * 3600000).toISOString();
  const soon3d = new Date(Date.now() + 3 * 86400000).toISOString();

  const { data, error } = await supabase
    .from('communications_history')
    .select('id, subject, contact_name, project_code, follow_up_date, occurred_at')
    .eq('waiting_for_response', true)
    .eq('response_needed_by', 'us')
    .lt('occurred_at', cutoff48h)
    .or(`follow_up_date.is.null,follow_up_date.lte.${soon3d}`);

  if (error) {
    console.error('[Stale Emails] Error:', error.message);
    return [];
  }

  log(`[Stale Emails] Found ${(data || []).length} stale email follow-ups`);

  const suggestions = [];
  for (const e of data || []) {
    const daysStale = daysBetween(new Date(), e.occurred_at);
    const stream = e.project_code ? await getStreamForProject(e.project_code) : 'Business';
    const priority = daysStale > 7 ? 'now' : 'next';

    suggestions.push({
      title: `Reply to ${e.contact_name || 'unknown'} re: ${e.subject || '(no subject)'}`,
      stream,
      priority,
      notes: `${daysStale}d since last message`,
      source_type: 'email_followup',
      source_ref: String(e.id),
      due_date: e.follow_up_date?.split('T')[0] || null,
      project_code: e.project_code,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  }
  return suggestions;
}

// ── Signal 4: Calendar Deadlines ───────────────────────────────────────

async function getCalendarDeadlines() {
  const now = new Date().toISOString();
  const in3d = new Date(Date.now() + 3 * 86400000).toISOString();

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, detected_project_code, event_type')
    .in('event_type', ['deadline', 'milestone'])
    .gte('start_time', now)
    .lte('start_time', in3d);

  if (error) {
    console.error('[Calendar Deadlines] Error:', error.message);
    return [];
  }

  log(`[Calendar Deadlines] Found ${(data || []).length} upcoming deadlines`);

  const suggestions = [];
  for (const c of data || []) {
    const daysLeft = daysBetween(c.start_time, new Date());
    const stream = c.detected_project_code ? await getStreamForProject(c.detected_project_code) : 'Business';
    const priority = daysLeft <= 1 ? 'now' : 'next';

    suggestions.push({
      title: c.title,
      stream,
      priority,
      source_type: 'calendar_deadline',
      source_ref: String(c.id),
      due_date: c.start_time?.split('T')[0] || null,
      project_code: c.detected_project_code,
      expires_at: c.start_time,
    });
  }
  return suggestions;
}

// ── Signal 5: High-Priority Insights ───────────────────────────────────

async function getHighPriorityInsights() {
  const { data, error } = await supabase
    .from('intelligence_insights')
    .select('id, title, insight_type, data, priority, expires_at')
    .eq('priority', 'high')
    .gt('expires_at', new Date().toISOString())
    .is('acted_at', null);

  if (error) {
    console.error('[Insights] Error:', error.message);
    return [];
  }

  log(`[Insights] Found ${(data || []).length} high-priority insights`);

  return (data || []).map(i => {
    const projectCode = i.data?.project_code || null;
    return {
      title: i.title,
      stream: 'Business',
      priority: 'next',
      notes: i.insight_type,
      source_type: 'insight',
      source_ref: String(i.id),
      project_code: projectCode,
      expires_at: i.expires_at,
    };
  });
}

// ── Main: Collect + Dedup + Upsert ─────────────────────────────────────

async function main() {
  console.log('💡 Sprint Suggestion Generator\n');

  // Collect all suggestions from 5 signal sources
  const [grants, actions, emails, calendar, insights] = await Promise.all([
    getGrantDeadlines(),
    getOverdueActions(),
    getStaleEmails(),
    getCalendarDeadlines(),
    getHighPriorityInsights(),
  ]);

  const allSuggestions = [...grants, ...actions, ...emails, ...calendar, ...insights];
  console.log(`Total suggestions from signals: ${allSuggestions.length}`);

  if (allSuggestions.length === 0) {
    console.log('No suggestions to upsert. Done.');
    return;
  }

  // Get existing active suggestions for dedup
  const { data: existing } = await supabase
    .from('sprint_suggestions')
    .select('source_type, source_ref')
    .eq('dismissed', false)
    .is('promoted_to', null);

  const existingKeys = new Set(
    (existing || []).map(e => `${e.source_type}::${e.source_ref}`)
  );

  // Also check dismissed/promoted to avoid re-creating
  const { data: dismissed } = await supabase
    .from('sprint_suggestions')
    .select('source_type, source_ref')
    .or('dismissed.eq.true,promoted_to.not.is.null');

  const dismissedKeys = new Set(
    (dismissed || []).map(e => `${e.source_type}::${e.source_ref}`)
  );

  // Filter to only new suggestions
  const newSuggestions = allSuggestions.filter(s => {
    const key = `${s.source_type}::${s.source_ref}`;
    return !existingKeys.has(key) && !dismissedKeys.has(key);
  });

  console.log(`New suggestions after dedup: ${newSuggestions.length}`);

  if (newSuggestions.length === 0) {
    console.log('All suggestions already exist. Done.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would insert:');
    for (const s of newSuggestions) {
      console.log(`  [${s.source_type}] ${s.title} (${s.priority})`);
    }
    return;
  }

  // Insert new suggestions
  const { error } = await supabase
    .from('sprint_suggestions')
    .insert(newSuggestions);

  if (error) {
    console.error('Insert error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${newSuggestions.length} new suggestions`);

  // Clean up expired suggestions
  const { data: expired } = await supabase
    .from('sprint_suggestions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('dismissed', false)
    .is('promoted_to', null)
    .select('id');

  if (expired?.length) {
    console.log(`🧹 Cleaned up ${expired.length} expired suggestions`);
  }

  // Summary by source type
  const summary = {};
  for (const s of newSuggestions) {
    summary[s.source_type] = (summary[s.source_type] || 0) + 1;
  }
  console.log('\nBy source:', JSON.stringify(summary));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
