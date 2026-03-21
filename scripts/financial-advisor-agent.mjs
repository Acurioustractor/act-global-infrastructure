#!/usr/bin/env node

/**
 * Financial Advisor Agent
 *
 * AI-powered weekly digest with cost insights, budget tracking,
 * R&D analysis, runway projections, and actionable recommendations.
 *
 * Usage:
 *   node scripts/financial-advisor-agent.mjs              # Full analysis
 *   node scripts/financial-advisor-agent.mjs --notify     # Send Telegram digest
 *   node scripts/financial-advisor-agent.mjs --project ACT-GD  # Single project
 *   node scripts/financial-advisor-agent.mjs --json       # JSON output
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const args = process.argv.slice(2);
const NOTIFY = args.includes('--notify');
const JSON_OUT = args.includes('--json');
const projectIdx = args.indexOf('--project');
const SINGLE_PROJECT = projectIdx !== -1 ? args[projectIdx + 1] : null;

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// Australian Financial Year: July 1 - June 30
function getFYDates() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    fyStart: `${year}-07-01`,
    fyEnd: `${year + 1}-06-30`,
    fyLabel: `FY${String(year + 1).slice(2)}`,
    monthsElapsed: now.getMonth() >= 6 ? now.getMonth() - 6 + 1 : now.getMonth() + 7,
  };
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

async function collectFinancialData() {
  const fy = getFYDates();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12-01`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-01`;
  const twoMonthsAgo = now.getMonth() <= 1
    ? `${now.getFullYear() - 1}-${String(12 + now.getMonth() - 1).padStart(2, '0')}-01`
    : `${now.getFullYear()}-${String(now.getMonth() - 1).padStart(2, '0')}-01`;

  // 1. FY-to-date spend by project
  const { data: fySpend } = await supabase.rpc('exec_sql', {
    query: `SELECT project_code,
      sum(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') THEN ABS(total) ELSE 0 END)::numeric as spend,
      sum(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END)::numeric as income,
      count(*)::int as txn_count
    FROM xero_transactions
    WHERE date >= '${fy.fyStart}' AND project_code IS NOT NULL
    ${SINGLE_PROJECT ? `AND project_code = '${SINGLE_PROJECT}'` : ''}
    GROUP BY project_code ORDER BY spend DESC`
  });

  // 2. Monthly burn by project (last 3 months)
  const { data: monthlyBurn } = await supabase.rpc('exec_sql', {
    query: `SELECT project_code,
      date_trunc('month', date::timestamp)::date as month,
      sum(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') THEN ABS(total) ELSE 0 END)::numeric as spend
    FROM xero_transactions
    WHERE date >= '${twoMonthsAgo}' AND project_code IS NOT NULL
    ${SINGLE_PROJECT ? `AND project_code = '${SINGLE_PROJECT}'` : ''}
    GROUP BY project_code, date_trunc('month', date::timestamp)
    ORDER BY project_code, month`
  });

  // 3. R&D eligible spend (projects marked as R&D)
  const RD_PROJECTS = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'];
  const { data: rdSpend } = await supabase.rpc('exec_sql', {
    query: `SELECT project_code,
      sum(ABS(total))::numeric as total_spend,
      count(*)::int as txn_count,
      count(CASE WHEN has_attachments THEN 1 END)::int as with_receipts
    FROM xero_transactions
    WHERE date >= '${fy.fyStart}'
    AND type IN ('SPEND','SPEND-TRANSFER')
    AND project_code IN (${RD_PROJECTS.map(p => `'${p}'`).join(',')})
    GROUP BY project_code ORDER BY total_spend DESC`
  });

  // 4. Cash position (latest bank balance from transactions)
  const { data: cashPosition } = await supabase.rpc('exec_sql', {
    query: `SELECT
      sum(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END)::numeric as total_in,
      sum(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') THEN ABS(total) ELSE 0 END)::numeric as total_out,
      (sum(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END) -
       sum(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') THEN ABS(total) ELSE 0 END))::numeric as net
    FROM xero_transactions
    WHERE date >= '${fy.fyStart}'`
  });

  // 5. Outstanding invoices
  const { data: outstanding } = await supabase.rpc('exec_sql', {
    query: `SELECT type,
      count(*)::int as cnt,
      sum(amount_due)::numeric as total_due
    FROM xero_invoices
    WHERE status NOT IN ('PAID', 'VOIDED', 'DELETED')
    GROUP BY type`
  });

  // 6. Budget data (if exists)
  let budgets = [];
  try {
    const { data } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('fy_year', fy.fyLabel);
    budgets = data || [];
  } catch (e) { /* table may not exist yet */ }

  // 7. Receipt pipeline health
  const { data: receiptHealth } = await supabase.rpc('exec_sql', {
    query: `SELECT
      count(*)::int as total,
      count(CASE WHEN status = 'uploaded' THEN 1 END)::int as uploaded,
      count(CASE WHEN status IN ('captured','matched') THEN 1 END)::int as in_progress,
      count(CASE WHEN status = 'review' THEN 1 END)::int as needs_review,
      count(CASE WHEN status = 'failed' THEN 1 END)::int as failed
    FROM receipt_emails`
  });

  return { fy, fySpend, monthlyBurn, rdSpend, cashPosition: cashPosition?.[0], outstanding, budgets, receiptHealth: receiptHealth?.[0] };
}

