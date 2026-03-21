#!/usr/bin/env node

/**
 * Daily Priorities Engine
 *
 * Scores signals from 7 data sources using a 0-100 point system and upserts
 * ranked priorities into sprint_suggestions. Runs daily at 6:30am AEST,
 * before the 7am daily briefing.
 *
 * Scoring:
 *   - Overdue invoices: up to 30 pts (per day overdue, capped)
 *   - Grant deadline < 7 days: 25 pts
 *   - Grant deadline < 30 days: 15 pts
 *   - Relationship cooling + open deal: 20 pts
 *   - Unanswered comms > 3 days: 15 pts
 *   - High-value stale deal (> 14 days): 20 pts
 *   - Overdue action (critical): 25 pts, (high): 15 pts
 *   - Pipeline opp in "pursuing" with no activity: 10 pts
 *   - Value multiplier: ×1-3 based on value_mid
 *
 * Usage:
 *   node scripts/generate-daily-priorities.mjs
 *   node scripts/generate-daily-priorities.mjs --verbose
 *   node scripts/generate-daily-priorities.mjs --dry-run
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VERBOSE = process.argv.includes('--verbose');
const DRY_RUN = process.argv.includes('--dry-run');

function log(...args) {
  if (VERBOSE || DRY_RUN) console.log(...args);
}

function daysBetween(a, b) {
  return Math.floor((new Date(a) - new Date(b)) / 86400000);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

function valueMultiplier(valueMid) {
  if (!valueMid || valueMid <= 0) return 1;
  if (valueMid >= 100000) return 3;
  if (valueMid >= 50000) return 2;
  if (valueMid >= 10000) return 1.5;
  return 1;
}

// ── Signal 1: Overdue Invoices ─────────────────────────────────────────

async function scoreOverdueInvoices() {
  // Column is `type` (NOT `invoice_type`), values: ACCREC (receivable) or ACCPAY (payable)
  // Filter to ACCREC only — we want to chase money owed TO us, not bills we owe.
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('xero_id, contact_name, total, due_date, invoice_number, status, type')
    .eq('status', 'AUTHORISED')
    .eq('type', 'ACCREC')
    .lt('due_date', todayStr());

  if (error) {
    console.error('[Overdue Invoices] Error:', error.message);
    return [];
  }

  log(`[Overdue Invoices] Found ${(data || []).length} overdue`);

  return (data || []).map(inv => {
    const daysOverdue = daysBetween(new Date(), inv.due_date);
    // Invoices score higher than grants — collecting money owed beats applying for new money.
    // Base: 20 + 2 per day overdue, capped at 50. Plus value multiplier.
    const baseScore = Math.min(50, 20 + daysOverdue * 2);
    const multiplier = valueMultiplier(inv.total);
    const score = Math.round(baseScore * multiplier);

    return {
      title: `Chase ${inv.contact_name} — $${Number(inv.total).toLocaleString()} (${daysOverdue}d overdue)`,
      stream: 'Business',
      priority: score >= 50 ? 'now' : 'next',
      notes: JSON.stringify({
        score,
        invoice_number: inv.invoice_number,
        amount: inv.total,
        days_overdue: daysOverdue,
        action: `Send payment reminder for invoice ${inv.invoice_number}`,
      }),
      source_type: 'invoice_chase',
      source_ref: inv.xero_id,
      due_date: inv.due_date,
      project_code: null,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      _score: score,
    };
  });
}

// ── Signal 2: Grant Deadlines ──────────────────────────────────────────

async function scoreGrantDeadlines() {
  // Only score grants that have been matched to ACT (exist in opportunities_unified from GrantScope)
  // or have a fit_score >= 60 and aligned_projects set
  const { data, error } = await supabase
    .from('grant_opportunities')
    .select('id, name, provider, closes_at, fit_score, aligned_projects, amount_max')
    .gte('closes_at', todayStr())
    .lte('closes_at', futureDate(30))
    .or('application_status.is.null,application_status.neq.closed')
    .not('aligned_projects', 'is', null);

  if (error) {
    console.error('[Grant Deadlines] Error:', error.message);
    return [];
  }

  // Additional filter: only include grants with fit_score >= 60 OR aligned to ACT projects
  const filtered = (data || []).filter(g => {
    if (g.fit_score && g.fit_score >= 60) return true;
    if (Array.isArray(g.aligned_projects) && g.aligned_projects.length > 0) return true;
    return false;
  });

  log(`[Grant Deadlines] Found ${filtered.length} upcoming (filtered from ${(data || []).length})`);

  return filtered.map(g => {
    const daysLeft = daysBetween(g.closes_at, new Date());
    const baseScore = daysLeft <= 7 ? 25 : 15;
    const multiplier = valueMultiplier(g.amount_max);
    const score = Math.round(baseScore * multiplier);
    const projectCode = Array.isArray(g.aligned_projects) ? g.aligned_projects[0] : null;

    return {
      title: `Grant deadline: ${g.name} — ${daysLeft}d left${g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''}`,
      stream: 'Business',
      priority: score >= 50 ? 'now' : 'next',
      notes: JSON.stringify({
        score,
        provider: g.provider,
        amount: g.amount_max,
        fit_score: g.fit_score,
        days_left: daysLeft,
        action: daysLeft <= 3 ? 'Submit grant application TODAY' : `Review and prepare application (${daysLeft} days)`,
      }),
      source_type: 'grant_deadline',
      source_ref: String(g.id),
      due_date: g.closes_at?.split('T')[0],
      project_code: projectCode,
      expires_at: g.closes_at,
      _score: score,
    };
  });
}

// ── Signal 3: Cooling Relationships with Open Deals ────────────────────

async function scoreDealRisks() {
  // Get contacts with open opportunities and cooling engagement
  const { data: opportunities, error: oppErr } = await supabase
    .from('ghl_opportunities')
    .select('id, name, monetary_value, stage_name, pipeline_name, ghl_updated_at, ghl_contact_id, status')
    .eq('status', 'open');

  if (oppErr) {
    console.error('[Deal Risks] Error:', oppErr.message);
    return [];
  }

  const results = [];

  for (const opp of opportunities || []) {
    const val = parseFloat(opp.monetary_value) || 0;
    const daysSinceChange = opp.ghl_updated_at
      ? daysBetween(new Date(), opp.ghl_updated_at)
      : 0;

    let score = 0;

    // High-value stale deal
    if (daysSinceChange > 14 && val > 0) {
      score += 20;
    }

    // Check if contact relationship is cooling
    if (opp.ghl_contact_id) {
      const { data: contact } = await supabase
        .from('ghl_contacts')
        .select('engagement_status, last_contact_date')
        .eq('ghl_id', opp.ghl_contact_id)
        .limit(1)
        .single();

      if (contact) {
        const daysSinceContact = contact.last_contact_date
          ? daysBetween(new Date(), contact.last_contact_date)
          : 999;

        if (daysSinceContact > 30) {
          score += 20; // Relationship going cold
        }
      }
    }

    if (score === 0) continue;

    const multiplier = valueMultiplier(val);
    score = Math.round(score * multiplier);

    results.push({
      title: `Deal at risk: ${opp.name} — $${val.toLocaleString()} (${opp.stage_name})`,
      stream: 'Business',
      priority: score >= 50 ? 'now' : 'next',
      notes: JSON.stringify({
        score,
        pipeline: opp.pipeline_name,
        stage: opp.stage_name,
        value: val,
        days_stale: daysSinceChange,
        action: 'Reach out to re-engage and move deal forward',
      }),
      source_type: 'deal_risk',
      source_ref: String(opp.id),
      due_date: todayStr(),
      project_code: null,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      _score: score,
    });
  }

  log(`[Deal Risks] Found ${results.length} at-risk deals`);
  return results;
}

// ── Signal 4: Unanswered Communications ────────────────────────────────

async function scoreUnansweredComms() {
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  // Cap at 60 days — anything older is not a real priority
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

  const { data, error } = await supabase
    .from('communications_history')
    .select('id, contact_name, contact_email, subject, channel, occurred_at, project_code')
    .eq('direction', 'inbound')
    .eq('requires_response', true)
    .lt('occurred_at', threeDaysAgo)
    .gt('occurred_at', sixtyDaysAgo)
    .not('contact_name', 'is', null)
    .neq('contact_name', '')
    .neq('contact_name', 'unknown')
    .order('occurred_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[Unanswered Comms] Error:', error.message);
    return [];
  }

  log(`[Unanswered Comms] Found ${(data || []).length} unanswered > 3 days (within 60d)`);

  return (data || []).map(comm => {
    const daysWaiting = daysBetween(new Date(), comm.occurred_at);
    const score = Math.min(30, 15 + (daysWaiting > 7 ? 10 : 0));

    return {
      title: `Reply to ${comm.contact_name}: ${comm.subject || '(no subject)'}`,
      stream: 'Business',
      priority: score >= 50 ? 'now' : 'next',
      notes: JSON.stringify({
        score,
        channel: comm.channel,
        days_waiting: daysWaiting,
        action: `Respond to ${comm.channel || 'email'} from ${comm.contact_name}`,
      }),
      source_type: 'email_followup',
      source_ref: String(comm.id),
      due_date: todayStr(),
      project_code: comm.project_code,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      _score: score,
    };
  });
}

// ── Signal 5: Overdue Actions ──────────────────────────────────────────

async function scoreOverdueActions() {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('id, title, content, project_code, follow_up_date, importance')
    .eq('action_required', true)
    .eq('status', 'open')
    .lt('follow_up_date', todayStr())
    .order('follow_up_date', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[Overdue Actions] Error:', error.message);
    return [];
  }

  log(`[Overdue Actions] Found ${(data || []).length} overdue`);

  return (data || []).map(action => {
    const daysOverdue = daysBetween(new Date(), action.follow_up_date);
    let baseScore = 10;
    if (action.importance === 'critical') baseScore = 25;
    else if (action.importance === 'high') baseScore = 15;
    const score = Math.min(40, baseScore + Math.floor(daysOverdue / 7) * 5);

    return {
      title: action.title || `Overdue action (${daysOverdue}d overdue)`,
      stream: 'Business',
      priority: score >= 50 ? 'now' : 'next',
      notes: JSON.stringify({
        score,
        importance: action.importance,
        days_overdue: daysOverdue,
        context: action.content?.slice(0, 200),
        action: 'Complete or reschedule this action item',
      }),
      source_type: 'overdue_action',
      source_ref: String(action.id),
      due_date: action.follow_up_date?.split('T')[0],
      project_code: action.project_code,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      _score: score,
    };
  });
}

// ── Signal 6: Pipeline Opportunities Stale ─────────────────────────────

async function scoreStalePipeline() {
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  const { data, error } = await supabase
    .from('opportunities_unified')
    .select('id, title, stage, value_mid, project_codes, contact_name, updated_at, expected_close')
    .in('stage', ['pursuing', 'applied', 'in_discussion'])
    .lt('updated_at', twoWeeksAgo);

  if (error) {
    console.error('[Stale Pipeline] Error:', error.message);
    return [];
  }

  log(`[Stale Pipeline] Found ${(data || []).length} stale opportunities`);

  return (data || []).map(opp => {
    const daysSinceUpdate = daysBetween(new Date(), opp.updated_at);
    const baseScore = 10;
    const multiplier = valueMultiplier(opp.value_mid);
    const score = Math.round(baseScore * multiplier);
    const projectCode = Array.isArray(opp.project_codes) ? opp.project_codes[0] : null;

    return {
      title: `Progress "${opp.title}" — ${daysSinceUpdate}d since last update`,
      stream: 'Business',
      priority: score >= 50 ? 'now' : 'next',
      notes: JSON.stringify({
        score,
        stage: opp.stage,
        value: opp.value_mid,
        contact: opp.contact_name,
        days_stale: daysSinceUpdate,
        expected_close: opp.expected_close,
        action: 'Follow up to move this opportunity forward',
      }),
      source_type: 'pipeline_progression',
      source_ref: String(opp.id),
      due_date: opp.expected_close || todayStr(),
      project_code: projectCode,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      _score: score,
    };
  });
}

// ── Main: Score, Rank, Upsert ──────────────────────────────────────────

async function main() {
  console.log('🎯 Daily Priorities Engine\n');

  const [invoices, grants, deals, comms, actions, pipeline] = await Promise.all([
    scoreOverdueInvoices(),
    scoreGrantDeadlines(),
    scoreDealRisks(),
    scoreUnansweredComms(),
    scoreOverdueActions(),
    scoreStalePipeline(),
  ]);

  const allItems = [...invoices, ...grants, ...deals, ...comms, ...actions, ...pipeline];

  // Sort by score descending
  allItems.sort((a, b) => (b._score || 0) - (a._score || 0));

  // Take top 15 (don't flood the table)
  const topItems = allItems.slice(0, 15);

  console.log(`\nTotal scored items: ${allItems.length}`);
  console.log(`Top priorities: ${topItems.length}`);

  if (topItems.length === 0) {
    console.log('No priority items found. All clear!');
    return;
  }

  // Show ranked items
  console.log('\n📋 Ranked Priorities:');
  for (const [i, item] of topItems.entries()) {
    const badge = item.priority === 'now' ? '🔴 NOW' : '🟡 NEXT';
    console.log(`  ${i + 1}. [${badge}] (${item._score}pts) ${item.title}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would upsert to sprint_suggestions');
    return;
  }

  // Dedup: check existing active suggestions
  const { data: existing } = await supabase
    .from('sprint_suggestions')
    .select('source_type, source_ref')
    .eq('dismissed', false)
    .is('promoted_to', null);

  const existingKeys = new Set(
    (existing || []).map(e => `${e.source_type}::${e.source_ref}`)
  );

  const { data: dismissed } = await supabase
    .from('sprint_suggestions')
    .select('source_type, source_ref')
    .or('dismissed.eq.true,promoted_to.not.is.null');

  const dismissedKeys = new Set(
    (dismissed || []).map(e => `${e.source_type}::${e.source_ref}`)
  );

  // Filter to new items only
  const newItems = topItems.filter(item => {
    const key = `${item.source_type}::${item.source_ref}`;
    return !existingKeys.has(key) && !dismissedKeys.has(key);
  });

  console.log(`\nNew items after dedup: ${newItems.length}`);

  if (newItems.length === 0) {
    console.log('All priorities already tracked. Done.');
    return;
  }

  // Remove _score before insert
  const insertData = newItems.map(({ _score, ...rest }) => rest);

  const { error } = await supabase
    .from('sprint_suggestions')
    .insert(insertData);

  if (error) {
    console.error('Insert error:', error.message);
    process.exit(1);
  }

  console.log(`\n✅ Inserted ${newItems.length} priority items`);

  // Clean up expired
  const { data: expired } = await supabase
    .from('sprint_suggestions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('dismissed', false)
    .is('promoted_to', null)
    .select('id');

  if (expired?.length) {
    console.log(`🧹 Cleaned up ${expired.length} expired items`);
  }

  // Summary
  const summary = {};
  for (const item of newItems) {
    summary[item.source_type] = (summary[item.source_type] || 0) + 1;
  }
  console.log('\nBy source:', JSON.stringify(summary));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
