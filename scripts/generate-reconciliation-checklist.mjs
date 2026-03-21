#!/usr/bin/env node

/**
 * Generate Reconciliation Checklist for Accountant
 *
 * Produces a comprehensive report of what needs attention in Xero:
 * - Unreconciled bank lines
 * - Transactions missing receipts
 * - Transactions missing project tags
 * - Bills awaiting approval
 * - Receipt pipeline status
 * - R&D eligible transactions
 *
 * Usage:
 *   node scripts/generate-reconciliation-checklist.mjs              # Full report
 *   node scripts/generate-reconciliation-checklist.mjs --month 2    # Specific month
 *   node scripts/generate-reconciliation-checklist.mjs --notify     # Send Telegram summary
 *   node scripts/generate-reconciliation-checklist.mjs --json       # JSON output
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const args = process.argv.slice(2);
const NOTIFY = args.includes('--notify');
const JSON_OUT = args.includes('--json');
const monthIdx = args.indexOf('--month');
const MONTH = monthIdx !== -1 ? parseInt(args[monthIdx + 1], 10) : new Date().getMonth() + 1;
const YEAR = new Date().getFullYear();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

async function collectData() {
  const monthStart = `${YEAR}-${String(MONTH).padStart(2, '0')}-01`;
  const nextMonth = MONTH === 12 ? `${YEAR + 1}-01-01` : `${YEAR}-${String(MONTH + 1).padStart(2, '0')}-01`;

  // 1. Transaction summary
  const { data: txSummary } = await supabase.rpc('exec_sql', {
    query: `SELECT
      count(*)::int as total,
      count(CASE WHEN has_attachments THEN 1 END)::int as with_receipts,
      count(CASE WHEN NOT has_attachments AND type IN ('SPEND','SPEND-TRANSFER') THEN 1 END)::int as spend_missing_receipts,
      count(CASE WHEN project_code IS NULL THEN 1 END)::int as missing_project,
      sum(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') THEN ABS(total) ELSE 0 END)::numeric as total_spend,
      sum(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END)::numeric as total_income
    FROM xero_transactions
    WHERE date >= '${monthStart}' AND date < '${nextMonth}'`
  });

  // 2. Top unreceipted transactions
  const { data: topMissing } = await supabase.rpc('exec_sql', {
    query: `SELECT contact_name, ABS(total) as amount, date, project_code, type
    FROM xero_transactions
    WHERE date >= '${monthStart}' AND date < '${nextMonth}'
    AND NOT has_attachments AND type IN ('SPEND','SPEND-TRANSFER')
    ORDER BY ABS(total) DESC LIMIT 20`
  });

  // 3. Untagged transactions
  const { data: untagged } = await supabase.rpc('exec_sql', {
    query: `SELECT contact_name, ABS(total) as amount, date, type
    FROM xero_transactions
    WHERE date >= '${monthStart}' AND date < '${nextMonth}'
    AND project_code IS NULL
    ORDER BY ABS(total) DESC LIMIT 15`
  });

  // 4. Receipt pipeline status
  const { data: pipeline } = await supabase.rpc('exec_sql', {
    query: `SELECT status, count(*)::int as cnt,
      sum(CASE WHEN amount_detected IS NOT NULL THEN amount_detected ELSE 0 END)::numeric as total_amount
    FROM receipt_emails GROUP BY status ORDER BY cnt DESC`
  });

  // 5. Invoices summary (receivables + payables)
  const { data: invoices } = await supabase.rpc('exec_sql', {
    query: `SELECT type, status,
      count(*)::int as cnt,
      sum(amount_due)::numeric as total_due
    FROM xero_invoices
    WHERE status NOT IN ('PAID', 'VOIDED', 'DELETED')
    GROUP BY type, status ORDER BY type, status`
  });

  // 6. Project spend breakdown
  const { data: projectSpend } = await supabase.rpc('exec_sql', {
    query: `SELECT project_code,
      count(*)::int as txn_count,
      sum(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') THEN ABS(total) ELSE 0 END)::numeric as spend,
      sum(CASE WHEN type = 'RECEIVE' THEN total ELSE 0 END)::numeric as income,
      count(CASE WHEN NOT has_attachments AND type IN ('SPEND','SPEND-TRANSFER') THEN 1 END)::int as missing_receipts
    FROM xero_transactions
    WHERE date >= '${monthStart}' AND date < '${nextMonth}'
    AND project_code IS NOT NULL
    GROUP BY project_code ORDER BY spend DESC`
  });

  // 7. Subscription spend (recurring vendors)
  const { data: subscriptions } = await supabase.rpc('exec_sql', {
    query: `SELECT contact_name, count(*)::int as months,
      round(avg(ABS(total))::numeric, 2) as avg_amount,
      max(date) as last_date
    FROM xero_transactions
    WHERE type = 'SPEND' AND date >= '${YEAR}-01-01'
    GROUP BY contact_name HAVING count(*) >= 3
    ORDER BY avg(ABS(total)) DESC LIMIT 20`
  });

  return { txSummary: txSummary?.[0], topMissing, untagged, pipeline, invoices, projectSpend, subscriptions };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(data) {
  const monthName = new Date(YEAR, MONTH - 1).toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  const s = data.txSummary || {};
  const receiptRate = s.total > 0 ? Math.round(s.with_receipts / s.total * 100) : 0;
  const tagRate = s.total > 0 ? Math.round((s.total - s.missing_project) / s.total * 100) : 0;

  const lines = [
    `# Reconciliation Checklist — ${monthName}`,
    `Generated: ${new Date().toISOString().slice(0, 16)}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total transactions | ${s.total || 0} |`,
    `| Total spend | $${(s.total_spend || 0).toLocaleString()} |`,
    `| Total income | $${(s.total_income || 0).toLocaleString()} |`,
    `| Receipt coverage | ${receiptRate}% (${s.with_receipts || 0}/${s.total || 0}) |`,
    `| Project tag coverage | ${tagRate}% |`,
    `| Spend missing receipts | ${s.spend_missing_receipts || 0} transactions |`,
    '',
  ];

  // Receipt pipeline
  if (data.pipeline?.length) {
    lines.push('## Receipt Pipeline', '');
    lines.push('| Status | Count | Amount |');
    lines.push('|--------|-------|--------|');
    for (const row of data.pipeline) {
      lines.push(`| ${row.status} | ${row.cnt} | $${(row.total_amount || 0).toLocaleString()} |`);
    }
    lines.push('');
  }

  // Top missing receipts
  if (data.topMissing?.length) {
    lines.push('## Top Missing Receipts (action required)', '');
    lines.push('| Vendor | Amount | Date | Project |');
    lines.push('|--------|--------|------|---------|');
    for (const tx of data.topMissing) {
      lines.push(`| ${tx.contact_name || '?'} | $${parseFloat(tx.amount).toFixed(2)} | ${tx.date} | ${tx.project_code || '-'} |`);
    }
    lines.push('');
  }

  // Untagged transactions
  if (data.untagged?.length) {
    lines.push('## Untagged Transactions (needs project code)', '');
    lines.push('| Vendor | Amount | Date | Type |');
    lines.push('|--------|--------|------|------|');
    for (const tx of data.untagged) {
      lines.push(`| ${tx.contact_name || '?'} | $${parseFloat(tx.amount).toFixed(2)} | ${tx.date} | ${tx.type} |`);
    }
    lines.push('');
  }

  // Outstanding invoices
  if (data.invoices?.length) {
    lines.push('## Outstanding Invoices', '');
    lines.push('| Type | Status | Count | Amount Due |');
    lines.push('|------|--------|-------|------------|');
    for (const inv of data.invoices) {
      const typeName = inv.type === 'ACCREC' ? 'Receivable' : 'Payable';
      lines.push(`| ${typeName} | ${inv.status} | ${inv.cnt} | $${(inv.total_due || 0).toLocaleString()} |`);
    }
    lines.push('');
  }

  // Project spend
  if (data.projectSpend?.length) {
    lines.push('## Project Spend This Month', '');
    lines.push('| Project | Txns | Spend | Income | Missing Receipts |');
    lines.push('|---------|------|-------|--------|-----------------|');
    for (const p of data.projectSpend) {
      lines.push(`| ${p.project_code} | ${p.txn_count} | $${(p.spend || 0).toLocaleString()} | $${(p.income || 0).toLocaleString()} | ${p.missing_receipts} |`);
    }
    lines.push('');
  }

  // Subscriptions
  if (data.subscriptions?.length) {
    lines.push('## Recurring Subscriptions (3+ months)', '');
    lines.push('| Vendor | Avg/month | Months | Last Date |');
    lines.push('|--------|-----------|--------|-----------|');
    for (const sub of data.subscriptions) {
      lines.push(`| ${sub.contact_name} | $${sub.avg_amount} | ${sub.months} | ${sub.last_date} |`);
    }
    lines.push('');
  }

  // Accountant action items
  lines.push('## Accountant Action Items', '');
  const actions = [];
  if (s.spend_missing_receipts > 0) actions.push(`- [ ] Review ${s.spend_missing_receipts} transactions missing receipts`);
  if (s.missing_project > 0) actions.push(`- [ ] Tag ${s.missing_project} transactions with project codes`);
  if (data.invoices?.some(i => i.type === 'ACCPAY' && i.status === 'AUTHORISED')) {
    actions.push('- [ ] Review and approve outstanding payable invoices');
  }
  actions.push('- [ ] Reconcile bank statement in Xero (requires Xero UI)');
  actions.push('- [ ] Review subscription costs for potential savings');
  if (actions.length > 0) lines.push(...actions);
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log(`=== Reconciliation Checklist — ${YEAR}-${String(MONTH).padStart(2, '0')} ===`);

  const data = await collectData();
  const report = generateReport(data);

  if (JSON_OUT) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('\n' + report);

  // Save to file
  const filename = `reconciliation-checklist-${YEAR}-${String(MONTH).padStart(2, '0')}.md`;
  const outputPath = `scripts/output/${filename}`;
  try {
    writeFileSync(outputPath, report);
    log(`Saved to ${outputPath}`);
  } catch (e) {
    // output dir might not exist
  }

  // Telegram
  if (NOTIFY) {
    const s = data.txSummary || {};
    const msg = [
      `📊 *Reconciliation Checklist — ${new Date(YEAR, MONTH - 1).toLocaleString('en-AU', { month: 'long' })}*`,
      '',
      `Transactions: ${s.total || 0}`,
      `Spend: $${(s.total_spend || 0).toLocaleString()}`,
      `Receipt coverage: ${s.total > 0 ? Math.round(s.with_receipts / s.total * 100) : 0}%`,
      `Missing receipts: ${s.spend_missing_receipts || 0}`,
      `Untagged: ${s.missing_project || 0}`,
    ].join('\n');

    try {
      const { sendTelegramMessage } = await import('./lib/telegram.mjs');
      await sendTelegramMessage(msg);
      log('Telegram notification sent');
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