// ============================================================================
// ANALYSIS & RECOMMENDATIONS
// ============================================================================

function analyze(data) {
  const insights = [];
  const warnings = [];
  const recommendations = [];

  const fy = data.fy;

  // Burn rate analysis by project
  const burnByProject = {};
  for (const row of data.monthlyBurn || []) {
    if (!burnByProject[row.project_code]) burnByProject[row.project_code] = [];
    burnByProject[row.project_code].push({ month: row.month, spend: parseFloat(row.spend) });
  }

  for (const [code, months] of Object.entries(burnByProject)) {
    if (months.length < 2) continue;
    const recent = months[months.length - 1].spend;
    const previous = months[months.length - 2].spend;
    const change = previous > 0 ? ((recent - previous) / previous * 100) : 0;

    if (change > 30) {
      warnings.push(`${code} burn rate increased ${change.toFixed(0)}% month-over-month ($${previous.toFixed(0)} → $${recent.toFixed(0)})`);
    } else if (change < -30 && recent > 100) {
      insights.push(`${code} spend decreased ${Math.abs(change).toFixed(0)}% — potential underspend or delayed invoices`);
    }

    // Average monthly burn for runway calc
    const avgBurn = months.reduce((s, m) => s + m.spend, 0) / months.length;
    burnByProject[code]._avgBurn = avgBurn;
  }

  // Budget vs actual
  for (const budget of data.budgets || []) {
    const actual = data.fySpend?.find(s => s.project_code === budget.project_code);
    if (!actual) continue;
    const spent = parseFloat(actual.spend);
    const budgeted = parseFloat(budget.budget_amount);
    const pct = budgeted > 0 ? (spent / budgeted * 100) : 0;
    const monthsRemaining = 12 - fy.monthsElapsed;

    if (pct > 80) {
      warnings.push(`${budget.project_code} is ${pct.toFixed(0)}% through budget ($${spent.toLocaleString()} / $${budgeted.toLocaleString()}) with ${monthsRemaining} months remaining`);
    }

    if (pct < 30 && fy.monthsElapsed > 4) {
      insights.push(`${budget.project_code} only ${pct.toFixed(0)}% of budget used — may have unspent allocation`);
    }
  }

  // R&D analysis
  const rdTotal = (data.rdSpend || []).reduce((s, r) => s + parseFloat(r.total_spend), 0);
  const rdRefund = rdTotal * 0.435; // 43.5% refundable offset
  insights.push(`R&D eligible spend ${fy.fyLabel}: $${rdTotal.toLocaleString()} → estimated refund: $${rdRefund.toLocaleString()}`);

  const rdMissingReceipts = (data.rdSpend || []).reduce((s, r) => s + (r.txn_count - r.with_receipts), 0);
  if (rdMissingReceipts > 0) {
    warnings.push(`${rdMissingReceipts} R&D transactions missing receipts — impacts tax claim`);
    recommendations.push('Prioritize receipting R&D transactions — each missing receipt reduces the 43.5% refund');
  }

  // Cash position
  if (data.cashPosition) {
    const net = parseFloat(data.cashPosition.net);
    insights.push(`FY net position: $${net.toLocaleString()} (in: $${parseFloat(data.cashPosition.total_in).toLocaleString()}, out: $${parseFloat(data.cashPosition.total_out).toLocaleString()})`);
  }

  // Outstanding invoices
  for (const inv of data.outstanding || []) {
    if (inv.type === 'ACCREC' && parseFloat(inv.total_due) > 0) {
      insights.push(`Receivables outstanding: $${parseFloat(inv.total_due).toLocaleString()} across ${inv.cnt} invoices`);
    }
    if (inv.type === 'ACCPAY' && parseFloat(inv.total_due) > 0) {
      insights.push(`Payables outstanding: $${parseFloat(inv.total_due).toLocaleString()} across ${inv.cnt} bills`);
    }
  }

  // Receipt pipeline
  if (data.receiptHealth) {
    const rh = data.receiptHealth;
    const rate = rh.total > 0 ? Math.round(rh.uploaded / rh.total * 100) : 0;
    insights.push(`Receipt pipeline: ${rate}% uploaded (${rh.uploaded}/${rh.total}), ${rh.in_progress} in progress, ${rh.needs_review} need review`);
    if (rh.failed > 0) warnings.push(`${rh.failed} receipt uploads have failed — needs investigation`);
  }

  // General recommendations
  recommendations.push('Run reconciliation checklist before accountant review');
  if ((data.fySpend || []).some(s => !s.project_code)) {
    recommendations.push('Tag remaining untagged transactions with project codes');
  }

  return { insights, warnings, recommendations };
}

