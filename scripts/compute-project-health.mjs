#!/usr/bin/env node
/**
 * Project Health Calculator: Compute health scores for all active projects
 *
 * For each active project in project-codes.json:
 * - Count xero_transactions + invoices
 * - Sum income/expenses
 * - Count GHL opportunities + contacts
 * - Count communications_history emails
 * - Count grant_applications
 * - Compute health score (financial + relationship + communication activity)
 * - Upsert into project_health table
 *
 * Usage:
 *   node scripts/compute-project-health.mjs           # Dry run
 *   node scripts/compute-project-health.mjs --apply    # Upsert to project_health
 */

import { createClient } from '@supabase/supabase-js';
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

const applyMode = process.argv.includes('--apply');

// Load active projects directly from canonical projects table
const { data: projectRows, error: loadError } = await supabase
  .from('projects')
  .select('*')
  .in('status', ['active', 'ideation'])
  .order('importance_weight', { ascending: false });

if (loadError) {
  console.error('Failed to load projects:', loadError.message);
  process.exit(1);
}

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

async function computeProjectHealth(code, project) {
  // Parallel fetch all metrics
  const [
    txResult,
    invResult,
    oppsResult,
    contactsResult,
    emailsResult,
    grantsResult,
    subsResult,
  ] = await Promise.all([
    // Transactions
    supabase
      .from('xero_transactions')
      .select('total, type')
      .eq('project_code', code),

    // Invoices
    supabase
      .from('xero_invoices')
      .select('total, amount_due, type')
      .eq('project_code', code),

    // GHL opportunities
    supabase
      .from('ghl_opportunities')
      .select('monetary_value, status')
      .eq('project_code', code),

    // GHL contacts (by tag)
    supabase
      .from('ghl_contacts')
      .select('id', { count: 'exact', head: true })
      .contains('tags', [(project.ghl_tags || [])[0] || code.toLowerCase()]),

    // Emails
    supabase
      .from('communications_history')
      .select('id', { count: 'exact', head: true })
      .contains('project_codes', [code]),

    // Grant applications
    supabase
      .from('grant_applications')
      .select('status, amount_requested, outcome_amount')
      .eq('project_code', code),

    // Subscriptions
    supabase
      .from('subscriptions')
      .select('amount')
      .contains('project_codes', [code])
      .eq('account_status', 'active'),
  ]);

  const transactions = txResult.data || [];
  const invoices = invResult.data || [];
  const opportunities = oppsResult.data || [];
  const grants = grantsResult.data || [];
  const subs = subsResult.data || [];

  // Financial metrics
  let income = 0, expenses = 0;
  for (const tx of transactions) {
    if (tx.type === 'RECEIVE') income += Math.abs(tx.total || 0);
    else if (tx.type === 'SPEND') expenses += Math.abs(tx.total || 0);
  }

  const receivable = invoices
    .filter(i => i.type === 'ACCREC' && i.amount_due > 0)
    .reduce((s, i) => s + (i.amount_due || 0), 0);

  const pipelineValue = opportunities
    .filter(o => o.status !== 'lost')
    .reduce((s, o) => s + (Number(o.monetary_value) || 0), 0);

  const grantFunding = grants
    .filter(g => g.status === 'approved' || g.status === 'acquitted')
    .reduce((s, g) => s + (g.outcome_amount || g.amount_requested || 0), 0);

  const subMonthly = subs.reduce((s, sub) => s + Math.abs(sub.amount || 0), 0);

  // Activity counts
  const contactCount = contactsResult.count || 0;
  const emailCount = emailsResult.count || 0;
  const txCount = transactions.length;
  const oppCount = opportunities.length;
  const grantCount = grants.length;

  // Health score (0-100)
  // Financial activity (40%): transactions + invoices + grants
  const financialScore = Math.min(100, (txCount * 3) + (invoices.length * 5) + (grantCount * 10));
  // Relationship activity (30%): contacts + opportunities
  const relationshipScore = Math.min(100, (contactCount * 5) + (oppCount * 10));
  // Communication activity (30%): emails
  const communicationScore = Math.min(100, emailCount * 2);

  const healthScore = Math.round(
    financialScore * 0.4 + relationshipScore * 0.3 + communicationScore * 0.3
  );

  // Determine health status
  const healthStatus = healthScore >= 70 ? 'healthy' : healthScore >= 40 ? 'attention' : 'critical';

  return {
    // Fields for display/logging
    _display: {
      code, name: project.name, category: project.category, status: project.status,
      healthScore, financialScore: Math.round(financialScore),
      relationshipScore: Math.round(relationshipScore),
      communicationScore: Math.round(communicationScore),
      income: Math.round(income), expenses: Math.round(expenses), txCount,
    },
    // Fields matching project_health table schema
    _row: {
      project_code: code,
      project_name: project.name,
      overall_score: healthScore,
      momentum_score: Math.round(communicationScore),
      engagement_score: Math.round(relationshipScore),
      financial_score: Math.round(financialScore),
      timeline_score: 50, // placeholder — no timeline data yet
      health_status: healthStatus,
      metrics: {
        total_income: Math.round(income),
        total_expenses: Math.round(expenses),
        net_position: Math.round(income - expenses),
        receivable: Math.round(receivable),
        pipeline_value: Math.round(pipelineValue),
        grant_funding: Math.round(grantFunding),
        subscription_monthly: Math.round(subMonthly),
        transaction_count: txCount,
        invoice_count: invoices.length,
        opportunity_count: oppCount,
        contact_count: contactCount,
        email_count: emailCount,
        grant_count: grantCount,
      },
      alerts: [],
      calculated_at: new Date().toISOString(),
      calculation_version: '2.0.0',
    },
  };
}

