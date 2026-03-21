#!/usr/bin/env node
/**
 * Project Budget Alerts — Telegram P&L Notifications
 *
 * Checks budget vs actual spend for all projects and sends
 * Telegram alerts for:
 *   - Projects over 80% of expense budget
 *   - Spend spikes (>30% increase month-over-month)
 *   - Revenue below 20% of target with <3 months remaining in FY
 *   - Grant tracking: realized grants without Xero invoices
 *
 * Usage:
 *   node scripts/project-budget-alerts.mjs              # Send alerts
 *   node scripts/project-budget-alerts.mjs --dry-run    # Preview only
 *   node scripts/project-budget-alerts.mjs --verbose    # Detailed output
 *
 * Schedule: Add to PM2 cron for weekly runs (Monday morning).
 */

import { createClient } from '@supabase/supabase-js';
import { sendTelegram } from './lib/telegram.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

function fmt(amount) {
  if (amount == null) return '$0';
  const num = Number(amount);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================
// Data Fetching
// ============================================

async function fetchBudgetVsActual() {
  const { data: budgets } = await supabase
    .from('project_budgets')
    .select('project_code, budget_type, budget_amount')
    .eq('fy_year', 'FY26')
    .limit(500);

  const { data: actuals } = await supabase
    .from('project_monthly_financials')
    .select('project_code, month, revenue, expenses')
    .gte('month', '2025-07-01')
    .limit(2000);

  // Aggregate budgets by project
  const budgetMap = {};
  for (const b of (budgets || [])) {
    if (!budgetMap[b.project_code]) budgetMap[b.project_code] = { expense: 0, revenue: 0 };
    if (b.budget_type === 'expense') budgetMap[b.project_code].expense += Number(b.budget_amount || 0);
    if (b.budget_type === 'revenue' || b.budget_type === 'grant') budgetMap[b.project_code].revenue += Number(b.budget_amount || 0);
  }

  // Aggregate actuals by project + monthly for spike detection
  const actualMap = {};
  const monthlyMap = {};
  for (const a of (actuals || [])) {
    if (!actualMap[a.project_code]) actualMap[a.project_code] = { revenue: 0, expenses: 0 };
    actualMap[a.project_code].revenue += Number(a.revenue || 0);
    actualMap[a.project_code].expenses += Number(a.expenses || 0);

    const key = `${a.project_code}:${a.month}`;
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, expenses: 0 };
    monthlyMap[key].expenses += Math.abs(Number(a.expenses || 0));
    monthlyMap[key].revenue += Number(a.revenue || 0);
  }

  // Merge into results
  const projects = new Set([...Object.keys(budgetMap), ...Object.keys(actualMap)]);
  const result = [];
  for (const code of projects) {
    const bud = budgetMap[code] || { expense: 0, revenue: 0 };
    const act = actualMap[code] || { revenue: 0, expenses: 0 };
    const expPct = bud.expense > 0 ? Math.round((Math.abs(act.expenses) / bud.expense) * 100) : null;
    const revPct = bud.revenue > 0 ? Math.round((act.revenue / bud.revenue) * 100) : null;
    result.push({ code, budgetExpense: bud.expense, budgetRevenue: bud.revenue, actualRevenue: act.revenue, actualExpense: Math.abs(act.expenses), expPct, revPct });
  }

  return { projects: result, monthlyMap };
}

async function fetchGrantTracking() {
  const { data } = await supabase
    .from('grant_financial_tracking')
    .select('grant_name, project_code, monetary_value, status, xero_invoice_number')
    .order('monetary_value', { ascending: false })
    .limit(50);
  return data || [];
}

// ============================================
// Alert Detection
// ============================================