// ============================================================================
// OUTPUT
// ============================================================================

function formatReport(data, analysis) {
  const fy = data.fy;
  const lines = [
    `# Financial Advisor Report — ${fy.fyLabel}`,
    `Generated: ${new Date().toISOString().slice(0, 16)}`,
    `Month ${fy.monthsElapsed}/12 of financial year`,
    '',
  ];

  if (analysis.warnings.length > 0) {
    lines.push('## Warnings', '');
    for (const w of analysis.warnings) lines.push(`- ⚠️  ${w}`);
    lines.push('');
  }

  if (analysis.insights.length > 0) {
    lines.push('## Insights', '');
    for (const i of analysis.insights) lines.push(`- ${i}`);
    lines.push('');
  }

  // FY spend by project
  if (data.fySpend?.length) {
    lines.push('## Project Spend (FY-to-date)', '');
    lines.push('| Project | Spend | Income | Net | Txns |');
    lines.push('|---------|-------|--------|-----|------|');
    let totalSpend = 0, totalIncome = 0;
    for (const p of data.fySpend) {
      const spend = parseFloat(p.spend);
      const income = parseFloat(p.income);
      totalSpend += spend;
      totalIncome += income;
      lines.push(`| ${p.project_code} | $${spend.toLocaleString()} | $${income.toLocaleString()} | $${(income - spend).toLocaleString()} | ${p.txn_count} |`);
    }
    lines.push(`| **Total** | **$${totalSpend.toLocaleString()}** | **$${totalIncome.toLocaleString()}** | **$${(totalIncome - totalSpend).toLocaleString()}** | |`);
    lines.push('');
  }

  // R&D
  if (data.rdSpend?.length) {
    lines.push('## R&D Tax Incentive', '');
    lines.push('| Project | Eligible Spend | Receipted | Est. Refund (43.5%) |');
    lines.push('|---------|---------------|-----------|---------------------|');
    let rdTotal = 0;
    for (const r of data.rdSpend) {
      const spend = parseFloat(r.total_spend);
      rdTotal += spend;
      const receiptPct = r.txn_count > 0 ? Math.round(r.with_receipts / r.txn_count * 100) : 0;
      lines.push(`| ${r.project_code} | $${spend.toLocaleString()} | ${receiptPct}% | $${(spend * 0.435).toLocaleString()} |`);
    }
    lines.push(`| **Total** | **$${rdTotal.toLocaleString()}** | | **$${(rdTotal * 0.435).toLocaleString()}** |`);
    lines.push('');
  }

  if (analysis.recommendations.length > 0) {
    lines.push('## Recommendations', '');
    for (const r of analysis.recommendations) lines.push(`- ${r}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('=== Financial Advisor Agent ===');

  const data = await collectFinancialData();
  const analysis = analyze(data);

  if (JSON_OUT) {
    console.log(JSON.stringify({ data, analysis }, null, 2));
    return;
  }

  const report = formatReport(data, analysis);
  console.log('\n' + report);

  // Telegram digest
  if (NOTIFY) {
    const msg = [
      `💰 *Financial Advisor — ${data.fy.fyLabel}*`,
      '',
      ...analysis.warnings.slice(0, 3).map(w => `⚠️ ${w}`),
      '',
      ...analysis.insights.slice(0, 5).map(i => `📊 ${i}`),
      '',
      ...analysis.recommendations.slice(0, 3).map(r => `💡 ${r}`),
    ].join('\n');

    try {
      const { sendTelegramMessage } = await import('./lib/telegram.mjs');
      await sendTelegramMessage(msg);
      log('Telegram digest sent');
    } catch (err) {
      log(`Telegram failed: ${err.message}`);
    }
  }
}

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
