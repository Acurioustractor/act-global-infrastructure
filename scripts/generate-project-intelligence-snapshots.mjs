#!/usr/bin/env node
/**
 * Generate Project Intelligence Snapshots
 *
 * Pre-calculates daily snapshots for all active projects, combining:
 * - FY financials (revenue, expenses, net, burn rate)
 * - Pipeline value (active grants + opportunities)
 * - Counts (contacts, grants, emails, meetings, knowledge)
 * - Health scores
 * - Focus areas summary
 *
 * Run daily at 6am AEST via PM2.
 *
 * Usage:
 *   node scripts/generate-project-intelligence-snapshots.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

// Australian FY: Jul 1 - Jun 30
function getFYStart() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-07-01`;
}

const fyStart = getFYStart();

// Load active projects
const { data: projects, error: loadError } = await supabase
  .from('projects')
  .select('code, name, status')
  .in('status', ['active', 'ideation'])
  .order('importance_weight', { ascending: false });

if (loadError) {
  console.error('Failed to load projects:', loadError.message);
  process.exit(1);
}

console.log(`Generating snapshots for ${projects.length} projects (${today})`);

let successCount = 0;

for (const project of projects) {
  const code = project.code;

  try {
    // Parallel fetch all data for this project
    const [
      txResult,
      grantsResult,
      emailsResult,
      meetingsResult,
      knowledgeResult,
      healthResult,
      focusResult,
      oppsResult,
      contactsResult,
    ] = await Promise.all([
      // FY transactions
      supabase
        .from('xero_transactions')
        .select('total, type')
        .eq('project_code', code)
        .gte('date', fyStart),

      // Active grants
      supabase
        .from('grant_applications')
        .select('amount_requested, status')
        .eq('project_code', code)
        .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),

      // Emails (30d)
      supabase
        .from('communications_history')
        .select('id', { count: 'exact', head: true })
        .contains('project_codes', [code])
        .gte('occurred_at', thirtyDaysAgo),

      // Meetings (30d)
      supabase
        .from('calendar_events')
        .select('id', { count: 'exact', head: true })
        .eq('project_code', code)
        .gte('start_time', thirtyDaysAgo),

      // Knowledge items (30d)
      supabase
        .from('project_knowledge')
        .select('id', { count: 'exact', head: true })
        .eq('project_code', code)
        .gte('recorded_at', thirtyDaysAgo),

      // Health scores
      supabase
        .from('project_health')
        .select('health_score, momentum_score, engagement_score, financial_score, timeline_score')
        .eq('project_code', code)
        .maybeSingle(),

      // Focus areas (current blockers/wins)
      supabase
        .from('project_focus_areas')
        .select('title, status')
        .eq('project_code', code)
        .in('status', ['current', 'blocked', 'completed'])
        .order('updated_at', { ascending: false })
        .limit(10),

      // GHL opportunities
      supabase
        .from('ghl_opportunities')
        .select('monetary_value, status')
        .eq('project_code', code)
        .eq('status', 'open'),

      // Contacts tagged with project
      supabase
        .from('ghl_contacts')
        .select('ghl_id', { count: 'exact', head: true })
        .contains('projects', [code]),
    ]);

    // Calculate financials
    const txData = txResult.data || [];
    let fyRevenue = 0;
    let fyExpenses = 0;
    txData.forEach(tx => {
      if (tx.type === 'RECEIVE') fyRevenue += Math.abs(tx.total || 0);
      else if (tx.type === 'SPEND') fyExpenses += Math.abs(tx.total || 0);
    });

    // Monthly burn rate (expenses over months elapsed in FY)
    const fyStartDate = new Date(fyStart);
    const monthsElapsed = Math.max(1, Math.ceil((Date.now() - fyStartDate.getTime()) / (30 * 86400000)));
    const monthlyBurnRate = Math.round(fyExpenses / monthsElapsed);

    // Pipeline value (grants + opportunities)
    const grantPipeline = (grantsResult.data || []).reduce((s, g) => s + (g.amount_requested || 0), 0);
    const oppPipeline = (oppsResult.data || []).reduce((s, o) => s + ((o.monetary_value || 0) / 100), 0);
    const pipelineValue = grantPipeline + oppPipeline;

    // Focus area summaries
    const focusData = focusResult.data || [];
    const blockers = focusData.filter(f => f.status === 'blocked').map(f => f.title);
    const recentWins = focusData.filter(f => f.status === 'completed').slice(0, 3).map(f => f.title);
    const currentFocus = focusData.filter(f => f.status === 'current').map(f => f.title).join(', ') || null;

    const h = healthResult.data;

    const snapshot = {
      project_code: code,
      snapshot_date: today,
      fy_revenue: Math.round(fyRevenue),
      fy_expenses: Math.round(fyExpenses),
      fy_net: Math.round(fyRevenue - fyExpenses),
      monthly_burn_rate: monthlyBurnRate,
      pipeline_value: Math.round(pipelineValue),
      contact_count: contactsResult.count || 0,
      active_grant_count: (grantsResult.data || []).length,
      email_count_30d: emailsResult.count || 0,
      meeting_count_30d: meetingsResult.count || 0,
      knowledge_count_30d: knowledgeResult.count || 0,
      health_score: h?.health_score || null,
      momentum_score: h?.momentum_score || null,
      engagement_score: h?.engagement_score || null,
      financial_score: h?.financial_score || null,
      timeline_score: h?.timeline_score || null,
      current_focus: currentFocus,
      blockers: blockers.length > 0 ? blockers : null,
      recent_wins: recentWins.length > 0 ? recentWins : null,
      opportunity_summary: {
        grants: { count: (grantsResult.data || []).length, value: grantPipeline },
        ghl: { count: (oppsResult.data || []).length, value: oppPipeline },
      },
    };

    const { error: upsertError } = await supabase
      .from('project_intelligence_snapshots')
      .upsert(snapshot, { onConflict: 'project_code,snapshot_date' });

    if (upsertError) {
      console.error(`  [${code}] Error upserting snapshot:`, upsertError.message);
    } else {
      console.log(`  [${code}] Snapshot generated — revenue: $${fyRevenue.toLocaleString()}, expenses: $${fyExpenses.toLocaleString()}, pipeline: $${pipelineValue.toLocaleString()}, health: ${h?.health_score || 'N/A'}`);
      successCount++;
    }
  } catch (err) {
    console.error(`  [${code}] Error:`, err.message);
  }
}

console.log(`\nDone. ${successCount}/${projects.length} snapshots generated.`);

// Record sync status
try {
  await recordSyncStatus(supabase, 'project_intelligence_snapshots', {
    status: successCount > 0 ? 'healthy' : 'error',
    recordCount: successCount,
    error: successCount === 0 ? 'No snapshots generated' : null,
  });
} catch (e) {
  console.warn('Could not record sync status:', e.message);
}
