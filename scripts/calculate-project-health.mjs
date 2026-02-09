#!/usr/bin/env node
/**
 * BUNYA - Project Health Calculator
 *
 * Calculates health scores for all ACT projects based on:
 * - Momentum: Recent activity (commits, updates, communications)
 * - Engagement: Team involvement
 * - Financial: Budget health, invoice status
 * - Timeline: Milestone completion, deadlines
 *
 * Usage:
 *   node scripts/calculate-project-health.mjs
 *   node scripts/calculate-project-health.mjs --project=EL
 *
 * Created: 2026-01-27
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse command line args
const args = process.argv.slice(2);
const projectFilter = args.find(a => a.startsWith('--project='))?.split('=')[1];

// ============================================
// Score Calculation Functions
// ============================================

/**
 * Calculate momentum score based on recent activity
 */
async function calculateMomentumScore(projectCode) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Check for recent communications
  const { count: commCount } = await supabase
    .from('communications_history')
    .select('*', { count: 'exact', head: true })
    .contains('metadata', { project_code: projectCode })
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Check for recent tasks completed
  const { count: taskCount } = await supabase
    .from('agent_task_queue')
    .select('*', { count: 'exact', head: true })
    .eq('project_code', projectCode)
    .eq('status', 'completed')
    .gte('completed_at', thirtyDaysAgo.toISOString());

  // Score based on activity level
  const totalActivity = (commCount || 0) + (taskCount || 0) * 2;

  if (totalActivity >= 20) return 100;
  if (totalActivity >= 10) return 80;
  if (totalActivity >= 5) return 60;
  if (totalActivity >= 2) return 40;
  if (totalActivity >= 1) return 20;
  return 0;
}

/**
 * Calculate financial score based on invoices
 */