async function main() {
  console.log(`\n📊 Project Health Calculator ${applyMode ? '(APPLY MODE)' : '(DRY RUN)'}\n`);

  console.log(`Computing health for ${projectRows.length} active projects...\n`);

  const results = [];

  // Process in batches of 5 to avoid overwhelming the DB
  for (let i = 0; i < projectRows.length; i += 5) {
    const batch = projectRows.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(p => computeProjectHealth(p.code, p))
    );
    results.push(...batchResults);
  }

  // Sort by health score descending
  results.sort((a, b) => b._display.healthScore - a._display.healthScore);

  // Display results
  console.log('Project Health Scores:');
  console.log('─'.repeat(90));
  console.log(`${'Code'.padEnd(8)} ${'Name'.padEnd(30)} ${'Score'.padEnd(7)} ${'Fin'.padEnd(5)} ${'Rel'.padEnd(5)} ${'Com'.padEnd(5)} ${'Txns'.padEnd(6)} ${'Income'.padEnd(12)} ${'Expenses'.padEnd(12)}`);
  console.log('─'.repeat(90));

  for (const { _display: r } of results) {
    const score = `${r.healthScore}`.padEnd(7);
    const fin = `${r.financialScore}`.padEnd(5);
    const rel = `${r.relationshipScore}`.padEnd(5);
    const com = `${r.communicationScore}`.padEnd(5);
    const txns = `${r.txCount}`.padEnd(6);
    const inc = `$${r.income.toLocaleString()}`.padEnd(12);
    const exp = `$${r.expenses.toLocaleString()}`.padEnd(12);
    console.log(`${r.code.padEnd(8)} ${r.name.padEnd(30)} ${score} ${fin} ${rel} ${com} ${txns} ${inc} ${exp}`);
  }

  console.log('─'.repeat(90));

  const totalIncome = results.reduce((s, r) => s + r._display.income, 0);
  const totalExpenses = results.reduce((s, r) => s + r._display.expenses, 0);
  const avgHealth = Math.round(results.reduce((s, r) => s + r._display.healthScore, 0) / results.length);
  console.log(`\nAverage health: ${avgHealth}, Total income: $${totalIncome.toLocaleString()}, Total expenses: $${totalExpenses.toLocaleString()}`);

  if (applyMode) {
    console.log('\nUpserting to project_health table...');
    let upserted = 0;

    for (const r of results) {
      const { error } = await supabase
        .from('project_health')
        .upsert(r._row, { onConflict: 'project_code' });

      if (error) {
        console.error(`  Failed ${r._row.project_code}: ${error.message}`);
      } else {
        upserted++;
      }
    }
    console.log(`✅ Upserted ${upserted}/${results.length} project health records\n`);
  } else {
    console.log('\nRun with --apply to upsert to project_health table.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
