#!/usr/bin/env node
/**
 * Money-out alignment audit (mirror of audit-money-in-alignment.mjs).
 *
 * Reconciles every dollar of expense FY26-to-date across:
 *   1. PAID bills (xero_invoices, type=ACCPAY, amount_paid > 0)
 *   2. Standalone bank spends (xero_transactions, type=SPEND — direct card/bank charges, fees)
 *   3. Outstanding payables (xero_invoices, type=ACCPAY, amount_due > 0) — bills to pay
 *
 * Output: thoughts/shared/reports/money-out-alignment-<date>.md
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith('--since'));
const SINCE = sinceArg ? sinceArg.split(/[ =]/)[1] : '2025-07-01';

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const log = (m) => console.log(m);

async function main() {
  log(`Money-out alignment since ${SINCE}\n`);

  // 1. PAID bills (cash already paid out via Xero bill)
  const { data: paidBills } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, amount_paid, fully_paid_date, project_code, entity_code')
    .eq('type', 'ACCPAY')
    .gt('amount_paid', 0)
    .gte('date', SINCE)
    .order('amount_paid', { ascending: false });
  const billCount = paidBills?.length || 0;
  const billTotal = (paidBills || []).reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  // 2. Standalone SPEND bank txns
  // Need pagination — likely > 1000 rows
  let spends = [];
  let from = 0;
  while (true) {
    const { data: page } = await supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, project_code, entity_code, is_reconciled, status, bank_account, rd_eligible')
      .eq('type', 'SPEND')
      .neq('status', 'DELETED')
      .gte('date', SINCE)
      .range(from, from + 999);
    if (!page || page.length === 0) break;
    spends.push(...page);
    if (page.length < 1000) break;
    from += 1000;
  }
  const spendCount = spends.length;
  const spendTotal = spends.reduce((s, t) => s + Number(t.total || 0), 0);

  // 3. Outstanding payables
  const { data: outstanding } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, total, amount_due, due_date, project_code')
    .eq('type', 'ACCPAY')
    .in('status', ['AUTHORISED', 'DRAFT', 'SUBMITTED'])
    .gt('amount_due', 0)
    .gte('date', SINCE)
    .order('amount_due', { ascending: false });
  const outCount = outstanding?.length || 0;
  const outTotal = (outstanding || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);

  // Group spends by project for summary
  const byProject = {};
  for (const s of spends) {
    const code = s.project_code || '(uncoded)';
    if (!byProject[code]) byProject[code] = { count: 0, total: 0 };
    byProject[code].count += 1;
    byProject[code].total += Number(s.total || 0);
  }
  const topProjects = Object.entries(byProject)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 12);

  // R&D-eligible analysis
  const rdSpends = spends.filter(s => s.rd_eligible);
  const rdTotal = rdSpends.reduce((s, t) => s + Number(t.total || 0), 0);

  // Gaps
  const gapMissingProject = (paidBills || []).filter(i => !i.project_code).length
    + spends.filter(s => !s.project_code).length;
  const gapMissingEntity = (paidBills || []).filter(i => !i.entity_code).length
    + spends.filter(s => !s.entity_code).length;
  const gapUnreconciled = spends.filter(s => s.is_reconciled === false).length;

  // Build markdown
  const lines = [];
  const date = new Date().toISOString().slice(0, 10);
  lines.push(`# Money-Out Alignment — ${date}`);
  lines.push(`\n> Period: ${SINCE} → today. Reconciles every $ of expense across paid bills, standalone bank spends, and outstanding payables.\n`);

  lines.push(`## 💸 Grand totals\n`);
  lines.push(`| Source | Count | $ |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| **PAID bills** (via Xero bill) | ${billCount} | **${fmt(billTotal)}** |`);
  lines.push(`| **Standalone SPEND bank txns** (cards, fees, direct payments) | ${spendCount} | **${fmt(spendTotal)}** |`);
  lines.push(`| **TOTAL CASH OUT** | ${billCount + spendCount} | **${fmt(billTotal + spendTotal)}** |`);
  lines.push(``);
  lines.push(`| Pipeline | Count | $ |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| **Outstanding payables** (bills to pay) | ${outCount} | ${fmt(outTotal)} |`);
  lines.push(`| **R&D-eligible spend** (within total) | ${rdSpends.length} | **${fmt(rdTotal)}** |`);
  lines.push(``);

  lines.push(`## 🚩 Alignment gaps\n`);
  lines.push(`- **${gapMissingProject}** records missing project_code`);
  lines.push(`- **${gapMissingEntity}** records missing entity_code`);
  lines.push(`- **${gapUnreconciled}** SPEND bank txns marked unreconciled`);
  lines.push(``);

  lines.push(`## 🎯 Spend by project (top 12)\n`);
  lines.push(`| Project | Count | $ |`);
  lines.push(`|---|---:|---:|`);
  for (const [code, d] of topProjects) {
    lines.push(`| ${code} | ${d.count} | ${fmt(d.total)} |`);
  }
  lines.push(``);

  lines.push(`## ⏳ Outstanding payables (${outCount}, ${fmt(outTotal)})\n`);
  lines.push(`| Bill | Vendor | Due | Amount | Project |`);
  lines.push(`|---|---|---|---:|---|`);
  for (const i of (outstanding || []).slice(0, 25)) {
    const overdue = i.due_date && new Date(i.due_date) < new Date();
    lines.push(`| ${i.invoice_number || '—'} | ${(i.contact_name || '').slice(0, 40)} | ${i.due_date || '?'}${overdue ? ' ⚠️' : ''} | ${fmt(i.amount_due)} | ${i.project_code || '🚩'} |`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(`Generated by \`node scripts/audit-money-out-alignment.mjs\`. Sister report: \`audit-money-in-alignment.mjs\`.`);

  const outPath = join(__dirname, '..', 'thoughts', 'shared', 'reports', `money-out-alignment-${date}.md`);
  writeFileSync(outPath, lines.join('\n'));
  log(`\n✅ Wrote ${outPath}`);
  log(`Summary:`);
  log(`  Paid bills: ${billCount} (${fmt(billTotal)})`);
  log(`  Standalone spends: ${spendCount} (${fmt(spendTotal)})`);
  log(`  Outstanding: ${outCount} (${fmt(outTotal)})`);
  log(`  R&D-eligible: ${rdSpends.length} txns (${fmt(rdTotal)})`);
  log(`  Total cash out: ${fmt(billTotal + spendTotal)}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