async function calculateFinancialScore(projectCode) {
  // Get invoices for this project
  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('total, amount_due, amount_paid, status, type')
    .eq('project_code', projectCode);

  if (!invoices || invoices.length === 0) {
    return 70; // No financial data = neutral score
  }

  const receivables = invoices.filter(i => i.type === 'ACCREC');
  const totalInvoiced = receivables.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const totalPaid = receivables.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
  const totalDue = receivables.reduce((sum, i) => sum + Number(i.amount_due || 0), 0);

  if (totalInvoiced === 0) return 70;

  // Payment rate
  const paymentRate = totalPaid / totalInvoiced;

  // Overdue ratio
  const overdueInvoices = invoices.filter(i =>
    i.amount_due > 0 && i.status !== 'PAID'
  );
  const overdueRatio = overdueInvoices.length / invoices.length;

  // Score
  let score = 50 + (paymentRate * 40) - (overdueRatio * 30);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate engagement score based on team activity
 */
async function calculateEngagementScore(projectCode) {
  // Get contacts linked to this project
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('id, last_activity')
    .contains('tags', [projectCode]);

  if (!contacts || contacts.length === 0) {
    return 50; // No contacts = neutral
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeContacts = contacts.filter(c =>
    c.last_activity && new Date(c.last_activity) >= thirtyDaysAgo
  );

  const engagementRate = activeContacts.length / contacts.length;

  let score = 30 + (engagementRate * 70);
  return Math.min(100, Math.round(score));
}

/**
 * Calculate timeline score based on tasks and deadlines
 */
async function calculateTimelineScore(projectCode) {
  // Get tasks for this project
  const { data: tasks } = await supabase
    .from('agent_task_queue')
    .select('status, due_date, completed_at')
    .eq('project_code', projectCode);

  if (!tasks || tasks.length === 0) {
    return 60; // No tasks = neutral
  }

  const completed = tasks.filter(t => t.status === 'completed');
  const overdue = tasks.filter(t =>
    t.status !== 'completed' &&
    t.due_date &&
    new Date(t.due_date) < new Date()
  );

  const completionRate = completed.length / tasks.length;
  const overdueRate = overdue.length / tasks.length;

  let score = 50 + (completionRate * 40) - (overdueRate * 30);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate alerts based on metrics
 */
function generateAlerts(metrics, scores) {
  const alerts = [];

  if (scores.momentum < 30) {
    alerts.push({
      type: 'stale',
      message: 'No significant activity in the last 30 days',
      severity: scores.momentum < 10 ? 'critical' : 'warning'
    });
  }

  if (scores.financial < 40) {
    alerts.push({
      type: 'financial',
      message: 'Outstanding invoices or payment issues',
      severity: 'warning'
    });
  }

  if (scores.timeline < 40) {
    alerts.push({
      type: 'timeline',
      message: 'Overdue tasks or missed deadlines',
      severity: 'warning'
    });
  }

  if (scores.engagement < 30) {
    alerts.push({
      type: 'engagement',
      message: 'Low team engagement in the last 30 days',
      severity: 'warning'
    });
  }

  return alerts;
}

/**
 * Calculate overall health for a project
 */
async function calculateProjectHealth(projectCode, projectName) {
  console.log(`  📊 Calculating health for ${projectCode}...`);

  // Calculate individual scores
  const momentum = await calculateMomentumScore(projectCode);
  const financial = await calculateFinancialScore(projectCode);
  const engagement = await calculateEngagementScore(projectCode);
  const timeline = await calculateTimelineScore(projectCode);

  // Weighted average for overall score
  const overall = Math.round(
    (momentum * 0.3) +
    (financial * 0.25) +
    (engagement * 0.2) +
    (timeline * 0.25)
  );

  // Determine status
  const status = overall >= 80 ? 'thriving' :
                 overall >= 60 ? 'healthy' :
                 overall >= 40 ? 'attention' :
                 overall >= 20 ? 'critical' : 'dormant';

  const scores = { momentum, financial, engagement, timeline };
  const alerts = generateAlerts({}, scores);

  return {
    project_code: projectCode,
    project_name: projectName,
    overall_score: overall,
    momentum_score: momentum,
    financial_score: financial,
    engagement_score: engagement,
    timeline_score: timeline,
    health_status: status,
    metrics: scores,
    alerts,
    calculated_at: new Date().toISOString()
  };
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🌲 BUNYA - Project Health Calculator                ║
╚══════════════════════════════════════════════════════╝
`);

  // Get list of projects
  let projects;

  if (projectFilter) {
    // Single project
    const { data } = await supabase
      .from('act_projects')
      .select('code, name')
      .eq('code', projectFilter);
    projects = data || [{ code: projectFilter, name: projectFilter }];
  } else {
    // All projects
    const { data } = await supabase
      .from('act_projects')
      .select('code, name');

    if (!data || data.length === 0) {
      // Fallback to project codes config
      console.log('  Using fallback project list...');
      const projectCodes = ['EL', 'HARVEST', 'GOODS', 'JUSTICEHUB', 'PICC', 'DADLAB'];
      projects = projectCodes.map(code => ({ code, name: code }));
    } else {
      projects = data;
    }
  }

  console.log(`  Found ${projects.length} projects to analyze\n`);

  // Calculate health for each project
  const results = [];
  for (const project of projects) {
    const health = await calculateProjectHealth(project.code, project.name);
    results.push(health);
  }

  // Upsert results to database
  console.log('\n  💾 Saving health data...');

  for (const health of results) {
    const { error } = await supabase
      .from('project_health')
      .upsert(health, { onConflict: 'project_code' });

    if (error) {
      console.error(`  ❌ Error saving ${health.project_code}:`, error.message);
    }

    // Also save to history
    await supabase
      .from('project_health_history')
      .upsert({
        project_code: health.project_code,
        overall_score: health.overall_score,
        momentum_score: health.momentum_score,
        engagement_score: health.engagement_score,
        financial_score: health.financial_score,
        timeline_score: health.timeline_score,
        health_status: health.health_status,
        alerts_count: health.alerts.length,
        snapshot_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'project_code,snapshot_date' });
  }

  // Summary
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Summary                                             ║
╚══════════════════════════════════════════════════════╝
`);

  const statusCounts = {
    thriving: results.filter(r => r.health_status === 'thriving').length,
    healthy: results.filter(r => r.health_status === 'healthy').length,
    attention: results.filter(r => r.health_status === 'attention').length,
    critical: results.filter(r => r.health_status === 'critical').length,
    dormant: results.filter(r => r.health_status === 'dormant').length
  };

  console.log(`  🌟 Thriving:  ${statusCounts.thriving}`);
  console.log(`  ✅ Healthy:   ${statusCounts.healthy}`);
  console.log(`  ⚠️  Attention: ${statusCounts.attention}`);
  console.log(`  🔴 Critical:  ${statusCounts.critical}`);
  console.log(`  💤 Dormant:   ${statusCounts.dormant}`);

  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.overall_score, 0) / results.length
  );
  console.log(`\n  📊 Average Health Score: ${avgScore}/100`);

  // List projects needing attention
  const needsAttention = results.filter(r =>
    r.health_status === 'attention' || r.health_status === 'critical'
  );

  if (needsAttention.length > 0) {
    console.log('\n  🚨 Projects Needing Attention:');
    for (const p of needsAttention) {
      console.log(`     - ${p.project_code}: ${p.overall_score}/100 (${p.health_status})`);
    }
  }

  console.log('\n  ✅ Health calculation complete!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