function detectAlerts(budgetResult, grants) {
  const alerts = [];
  const { projects, monthlyMap } = budgetResult;

  // FY26 months remaining (FY ends June 30 2026)
  const now = new Date();
  const fyEnd = new Date('2026-06-30');
  const monthsRemaining = Math.max(0, Math.round((fyEnd - now) / (30 * 24 * 60 * 60 * 1000)));

  for (const proj of projects) {
    // Over 80% expense budget
    if (proj.expPct != null && proj.expPct > 80) {
      alerts.push({
        type: 'over_budget',
        severity: proj.expPct > 100 ? 'critical' : 'warning',
        project: proj.code,
        message: `${proj.code} at ${proj.expPct}% of expense budget (${fmt(proj.actualExpense)}/${fmt(proj.budgetExpense)})`,
      });
    }

    // Revenue below 20% with <3 months remaining
    if (monthsRemaining <= 3 && proj.budgetRevenue > 0 && proj.revPct != null && proj.revPct < 20) {
      alerts.push({
        type: 'revenue_behind',
        severity: 'warning',
        project: proj.code,
        message: `${proj.code} revenue only ${proj.revPct}% of target with ${monthsRemaining} months left (${fmt(proj.actualRevenue)}/${fmt(proj.budgetRevenue)})`,
      });
    }

    // Spend spike: check last 2 months
    const months = Object.keys(monthlyMap)
      .filter(k => k.startsWith(proj.code + ':'))
      .sort()
      .slice(-2);

    if (months.length === 2) {
      const prev = monthlyMap[months[0]].expenses;
      const curr = monthlyMap[months[1]].expenses;
      if (prev > 0 && curr > prev * 1.3 && curr > 1000) {
        const pct = Math.round(((curr - prev) / prev) * 100);
        alerts.push({
          type: 'spend_spike',
          severity: 'info',
          project: proj.code,
          message: `${proj.code} spend +${pct}% month-over-month (${fmt(prev)} \u2192 ${fmt(curr)})`,
        });
      }
    }
  }

  // Grants without Xero invoices
  const unlinked = grants.filter(g => !g.xero_invoice_number);
  if (unlinked.length > 0) {
    const total = unlinked.reduce((s, g) => s + (Number(g.monetary_value) || 0), 0);
    alerts.push({
      type: 'grants_uninvoiced',
      severity: 'warning',
      project: 'ALL',
      message: `${unlinked.length} realized grant${unlinked.length > 1 ? 's' : ''} (${fmt(total)}) not yet invoiced in Xero: ${unlinked.map(g => g.grant_name).join(', ')}`,
    });
  }

  return alerts;
}

// ============================================
// Message Formatting
// ============================================

function buildTelegramMessage(alerts) {
  if (alerts.length === 0) return null;

  const critical = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');
  const infos = alerts.filter(a => a.severity === 'info');

  let msg = '*\u{1F4CA} Weekly P&L Alert*\n\n';

  if (critical.length > 0) {
    msg += '\u{1F534} *Critical*\n';
    for (const a of critical) msg += `\u2022 ${a.message}\n`;
    msg += '\n';
  }

  if (warnings.length > 0) {
    msg += '\u{1F7E0} *Warnings*\n';
    for (const a of warnings) msg += `\u2022 ${a.message}\n`;
    msg += '\n';
  }

  if (infos.length > 0) {
    msg += '\u{1F535} *Info*\n';
    for (const a of infos) msg += `\u2022 ${a.message}\n`;
    msg += '\n';
  }

  msg += `_${alerts.length} alert${alerts.length > 1 ? 's' : ''} \u2022 ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}_`;

  return msg;
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Project Budget Alerts ===');
  if (DRY_RUN) log('DRY RUN MODE');

  const [budgetResult, grants] = await Promise.all([
    fetchBudgetVsActual(),
    fetchGrantTracking(),
  ]);

  verbose(`  Projects with budgets: ${budgetResult.projects.length}`);
  verbose(`  Grants tracked: ${grants.length}`);

  const alerts = detectAlerts(budgetResult, grants);
  log(`Detected ${alerts.length} alerts`);

  for (const a of alerts) {
    verbose(`  [${a.severity}] ${a.message}`);
  }

  const message = buildTelegramMessage(alerts);

  if (!message) {
    log('No alerts to send. All clear!');
    return;
  }

  if (DRY_RUN) {
    log('[DRY RUN] Would send:\n' + message);
    return;
  }

  const sent = await sendTelegram(message);
  log(sent ? 'Alert sent to Telegram' : 'Failed to send Telegram alert');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
